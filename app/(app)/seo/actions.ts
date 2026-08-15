'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db'
import { organizations, seoAudits } from '@/db/schema'
import { recordAudit } from '@/lib/audit'
import { requireMutator } from '@/lib/session'
import { crawlDomain } from '@/lib/leads-agent/crawler'
import { runAudit } from '@/lib/leads-agent/audit'

const urlSchema = z.object({ websiteUrl: z.string().url() })

export async function setWebsiteUrlAction(input: unknown) {
  const user = await requireMutator('seo')
  const { websiteUrl } = urlSchema.parse(input)

  await db.update(organizations).set({ websiteUrl }).where(eq(organizations.id, user.orgId))
  await recordAudit({ orgId: user.orgId, userId: user.id, action: 'seo_website_url_set', entity: 'organization', entityId: user.orgId, meta: { websiteUrl } })

  revalidatePath('/seo')
}

export async function runSeoAuditAction() {
  const user = await requireMutator('seo')

  const [org] = await db.select({ websiteUrl: organizations.websiteUrl }).from(organizations).where(eq(organizations.id, user.orgId))
  if (!org?.websiteUrl) throw new Error('Geen website-URL ingesteld.')

  const crawl = await crawlDomain(org.websiteUrl)
  if (crawl.pages.length === 0) {
    throw new Error('Kon geen pagina\'s ophalen van deze website — controleer de URL.')
  }
  const audit = await runAudit(org.websiteUrl, crawl)

  await db.insert(seoAudits).values({ orgId: user.orgId, url: org.websiteUrl, rawJson: audit as unknown as Record<string, unknown> })
  await recordAudit({ orgId: user.orgId, userId: user.id, action: 'seo_audit_run', entity: 'organization', entityId: user.orgId, meta: { url: org.websiteUrl } })

  revalidatePath('/seo')
}
