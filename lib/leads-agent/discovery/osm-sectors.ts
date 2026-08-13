/**
 * ICP sector -> OSM tag mapping. Dutch SMB categories don't map 1:1 onto
 * OSM's tagging scheme, so this is a best-effort, tunable mapping rather
 * than an authoritative one — flagged so it can be refined per-sector once
 * real run data shows which tags actually return good candidates.
 */
export const OSM_SECTOR_TAGS: Record<string, string[]> = {
  aannemer: ['craft=builder', 'shop=doityourself'],
  installateur: ['craft=electrician', 'craft=plumber', 'craft=hvac'],
  tandarts: ['amenity=dentist'],
  kliniek: ['amenity=clinic', 'healthcare=clinic'],
  praktijk: ['healthcare=doctor', 'amenity=doctors'],
  advocaat: ['office=lawyer'],
  notaris: ['office=notary'],
  accountant: ['office=accountant'],
  makelaar: ['office=estate_agent'],
  hovenier: ['craft=gardener'],
  autobedrijf: ['shop=car_repair', 'shop=car'],
  salon: ['shop=hairdresser', 'shop=beauty'],
  fysio: ['healthcare=physiotherapist', 'amenity=physiotherapist'],
  catering: ['shop=catering', 'craft=caterer'],
  interieur: ['shop=interior_decoration', 'shop=furniture'],
  speciaalzaak: ['shop=convenience', 'shop=department_store'],
};

export function sectorToOsmTags(sector: string): string[] {
  return OSM_SECTOR_TAGS[sector] ?? [];
}
