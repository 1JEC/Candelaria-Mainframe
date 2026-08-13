// ============ MODULE F: LEADS AGENT ============
// New tables for the Leads agent (discovery, enrichment, audit, scoring,
// AI packs, run orchestration, and outbound). Extends MODULE D rather than
// duplicating it — leads/leadEvents/prospectSources/outreachTasks/
// outreachMessages/agentRuns/settings still live in schema.ts.
//
// Cross-file references to `leads`/`users` (defined in schema.ts) use real
// FKs since this file imports schema.ts one-way. The reverse direction
// (schema.ts's outreachMessages.enrollmentId, agentRuns.runId) uses plain
// text columns without a `.references()` FK to avoid a circular import —
// validated at the application layer instead.

import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  unique,
  index,
  varchar,
  decimal,
  bigserial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { leads, users } from "./schema";

// ---------- Run orchestration ----------

export const leadRuns = pgTable("lead_runs", {
  id: text("id").primaryKey(),
  label: varchar("label", { length: 255 }),
  paramsJson: jsonb("params_json"),
  status: varchar("status", { length: 20 }).default("queued"), // queued|running|paused|cancelled|done|failed
  startedBy: text("started_by").references(() => users.id),
  startedAt: timestamp("started_at").defaultNow(),
  finishedAt: timestamp("finished_at"),
  heartbeatAt: timestamp("heartbeat_at").defaultNow(),
  cancelRequested: boolean("cancel_requested").default(false),
  statsJson: jsonb("stats_json"),
  aiCostEur: decimal("ai_cost_eur", { precision: 8, scale: 4 }).default("0"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const leadRunTasks = pgTable(
  "lead_run_tasks",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => leadRuns.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 20 }).notNull(), // discover|enrich|audit|score|ai|pack|send
    target: text("target"), // e.g. a discovered candidate's raw identity, or a lead id
    status: varchar("status", { length: 20 }).default("pending"), // pending|claimed|done|failed
    attempts: integer("attempts").default(0),
    claimedAt: timestamp("claimed_at"),
    finishedAt: timestamp("finished_at"),
    error: text("error"),
    resultJson: jsonb("result_json"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    runIdx: index("run_tasks_run_idx").on(table.runId),
    statusIdx: index("run_tasks_status_idx").on(table.status),
  })
);

export const agentEvents = pgTable(
  "agent_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(), // stream cursor
    runId: text("run_id")
      .notNull()
      .references(() => leadRuns.id, { onDelete: "cascade" }),
    taskId: text("task_id"),
    ts: timestamp("ts").defaultNow(),
    level: varchar("level", { length: 10 }).default("info"), // info|warn|error
    code: varchar("code", { length: 50 }).notNull(),
    messageNl: text("message_nl"),
    payloadJson: jsonb("payload_json"),
    leadId: text("lead_id"),
    durationMs: integer("duration_ms"),
  },
  (table) => ({
    runIdx: index("events_run_idx").on(table.runId, table.id),
  })
);

// ---------- Evidence & enrichment ----------

export const leadSignals = pgTable(
  "lead_signals",
  {
    id: text("id").primaryKey(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 50 }).notNull(),
    labelNl: text("label_nl"),
    evidence: text("evidence"),
    sourceUrl: text("source_url"),
    points: integer("points").default(0),
    capturedAt: timestamp("captured_at").defaultNow(),
  },
  (table) => ({
    leadIdx: index("signals_lead_idx").on(table.leadId),
  })
);

export const leadContacts = pgTable(
  "lead_contacts",
  {
    id: text("id").primaryKey(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    field: varchar("field", { length: 50 }).notNull(), // e.g. email_general, phone_e164, kvk_number
    value: text("value").notNull(),
    sourceUrl: text("source_url").notNull(),
    capturedAt: timestamp("captured_at").defaultNow(),
  },
  (table) => ({
    leadIdx: index("contacts_lead_idx").on(table.leadId),
  })
);

export const leadAudits = pgTable(
  "lead_audits",
  {
    id: text("id").primaryKey(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    runId: text("run_id").references(() => leadRuns.id),
    rawJson: jsonb("raw_json"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    leadIdx: index("audits_lead_idx").on(table.leadId),
  })
);

export const leadPacks = pgTable(
  "lead_packs",
  {
    id: text("id").primaryKey(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    runId: text("run_id").references(() => leadRuns.id),
    email1: text("email_1"),
    email2: text("email_2"),
    email3: text("email_3"),
    dmDraft: text("dm_draft"),
    callScript: text("call_script"),
    evidenceMd: text("evidence_md"),
    generatedAt: timestamp("generated_at").defaultNow(),
    model: varchar("model", { length: 50 }),
    grounded: boolean("grounded").default(true),
  },
  (table) => ({
    leadIdx: index("packs_lead_idx").on(table.leadId),
  })
);

export const pageCache = pgTable("page_cache", {
  urlHash: varchar("url_hash", { length: 64 }).primaryKey(),
  url: text("url").notNull(),
  status: integer("status"),
  fetchedAt: timestamp("fetched_at").defaultNow(),
  body: text("body"),
});

// ---------- Config (versioned, ICP / rubric / thresholds / sources) ----------

export const leadAgentConfig = pgTable(
  "lead_agent_config",
  {
    id: text("id").primaryKey(),
    key: varchar("key", { length: 50 }).notNull(), // icp | rubric | thresholds | crawl | sources | sequences_meta
    version: integer("version").notNull(),
    valueJson: jsonb("value_json").notNull(),
    isActive: boolean("is_active").default(true),
    updatedBy: text("updated_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    keyVersionUnique: unique("config_key_version_unique").on(table.key, table.version),
    keyActiveIdx: index("config_key_active_idx").on(table.key, table.isActive),
  })
);

// ---------- Outbound ----------

export const sequences = pgTable("sequences", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  stepsJson: jsonb("steps_json").notNull(),
  active: boolean("active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const mailboxes = pgTable("mailboxes", {
  id: text("id").primaryKey(),
  address: varchar("address", { length: 255 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }),
  provider: varchar("provider", { length: 50 }),
  dailyCap: integer("daily_cap").default(20),
  sentToday: integer("sent_today").default(0),
  warmupStage: varchar("warmup_stage", { length: 20 }).default("cold"),
  health: varchar("health", { length: 20 }).default("unknown"), // green|amber|red|unknown
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const enrollments = pgTable(
  "enrollments",
  {
    id: text("id").primaryKey(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    sequenceId: text("sequence_id")
      .notNull()
      .references(() => sequences.id),
    mailboxId: text("mailbox_id").references(() => mailboxes.id),
    status: varchar("status", { length: 20 }).default("active"), // active|stopped|completed
    currentStep: integer("current_step").default(0),
    nextSendAt: timestamp("next_send_at"),
    stoppedReason: text("stopped_reason"),
    enrolledBy: text("enrolled_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    leadIdx: index("enrollments_lead_idx").on(table.leadId),
    statusIdx: index("enrollments_status_idx").on(table.status),
  })
);

export const replies = pgTable(
  "replies",
  {
    id: text("id").primaryKey(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    messageId: text("message_id"), // soft ref to outreach_messages.id
    fromAddress: varchar("from_address", { length: 255 }),
    receivedAt: timestamp("received_at").defaultNow(),
    bodyText: text("body_text"),
    classification: varchar("classification", { length: 20 }), // positive|neutral|negative|optout|ooo|bounce
    confidence: decimal("confidence", { precision: 4, scale: 3 }),
    handledBy: text("handled_by"),
    handledAt: timestamp("handled_at"),
  },
  (table) => ({
    leadIdx: index("replies_lead_idx").on(table.leadId),
  })
);

export const outbox = pgTable(
  "outbox",
  {
    id: text("id").primaryKey(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    channel: varchar("channel", { length: 20 }).notNull(),
    payloadJson: jsonb("payload_json").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    sentAt: timestamp("sent_at"), // null while OUTBOUND_ENABLED=false — dry-run rows never get this set
  },
  (table) => ({
    leadIdx: index("outbox_lead_idx").on(table.leadId),
  })
);

export const sendLog = pgTable(
  "send_log",
  {
    id: text("id").primaryKey(),
    mailboxId: text("mailbox_id").references(() => mailboxes.id),
    leadId: text("lead_id").references(() => leads.id),
    ts: timestamp("ts").defaultNow(),
    result: varchar("result", { length: 20 }).notNull(), // sent|blocked|failed
    reason: text("reason"),
  },
  (table) => ({
    mailboxIdx: index("send_log_mailbox_idx").on(table.mailboxId),
  })
);

export const suppression = pgTable(
  "suppression",
  {
    id: text("id").primaryKey(),
    kind: varchar("kind", { length: 20 }).notNull(), // domain|email|phone|kvk|hash
    value: text("value").notNull(),
    source: varchar("source", { length: 50 }), // manual|optout|bounce|forget
    reason: text("reason"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    kindValueUnique: unique("suppression_kind_value_unique").on(table.kind, table.value),
  })
);

// ---------- Relations ----------

export const leadRunsRelations = relations(leadRuns, ({ many }) => ({
  tasks: many(leadRunTasks),
  events: many(agentEvents),
}));

export const leadRunTasksRelations = relations(leadRunTasks, ({ one }) => ({
  run: one(leadRuns, { fields: [leadRunTasks.runId], references: [leadRuns.id] }),
}));

export const agentEventsRelations = relations(agentEvents, ({ one }) => ({
  run: one(leadRuns, { fields: [agentEvents.runId], references: [leadRuns.id] }),
}));

export const leadSignalsRelations = relations(leadSignals, ({ one }) => ({
  lead: one(leads, { fields: [leadSignals.leadId], references: [leads.id] }),
}));

export const leadContactsRelations = relations(leadContacts, ({ one }) => ({
  lead: one(leads, { fields: [leadContacts.leadId], references: [leads.id] }),
}));

export const leadPacksRelations = relations(leadPacks, ({ one }) => ({
  lead: one(leads, { fields: [leadPacks.leadId], references: [leads.id] }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  lead: one(leads, { fields: [enrollments.leadId], references: [leads.id] }),
  sequence: one(sequences, { fields: [enrollments.sequenceId], references: [sequences.id] }),
  mailbox: one(mailboxes, { fields: [enrollments.mailboxId], references: [mailboxes.id] }),
}));

export const repliesRelations = relations(replies, ({ one }) => ({
  lead: one(leads, { fields: [replies.leadId], references: [leads.id] }),
}));
