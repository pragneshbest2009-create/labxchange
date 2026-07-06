import { queryCuratedListings } from './curatedListings';
import { hasPrice } from './classifyListing';

function comparePricedFirst(a, b) {
  const ap = hasPrice(a) ? 1 : 0;
  const bp = hasPrice(b) ? 1 : 0;
  return bp - ap;
}

function dedupeBySourceUrl(rows) {
  const seen = new Set();
  return rows.filter((item) => {
    const key = item.source_url || item.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortListings(rows, sort) {
  const sorted = [...rows];
  if (sort === 'priceAsc') {
    sorted.sort((a, b) => {
      const pf = comparePricedFirst(a, b);
      if (pf !== 0) return pf;
      return (a.price ?? Infinity) - (b.price ?? Infinity);
    });
  } else if (sort === 'priceDesc') {
    sorted.sort((a, b) => {
      const pf = comparePricedFirst(a, b);
      if (pf !== 0) return pf;
      return (b.price ?? 0) - (a.price ?? 0);
    });
  } else if (sort === 'newest') {
    sorted.sort((a, b) => {
      const pf = comparePricedFirst(a, b);
      if (pf !== 0) return pf;
      return (b.year || 0) - (a.year || 0);
    });
  } else {
    sorted.sort((a, b) => {
      const pf = comparePricedFirst(a, b);
      if (pf !== 0) return pf;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }
  return sorted;
}

export function mergeAndPaginateListings(baseRows, params) {
  const { page = 1, limit = 20, sort, pricedOnly } = params;
  const curated = queryCuratedListings(params);
  const merged = sortListings(dedupeBySourceUrl([...curated, ...baseRows]), sort);
  const pricedCount = merged.filter(hasPrice).length;
  const rows = pricedOnly === '1' || pricedOnly === 'true' || pricedOnly === true
    ? merged.filter(hasPrice)
    : merged;
  const total = rows.length;
  const start = (Number(page) - 1) * Number(limit);
  const listings = rows.slice(start, start + Number(limit));

  return {
    listings,
    total,
    pricedCount,
    unpricedCount: merged.length - pricedCount,
    page: Number(page),
    limit: Number(limit),
  };
}

export function matchesSearchTerm(item, search) {
  if (!search) return true;
  const hay = `${item.name} ${item.spec} ${item.notes || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
  return hay.includes(search.toLowerCase());
}

export function filterListingRows(rows, { q = '', category, condition }) {
  let filtered = rows.filter((item) => item.is_active !== false);

  if (q) filtered = filtered.filter((item) => matchesSearchTerm(item, q));
  if (category && category !== 'All') filtered = filtered.filter((item) => item.category === category);
  if (condition && condition !== 'ALL') filtered = filtered.filter((item) => item.condition === condition);

  return filtered;
}
