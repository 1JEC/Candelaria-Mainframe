import { describe, expect, it } from 'vitest'

import { assessRisk } from './index'
import type { RiskInput } from './types'
import type { AuditRaw } from '@/lib/leads-agent/audit'
import type { ExtractedContacts } from '@/lib/leads-agent/extraction/contacts'

const DISCOVERY_URL = 'https://www.openstreetmap.org/node/123'
const HOMEPAGE = 'https://voorbeeldbedrijf.nl/'

/** A healthy, modern site — every risk factor deliberately absent. Tests override only the field under test. */
function healthyAudit(overrides: Partial<AuditRaw> = {}): AuditRaw {
  return {
    url: HOMEPAGE,
    httpsValid: true,
    httpStatus: 200,
    loadTimeMs: 900,
    mobileViewport: true,
    platform: 'WordPress',
    platformEvidence: 'wp-content',
    outdatedMarker: null,
    outdatedMarkerEvidence: null,
    titlePresent: true,
    titleLength: 40,
    metaDescriptionPresent: true,
    metaDescriptionLength: 120,
    h1Present: true,
    h1Count: 1,
    schemaOrgTypes: ['LocalBusiness'],
    analyticsDetected: ['google_analytics'],
    hasContactForm: true,
    hasChatOrWhatsapp: true,
    hasOnlineBooking: false,
    hasWebshop: false,
    brokenLinksSample: [{ url: `${HOMEPAGE}contact`, status: 200 }],
    imageCount: 10,
    imagesWithoutAlt: 0,
    htmlLangPresent: true,
    lastContentYearGuess: new Date().getFullYear(),
    psi: null,
    auditedAt: new Date().toISOString(),
    ...overrides,
  }
}

function fullContacts(overrides: Partial<ExtractedContacts> = {}): ExtractedContacts {
  return {
    emailGeneral: { field: 'email_general', value: 'info@voorbeeldbedrijf.nl', sourceUrl: HOMEPAGE },
    phoneE164: { field: 'phone_e164', value: '+31701234567', sourceUrl: HOMEPAGE },
    kvkNumber: { field: 'kvk_number', value: '12345678', sourceUrl: HOMEPAGE },
    contactFormUrl: { field: 'contact_form_url', value: `${HOMEPAGE}contact`, sourceUrl: HOMEPAGE },
    socials: [],
    hasChatOrWhatsapp: true,
    hasContactForm: true,
    ...overrides,
  }
}

function baseInput(overrides: Partial<RiskInput> = {}): RiskInput {
  return {
    sector: 'tandarts',
    discoverySourceUrl: DISCOVERY_URL,
    hasWebsite: true,
    homepageUrl: HOMEPAGE,
    audit: healthyAudit(),
    contacts: fullContacts(),
    crawledPageUrls: [HOMEPAGE, `${HOMEPAGE}contact`, `${HOMEPAGE}privacyverklaring`],
    ...overrides,
  }
}

function codes(assessment: ReturnType<typeof assessRisk>): string[] {
  return assessment.factors.map((f) => f.code)
}

describe('assessRisk — business axis', () => {
  it('reports low risk for a healthy site with a privacy page', () => {
    const result = assessRisk(baseInput())
    expect(result.businessRisk).toBe('laag')
    expect(result.businessRiskScore).toBe(0)
    expect(result.headlineNl).toContain("Geen risico's met bewijs")
  })

  it('treats an unreachable site as high risk and stops evaluating further business factors', () => {
    const result = assessRisk(baseInput({ hasWebsite: true, audit: undefined }))
    expect(result.businessRisk).toBe('hoog')
    expect(codes(result)).toContain('risk_site_unreachable')
    expect(codes(result)).not.toContain('risk_no_https')
    expect(codes(result)).not.toContain('risk_no_mobile_viewport')
  })

  it('stacks the webshop factor on top of missing HTTPS', () => {
    const result = assessRisk(baseInput({ audit: healthyAudit({ httpsValid: false, hasWebshop: true }) }))
    expect(codes(result)).toContain('risk_no_https')
    expect(codes(result)).toContain('risk_webshop_without_https')
    expect(result.businessRisk).toBe('hoog')
  })

  it('does not fire the webshop factor when HTTPS is valid', () => {
    const result = assessRisk(baseInput({ audit: healthyAudit({ hasWebshop: true }) }))
    expect(codes(result)).not.toContain('risk_webshop_without_https')
  })

  it('flags tracking without a privacy page, and stays silent when one was crawled', () => {
    const withoutPrivacy = assessRisk(baseInput({ crawledPageUrls: [HOMEPAGE, `${HOMEPAGE}contact`] }))
    expect(codes(withoutPrivacy)).toContain('risk_analytics_without_privacy_page')

    const withPrivacy = assessRisk(baseInput())
    expect(codes(withPrivacy)).not.toContain('risk_analytics_without_privacy_page')
  })

  it('does not flag a missing privacy page when no tracking was detected', () => {
    const result = assessRisk(
      baseInput({ audit: healthyAudit({ analyticsDetected: [] }), crawledPageUrls: [HOMEPAGE] }),
    )
    expect(codes(result)).not.toContain('risk_analytics_without_privacy_page')
  })

  it('carries evidence and a source URL on every factor', () => {
    const result = assessRisk(
      baseInput({ audit: healthyAudit({ httpsValid: false, outdatedMarker: 'Adobe Flash-embed gevonden', outdatedMarkerEvidence: '<embed' }) }),
    )
    expect(result.factors.length).toBeGreaterThan(0)
    for (const factor of result.factors) {
      expect(factor.evidence.length).toBeGreaterThan(0)
      expect(factor.sourceUrl).toMatch(/^https?:\/\//)
    }
  })
})

describe('assessRisk — DNS factors', () => {
  const dnsAllBad = [
    { name: 'MX', status: 'red' as const, detail: 'Geen MX-records gevonden.' },
    { name: 'SPF', status: 'red' as const, detail: 'Geen SPF-record gevonden.' },
    { name: 'DKIM', status: 'amber' as const, detail: 'Selector "default" resolvet niet.' },
    { name: 'DMARC', status: 'red' as const, detail: 'Geen DMARC-record gevonden.' },
  ]

  it('scores missing DMARC, SPF and MX when DNS was checked', () => {
    const result = assessRisk(baseInput({ dns: dnsAllBad }))
    expect(codes(result)).toEqual(expect.arrayContaining(['risk_no_dmarc', 'risk_weak_spf', 'risk_no_mx']))
  })

  it('never derives a mail factor from a DKIM selector miss', () => {
    const dnsOnlyDkimAmber = [
      { name: 'MX', status: 'green' as const, detail: 'mx.example.nl' },
      { name: 'SPF', status: 'green' as const, detail: 'v=spf1 -all (±1 lookups)' },
      { name: 'DKIM', status: 'amber' as const, detail: 'Selector "default" resolvet niet.' },
      { name: 'DMARC', status: 'green' as const, detail: 'Policy: p=reject' },
    ]
    const result = assessRisk(baseInput({ dns: dnsOnlyDkimAmber }))
    expect(result.factors.filter((f) => f.category === 'security')).toHaveLength(0)
  })

  it('skips mail factors entirely when DNS was not checked', () => {
    const result = assessRisk(baseInput({ dns: undefined }))
    expect(codes(result)).not.toContain('risk_no_dmarc')
    expect(result.unknowns.some((u) => u.includes('DNS'))).toBe(true)
  })
})

describe('assessRisk — engagement axis', () => {
  it('flags a disqualified sector as high engagement risk', () => {
    const result = assessRisk(baseInput({ sector: 'webbureau' }))
    expect(codes(result)).toContain('risk_sector_disqualified')
    expect(result.engagementRisk).toBe('hoog')
  })

  it('flags a prospect with no reachable channel', () => {
    const result = assessRisk(baseInput({ contacts: { socials: [], hasChatOrWhatsapp: false, hasContactForm: false } }))
    expect(codes(result)).toContain('risk_no_reachable_channel')
  })

  it('flags an already-modern site as a weak opportunity', () => {
    const result = assessRisk(baseInput())
    expect(codes(result)).toContain('risk_low_pain_modern_site')
    expect(result.businessRisk).toBe('laag')
  })

  it('does not call a slow site modern', () => {
    const result = assessRisk(baseInput({ audit: healthyAudit({ loadTimeMs: 6000 }) }))
    expect(codes(result)).not.toContain('risk_low_pain_modern_site')
  })

  it('flags a possibly-inactive company only when site, phone and email are all absent', () => {
    const inactive = assessRisk(
      baseInput({ audit: undefined, contacts: { socials: [], hasChatOrWhatsapp: false, hasContactForm: false } }),
    )
    expect(codes(inactive)).toContain('risk_possibly_inactive')

    const reachable = assessRisk(baseInput({ audit: undefined }))
    expect(codes(reachable)).not.toContain('risk_possibly_inactive')
  })

  it('flags a closed builder platform but not WordPress', () => {
    const wix = assessRisk(baseInput({ audit: healthyAudit({ platform: 'Wix', platformEvidence: 'static.wixstatic.com' }) }))
    expect(codes(wix)).toContain('risk_closed_platform')

    const wordpress = assessRisk(baseInput())
    expect(codes(wordpress)).not.toContain('risk_closed_platform')
  })

  it('keeps the two axes independent', () => {
    const result = assessRisk(baseInput({ sector: 'webbureau' }))
    expect(result.engagementRisk).toBe('hoog')
    expect(result.businessRisk).toBe('laag')
  })
})

describe('assessRisk — honesty guarantees', () => {
  it('always reports that credit standing was not measured', () => {
    const result = assessRisk(baseInput())
    expect(result.unknowns.some((u) => u.includes('Kredietwaardigheid'))).toBe(true)
  })

  it('reports an unreachable website as an unknown, not as a clean bill of health', () => {
    const result = assessRisk(baseInput({ audit: undefined }))
    expect(result.unknowns.some((u) => u.includes('onbereikbaar'))).toBe(true)
  })

  it('caps each axis at 100', () => {
    const result = assessRisk(
      baseInput({
        sector: 'webbureau',
        audit: healthyAudit({
          httpsValid: false,
          hasWebshop: true,
          httpStatus: 503,
          outdatedMarker: 'Adobe Flash-embed gevonden',
          outdatedMarkerEvidence: '<embed',
          mobileViewport: false,
          lastContentYearGuess: 2011,
          brokenLinksSample: [{ url: `${HOMEPAGE}dood`, status: 404 }],
        }),
        contacts: { socials: [], hasChatOrWhatsapp: false, hasContactForm: false },
        crawledPageUrls: [HOMEPAGE],
        dns: [
          { name: 'MX', status: 'red', detail: 'Geen MX-records gevonden.' },
          { name: 'SPF', status: 'red', detail: 'Geen SPF-record gevonden.' },
          { name: 'DMARC', status: 'red', detail: 'Geen DMARC-record gevonden.' },
        ],
      }),
    )
    expect(result.businessRiskScore).toBeLessThanOrEqual(100)
    expect(result.engagementRiskScore).toBeLessThanOrEqual(100)
    expect(result.businessRisk).toBe('hoog')
  })

  it('builds the headline from its own factors, listing the heaviest first', () => {
    const result = assessRisk(baseInput({ audit: healthyAudit({ httpsValid: false, mobileViewport: false }) }))
    // 30 (no HTTPS) + 8 (no viewport) = 38, one factor short of "hoog" at 40 —
    // a single serious defect should not by itself max out the axis.
    expect(result.businessRiskScore).toBe(38)
    expect(result.headlineNl).toContain('Risico verhoogd')
    expect(result.headlineNl.toLowerCase()).toContain('geen geldige https')
    expect(result.headlineNl.indexOf('geen geldige https')).toBeLessThan(result.headlineNl.indexOf('onbruikbaar op mobiel'))
  })
})
