import type { DeviceType } from '@/db/schema'

/**
 * Minimal, dependency-free user-agent parser. Not exhaustive — good enough
 * for "mostly Chrome/Safari/Firefox on mostly Windows/macOS/iOS/Android"
 * analytics breakdowns, which covers the overwhelming majority of real
 * traffic. Unrecognised patterns fall back to null rather than a guess.
 */

export type ParsedUa = {
  deviceType: DeviceType | null
  browser: string | null
  os: string | null
}

const BOT_RE = /bot|crawler|spider|preview|headless|curl|wget|python-requests/i

export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true // no UA at all is treated as non-human traffic
  return BOT_RE.test(userAgent)
}

export function parseUserAgent(userAgent: string | null): ParsedUa {
  if (!userAgent) return { deviceType: null, browser: null, os: null }
  const ua = userAgent

  return {
    deviceType: parseDeviceType(ua),
    browser: parseBrowser(ua),
    os: parseOs(ua),
  }
}

function parseDeviceType(ua: string): DeviceType {
  if (/iPad|Tablet(?!.*Mobile)/i.test(ua)) return 'tablet'
  if (/Mobi|Android(?=.*Mobile)|iPhone|iPod/i.test(ua)) return 'mobile'
  return 'desktop'
}

function parseBrowser(ua: string): string | null {
  // Order matters: many browsers include "Safari" or "Chrome" tokens for
  // engine-compat reasons, so the more specific match must win.
  if (/EdgA?\//i.test(ua)) return 'Edge'
  if (/OPR\/|Opera/i.test(ua)) return 'Opera'
  if (/SamsungBrowser/i.test(ua)) return 'Samsung Internet'
  if (/FxiOS/i.test(ua)) return 'Firefox'
  if (/CriOS/i.test(ua)) return 'Chrome'
  if (/Firefox\//i.test(ua)) return 'Firefox'
  if (/Chrome\//i.test(ua)) return 'Chrome'
  if (/Safari\//i.test(ua) && /Version\//i.test(ua)) return 'Safari'
  return null
}

function parseOs(ua: string): string | null {
  if (/Windows NT/i.test(ua)) return 'Windows'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS'
  if (/Mac OS X/i.test(ua)) return 'macOS'
  if (/Android/i.test(ua)) return 'Android'
  if (/CrOS/i.test(ua)) return 'ChromeOS'
  if (/Linux/i.test(ua)) return 'Linux'
  return null
}
