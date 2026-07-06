import axios from 'axios';
import * as cheerio from 'cheerio';
import { SEARCH_SOURCES } from './searchSources.js';
import { classifyListing, parsePrice, inferCondition, hasPrice } from './classifyListing.js';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const MARKETPLACE_DOMAINS = [
  'labx.com', 'equipnet.com', 'machinio.com', 'biosurplus.com',
  'spectralabsci.com', 'mckscientific.com', 'labswapx.com', 'lab-machines.com',
  'govdeals.com', 'ebay.com', 'dotmed.com', 'newlifescientific.com',
];

function buildQueries(term, category) {
  const q = term.trim();
  const catHint = category && category !== 'All' ? `${category.toLowerCase()} ` : '';

  if (q) {
    return [
      `${q} used laboratory equipment price for sale`,
      `${q} lab equipment labx equipnet machinio biosurplus price`,
      `${q} refurbished lab instrument USD`,
      `${q} used lab equipment $ price machinio ebay`,
      `${q} laboratory instrument for sale price`,
    ];
  }

  return [
    `${catHint}used laboratory equipment for sale`,
    `${catHint}lab equipment marketplace labx equipnet`,
  ];
}

async function duckDuckGoSearch(query) {
  try {
    const { data } = await axios.post(
      'https://html.duckduckgo.com/html/',
      `q=${encodeURIComponent(query)}&b=`,
      {
        headers: {
          'User-Agent': USER_AGENT,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'text/html,application/xhtml+xml',
        },
        timeout: 15000,
        maxRedirects: 3,
      }
    );

    const $ = cheerio.load(data);
    const rows = [];

    $('.result').each((i, el) => {
      if (i >= 15) return;
      const a = $(el).find('a.result__a');
      const title = a.text().trim();
      let href = a.attr('href') || '';
      const snippet = $(el).find('.result__snippet').text().trim();

      if (href.startsWith('//')) href = `https:${href}`;
      if (href.includes('uddg=')) {
        try {
          const u = new URL(href, 'https://duckduckgo.com');
          href = decodeURIComponent(u.searchParams.get('uddg') || href);
        } catch { /* keep */ }
      }

      if (!title || !href || href.includes('duckduckgo.com')) return;
      rows.push({ title, href, snippet });
    });

    return rows;
  } catch {
    return [];
  }
}

function marketplaceFallback(term, category) {
  const q = term.trim() || (category && category !== 'All' ? category : 'laboratory equipment');
  return SEARCH_SOURCES.map((src) => ({
    title: `${q} — search on ${src.name}`,
    href: src.searchUrl(q),
    snippet: src.description,
  }));
}

function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Web';
  }
}

function sourceName(url) {
  const host = hostname(url);
  const known = SEARCH_SOURCES.find((s) => {
    try {
      return new URL(s.url).hostname.replace(/^www\./, '') === host;
    } catch {
      return false;
    }
  });
  return known?.name || host;
}

function toListing(row, index) {
  const spec = row.snippet || '';
  const text = `${row.title} ${spec}`;
  return {
    id: `web-${Buffer.from(row.href).toString('base64url').slice(0, 16)}-${index}`,
    name: row.title,
    spec,
    condition: inferCondition(text),
    price: parsePrice(text),
    negotiable: true,
    source_name: sourceName(row.href),
    source_url: row.href,
    contact_name: null,
    contact_email: null,
    year: null,
    category: classifyListing(row.title, spec),
    tags: [],
    is_active: true,
    external: true,
    created_at: new Date().toISOString(),
  };
}

function scoreResult(row, term) {
  const t = `${row.title} ${row.snippet}`.toLowerCase();
  const q = term.toLowerCase();
  let score = 0;
  if (parsePrice(`${row.title} ${row.snippet}`)) score += 8;
  if (q && t.includes(q)) score += 10;
  const host = hostname(row.href);
  if (MARKETPLACE_DOMAINS.some((d) => host.includes(d))) score += 5;
  if (/equipment|instrument|laboratory|lab\b|hplc|spectrometer|for sale|used/i.test(t)) score += 2;
  return score;
}

function sortListings(rows, sort, term = '') {
  const sorted = [...rows];
  const pricedFirst = (a, b) => {
    const ap = hasPrice(a) ? 1 : 0;
    const bp = hasPrice(b) ? 1 : 0;
    return bp - ap;
  };

  if (sort === 'priceAsc') {
    sorted.sort((a, b) => {
      const pf = pricedFirst(a, b);
      if (pf !== 0) return pf;
      return (a.price ?? Infinity) - (b.price ?? Infinity);
    });
  } else if (sort === 'priceDesc') {
    sorted.sort((a, b) => {
      const pf = pricedFirst(a, b);
      if (pf !== 0) return pf;
      return (b.price ?? 0) - (a.price ?? 0);
    });
  } else if (term) {
    sorted.sort((a, b) => {
      const pf = pricedFirst(a, b);
      if (pf !== 0) return pf;
      const sa = scoreResult({ title: a.name, snippet: a.spec, href: a.source_url }, term);
      const sb = scoreResult({ title: b.name, snippet: b.spec, href: b.source_url }, term);
      return sb - sa;
    });
  } else {
    sorted.sort((a, b) => pricedFirst(a, b));
  }
  return sorted;
}

function filterListings(rows, { category, condition }) {
  let filtered = rows;
  if (category && category !== 'All') {
    filtered = filtered.filter((r) => r.category === category);
  }
  if (condition && condition !== 'ALL') {
    filtered = filtered.filter((r) => r.condition === condition);
  }
  return filtered;
}

export async function searchInternet({ q = '', category, condition, sort }) {
  const queries = buildQueries(q, category);
  const seen = new Set();
  const raw = [];

  for (const query of queries) {
    const batch = await duckDuckGoSearch(query);
    for (const row of batch) {
      const key = row.href.split('?')[0];
      if (seen.has(key)) continue;
      seen.add(key);
      raw.push(row);
    }
    if (raw.length >= 60) break;
    await new Promise((r) => setTimeout(r, 250));
  }

  if (raw.length === 0) {
    raw.push(...marketplaceFallback(q, category));
  }

  let listings = raw.map((row, i) => toListing(row, i));
  listings = filterListings(listings, { category, condition });
  listings = sortListings(listings, sort, q);

  const total = listings.length;
  return {
    listings,
    total,
    agent: true,
    sourcesSearched: queries.length,
  };
}
