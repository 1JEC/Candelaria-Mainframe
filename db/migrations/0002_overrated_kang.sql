CREATE TYPE "public"."device_type" AS ENUM('mobile', 'tablet', 'desktop');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'booked', 'won', 'lost');--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text DEFAULT 'candelaria-website' NOT NULL,
	"form_name" text DEFAULT 'book-audit-call' NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"company" text,
	"website_url" text,
	"message" text,
	"payload" jsonb NOT NULL,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"ip_address" text,
	"ip_country" text,
	"ip_city" text,
	"visitor_hash" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pageviews" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"site" text DEFAULT 'candelaria-agency' NOT NULL,
	"path" text NOT NULL,
	"referrer" text,
	"referrer_domain" text,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"country" text,
	"city" text,
	"region" text,
	"ip_truncated" text,
	"visitor_hash" text,
	"session_id" text,
	"device_type" "device_type",
	"browser" text,
	"os" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "leads_created_idx" ON "leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leads_visitor_idx" ON "leads" USING btree ("visitor_hash");--> statement-breakpoint
CREATE INDEX "leads_ip_created_idx" ON "leads" USING btree ("ip_address","created_at");--> statement-breakpoint
CREATE INDEX "pageviews_created_idx" ON "pageviews" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "pageviews_country_idx" ON "pageviews" USING btree ("country");--> statement-breakpoint
CREATE INDEX "pageviews_session_idx" ON "pageviews" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "pageviews_visitor_idx" ON "pageviews" USING btree ("visitor_hash");