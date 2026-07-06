// Unified search: internet agent + local database
import { searchInternet } from '../../lib/webSearchAgent';
import { getSupabase, getSupabaseConfigError, isSupabaseReachable } from '../../lib/supabase';
import { mergeAndPaginateListings, filterListingRows } from '../../lib/listingQuery';
import { enrichListingsWithPrices } from '../../lib/priceExtractor';

function sanitize(term) {
  return String(term).trim().replace(/,/g, ' ').slice(0, 100);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { q, category, condition, sort, page = 1, limit = 20, pricedOnly } = req.query;
  const search = sanitize(q || '');
  const params = { q: search, category, condition, sort, page, limit, pricedOnly };

  try {
    const web = await searchInternet(params);

    let local = [];
    const configError = getSupabaseConfigError();
    if (!configError && await isSupabaseReachable()) {
      try {
        const supabase = getSupabase();
        let query = supabase.from('listings').select('*').eq('is_active', true).limit(200);

        if (search) {
          const pattern = `%${search.replace(/[%_]/g, '\\$&')}%`;
          query = query.or(`name.ilike.${pattern},spec.ilike.${pattern},source_name.ilike.${pattern}`);
        }
        if (category && category !== 'All') query = query.eq('category', category);
        if (condition && condition !== 'ALL') query = query.eq('condition', condition);

        const { data } = await query;
        local = filterListingRows(data || [], params);
      } catch {
        local = [];
      }
    }

    const combined = [...local, ...web.listings];
    const enrichBudget = search.length >= 2 ? 22_000 : 0;
    const enrich = enrichBudget > 0
      ? await enrichListingsWithPrices(combined, { budgetMs: enrichBudget })
      : { pricesFetched: 0, pagesChecked: 0, pricedCount: combined.filter((l) => l.price > 0).length };

    const merged = mergeAndPaginateListings(combined, params);

    const priceNote = merged.pricedCount
      ? `${merged.pricedCount} with listed prices`
      : merged.unpricedCount > 0
        ? `${merged.unpricedCount} found — uncheck “Listed prices only” to view all`
        : 'No results found';

    return res.json({
      ...merged,
      agent: true,
      sourcesSearched: web.sourcesSearched,
      pricesFetched: enrich.pricesFetched,
      pagesChecked: enrich.pagesChecked,
      message: search
        ? `${priceNote} · searched ${web.sourcesSearched} web sources for "${search}"`
        : `${priceNote} · browsing ${web.sourcesSearched} web sources`,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internet search failed' });
  }
}
