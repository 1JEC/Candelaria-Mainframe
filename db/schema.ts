import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

/**
 * Phase 1 core schema.
 *
 * Every tenant-scoped table carries `org_id` so that all queries can be
 * filtered by organization. `is_demo` marks seeded/demo rows — real data must
 * never be written with `is_demo = true`, and demo data must always be
 * visibly labelled in the UI.
 */

export const userRole = pgEnum('user_role', [
  'admin', // Candelaria staff — full access across organizations
  'client_manager', // Client-side owner — all modules for their own org
  'client_viewer', // Read-only — dashboard, library and reports only
])

export const orgPlan = pgEnum('org_plan', ['starter', 'growth', 'scale'])

export const integrationProvider = pgEnum('integration_provider', [
  'meta',
  'google_ads',
  'google_search_console',
  'google_analytics',
  'linkedin',
  'resend',
  'anthropic',
])

export const integrationStatus = pgEnum('integration_status', [
  'not_connected',
  'connected',
  'expired',
  'error',
])

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    plan: orgPlan('plan').notNull().default('starter'),
    isDemo: boolean('is_demo').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('organizations_slug_idx').on(t.slug)],
)

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    name: text('name').notNull(),
    role: userRole('role').notNull().default('client_viewer'),
    passwordHash: text('password_hash').notNull(),
    passwordResetTokenHash: text('password_reset_token_hash'),
    passwordResetExpiresAt: timestamp('password_reset_expires_at', {
      withTimezone: true,
    }),
    lastLogin: timestamp('last_login', { withTimezone: true }),
    isDemo: boolean('is_demo').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('users_email_idx').on(t.email),
    index('users_org_idx').on(t.orgId),
  ],
)

/**
 * Append-only trail. Every mutation in the portal writes exactly one row here.
 * Never updated, never deleted.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    // Null when the actor is a system process (agent, cron, ingest endpoint).
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: text('action').notNull(), // e.g. 'user.login', 'request.create'
    entity: text('entity').notNull(), // e.g. 'user', 'request'
    entityId: text('entity_id'),
    meta: jsonb('meta').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('audit_log_org_created_idx').on(t.orgId, t.createdAt),
    index('audit_log_entity_idx').on(t.entity, t.entityId),
  ],
)

export const integrations = pgTable(
  'integrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    provider: integrationProvider('provider').notNull(),
    status: integrationStatus('status').notNull().default('not_connected'),
    // AES-256-GCM ciphertext — never a plaintext token. Written only by the
    // integration flow, read only server-side.
    encryptedCredentials: text('encrypted_credentials'),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('integrations_org_provider_idx').on(t.orgId, t.provider),
  ],
)

/**
 * Per-org bearer tokens for the `/api/ingest/*` endpoints. Only the SHA-256
 * hash is stored — the plaintext is shown once at creation and never again.
 */
export const ingestTokens = pgTable(
  'ingest_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    tokenHash: text('token_hash').notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('ingest_tokens_hash_idx').on(t.tokenHash),
    index('ingest_tokens_org_idx').on(t.orgId),
  ],
)

/* ------------------------------------------------------------------ */
/* Phase 2A — AI Agents                                                */
/* ------------------------------------------------------------------ */

export const agentType = pgEnum('agent_type', [
  'chat',
  'voice',
  'email',
  'internal',
])

export const agentStatus = pgEnum('agent_status', [
  'active',
  'paused',
  'error',
])

export const conversationOutcome = pgEnum('conversation_outcome', [
  'resolved',
  'escalated',
  'abandoned',
])

export const conversationSentiment = pgEnum('conversation_sentiment', [
  'positive',
  'neutral',
  'negative',
])

export const messageRole = pgEnum('message_role', [
  'user',
  'assistant',
  'system',
])

export const escalationStatus = pgEnum('escalation_status', [
  'open',
  'in_progress',
  'done',
])

export const agents = pgTable(
  'agents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: agentType('type').notNull().default('chat'),
    status: agentStatus('status').notNull().default('active'),
    model: text('model'),
    isDemo: boolean('is_demo').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('agents_org_idx').on(t.orgId),
    // External systems address agents by name when ingesting.
    uniqueIndex('agents_org_name_idx').on(t.orgId, t.name),
  ],
)

export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    channel: text('channel').notNull().default('web'),
    outcome: conversationOutcome('outcome').notNull().default('resolved'),
    sentiment: conversationSentiment('sentiment').notNull().default('neutral'),
    topic: text('topic'),
    tokenInput: integer('token_input').notNull().default(0),
    tokenOutput: integer('token_output').notNull().default(0),
    /** Client feedback: 1 = thumbs up, -1 = thumbs down, null = not rated. */
    rating: smallint('rating'),
    /** Idempotency key from the source system, unique per org. */
    externalId: text('external_id'),
    isDemo: boolean('is_demo').notNull().default(false),
  },
  (t) => [
    index('conversations_org_started_idx').on(t.orgId, t.startedAt),
    index('conversations_agent_idx').on(t.agentId),
    index('conversations_outcome_idx').on(t.orgId, t.outcome),
    uniqueIndex('conversations_org_external_idx').on(t.orgId, t.externalId),
  ],
)

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: messageRole('role').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('messages_conversation_idx').on(t.conversationId, t.createdAt)],
)

export const escalations = pgTable(
  'escalations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    status: escalationStatus('status').notNull().default('open'),
    assignedNote: text('assigned_note'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('escalations_conversation_idx').on(t.conversationId),
    index('escalations_org_status_idx').on(t.orgId, t.status),
  ],
)

/* ------------------------------------------------------------------ */
/* Phase 2B — Requests & changelog                                     */
/* ------------------------------------------------------------------ */

// Status and priority values are Dutch because they are specified that way in
// the product brief and are rendered directly as filter keys.
export const requestPriority = pgEnum('request_priority', [
  'laag',
  'normaal',
  'hoog',
  'urgent',
])

export const requestStatus = pgEnum('request_status', [
  'nieuw',
  'in_behandeling',
  'afgerond',
  'afgewezen',
])

export const requests = pgTable(
  'requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    priority: requestPriority('priority').notNull().default('normaal'),
    status: requestStatus('status').notNull().default('nieuw'),
    isDemo: boolean('is_demo').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('requests_org_status_idx').on(t.orgId, t.status),
    index('requests_org_created_idx').on(t.orgId, t.createdAt),
  ],
)

export const requestComments = pgTable(
  'request_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => requests.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('request_comments_request_idx').on(t.requestId, t.createdAt)],
)

export const changelogEntries = pgTable(
  'changelog_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    weekLabel: text('week_label').notNull(),
    entry: text('entry').notNull(),
    isDemo: boolean('is_demo').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('changelog_org_created_idx').on(t.orgId, t.createdAt)],
)

/* ------------------------------------------------------------------ */
/* Website lead intake + owned analytics                               */
/*                                                                      */
/* Candelaria's OWN data about candelaria-agency.netlify.app visitors  */
/* and form submissions — never a client's. Deliberately NOT org-scoped */
/* (no org_id) and gated admin-only at the module level (see            */
/* lib/rbac.ts: MODULE_ACCESS['website-leads'|'analytics']).            */
/* ------------------------------------------------------------------ */

export const leadStatus = pgEnum('lead_status', [
  'new',
  'contacted',
  'booked',
  'won',
  'lost',
])

export const deviceType = pgEnum('device_type', [
  'mobile',
  'tablet',
  'desktop',
])

export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    source: text('source').notNull().default('candelaria-website'),
    formName: text('form_name').notNull().default('book-audit-call'),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    company: text('company'),
    websiteUrl: text('website_url'),
    message: text('message'),
    /** Full raw submission body, for fields not modeled above. */
    payload: jsonb('payload').notNull().$type<Record<string, unknown>>(),
    status: leadStatus('status').notNull().default('new'),
    /**
     * Full IP address. Legal basis: legitimate interest (security/fraud
     * prevention on an active form submission) — unlike `pageviews`, this is
     * never truncated. See DECISIONS.md privacy section.
     */
    ipAddress: text('ip_address'),
    ipCountry: text('ip_country'),
    ipCity: text('ip_city'),
    /** Links this lead to its pre-submission pageview journey. */
    visitorHash: text('visitor_hash'),
    utmSource: text('utm_source'),
    utmMedium: text('utm_medium'),
    utmCampaign: text('utm_campaign'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('leads_created_idx').on(t.createdAt),
    index('leads_status_idx').on(t.status),
    index('leads_visitor_idx').on(t.visitorHash),
    index('leads_ip_created_idx').on(t.ipAddress, t.createdAt),
  ],
)

export const pageviews = pgTable(
  'pageviews',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    site: text('site').notNull().default('candelaria-agency'),
    path: text('path').notNull(),
    referrer: text('referrer'),
    /** Parsed hostname, e.g. 'google.com', 'linkedin.com', '(direct)'. */
    referrerDomain: text('referrer_domain'),
    utmSource: text('utm_source'),
    utmMedium: text('utm_medium'),
    utmCampaign: text('utm_campaign'),
    country: text('country'),
    city: text('city'),
    region: text('region'),
    /**
     * Masked last IPv4 octet / collapsed IPv6 tail — never the full address.
     * See lib/ip.ts:truncateIp and DECISIONS.md privacy section.
     */
    ipTruncated: text('ip_truncated'),
    /** Daily-rotating SHA-256 hash — see lib/visitor-hash.ts. */
    visitorHash: text('visitor_hash'),
    /** Client-generated per-tab session id (sessionStorage on the website). */
    sessionId: text('session_id'),
    deviceType: deviceType('device_type'),
    browser: text('browser'),
    os: text('os'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('pageviews_created_idx').on(t.createdAt),
    index('pageviews_country_idx').on(t.country),
    index('pageviews_session_idx').on(t.sessionId),
    index('pageviews_visitor_idx').on(t.visitorHash),
  ],
)

/* ------------------------------------------------------------------ */
/* Prospecting — Leads Agent                                           */
/*                                                                      */
/* Candelaria's OWN outbound MKB lead-finding agent: discovers Dutch    */
/* SMBs, audits their websites, scores fit/pain, drafts outreach, and   */
/* (once enabled) tracks sends. Entirely unrelated to the client-facing */
/* `leads` module above — that is each org's own CRM. Deliberately NOT  */
/* org-scoped (no org_id) and gated staff-only at the module level (see */
/* lib/rbac.ts: STAFF_ONLY_MODULES includes 'prospecting'). Table names */
/* are all prefixed `prospect_` to avoid any collision with `leads`/    */
/* `pageviews` above or with any future client-facing module.           */
/* ------------------------------------------------------------------ */

export const prospectLeadStatus = pgEnum('prospect_lead_status', [
  'new',
  'contacted',
  'qualified',
  'packed',
  'replied',
  'won',
  'lost',
  'suppressed',
])

export const prospectPriority = pgEnum('prospect_priority', ['A', 'B', 'C'])

export const prospectRunStatus = pgEnum('prospect_run_status', [
  'queued',
  'running',
  'paused',
  'cancelled',
  'done',
  'failed',
])

export const prospectTaskType = pgEnum('prospect_task_type', [
  'discover',
  'process_candidate',
])

export const prospectTaskStatus = pgEnum('prospect_task_status', [
  'pending',
  'claimed',
  'done',
  'failed',
])

export const prospectEventLevel = pgEnum('prospect_event_level', [
  'info',
  'warn',
  'error',
])

export const prospectConfigKey = pgEnum('prospect_config_key', [
  'icp',
  'rubric',
  'thresholds',
  'crawl',
  'sources',
  'outbound_halt',
  'golive_checklist',
])

export const prospectMailboxHealth = pgEnum('prospect_mailbox_health', [
  'green',
  'amber',
  'red',
  'unknown',
])

export const prospectEnrollmentStatus = pgEnum('prospect_enrollment_status', [
  'active',
  'stopped',
  'completed',
])

export const prospectReplyClassification = pgEnum(
  'prospect_reply_classification',
  ['positive', 'neutral', 'negative', 'optout', 'ooo', 'bounce'],
)

export const prospectSendResult = pgEnum('prospect_send_result', [
  'sent',
  'blocked',
  'failed',
  'bounce',
  'spam_complaint',
])

export const prospectSuppressionKind = pgEnum('prospect_suppression_kind', [
  'domain',
  'email',
  'phone',
  'kvk',
  'hash',
])

export const prospectLeads = pgTable(
  'prospect_leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Nullable: the agent may create a lead with only a phone or contact-form
    // channel — never invent an email to satisfy a not-null constraint.
    email: text('email'),
    name: text('name'),
    company: text('company'),
    website: text('website'),
    phone: text('phone'),
    source: text('source').notNull(),
    sourceId: text('source_id'),
    status: prospectLeadStatus('status').notNull().default('new'),
    score: integer('score').notNull().default(0),
    scoreBreakdown: jsonb('score_breakdown').$type<Record<string, unknown>>(),
    tags: text('tags').array(),
    notes: text('notes'),
    lastContactedAt: timestamp('last_contacted_at', { withTimezone: true }),
    nextFollowUpAt: timestamp('next_follow_up_at', { withTimezone: true }),
    registrableDomain: text('registrable_domain'),
    legalName: text('legal_name'),
    kvkNumber: text('kvk_number'),
    sbiCode: text('sbi_code'),
    sector: text('sector'),
    street: text('street'),
    postcode: text('postcode'),
    city: text('city'),
    province: text('province'),
    phoneE164: text('phone_e164'),
    emailGeneral: text('email_general'),
    contactFormUrl: text('contact_form_url'),
    socialsJson: jsonb('socials_json').$type<{ field: string; value: string; sourceUrl: string }[]>(),
    fitScore: integer('fit_score').notNull().default(0),
    painScore: integer('pain_score').notNull().default(0),
    totalScore: integer('total_score').notNull().default(0),
    priority: prospectPriority('priority'),
    recommendedOffer: text('recommended_offer'),
    recommendedChannel: text('recommended_channel'),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    auditedAt: timestamp('audited_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('prospect_leads_email_idx').on(t.email),
    uniqueIndex('prospect_leads_domain_idx').on(t.registrableDomain),
    index('prospect_leads_status_idx').on(t.status),
    index('prospect_leads_total_score_idx').on(t.totalScore),
  ],
)

export const prospectRuns = pgTable('prospect_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  label: text('label'),
  paramsJson: jsonb('params_json').$type<Record<string, unknown>>(),
  status: prospectRunStatus('status').notNull().default('queued'),
  startedBy: uuid('started_by').references(() => users.id, {
    onDelete: 'set null',
  }),
  startedAt: timestamp('started_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  heartbeatAt: timestamp('heartbeat_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  cancelRequested: boolean('cancel_requested').notNull().default(false),
  statsJson: jsonb('stats_json').$type<Record<string, unknown>>(),
  aiCostEur: numeric('ai_cost_eur', { precision: 8, scale: 4 })
    .notNull()
    .default('0'),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const prospectRunTasks = pgTable(
  'prospect_run_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: uuid('run_id')
      .notNull()
      .references(() => prospectRuns.id, { onDelete: 'cascade' }),
    type: prospectTaskType('type').notNull(),
    target: text('target'),
    status: prospectTaskStatus('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    error: text('error'),
    resultJson: jsonb('result_json').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('prospect_run_tasks_run_idx').on(t.runId),
    index('prospect_run_tasks_status_idx').on(t.status),
  ],
)

export const prospectEvents = pgTable(
  'prospect_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(), // stream cursor
    runId: uuid('run_id')
      .notNull()
      .references(() => prospectRuns.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id'),
    ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
    level: prospectEventLevel('level').notNull().default('info'),
    code: text('code').notNull(),
    messageNl: text('message_nl'),
    payloadJson: jsonb('payload_json').$type<Record<string, unknown>>(),
    leadId: uuid('lead_id'),
    durationMs: integer('duration_ms'),
  },
  (t) => [index('prospect_events_run_idx').on(t.runId, t.id)],
)

export const prospectSignals = pgTable(
  'prospect_signals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => prospectLeads.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    labelNl: text('label_nl'),
    evidence: text('evidence'),
    sourceUrl: text('source_url'),
    points: integer('points').notNull().default(0),
    capturedAt: timestamp('captured_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('prospect_signals_lead_idx').on(t.leadId)],
)

export const prospectContacts = pgTable(
  'prospect_contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => prospectLeads.id, { onDelete: 'cascade' }),
    field: text('field').notNull(), // e.g. email_general, phone_e164, kvk_number
    value: text('value').notNull(),
    sourceUrl: text('source_url').notNull(),
    capturedAt: timestamp('captured_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('prospect_contacts_lead_idx').on(t.leadId)],
)

export const prospectAudits = pgTable(
  'prospect_audits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => prospectLeads.id, { onDelete: 'cascade' }),
    runId: uuid('run_id').references(() => prospectRuns.id, {
      onDelete: 'set null',
    }),
    rawJson: jsonb('raw_json').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('prospect_audits_lead_idx').on(t.leadId)],
)

export const prospectPacks = pgTable(
  'prospect_packs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => prospectLeads.id, { onDelete: 'cascade' }),
    runId: uuid('run_id').references(() => prospectRuns.id, {
      onDelete: 'set null',
    }),
    email1: text('email_1'),
    email2: text('email_2'),
    email3: text('email_3'),
    dmDraft: text('dm_draft'),
    callScript: text('call_script'),
    evidenceMd: text('evidence_md'),
    generatedAt: timestamp('generated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    model: text('model'),
    grounded: boolean('grounded').notNull().default(true),
  },
  (t) => [index('prospect_packs_lead_idx').on(t.leadId)],
)

/** General-purpose HTTP response cache (Overpass, crawled pages, DNS). */
export const prospectPageCache = pgTable('prospect_page_cache', {
  urlHash: text('url_hash').primaryKey(), // sha256 of the request
  url: text('url').notNull(),
  status: integer('status'),
  fetchedAt: timestamp('fetched_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  body: text('body'),
})

export const prospectConfig = pgTable(
  'prospect_config',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: prospectConfigKey('key').notNull(),
    version: integer('version').notNull(),
    valueJson: jsonb('value_json').notNull().$type<Record<string, unknown>>(),
    isActive: boolean('is_active').notNull().default(true),
    updatedBy: uuid('updated_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('prospect_config_key_version_idx').on(t.key, t.version),
    index('prospect_config_key_active_idx').on(t.key, t.isActive),
  ],
)

export const prospectSequences = pgTable('prospect_sequences', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  stepsJson: jsonb('steps_json').notNull().$type<Record<string, unknown>[]>(),
  active: boolean('active').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const prospectMailboxes = pgTable(
  'prospect_mailboxes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    address: text('address').notNull(),
    displayName: text('display_name'),
    provider: text('provider'),
    dailyCap: integer('daily_cap').notNull().default(20),
    sentToday: integer('sent_today').notNull().default(0),
    warmupStage: text('warmup_stage').notNull().default('cold'),
    health: prospectMailboxHealth('health').notNull().default('unknown'),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('prospect_mailboxes_address_idx').on(t.address)],
)

export const prospectEnrollments = pgTable(
  'prospect_enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => prospectLeads.id, { onDelete: 'cascade' }),
    sequenceId: uuid('sequence_id')
      .notNull()
      .references(() => prospectSequences.id),
    mailboxId: uuid('mailbox_id').references(() => prospectMailboxes.id, {
      onDelete: 'set null',
    }),
    status: prospectEnrollmentStatus('status').notNull().default('active'),
    currentStep: integer('current_step').notNull().default(0),
    nextSendAt: timestamp('next_send_at', { withTimezone: true }),
    stoppedReason: text('stopped_reason'),
    enrolledBy: uuid('enrolled_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('prospect_enrollments_lead_idx').on(t.leadId),
    index('prospect_enrollments_status_idx').on(t.status),
  ],
)

export const prospectReplies = pgTable(
  'prospect_replies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => prospectLeads.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id'), // soft ref — no outreach_messages table in this port
    fromAddress: text('from_address'),
    receivedAt: timestamp('received_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    bodyText: text('body_text'),
    classification: prospectReplyClassification('classification'),
    confidence: numeric('confidence', { precision: 4, scale: 3 }),
    handledBy: uuid('handled_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    handledAt: timestamp('handled_at', { withTimezone: true }),
    prepBrief: text('prep_brief'),
  },
  (t) => [index('prospect_replies_lead_idx').on(t.leadId)],
)

export const prospectOutbox = pgTable(
  'prospect_outbox',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => prospectLeads.id, { onDelete: 'cascade' }),
    channel: text('channel').notNull(),
    payloadJson: jsonb('payload_json').notNull().$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Null while OUTBOUND_ENABLED=false — dry-run rows never get this set.
    sentAt: timestamp('sent_at', { withTimezone: true }),
  },
  (t) => [index('prospect_outbox_lead_idx').on(t.leadId)],
)

export const prospectSendLog = pgTable(
  'prospect_send_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mailboxId: uuid('mailbox_id').references(() => prospectMailboxes.id, {
      onDelete: 'set null',
    }),
    leadId: uuid('lead_id').references(() => prospectLeads.id, {
      onDelete: 'set null',
    }),
    ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
    result: prospectSendResult('result').notNull(),
    reason: text('reason'),
  },
  (t) => [index('prospect_send_log_mailbox_idx').on(t.mailboxId)],
)

/**
 * Per-call AI usage log (one row per `callModel()` invocation), distinct
 * from `prospect_runs` (one row per full discover-and-process cycle).
 * `checkAiBudget()` sums `cost_eur` across today's rows regardless of which
 * run they belong to — the daily cap is global to the module, not per-run.
 */
export const prospectAiCalls = pgTable(
  'prospect_ai_calls',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: uuid('run_id').references(() => prospectRuns.id, {
      onDelete: 'set null',
    }),
    purpose: text('purpose').notNull(), // sector_classification | pain_brief | outreach_pack | call_prep
    model: text('model').notNull(),
    success: boolean('success').notNull(),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    costEur: numeric('cost_eur', { precision: 8, scale: 4 }),
    errorMessage: text('error_message'),
    outputSummary: text('output_summary'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    durationMs: integer('duration_ms'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('prospect_ai_calls_run_idx').on(t.runId),
    index('prospect_ai_calls_created_idx').on(t.createdAt),
  ],
)

export const prospectSuppression = pgTable(
  'prospect_suppression',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: prospectSuppressionKind('kind').notNull(),
    value: text('value').notNull(),
    source: text('source'), // manual|optout|bounce|forget
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('prospect_suppression_kind_value_idx').on(t.kind, t.value)],
)

export type Organization = typeof organizations.$inferSelect
export type User = typeof users.$inferSelect
export type AuditLogEntry = typeof auditLog.$inferSelect
export type Integration = typeof integrations.$inferSelect
export type IngestToken = typeof ingestTokens.$inferSelect
export type Agent = typeof agents.$inferSelect
export type Conversation = typeof conversations.$inferSelect
export type Message = typeof messages.$inferSelect
export type Escalation = typeof escalations.$inferSelect
export type Request = typeof requests.$inferSelect
export type RequestComment = typeof requestComments.$inferSelect
export type ChangelogEntry = typeof changelogEntries.$inferSelect
export type Lead = typeof leads.$inferSelect
export type Pageview = typeof pageviews.$inferSelect

export type UserRole = (typeof userRole.enumValues)[number]
export type RequestStatus = (typeof requestStatus.enumValues)[number]
export type RequestPriority = (typeof requestPriority.enumValues)[number]
export type EscalationStatus = (typeof escalationStatus.enumValues)[number]
export type ConversationOutcome = (typeof conversationOutcome.enumValues)[number]
export type ConversationSentiment =
  (typeof conversationSentiment.enumValues)[number]
export type LeadStatus = (typeof leadStatus.enumValues)[number]
export type DeviceType = (typeof deviceType.enumValues)[number]

export type ProspectLead = typeof prospectLeads.$inferSelect
export type ProspectRun = typeof prospectRuns.$inferSelect
export type ProspectRunTask = typeof prospectRunTasks.$inferSelect
export type ProspectEvent = typeof prospectEvents.$inferSelect
export type ProspectSignal = typeof prospectSignals.$inferSelect
export type ProspectContact = typeof prospectContacts.$inferSelect
export type ProspectAudit = typeof prospectAudits.$inferSelect
export type ProspectPack = typeof prospectPacks.$inferSelect
export type ProspectConfigRow = typeof prospectConfig.$inferSelect
export type ProspectSequence = typeof prospectSequences.$inferSelect
export type ProspectMailbox = typeof prospectMailboxes.$inferSelect
export type ProspectEnrollment = typeof prospectEnrollments.$inferSelect
export type ProspectReply = typeof prospectReplies.$inferSelect
export type ProspectOutboxRow = typeof prospectOutbox.$inferSelect
export type ProspectSendLogRow = typeof prospectSendLog.$inferSelect
export type ProspectSuppressionRow = typeof prospectSuppression.$inferSelect
export type ProspectAiCall = typeof prospectAiCalls.$inferSelect

export type ProspectLeadStatus = (typeof prospectLeadStatus.enumValues)[number]
export type ProspectPriority = (typeof prospectPriority.enumValues)[number]
export type ProspectRunStatus = (typeof prospectRunStatus.enumValues)[number]
export type ProspectTaskType = (typeof prospectTaskType.enumValues)[number]
export type ProspectTaskStatus = (typeof prospectTaskStatus.enumValues)[number]
export type ProspectEventLevel = (typeof prospectEventLevel.enumValues)[number]
export type ProspectConfigKey = (typeof prospectConfigKey.enumValues)[number]
export type ProspectMailboxHealth = (typeof prospectMailboxHealth.enumValues)[number]
export type ProspectEnrollmentStatus =
  (typeof prospectEnrollmentStatus.enumValues)[number]
export type ProspectReplyClassification =
  (typeof prospectReplyClassification.enumValues)[number]
export type ProspectSendResult = (typeof prospectSendResult.enumValues)[number]
export type ProspectSuppressionKind =
  (typeof prospectSuppressionKind.enumValues)[number]
