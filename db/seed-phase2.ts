import { eq } from 'drizzle-orm'

import { db, sql } from './index'
import {
  agents,
  changelogEntries,
  conversations,
  escalations,
  ingestTokens,
  messages,
  organizations,
  requestComments,
  requests,
  users,
} from './schema'
import { generateIngestToken } from '../lib/tokens'

/**
 * Phase 2 demo data. Everything written here is `is_demo = true`.
 *
 * The conversation transcripts are synthetic support dialogues about a
 * fictional demo company — no real client, person or metric is represented.
 * Volumes are generated deterministically so the charts have a believable
 * shape without any number being presented as a real result.
 */

const TOPICS = [
  'Offerte aanvragen',
  'Levertijd',
  'Openingstijden',
  'Retour aanmelden',
  'Factuurvraag',
  'Technische storing',
  'Afspraak inplannen',
  'Prijsinformatie',
]

const CHANNELS = ['web', 'whatsapp', 'email'] as const

/** Deterministic PRNG so re-seeding produces identical demo data. */
function makeRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

const rand = makeRandom(20260803)

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]
}

function transcriptFor(topic: string, agentName: string) {
  return [
    {
      role: 'user' as const,
      content: `Hoi, ik heb een vraag over: ${topic.toLowerCase()}.`,
    },
    {
      role: 'assistant' as const,
      content: `Goedemiddag! Ik ben ${agentName}, de digitale assistent van de demo-organisatie. Ik help je graag met "${topic.toLowerCase()}". Kun je aangeven waar het precies om gaat?`,
    },
    {
      role: 'user' as const,
      content: 'Ja, ik wil weten wat de mogelijkheden zijn en wat het kost.',
    },
    {
      role: 'assistant' as const,
      content:
        'Dat hangt af van je situatie. Ik stuur je de standaardinformatie door en zet een notitie klaar voor een collega, zodat je een passend voorstel krijgt. Klopt het e-mailadres dat bij ons bekend is?',
    },
    { role: 'user' as const, content: 'Ja dat klopt, dank je wel!' },
  ]
}

async function main() {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, 'demo'))
    .limit(1)

  if (!org) {
    throw new Error('Demo organization not found. Run `npm run db:seed` first.')
  }

  const orgUsers = await db.select().from(users).where(eq(users.orgId, org.id))
  const manager = orgUsers.find((u) => u.role === 'client_manager')!
  const admin = orgUsers.find((u) => u.role === 'admin')!

  /* --- ingest token ------------------------------------------------ */

  const existingToken = await db
    .select()
    .from(ingestTokens)
    .where(eq(ingestTokens.orgId, org.id))
    .limit(1)

  let plaintextToken: string | null = null
  if (existingToken.length === 0) {
    const { token, hash } = generateIngestToken()
    await db.insert(ingestTokens).values({
      orgId: org.id,
      name: 'Demo ingest token',
      tokenHash: hash,
    })
    plaintextToken = token
  }

  /* --- agents ------------------------------------------------------ */

  const agentSpecs = [
    { name: 'Sofie', type: 'chat' as const, model: 'claude-sonnet-4-5', status: 'active' as const },
    { name: 'Daan', type: 'email' as const, model: 'claude-haiku-4-5', status: 'active' as const },
    { name: 'Roos', type: 'voice' as const, model: 'claude-sonnet-4-5', status: 'paused' as const },
  ]

  const agentIds: { id: string; name: string }[] = []
  for (const spec of agentSpecs) {
    const [row] = await db
      .insert(agents)
      .values({ ...spec, orgId: org.id, isDemo: true })
      .onConflictDoUpdate({
        target: [agents.orgId, agents.name],
        set: { type: spec.type, model: spec.model, status: spec.status },
      })
      .returning({ id: agents.id, name: agents.name })
    agentIds.push(row)
  }
  console.log(`agents: ${agentIds.map((a) => a.name).join(', ')}`)

  /* --- conversations ----------------------------------------------- */

  await db.delete(conversations).where(eq(conversations.orgId, org.id))

  const now = new Date()
  let convCount = 0
  let escalatedCount = 0

  // 60 days of history, weighted so weekdays are busier than weekends.
  for (let dayOffset = 59; dayOffset >= 0; dayOffset--) {
    const day = new Date(now)
    day.setDate(day.getDate() - dayOffset)
    const weekday = day.getDay()
    const isWeekend = weekday === 0 || weekday === 6
    const volume = isWeekend
      ? Math.floor(rand() * 3)
      : 3 + Math.floor(rand() * 7)

    for (let i = 0; i < volume; i++) {
      const agent = agentIds[Math.floor(rand() * agentIds.length)]
      const startedAt = new Date(day)
      startedAt.setHours(8 + Math.floor(rand() * 11), Math.floor(rand() * 60), 0, 0)
      const durationMin = 2 + Math.floor(rand() * 12)
      const endedAt = new Date(startedAt.getTime() + durationMin * 60_000)

      const roll = rand()
      const outcome =
        roll < 0.74 ? 'resolved' : roll < 0.9 ? 'escalated' : 'abandoned'
      const sentiment =
        outcome === 'resolved'
          ? rand() < 0.75
            ? 'positive'
            : 'neutral'
          : outcome === 'escalated'
            ? rand() < 0.5
              ? 'neutral'
              : 'negative'
            : 'negative'

      const topic = pick(TOPICS)
      const ratingRoll = rand()
      const rating =
        ratingRoll < 0.55 ? null : ratingRoll < 0.92 ? 1 : -1

      const [conv] = await db
        .insert(conversations)
        .values({
          orgId: org.id,
          agentId: agent.id,
          startedAt,
          endedAt,
          channel: pick(CHANNELS),
          outcome,
          sentiment,
          topic,
          tokenInput: 300 + Math.floor(rand() * 1800),
          tokenOutput: 150 + Math.floor(rand() * 900),
          rating,
          externalId: `demo-${dayOffset}-${i}`,
          isDemo: true,
        })
        .returning({ id: conversations.id })

      const lines = transcriptFor(topic, agent.name)
      await db.insert(messages).values(
        lines.map((line, idx) => ({
          conversationId: conv.id,
          role: line.role,
          content: line.content,
          createdAt: new Date(startedAt.getTime() + idx * 45_000),
        })),
      )

      if (outcome === 'escalated') {
        // Older escalations are mostly worked off; recent ones stay open.
        const status =
          dayOffset > 21 ? 'done' : dayOffset > 7 ? 'in_progress' : 'open'
        await db.insert(escalations).values({
          orgId: org.id,
          conversationId: conv.id,
          status,
          assignedNote:
            status === 'done'
              ? 'Telefonisch afgehandeld door de klantenservice.'
              : status === 'in_progress'
                ? 'Opgepakt, wacht op informatie van de klant.'
                : null,
          resolvedAt: status === 'done' ? endedAt : null,
          createdAt: endedAt,
        })
        escalatedCount++
      }

      convCount++
    }
  }
  console.log(`conversations: ${convCount} (${escalatedCount} escalated)`)

  /* --- requests ----------------------------------------------------- */

  await db.delete(requests).where(eq(requests.orgId, org.id))

  const requestSpecs = [
    {
      title: 'Openingstijden aanpassen op de website',
      description:
        'Vanaf volgende maand zijn we op vrijdag tot 17:00 open in plaats van 16:00. Kunnen jullie dit aanpassen op de website en in de chatbot?',
      priority: 'normaal' as const,
      status: 'afgerond' as const,
      daysAgo: 24,
      comments: [
        { admin: true, body: 'Duidelijk, we passen het deze week aan.' },
        { admin: true, body: 'Aangepast op de website en in de kennisbank van Sofie.' },
      ],
    },
    {
      title: 'Nieuwe productfoto\'s plaatsen',
      description:
        'We hebben nieuwe foto\'s laten maken van de drie hoofdproducten. Graag vervangen op de productpagina\'s.',
      priority: 'laag' as const,
      status: 'in_behandeling' as const,
      daysAgo: 9,
      comments: [
        { admin: true, body: 'Ontvangen. We zetten ze klaar en sturen een preview.' },
      ],
    },
    {
      title: 'Chatbot geeft verkeerd antwoord over retourtermijn',
      description:
        'De chatbot noemt 14 dagen retourtermijn, maar dat is bij ons 30 dagen. Graag met spoed corrigeren.',
      priority: 'hoog' as const,
      status: 'nieuw' as const,
      daysAgo: 2,
      comments: [],
    },
  ]

  for (const spec of requestSpecs) {
    const createdAt = new Date(now)
    createdAt.setDate(createdAt.getDate() - spec.daysAgo)

    const [req] = await db
      .insert(requests)
      .values({
        orgId: org.id,
        userId: manager.id,
        title: spec.title,
        description: spec.description,
        priority: spec.priority,
        status: spec.status,
        isDemo: true,
        createdAt,
        updatedAt: createdAt,
      })
      .returning({ id: requests.id })

    for (const [idx, c] of spec.comments.entries()) {
      const at = new Date(createdAt.getTime() + (idx + 1) * 86_400_000)
      await db.insert(requestComments).values({
        requestId: req.id,
        userId: c.admin ? admin.id : manager.id,
        body: c.body,
        createdAt: at,
      })
    }
  }
  console.log(`requests: ${requestSpecs.length}`)

  /* --- changelog ---------------------------------------------------- */

  await db.delete(changelogEntries).where(eq(changelogEntries.orgId, org.id))

  const changelog = [
    { weekLabel: 'Week 31', entry: 'Chatbot Sofie uitgebreid met vragen over retouren en garantie.', daysAgo: 3 },
    { weekLabel: 'Week 30', entry: 'Openingstijden aangepast op de website en in de kennisbank.', daysAgo: 10 },
    { weekLabel: 'Week 29', entry: 'E-mailagent Daan live gezet voor het beantwoorden van factuurvragen.', daysAgo: 17 },
    { weekLabel: 'Week 28', entry: 'Escalatie-inbox ingericht zodat complexe vragen direct bij het team landen.', daysAgo: 24 },
  ]

  for (const c of changelog) {
    const createdAt = new Date(now)
    createdAt.setDate(createdAt.getDate() - c.daysAgo)
    await db.insert(changelogEntries).values({
      orgId: org.id,
      weekLabel: c.weekLabel,
      entry: c.entry,
      isDemo: true,
      createdAt,
    })
  }
  console.log(`changelog: ${changelog.length}`)

  if (plaintextToken) {
    console.log(
      `\n=== INGEST TOKEN (shown once, store it now) ===\n${plaintextToken}\n`,
    )
  } else {
    console.log('\ningest token: already exists, not regenerated')
  }
}

main()
  .then(() => sql.end())
  .catch(async (err) => {
    console.error(err)
    await sql.end()
    process.exit(1)
  })
