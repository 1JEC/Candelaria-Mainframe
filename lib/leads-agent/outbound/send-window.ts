const SEND_WINDOW_START = process.env.SEND_WINDOW_START ?? "08:30";
const SEND_WINDOW_END = process.env.SEND_WINDOW_END ?? "17:30";
const SEND_TIMEZONE = process.env.SEND_TIMEZONE ?? "Europe/Amsterdam";

/**
 * Dutch public holidays, computed rather than a literal per-year table —
 * "hard-coded" in the sense the spec means (deterministic, no external
 * lookup, documented here), but as a rule set so it never goes stale the
 * way a fixed date table would. Gauss's Easter algorithm (Meeus/Jones/
 * Butcher variant) derives the four moveable holidays; the rest are fixed
 * calendar dates. Bevrijdingsdag (May 5) is included even though it's
 * only a statutory day off every 5 years for most sectors — being
 * conservative about not sending mail beats being wrong about it.
 */
function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dutchPublicHolidays(year: number): Set<string> {
  const easter = new Date(Date.UTC(year, easterSunday(year).month - 1, easterSunday(year).day));
  const holidays = [
    `${year}-01-01`, // Nieuwjaarsdag
    ymd(addDays(easter, 1)), // Tweede Paasdag
    `${year}-04-27`, // Koningsdag
    `${year}-05-05`, // Bevrijdingsdag
    ymd(addDays(easter, 39)), // Hemelvaartsdag
    ymd(addDays(easter, 49)), // Eerste Pinksterdag (a Sunday — included for completeness)
    ymd(addDays(easter, 50)), // Tweede Pinksterdag
    `${year}-12-25`, // Eerste Kerstdag
    `${year}-12-26`, // Tweede Kerstdag
  ];
  return new Set(holidays);
}

function partsInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: parts.weekday, // "Mon".."Sun"
  };
}

export interface SendWindowCheck {
  ok: boolean;
  reason?: string;
}

/** §9 gate 4 (window portion): Mon-Fri, within SEND_WINDOW_START..END, not a Dutch public holiday, all in Europe/Amsterdam local time. */
export function checkSendWindow(now: Date = new Date()): SendWindowCheck {
  const { dateStr, hour, minute, weekday } = partsInTimeZone(now, SEND_TIMEZONE);

  if (weekday === "Sat" || weekday === "Sun") {
    return { ok: false, reason: "Buiten verzendvenster: weekend." };
  }

  const year = Number(dateStr.slice(0, 4));
  if (dutchPublicHolidays(year).has(dateStr)) {
    return { ok: false, reason: "Buiten verzendvenster: Nederlandse feestdag." };
  }

  const [startH, startM] = SEND_WINDOW_START.split(":").map(Number);
  const [endH, endM] = SEND_WINDOW_END.split(":").map(Number);
  const nowMinutes = hour * 60 + minute;
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (nowMinutes < startMinutes || nowMinutes >= endMinutes) {
    return { ok: false, reason: `Buiten verzendvenster: ${SEND_WINDOW_START}-${SEND_WINDOW_END} (${SEND_TIMEZONE}).` };
  }

  return { ok: true };
}

/** 4-15 min jitter between sends from one mailbox, per §9 gate 4. */
export function jitterMs(): number {
  const minMs = 4 * 60 * 1000;
  const maxMs = 15 * 60 * 1000;
  return minMs + Math.random() * (maxMs - minMs);
}
