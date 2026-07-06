// Curated vendor listings — manually tracked sourcing options.
// Merged into search results alongside scraped / demo data.

export const ECHO_650_BRIEF = {
  instrument: 'Labcyte Echo 650 Liquid Handler',
  assignee: 'Hitgna Shah',
  task: 'Contact resellers and verify specs, accessories, and calibration status before purchase.',
  caution: 'Budget listings ($16K–$20K) may not include all required specs, tips, or materials — confirm with vendor.',
};

export const CURATED_LISTINGS = [
  {
    id: 'curated-echo-labx',
    name: 'Labcyte Echo 650 Liquid Handler',
    spec: 'Acoustic droplet ejection liquid handler — contact LabX reseller for full configuration, tip type, and service history.',
    condition: 'USED',
    price: null,
    negotiable: true,
    source_name: 'LabX.com',
    source_url: 'https://www.labx.com/product/labcyte-echo',
    contact_name: 'LabX reseller',
    contact_email: null,
    year: null,
    category: 'Drug Discovery',
    tags: ['echo', 'liquid handler', 'labcyte', 'hts'],
    notes: 'Primary marketplace — contact reseller via listing page.',
    priority: 'high',
    is_active: true,
    created_at: '2026-07-06T09:00:00.000Z',
  },
  {
    id: 'curated-echo-machinio',
    name: 'Labcyte / Beckman Coulter — Machinio listings',
    spec: 'Browse manufacturer-filtered used Echo and related liquid handlers.',
    condition: 'USED',
    price: null,
    negotiable: true,
    source_name: 'Machinio',
    source_url: 'https://www.machinio.com/manufacturer/labcyte,-beckman-coulter',
    contact_name: 'Machinio sellers',
    contact_email: null,
    year: null,
    category: 'Drug Discovery',
    tags: ['echo', 'liquid handler', 'labcyte', 'beckman'],
    notes: 'Compare multiple sellers — verify model (550 vs 650) and included accessories.',
    priority: 'high',
    is_active: true,
    created_at: '2026-07-06T08:55:00.000Z',
  },
  {
    id: 'curated-echo-labmachines',
    name: 'Pre-owned lab equipment — Lab-Machines.com',
    spec: 'Dealer pre-owned inventory — search for Labcyte Echo or liquid handler.',
    condition: 'USED',
    price: null,
    negotiable: true,
    source_name: 'Lab-Machines.com',
    source_url: 'https://lab-machines.com/pre-owned',
    contact_name: 'Lab-Machines sales',
    contact_email: null,
    year: null,
    category: 'Drug Discovery',
    tags: ['echo', 'liquid handler', 'pre-owned'],
    notes: 'Contact vendor to confirm Echo 650 availability and configuration.',
    priority: 'medium',
    is_active: true,
    created_at: '2026-07-06T08:50:00.000Z',
  },
  {
    id: 'curated-echo-dipylon',
    name: 'Labcyte Echo 650',
    spec: 'Refurbished unit — confirm tip compatibility, software license, and QC documentation.',
    condition: 'USED',
    price: 16000,
    negotiable: true,
    source_name: 'Dipylon Medical',
    source_url: 'https://dipylonmedical.com/product/labcyte-echo-650/',
    contact_name: 'Dipylon Medical',
    contact_email: null,
    year: null,
    category: 'Drug Discovery',
    tags: ['echo', 'liquid handler', 'labcyte', 'budget'],
    notes: 'Very low price ($16K) — verify all specs and required materials are included.',
    priority: 'review',
    is_active: true,
    created_at: '2026-07-06T08:45:00.000Z',
  },
  {
    id: 'curated-echo-axonia',
    name: 'Labcyte Echo 650',
    spec: 'Pre-owned Echo 650 — confirm accessory package and validation status.',
    condition: 'USED',
    price: 20000,
    negotiable: true,
    source_name: 'Axonia Medical',
    source_url: 'https://axoniamedical.com/dna-rna-purification/74-labcyte-echo-650.html',
    contact_name: 'Axonia Medical',
    contact_email: null,
    year: null,
    category: 'Drug Discovery',
    tags: ['echo', 'liquid handler', 'labcyte', 'budget'],
    notes: 'Low price ($20K) — confirm specs, tips, and service records meet requirements.',
    priority: 'review',
    is_active: true,
    created_at: '2026-07-06T08:40:00.000Z',
  },
  {
    id: 'curated-echo-ferus',
    name: 'Labcyte Echo 650',
    spec: 'Pre-owned Echo 650 — request full bill of materials and installation support.',
    condition: 'USED',
    price: 20000,
    negotiable: true,
    source_name: 'Ferus Medical',
    source_url: 'https://ferusmedical.com/product/labcyte-echo-650/',
    contact_name: 'Ferus Medical',
    contact_email: null,
    year: null,
    category: 'Drug Discovery',
    tags: ['echo', 'liquid handler', 'labcyte', 'budget'],
    notes: 'Low price ($20K) — verify configuration matches lab requirements.',
    priority: 'review',
    is_active: true,
    created_at: '2026-07-06T08:35:00.000Z',
  },
];

export function getCuratedListings() {
  return CURATED_LISTINGS.filter((item) => item.is_active);
}

export function queryCuratedListings({ q = '', category, condition, sort }) {
  let rows = getCuratedListings();

  if (q) {
    const term = q.toLowerCase();
    rows = rows.filter((item) => {
      const hay = `${item.name} ${item.spec} ${item.notes || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
      return hay.includes(term);
    });
  }
  if (category && category !== 'All') rows = rows.filter((item) => item.category === category);
  if (condition && condition !== 'ALL') rows = rows.filter((item) => item.condition === condition);

  if (sort === 'priceAsc') rows.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  else if (sort === 'priceDesc') rows.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  else if (sort === 'newest') rows.sort((a, b) => (b.year || 0) - (a.year || 0));
  else rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return rows;
}
