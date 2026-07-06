const CATEGORY_RULES = [
  { keywords: ['hplc','uplc','lc-ms','gc-ms','gc/ms','mass spec','spectrometer','nmr','ftir','uv-vis','spectroscopy','chromatograph','biotage','flash chromatography'], category: 'Analytical' },
  { keywords: ['reactor','synthesizer','rotovap','rotary evaporator','distillation','reflux','synthesis','peptide'], category: 'Synthesis' },
  { keywords: ['pcr','sequencer','centrifuge','incubator','microscope','flow cytometer','cell counter','biosafety cabinet'], category: 'Biology' },
  { keywords: ['bioreactor','fermenter','cell culture','biopharma','upstream','downstream','filtration','tangential'], category: 'Life Science' },
  { keywords: ['liquid handler','plate reader','echo','mosquito','hts','high throughput','assay','labcyte'], category: 'Drug Discovery' },
  { keywords: ['dmpk','adme','metabolite','clearance','permeability','caco','pampa','microsomal'], category: 'DMPK' },
];

export function classifyListing(name, spec = '') {
  const text = `${name} ${spec}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((k) => text.includes(k))) return rule.category;
  }
  return 'Analytical';
}

export function parsePrice(text) {
  if (!text) return null;
  const match = String(text).match(/\$\s?([\d,]+(?:\.\d{2})?)/);
  if (!match) return null;
  const n = parseFloat(match[1].replace(/,/g, ''));
  return Number.isNaN(n) ? null : n;
}

export function inferCondition(text) {
  const t = String(text).toLowerCase();
  if (/\bnew\b|like-new|brand new/.test(t)) return 'NEW';
  return 'USED';
}
