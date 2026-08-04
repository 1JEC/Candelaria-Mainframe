'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { db } from '@/db'
import { requestComments, requests, users } from '@/db/schema'
import { recordAudit } from '@/lib/audit'
import { agencyInbox, sendEmail } from '@/lib/email'
import { requestStatusMeta } from '@/lib/labels'
import { isStaff } from '@/lib/rbac'
import { requireMutator } from '@/lib/session'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100'

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  priority: z.enum(['laag', 'normaal', 'hoog', 'urgent']),
})

export async function createRequest(input: unknown) {
  const user = await requireMutator('requests')
  const data = createSchema.parse(input)

  const [row] = await db
    .insert(requests)
    .values({
      orgId: user.orgId,
      userId: user.id,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: 'nieuw',
      isDemo: false,
    })
    .returning({ id: requests.id })

  await recordAudit({
    orgId: user.orgId,
    userId: user.id,
    action: 'request.create',
    entity: 'request',
    entityId: row.id,
    meta: { priority: data.priority },
  })

  // Notifies the agency, never the client — the client just submitted it.
  await sendEmail({
    to: agencyInbox(),
    subject: `Nieuw verzoek — ${user.orgName}: ${data.title}`,
    text: [
      `Organisatie: ${user.orgName}`,
      `Ingediend door: ${user.name} (${user.email})`,
      `Prioriteit: ${data.priority}`,
      '',
      data.description,
      '',
      `${APP_URL}/requests/${row.id}`,
    ].join('\n'),
  })

  revalidatePath('/requests')
  return { id: row.id }
}

const commentSchema = z.object({
  requestId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
})

export async function addComment(input: unknown) {
  const user = await requireMutator('requests')
  const { requestId, body } = commentSchema.parse(input)

  const [target] = await db
    .select({ id: requests.id, title: requests.title, userId: requests.userId })
    .from(requests)
    .where(and(eq(requests.id, requestId), eq(requests.orgId, user.orgId)))
    .limit(1)

  if (!target) throw new Error('Request not found.')

  await db.insert(requestComments).values({
    requestId,
    userId: user.id,
    body,
  })

  await db
    .update(requests)
    .set({ updatedAt: new Date() })
    .where(eq(requests.id, requestId))

  await recordAudit({
    orgId: user.orgId,
    userId: user.id,
    action: 'request.comment',
    entity: 'request',
    entityId: requestId,
  })

  // A reply from the agency notifies the client; a client's own reply notifies
  // the agency. Nobody is emailed about their own comment.
  if (isStaff(user.role)) {
    const email = await requesterEmail(target.userId)
    if (email) {
      await sendEmail({
        to: email,
        subject: `Reactie op je verzoek: ${target.title}`,
        text: [
          `Er is een reactie geplaatst op je verzoek "${target.title}".`,
          '',
          body,
          '',
          `${APP_URL}/requests/${requestId}`,
        ].join('\n'),
      })
    }
  } else {
    await sendEmail({
      to: agencyInbox(),
      subject: `Reactie van ${user.orgName}: ${target.title}`,
      text: [body, '', `${APP_URL}/requests/${requestId}`].join('\n'),
    })
  }

  revalidatePath(`/requests/${requestId}`)
}

const statusSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(['nieuw', 'in_behandeling', 'afgerond', 'afgewezen']),
})

/** Status changes are an agency action — clients follow, they do not decide. */
export async function changeRequestStatus(input: unknown) {
  const user = await requireMutator('requests')
  const { requestId, status } = statusSchema.parse(input)

  if (!isStaff(user.role)) {
    throw new Error('Forbidden: only agency staff can change a request status.')
  }

  const [row] = await db
    .update(requests)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(requests.id, requestId), eq(requests.orgId, user.orgId)))
    .returning({ id: requests.id, title: requests.title, userId: requests.userId })

  if (!row) throw new Error('Request not found.')

  await recordAudit({
    orgId: user.orgId,
    userId: user.id,
    action: 'request.status',
    entity: 'request',
    entityId: requestId,
    meta: { status },
  })

  const email = await requesterEmail(row.userId)
  if (email) {
    await sendEmail({
      to: email,
      subject: `Status bijgewerkt: ${row.title}`,
      text: [
        `De status van je verzoek "${row.title}" is gewijzigd naar: ${requestStatusMeta[status].label}.`,
        '',
        `${APP_URL}/requests/${requestId}`,
      ].join('\n'),
    })
  }

  revalidatePath(`/requests/${requestId}`)
  revalidatePath('/requests')
}

async function requesterEmail(userId: string | null): Promise<string | null> {
  if (!userId) return null
  const [row] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return row?.email ?? null
}
