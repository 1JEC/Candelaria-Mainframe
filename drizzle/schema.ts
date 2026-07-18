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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============ AUTH & USERS ============

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  passwordHash: text("password_hash"),
  totpSecret: text("totp_secret"),
  role: varchar("role", { length: 50 }).default("user"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const integrationCredentials = pgTable(
  "integration_credentials",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 50 }).notNull(),
    encryptedToken: text("encrypted_token").notNull(),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at"),
    metadata: jsonb("metadata"),
    isActive: boolean("is_active").default(true),
    lastSyncedAt: timestamp("last_synced_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userProviderUnique: unique("user_provider_unique").on(
      table.userId,
      table.provider
    ),
  })
);

export const settings = pgTable("settings", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  brand: jsonb("brand"),
  autoPublishCategories: text("auto_publish_categories").array(),
  outreachApprovalRequired: boolean("outreach_approval_required").default(true),
  emailAutoReplyCategories: text("email_auto_reply_categories").array(),
  suppressionListDomains: text("suppression_list_domains").array(),
  suppressionListEmails: text("suppression_list_emails").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============ MODULE A: SOCIAL PUBLISHER ============

export const socialAccounts = pgTable("social_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  platform: varchar("platform", { length: 50 }).notNull(),
  accountId: varchar("account_id", { length: 255 }).notNull(),
  accountName: varchar("account_name", { length: 255 }),
  profileUrl: text("profile_url"),
  isActive: boolean("is_active").default(true),
  credentialId: text("credential_id").references(
    () => integrationCredentials.id
  ),
  createdAt: timestamp("created_at").defaultNow(),
});

export const posts = pgTable(
  "posts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    platforms: text("platforms").array(),
    status: varchar("status", { length: 50 }).default("draft"),
    contentType: varchar("content_type", { length: 50 }),
    approvedAt: timestamp("approved_at"),
    approvedBy: text("approved_by").references(() => users.id),
    publishedAt: timestamp("published_at"),
    scheduledFor: timestamp("scheduled_for"),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userIdx: index("posts_user_idx").on(table.userId),
    statusIdx: index("posts_status_idx").on(table.status),
  })
);

export const postVersions = pgTable("post_versions", {
  id: text("id").primaryKey(),
  postId: text("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  version: integer("version").default(1),
  caption: text("caption"),
  hashtags: text("hashtags").array(),
  mediaUrls: text("media_urls").array(),
  callToAction: varchar("call_to_action", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const postInsightsDaily = pgTable(
  "post_insights_daily",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    platform: varchar("platform", { length: 50 }).notNull(),
    date: timestamp("date").notNull(),
    impressions: integer("impressions").default(0),
    reach: integer("reach").default(0),
    likes: integer("likes").default(0),
    comments: integer("comments").default(0),
    shares: integer("shares").default(0),
    saves: integer("saves").default(0),
    clicks: integer("clicks").default(0),
    videoViews: integer("video_views"),
    profileVisits: integer("profile_visits"),
    followerGrowth: integer("follower_growth"),
    syncedAt: timestamp("synced_at").defaultNow(),
  },
  (table) => ({
    postDatePlatformUnique: unique("post_date_platform_unique").on(
      table.postId,
      table.date,
      table.platform
    ),
  })
);

export const socialComments = pgTable(
  "social_comments",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    platform: varchar("platform", { length: 50 }).notNull(),
    platformCommentId: varchar("platform_comment_id", { length: 255 }).notNull(),
    authorId: varchar("author_id", { length: 255 }),
    authorName: varchar("author_name", { length: 255 }),
    authorProfileUrl: text("author_profile_url"),
    text: text("text"),
    draftReply: text("draft_reply"),
    replySent: boolean("reply_sent").default(false),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    postIdx: index("comments_post_idx").on(table.postId),
  })
);

export const socialAccountsDailyStats = pgTable(
  "social_accounts_daily_stats",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => socialAccounts.id, { onDelete: "cascade" }),
    date: timestamp("date").notNull(),
    followers: integer("followers"),
    followersGrowth: integer("followers_growth"),
    impressions: integer("impressions"),
    reach: integer("reach"),
    syncedAt: timestamp("synced_at").defaultNow(),
  },
  (table) => ({
    accountDateUnique: unique("account_date_unique").on(table.accountId, table.date),
  })
);

// ============ MODULE B: WEBSITE INTAKE ============

export const intakeSubmissions = pgTable(
  "intake_submissions",
  {
    id: text("id").primaryKey(),
    formType: varchar("form_type", { length: 50 }).notNull(),
    source: varchar("source", { length: 50 }).default("website"),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }),
    company: varchar("company", { length: 255 }),
    website: text("website"),
    phone: varchar("phone", { length: 20 }),
    message: text("message"),
    payload: jsonb("payload"),
    convertedToLeadId: text("converted_to_lead_id"),
    spamScore: integer("spam_score").default(0),
    isSpam: boolean("is_spam").default(false),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    emailIdx: index("submissions_email_idx").on(table.email),
    spamIdx: index("submissions_spam_idx").on(table.isSpam),
  })
);

// ============ MODULE C: MAILBOX ============

export const emails = pgTable(
  "emails",
  {
    id: text("id").primaryKey(),
    messageId: varchar("message_id", { length: 255 }).unique(),
    threadId: varchar("thread_id", { length: 255 }),
    from: varchar("from", { length: 255 }).notNull(),
    to: varchar("to", { length: 255 }).notNull(),
    cc: text("cc").array(),
    bcc: text("bcc").array(),
    subject: varchar("subject", { length: 255 }),
    bodyPlain: text("body_plain"),
    bodyHtml: text("body_html"),
    isInbound: boolean("is_inbound").default(true),
    isSent: boolean("is_sent").default(false),
    folder: varchar("folder", { length: 100 }).default("inbox"),
    labels: text("labels").array(),
    flags: text("flags").array(),
    aiTriageCategory: varchar("ai_triage_category", { length: 50 }),
    aiTriagePriority: integer("ai_triage_priority"),
    linkedLeadId: text("linked_lead_id"),
    draftReplyId: text("draft_reply_id"),
    replySentAt: timestamp("reply_sent_at"),
    hasAttachments: boolean("has_attachments").default(false),
    attachmentUrls: text("attachment_urls").array(),
    receivedAt: timestamp("received_at"),
    createdAt: timestamp("created_at").defaultNow(),
    syncedAt: timestamp("synced_at").defaultNow(),
  },
  (table) => ({
    threadIdx: index("emails_thread_idx").on(table.threadId),
    fromIdx: index("emails_from_idx").on(table.from),
    leadIdx: index("emails_lead_idx").on(table.linkedLeadId),
  })
);

export const emailDrafts = pgTable("email_drafts", {
  id: text("id").primaryKey(),
  emailId: text("email_id")
    .notNull()
    .references(() => emails.id, { onDelete: "cascade" }),
  generatedBy: varchar("generated_by", { length: 50 }).default("ai"),
  to: varchar("to", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }),
  bodyPlain: text("body_plain"),
  status: varchar("status", { length: 50 }).default("draft"),
  approvedAt: timestamp("approved_at"),
  sentAt: timestamp("sent_at"),
  sentVia: varchar("sent_via", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============ MODULE D: LEAD-ENGINE ============

export const leads = pgTable(
  "leads",
  {
    id: text("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }),
    company: varchar("company", { length: 255 }),
    website: text("website"),
    phone: varchar("phone", { length: 20 }),
    linkedinUrl: text("linkedin_url"),
    source: varchar("source", { length: 50 }).notNull(),
    sourceId: text("source_id"),
    status: varchar("status", { length: 50 }).default("new"),
    score: integer("score").default(0),
    scoreBreakdown: jsonb("score_breakdown"),
    tags: text("tags").array(),
    notes: text("notes"),
    lastContactedAt: timestamp("last_contacted_at"),
    nextFollowUpAt: timestamp("next_follow_up_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    emailUnique: unique("leads_email_unique").on(table.email),
    statusIdx: index("leads_status_idx").on(table.status),
    scoreIdx: index("leads_score_idx").on(table.score),
  })
);

export const leadEvents = pgTable(
  "lead_events",
  {
    id: text("id").primaryKey(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull(),
    description: text("description"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    leadIdx: index("events_lead_idx").on(table.leadId),
  })
);

export const prospectSources = pgTable("prospect_sources", {
  id: text("id").primaryKey(),
  leadId: text("lead_id")
    .notNull()
    .unique()
    .references(() => leads.id, { onDelete: "cascade" }),
  sourceMethod: varchar("source_method", { length: 50 }).notNull(),
  rawData: jsonb("raw_data"),
  foundAt: text("found_at"),
  scoringReasoning: text("scoring_reasoning"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const outreachTasks = pgTable(
  "outreach_tasks",
  {
    id: text("id").primaryKey(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    taskType: varchar("task_type", { length: 50 }).notNull(),
    taskContent: jsonb("task_content"),
    status: varchar("status", { length: 50 }).default("pending"),
    completedAt: timestamp("completed_at"),
    completedBy: text("completed_by").references(() => users.id),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    leadIdx: index("tasks_lead_idx").on(table.leadId),
    statusIdx: index("tasks_status_idx").on(table.status),
  })
);

export const outreachMessages = pgTable(
  "outreach_messages",
  {
    id: text("id").primaryKey(),
    leadId: text("lead_id")
      .notNull()
      .references(() => leads.id, { onDelete: "cascade" }),
    channel: varchar("channel", { length: 50 }).notNull(),
    to: varchar("to", { length: 255 }).notNull(),
    subject: text("subject"),
    body: text("body"),
    sentAt: timestamp("sent_at"),
    sentBy: text("sent_by").references(() => users.id),
    bounced: boolean("bounced").default(false),
    bouncedAt: timestamp("bounced_at"),
    optedOut: boolean("opted_out").default(false),
    optedOutAt: timestamp("opted_out_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    leadIdx: index("outreach_lead_idx").on(table.leadId),
    sentIdx: index("outreach_sent_idx").on(table.sentAt),
  })
);

// ============ MODULE E: DATALOG & AUDIT ============

export const agentRuns = pgTable(
  "agent_runs",
  {
    id: text("id").primaryKey(),
    agentType: varchar("agent_type", { length: 50 }).notNull(),
    module: varchar("module", { length: 50 }).notNull(),
    inputSummary: text("input_summary"),
    toolsCalled: text("tools_called").array(),
    outputSummary: text("output_summary"),
    success: boolean("success").default(true),
    errorMessage: text("error_message"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    estimatedCost: decimal("estimated_cost", { precision: 8, scale: 4 }),
    startedAt: timestamp("started_at").defaultNow(),
    completedAt: timestamp("completed_at"),
    duration: integer("duration"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    typeIdx: index("runs_type_idx").on(table.agentType),
  })
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id),
    action: varchar("action", { length: 100 }).notNull(),
    resourceType: varchar("resource_type", { length: 50 }),
    resourceId: text("resource_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    ip: varchar("ip", { length: 45 }),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    actionIdx: index("audit_action_idx").on(table.action),
    userIdx: index("audit_user_idx").on(table.userId),
    timestampIdx: index("audit_timestamp_idx").on(table.createdAt),
  })
);

// ============ RELATIONS ============

export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  integrationCredentials: many(integrationCredentials),
  settings: one(settings),
  posts: many(posts),
  leads: many(leads),
  auditLogs: many(auditLog),
}));

export const postsRelations = relations(posts, ({ many, one }) => ({
  versions: many(postVersions),
  insights: many(postInsightsDaily),
  comments: many(socialComments),
  approvedBy: one(users, {
    fields: [posts.approvedBy],
    references: [users.id],
  }),
}));

export const leadsRelations = relations(leads, ({ many, one }) => ({
  events: many(leadEvents),
  prospectSource: one(prospectSources),
  outreachTasks: many(outreachTasks),
  outreachMessages: many(outreachMessages),
  emails: many(emails),
}));

export const emailsRelations = relations(emails, ({ many, one }) => ({
  drafts: many(emailDrafts),
  linkedLead: one(leads, {
    fields: [emails.linkedLeadId],
    references: [leads.id],
  }),
}));

export const intakeSubmissionsRelations = relations(
  intakeSubmissions,
  ({ one }) => ({
    convertedLead: one(leads, {
      fields: [intakeSubmissions.convertedToLeadId],
      references: [leads.id],
    }),
  })
);
