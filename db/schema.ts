import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
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
