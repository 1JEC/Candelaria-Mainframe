export const FORM_TYPE_LABELS: Record<string, string> = {
  offerte: "Offerte-aanvraag",
  contact: "Contactformulier",
  gratis_gesprek: "Gratis gesprek",
  onderhoud: "Onderhoud",
  social_media: "Social media",
};

export function formTypeLabel(type: string): string {
  return FORM_TYPE_LABELS[type] || type;
}
