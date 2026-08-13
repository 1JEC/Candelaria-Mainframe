import * as cheerio from "cheerio";
// Import metadata explicitly and call the "custom" build's signature — the
// convenience "/max" build's internal metadata wiring breaks under this
// app's module graph (throws "Cannot read properties of undefined" from
// inside isSupportedCountry, reproducibly, only when reached through the
// crawler's import chain — not in isolation). Passing metadata explicitly
// sidesteps whatever dual-instantiation is happening.
import { parsePhoneNumberFromString } from "libphonenumber-js/core";
import metadata from "libphonenumber-js/metadata.max.json";

export interface ContactField {
  field: string;
  value: string;
  sourceUrl: string;
}

export interface ExtractedContacts {
  emailGeneral?: ContactField;
  phoneE164?: ContactField;
  kvkNumber?: ContactField;
  contactFormUrl?: ContactField;
  socials: ContactField[]; // field = "social:instagram" | "social:facebook" | ...
  hasChatOrWhatsapp: boolean;
  hasContactForm: boolean;
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PLACEHOLDER_EMAILS = new Set(["example@example.com", "email@example.com", "info@example.com", "test@test.com"]);
const KVK_REGEX = /\bkvk[\s.:#-]*([0-9]{8})\b/i;

const SOCIAL_DOMAINS: { platform: string; pattern: RegExp }[] = [
  { platform: "instagram", pattern: /instagram\.com\/[a-zA-Z0-9_.]+/ },
  { platform: "facebook", pattern: /facebook\.com\/[a-zA-Z0-9_.]+/ },
  { platform: "linkedin", pattern: /linkedin\.com\/(company|in)\/[a-zA-Z0-9_-]+/ },
  { platform: "tiktok", pattern: /tiktok\.com\/@[a-zA-Z0-9_.]+/ },
  { platform: "x", pattern: /(twitter|x)\.com\/[a-zA-Z0-9_]+/ },
];

function extractEmail($: cheerio.CheerioAPI, pageUrl: string): ContactField | undefined {
  const mailtoHref = $('a[href^="mailto:"]').first().attr("href");
  if (mailtoHref) {
    const email = mailtoHref.replace(/^mailto:/i, "").split("?")[0].trim().toLowerCase();
    if (email && !PLACEHOLDER_EMAILS.has(email)) return { field: "email_general", value: email, sourceUrl: pageUrl };
  }
  const bodyText = $("body").text();
  const matches = bodyText.match(EMAIL_REGEX) ?? [];
  const valid = matches.map((m) => m.toLowerCase()).find((m) => !PLACEHOLDER_EMAILS.has(m));
  return valid ? { field: "email_general", value: valid, sourceUrl: pageUrl } : undefined;
}

// Candidate substrings that look like a Dutch phone number, each validated
// with parsePhoneNumberFromString — simpler and more robust in this runtime
// than findPhoneNumbersInText's PhoneNumberMatcher, which throws under
// ESM/CJS interop here (metadata not attached correctly through that path).
const PHONE_CANDIDATE_REGEX = /(\+31|0031|0)[\s-]?[1-9][\s0-9-]{7,12}/g;

function extractPhone($: cheerio.CheerioAPI, pageUrl: string): ContactField | undefined {
  const telHref = $('a[href^="tel:"]').first().attr("href");
  if (telHref) {
    const parsed = parsePhoneNumberFromString(telHref.replace(/^tel:/i, ""), "NL", metadata);
    if (parsed?.isValid()) return { field: "phone_e164", value: parsed.number, sourceUrl: pageUrl };
  }

  const text = $("body").text();
  const candidates = text.match(PHONE_CANDIDATE_REGEX) ?? [];
  for (const candidate of candidates) {
    const parsed = parsePhoneNumberFromString(candidate, "NL", metadata);
    if (parsed?.isValid()) return { field: "phone_e164", value: parsed.number, sourceUrl: pageUrl };
  }
  return undefined;
}

function extractKvk($: cheerio.CheerioAPI, pageUrl: string): ContactField | undefined {
  const match = $("body").text().match(KVK_REGEX);
  return match ? { field: "kvk_number", value: match[1], sourceUrl: pageUrl } : undefined;
}

function extractSocials($: cheerio.CheerioAPI, pageUrl: string): ContactField[] {
  const hrefs = $("a[href]")
    .map((_, el) => $(el).attr("href"))
    .get()
    .filter((h): h is string => Boolean(h));

  const found: ContactField[] = [];
  for (const { platform, pattern } of SOCIAL_DOMAINS) {
    const match = hrefs.find((h) => pattern.test(h));
    if (match) found.push({ field: `social:${platform}`, value: match, sourceUrl: pageUrl });
  }
  return found;
}

function detectWhatsapp($: cheerio.CheerioAPI): boolean {
  const hrefs = $("a[href]").map((_, el) => $(el).attr("href")).get();
  return hrefs.some((h) => h && /(wa\.me|api\.whatsapp\.com)/i.test(h));
}

function detectContactForm($: cheerio.CheerioAPI): boolean {
  return $("form").filter((_, form) => $(form).find('input[type="email"], textarea, input[type="text"]').length > 0).length > 0;
}

export function extractContactsFromPage(html: string, pageUrl: string): ExtractedContacts {
  const $ = cheerio.load(html);
  const hasContactForm = detectContactForm($);

  return {
    emailGeneral: extractEmail($, pageUrl),
    phoneE164: extractPhone($, pageUrl),
    kvkNumber: extractKvk($, pageUrl),
    contactFormUrl: hasContactForm ? { field: "contact_form_url", value: pageUrl, sourceUrl: pageUrl } : undefined,
    socials: extractSocials($, pageUrl),
    hasChatOrWhatsapp: detectWhatsapp($),
    hasContactForm,
  };
}

/** First-found-wins per scalar field across a crawl's pages; socials/whatsapp/form aggregate across all pages. */
export function mergeContactExtractions(pages: { url: string; html: string }[]): ExtractedContacts {
  const merged: ExtractedContacts = { socials: [], hasChatOrWhatsapp: false, hasContactForm: false };
  const seenSocialPlatforms = new Set<string>();

  for (const page of pages) {
    const extracted = extractContactsFromPage(page.html, page.url);
    merged.emailGeneral ??= extracted.emailGeneral;
    merged.phoneE164 ??= extracted.phoneE164;
    merged.kvkNumber ??= extracted.kvkNumber;
    merged.contactFormUrl ??= extracted.contactFormUrl;
    merged.hasChatOrWhatsapp ||= extracted.hasChatOrWhatsapp;
    merged.hasContactForm ||= extracted.hasContactForm;
    for (const social of extracted.socials) {
      if (!seenSocialPlatforms.has(social.field)) {
        seenSocialPlatforms.add(social.field);
        merged.socials.push(social);
      }
    }
  }
  return merged;
}

/** Flattens an ExtractedContacts into lead_contacts rows, ready to insert. */
export function toContactFields(extracted: ExtractedContacts): ContactField[] {
  const fields: ContactField[] = [];
  if (extracted.emailGeneral) fields.push(extracted.emailGeneral);
  if (extracted.phoneE164) fields.push(extracted.phoneE164);
  if (extracted.kvkNumber) fields.push(extracted.kvkNumber);
  if (extracted.contactFormUrl) fields.push(extracted.contactFormUrl);
  fields.push(...extracted.socials);
  return fields;
}
