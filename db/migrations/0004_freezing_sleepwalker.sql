CREATE TYPE "public"."prospect_config_key" AS ENUM('icp', 'rubric', 'thresholds', 'crawl', 'sources', 'outbound_halt', 'golive_checklist');--> statement-breakpoint
CREATE TYPE "public"."prospect_enrollment_status" AS ENUM('active', 'stopped', 'completed');--> statement-breakpoint
CREATE TYPE "public"."prospect_event_level" AS ENUM('info', 'warn', 'error');--> statement-breakpoint
CREATE TYPE "public"."prospect_lead_status" AS ENUM('new', 'contacted', 'qualified', 'packed', 'replied', 'won', 'lost', 'suppressed');--> statement-breakpoint
CREATE TYPE "public"."prospect_mailbox_health" AS ENUM('green', 'amber', 'red', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."prospect_priority" AS ENUM('A', 'B', 'C');--> statement-breakpoint
CREATE TYPE "public"."prospect_reply_classification" AS ENUM('positive', 'neutral', 'negative', 'optout', 'ooo', 'bounce');--> statement-breakpoint
CREATE TYPE "public"."prospect_run_status" AS ENUM('queued', 'running', 'paused', 'cancelled', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."prospect_send_result" AS ENUM('sent', 'blocked', 'failed');--> statement-breakpoint
CREATE TYPE "public"."prospect_suppression_kind" AS ENUM('domain', 'email', 'phone', 'kvk', 'hash');--> statement-breakpoint
CREATE TYPE "public"."prospect_task_status" AS ENUM('pending', 'claimed', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "public"."prospect_task_type" AS ENUM('discover', 'process_candidate');--> statement-breakpoint
CREATE TABLE "prospect_ai_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid,
	"purpose" text NOT NULL,
	"model" text NOT NULL,
	"success" boolean NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_eur" numeric(8, 4),
	"error_message" text,
	"output_summary" text,
	"started_at" timestamp with time zone NOT NULL,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospect_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"run_id" uuid,
	"raw_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospect_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" "prospect_config_key" NOT NULL,
	"version" integer NOT NULL,
	"value_json" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospect_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"field" text NOT NULL,
	"value" text NOT NULL,
	"source_url" text NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospect_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"sequence_id" uuid NOT NULL,
	"mailbox_id" uuid,
	"status" "prospect_enrollment_status" DEFAULT 'active' NOT NULL,
	"current_step" integer DEFAULT 0 NOT NULL,
	"next_send_at" timestamp with time zone,
	"stopped_reason" text,
	"enrolled_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospect_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"run_id" uuid NOT NULL,
	"task_id" uuid,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"level" "prospect_event_level" DEFAULT 'info' NOT NULL,
	"code" text NOT NULL,
	"message_nl" text,
	"payload_json" jsonb,
	"lead_id" uuid,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE TABLE "prospect_leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"name" text,
	"company" text,
	"website" text,
	"phone" text,
	"source" text NOT NULL,
	"source_id" text,
	"status" "prospect_lead_status" DEFAULT 'new' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"score_breakdown" jsonb,
	"tags" text[],
	"notes" text,
	"last_contacted_at" timestamp with time zone,
	"next_follow_up_at" timestamp with time zone,
	"registrable_domain" text,
	"legal_name" text,
	"kvk_number" text,
	"sbi_code" text,
	"sector" text,
	"street" text,
	"postcode" text,
	"city" text,
	"province" text,
	"phone_e164" text,
	"email_general" text,
	"contact_form_url" text,
	"socials_json" jsonb,
	"fit_score" integer DEFAULT 0 NOT NULL,
	"pain_score" integer DEFAULT 0 NOT NULL,
	"total_score" integer DEFAULT 0 NOT NULL,
	"priority" "prospect_priority",
	"recommended_offer" text,
	"recommended_channel" text,
	"first_seen_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"audited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospect_mailboxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"address" text NOT NULL,
	"display_name" text,
	"provider" text,
	"daily_cap" integer DEFAULT 20 NOT NULL,
	"sent_today" integer DEFAULT 0 NOT NULL,
	"warmup_stage" text DEFAULT 'cold' NOT NULL,
	"health" "prospect_mailbox_health" DEFAULT 'unknown' NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospect_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"payload_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "prospect_packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"run_id" uuid,
	"email_1" text,
	"email_2" text,
	"email_3" text,
	"dm_draft" text,
	"call_script" text,
	"evidence_md" text,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"model" text,
	"grounded" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospect_page_cache" (
	"url_hash" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"status" integer,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"body" text
);
--> statement-breakpoint
CREATE TABLE "prospect_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"message_id" uuid,
	"from_address" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"body_text" text,
	"classification" "prospect_reply_classification",
	"confidence" numeric(4, 3),
	"handled_by" uuid,
	"handled_at" timestamp with time zone,
	"prep_brief" text
);
--> statement-breakpoint
CREATE TABLE "prospect_run_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"type" "prospect_task_type" NOT NULL,
	"target" text,
	"status" "prospect_task_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"claimed_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"error" text,
	"result_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospect_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text,
	"params_json" jsonb,
	"status" "prospect_run_status" DEFAULT 'queued' NOT NULL,
	"started_by" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"heartbeat_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancel_requested" boolean DEFAULT false NOT NULL,
	"stats_json" jsonb,
	"ai_cost_eur" numeric(8, 4) DEFAULT '0' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospect_send_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mailbox_id" uuid,
	"lead_id" uuid,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"result" "prospect_send_result" NOT NULL,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "prospect_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"steps_json" jsonb NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospect_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"code" text NOT NULL,
	"label_nl" text,
	"evidence" text,
	"source_url" text,
	"points" integer DEFAULT 0 NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospect_suppression" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "prospect_suppression_kind" NOT NULL,
	"value" text NOT NULL,
	"source" text,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prospect_ai_calls" ADD CONSTRAINT "prospect_ai_calls_run_id_prospect_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."prospect_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_audits" ADD CONSTRAINT "prospect_audits_lead_id_prospect_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."prospect_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_audits" ADD CONSTRAINT "prospect_audits_run_id_prospect_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."prospect_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_config" ADD CONSTRAINT "prospect_config_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_contacts" ADD CONSTRAINT "prospect_contacts_lead_id_prospect_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."prospect_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_enrollments" ADD CONSTRAINT "prospect_enrollments_lead_id_prospect_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."prospect_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_enrollments" ADD CONSTRAINT "prospect_enrollments_sequence_id_prospect_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."prospect_sequences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_enrollments" ADD CONSTRAINT "prospect_enrollments_mailbox_id_prospect_mailboxes_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."prospect_mailboxes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_enrollments" ADD CONSTRAINT "prospect_enrollments_enrolled_by_users_id_fk" FOREIGN KEY ("enrolled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_events" ADD CONSTRAINT "prospect_events_run_id_prospect_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."prospect_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_outbox" ADD CONSTRAINT "prospect_outbox_lead_id_prospect_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."prospect_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_packs" ADD CONSTRAINT "prospect_packs_lead_id_prospect_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."prospect_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_packs" ADD CONSTRAINT "prospect_packs_run_id_prospect_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."prospect_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_replies" ADD CONSTRAINT "prospect_replies_lead_id_prospect_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."prospect_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_replies" ADD CONSTRAINT "prospect_replies_handled_by_users_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_run_tasks" ADD CONSTRAINT "prospect_run_tasks_run_id_prospect_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."prospect_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_runs" ADD CONSTRAINT "prospect_runs_started_by_users_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_send_log" ADD CONSTRAINT "prospect_send_log_mailbox_id_prospect_mailboxes_id_fk" FOREIGN KEY ("mailbox_id") REFERENCES "public"."prospect_mailboxes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_send_log" ADD CONSTRAINT "prospect_send_log_lead_id_prospect_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."prospect_leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_signals" ADD CONSTRAINT "prospect_signals_lead_id_prospect_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."prospect_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prospect_ai_calls_run_idx" ON "prospect_ai_calls" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "prospect_ai_calls_created_idx" ON "prospect_ai_calls" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "prospect_audits_lead_idx" ON "prospect_audits" USING btree ("lead_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prospect_config_key_version_idx" ON "prospect_config" USING btree ("key","version");--> statement-breakpoint
CREATE INDEX "prospect_config_key_active_idx" ON "prospect_config" USING btree ("key","is_active");--> statement-breakpoint
CREATE INDEX "prospect_contacts_lead_idx" ON "prospect_contacts" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "prospect_enrollments_lead_idx" ON "prospect_enrollments" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "prospect_enrollments_status_idx" ON "prospect_enrollments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "prospect_events_run_idx" ON "prospect_events" USING btree ("run_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "prospect_leads_email_idx" ON "prospect_leads" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "prospect_leads_domain_idx" ON "prospect_leads" USING btree ("registrable_domain");--> statement-breakpoint
CREATE INDEX "prospect_leads_status_idx" ON "prospect_leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "prospect_leads_total_score_idx" ON "prospect_leads" USING btree ("total_score");--> statement-breakpoint
CREATE UNIQUE INDEX "prospect_mailboxes_address_idx" ON "prospect_mailboxes" USING btree ("address");--> statement-breakpoint
CREATE INDEX "prospect_outbox_lead_idx" ON "prospect_outbox" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "prospect_packs_lead_idx" ON "prospect_packs" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "prospect_replies_lead_idx" ON "prospect_replies" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "prospect_run_tasks_run_idx" ON "prospect_run_tasks" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "prospect_run_tasks_status_idx" ON "prospect_run_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "prospect_send_log_mailbox_idx" ON "prospect_send_log" USING btree ("mailbox_id");--> statement-breakpoint
CREATE INDEX "prospect_signals_lead_idx" ON "prospect_signals" USING btree ("lead_id");--> statement-breakpoint
CREATE UNIQUE INDEX "prospect_suppression_kind_value_idx" ON "prospect_suppression" USING btree ("kind","value");