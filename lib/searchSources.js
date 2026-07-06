// External marketplaces and vendor sites for equipment sourcing.
// searchUrl(query) returns a link to search that site for the given term.

export const SEARCH_SOURCES = [
  {
    id: 'labx',
    name: 'LabX.com',
    description: 'Used lab & pharma equipment marketplace — contact resellers directly',
    url: 'https://www.labx.com',
    searchUrl: (q) => `https://www.labx.com/listing/search?q=${encodeURIComponent(q)}&type=instrument`,
    tags: ['marketplace', 'used'],
  },
  {
    id: 'equipnet',
    name: 'EquipNet.com',
    description: 'Global used industrial & lab equipment auctions and listings',
    url: 'https://www.equipnet.com',
    searchUrl: (q) => `https://www.equipnet.com/equipment/?q=${encodeURIComponent(q)}`,
    tags: ['marketplace', 'industrial'],
  },
  {
    id: 'spectralabsci',
    name: 'Spectra Lab Sci',
    description: 'Refurbished analytical equipment — LC/MS, GC/MS, HPLC, and more',
    url: 'https://www.spectralabsci.com',
    searchUrl: (q) => `https://www.spectralabsci.com/?s=${encodeURIComponent(q)}`,
    tags: ['dealer', 'refurbished', 'analytical', 'lcms'],
  },
  {
    id: 'mckinley',
    name: 'McKinley Scientific',
    description: 'Pre-owned analytical & clinical instruments — buy, sell, lease, or consign. 877-502-7082 · info@mckscientific.com',
    url: 'https://www.mckscientific.com',
    searchUrl: () => 'https://www.mckscientific.com/product',
    tags: ['dealer', 'refurbished', 'leasing', 'lcms'],
  },
  {
    id: 'labswap',
    name: 'Lab Swap',
    description: 'Pre-owned lab equipment incl. liquid handlers — sales@labswapx.com · 801-809-7702',
    url: 'https://labswapx.com',
    searchUrl: () => 'https://labswapx.com/product-list',
    tags: ['marketplace', 'liquid handler', 'pre-owned'],
  },
  {
    id: 'labx-echo',
    name: 'LabX — Labcyte Echo',
    description: 'Labcyte Echo liquid handler listings on LabX',
    url: 'https://www.labx.com/product/labcyte-echo',
    searchUrl: () => 'https://www.labx.com/product/labcyte-echo',
    tags: ['echo', 'liquid handler'],
  },
  {
    id: 'machinio',
    name: 'Machinio',
    description: 'Labcyte / Beckman Coulter manufacturer listings',
    url: 'https://www.machinio.com/manufacturer/labcyte,-beckman-coulter',
    searchUrl: (q) => `https://www.machinio.com/search?q=${encodeURIComponent(q)}`,
    tags: ['marketplace', 'used'],
  },
  {
    id: 'lab-machines',
    name: 'Lab-Machines.com',
    description: 'Pre-owned lab equipment dealer',
    url: 'https://lab-machines.com/pre-owned',
    searchUrl: (q) => `https://lab-machines.com/?s=${encodeURIComponent(q)}`,
    tags: ['pre-owned', 'dealer'],
  },
  {
    id: 'dipylon',
    name: 'Dipylon Medical',
    description: 'Refurbished lab equipment — verify specs before purchase',
    url: 'https://dipylonmedical.com',
    searchUrl: () => 'https://dipylonmedical.com/product/labcyte-echo-650/',
    tags: ['refurbished', 'budget'],
  },
  {
    id: 'axonia',
    name: 'Axonia Medical',
    description: 'DNA/RNA purification & liquid handling equipment',
    url: 'https://axoniamedical.com',
    searchUrl: () => 'https://axoniamedical.com/dna-rna-purification/74-labcyte-echo-650.html',
    tags: ['refurbished', 'budget'],
  },
  {
    id: 'ferus',
    name: 'Ferus Medical',
    description: 'Pre-owned Labcyte Echo systems',
    url: 'https://ferusmedical.com',
    searchUrl: () => 'https://ferusmedical.com/product/labcyte-echo-650/',
    tags: ['pre-owned', 'budget'],
  },
  {
    id: 'biosurplus',
    name: 'BioSurplus.com',
    description: 'Biotech & pharma used equipment',
    url: 'https://www.biosurplus.com',
    searchUrl: (q) => `https://www.biosurplus.com/search?q=${encodeURIComponent(q)}`,
    tags: ['marketplace', 'biotech'],
  },
];

export function getSearchSourcesForQuery(query = '') {
  const q = query.trim() || 'liquid handler';
  return SEARCH_SOURCES.map((source) => ({
    ...source,
    href: source.searchUrl(q),
  }));
}
