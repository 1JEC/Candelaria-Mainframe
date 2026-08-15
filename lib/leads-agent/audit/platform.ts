interface PlatformSignature {
  platform: string;
  patterns: RegExp[];
}

const SIGNATURES: PlatformSignature[] = [
  { platform: "WordPress", patterns: [/wp-content/i, /wp-includes/i, /name="generator"\s+content="WordPress/i] },
  { platform: "Wix", patterns: [/static\.wixstatic\.com/i, /name="generator"\s+content="Wix\.com/i] },
  { platform: "Squarespace", patterns: [/static1\.squarespace\.com/i, /squarespace-cdn\.com/i] },
  { platform: "Shopify", patterns: [/cdn\.shopify\.com/i, /Shopify\.theme/i] },
  { platform: "Webflow", patterns: [/data-wf-site=/i, /webflow\.js/i] },
  { platform: "Joomla", patterns: [/name="generator"\s+content="Joomla/i] },
  { platform: "Drupal", patterns: [/name="generator"\s+content="Drupal/i, /\/sites\/default\/files\//i] },
];

/** Best-effort CMS/platform fingerprinting from raw HTML — measured, not guessed: only reports a hit on an actual pattern match. */
export function detectPlatform(html: string): { platform: string; evidence: string } | null {
  for (const sig of SIGNATURES) {
    for (const pattern of sig.patterns) {
      const match = html.match(pattern);
      if (match) return { platform: sig.platform, evidence: match[0] };
    }
  }
  return null;
}

const OUTDATED_MARKERS: { pattern: RegExp; label: string }[] = [
  { pattern: /<embed[^>]+application\/x-shockwave-flash/i, label: "Adobe Flash-embed gevonden" },
  { pattern: /<frameset/i, label: "Verouderde frameset-layout gevonden" },
  { pattern: /jquery[.-]1\.[0-4]\./i, label: "Zeer verouderde jQuery-versie (1.0–1.4) gevonden" },
  { pattern: /name="generator"\s+content="Microsoft FrontPage/i, label: "Gemaakt met Microsoft FrontPage" },
];

/** Only fires on unambiguous outdated/hobbyist markers — never inferred from "no modern CMS detected" (that would be guessing). */
export function detectOutdatedMarker(html: string): { label: string; evidence: string } | null {
  for (const marker of OUTDATED_MARKERS) {
    const match = html.match(marker.pattern);
    if (match) return { label: marker.label, evidence: match[0] };
  }
  return null;
}
