const PSI_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export interface PsiResult {
  performanceScore: number | null; // 0-100
  seoScore: number | null;
}

export async function runPageSpeedInsights(pageUrl: string): Promise<PsiResult | null> {
  const apiKey = process.env.PAGESPEED_API_KEY;
  if (!apiKey) return null; // disables itself gracefully — no key, no call

  try {
    const url = `${PSI_URL}?url=${encodeURIComponent(pageUrl)}&key=${apiKey}&category=performance&category=seo&strategy=mobile`;
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) return null;
    const json = await res.json();
    const categories = json?.lighthouseResult?.categories;
    return {
      performanceScore: categories?.performance?.score != null ? Math.round(categories.performance.score * 100) : null,
      seoScore: categories?.seo?.score != null ? Math.round(categories.seo.score * 100) : null,
    };
  } catch {
    return null;
  }
}
