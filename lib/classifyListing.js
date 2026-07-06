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
  const s = String(text);

  const kMatch = s.match(/\$\s?([\d,]+(?:\.\d+)?)\s*[kK]\b/);
  if (kMatch) {
    const n = parseFloat(kMatch[1].replace(/,/g, '')) * 1000;
    if (!Number.isNaN(n) && n >= 100) return Math.round(n);
  }

  const patterns = [
    /\$\s?([\d,]+(?:\.\d{2})?)/g,
    /USD\s?([\d,]+(?:\.\d{2})?)/gi,
    /EUR\s?([\d,]+(?:\.\d{2})?)/gi,
    /€\s?([\d,]+(?:\.\d{2})?)/g,
    /£\s?([\d,]+(?:\.\d{2})?)/g,
    /price[:\s]+\$?\s?([\d,]+(?:\.\d{2})?)/gi,
    /([\d,]+(?:\.\d{2})?)\s*USD/gi,
  ];

  for (const pattern of patterns) {
    const matches = [...s.matchAll(pattern)];
    for (const match of matches) {
      const n = parseFloat(match[1].replace(/,/g, ''));
      if (!Number.isNaN(n) && n >= 100 && n <= 50_000_000) return Math.round(n);
    }
  }

  return null;
}

export function hasPrice(item) {
  return item?.price != null && item.price > 0;
}

export function inferCondition(text) {
  const t = String(text).toLowerCase();
  if (/\bnew\b|like-new|brand new/.test(t)) return 'NEW';
  return 'USED';
}
