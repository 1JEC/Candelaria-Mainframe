import robotsParser from "robots-parser";
import { DEFAULT_CRAWL } from "@/lib/leads-agent/config";

const robotsCache = new Map<string, ReturnType<typeof robotsParser> | null>();

/** §4 rule 12: honour robots.txt always. A fetch/parse failure means "no rules found" -> allow, not block. */
export async function isAllowedByRobots(pageUrl: string): Promise<boolean> {
  const origin = new URL(pageUrl).origin;

  let robots = robotsCache.get(origin);
  if (robots === undefined) {
    robots = await fetchRobots(origin);
    robotsCache.set(origin, robots);
  }
  if (!robots) return true;

  const allowed = robots.isAllowed(pageUrl, DEFAULT_CRAWL.userAgent);
  return allowed !== false; // undefined (no matching rule) counts as allowed
}

async function fetchRobots(origin: string): Promise<ReturnType<typeof robotsParser> | null> {
  const robotsUrl = `${origin}/robots.txt`;
  try {
    const res = await fetch(robotsUrl, {
      headers: { "User-Agent": DEFAULT_CRAWL.userAgent },
      signal: AbortSignal.timeout(DEFAULT_CRAWL.timeoutMs),
    });
    if (!res.ok) return null; // no robots.txt -> nothing disallowed
    const text = await res.text();
    return robotsParser(robotsUrl, text);
  } catch {
    return null;
  }
}
