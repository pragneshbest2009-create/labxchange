import { queryCuratedListings } from './curatedListings';

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
  if (sort === 'priceAsc') sorted.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  else if (sort === 'priceDesc') sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  else if (sort === 'newest') sorted.sort((a, b) => (b.year || 0) - (a.year || 0));
  else sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return sorted;
}

export function mergeAndPaginateListings(baseRows, params) {
  const { page = 1, limit = 20, sort } = params;
  const curated = queryCuratedListings(params);
  const merged = sortListings(dedupeBySourceUrl([...curated, ...baseRows]), sort);
  const total = merged.length;
  const start = (Number(page) - 1) * Number(limit);
  const listings = merged.slice(start, start + Number(limit));

  return { listings, total, page: Number(page), limit: Number(limit) };
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
