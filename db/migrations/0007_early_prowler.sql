CREATE TYPE "public"."prospect_risk_level" AS ENUM('laag', 'verhoogd', 'hoog');--> statement-breakpoint
ALTER TABLE "prospect_leads" ADD COLUMN "business_risk" "prospect_risk_level";--> statement-breakpoint
ALTER TABLE "prospect_leads" ADD COLUMN "business_risk_score" integer;--> statement-breakpoint
ALTER TABLE "prospect_leads" ADD COLUMN "engagement_risk" "prospect_risk_level";--> statement-breakpoint
ALTER TABLE "prospect_leads" ADD COLUMN "engagement_risk_score" integer;--> statement-breakpoint
ALTER TABLE "prospect_leads" ADD COLUMN "risk_headline_nl" text;--> statement-breakpoint
ALTER TABLE "prospect_leads" ADD COLUMN "risk_json" jsonb;--> statement-breakpoint
ALTER TABLE "prospect_leads" ADD COLUMN "risk_assessed_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "prospect_leads_business_risk_idx" ON "prospect_leads" USING btree ("business_risk");