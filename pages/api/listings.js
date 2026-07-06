// pages/api/listings.js
import { getSupabase, getSupabaseConfigError, isConnectionError, isSupabaseReachable, markSupabaseUnreachable } from '../../lib/supabase';
import { queryDemoListings } from '../../lib/demoListings';
import { mergeAndPaginateListings } from '../../lib/listingQuery';

function sanitizeSearchTerm(term) {
  return String(term).trim().replace(/,/g, ' ').slice(0, 100);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { q, category, condition, sort, page = 1, limit = 20 } = req.query;
  const search = sanitizeSearchTerm(q || '');
  const params = { q: search, category, condition, sort, page, limit };

  const configError = getSupabaseConfigError();
  if (configError) {
    return res.json({
      ...queryDemoListings(params),
      warning: configError,
    });
  }

  const reachable = await isSupabaseReachable();
  if (!reachable) {
    return res.json({
      ...queryDemoListings(params),
      warning: 'Supabase is unreachable — showing sample listings. Update your project URL in Vercel env vars.',
    });
  }

  try {
    const supabase = getSupabase();

    let query = supabase
      .from('listings')
      .select('*')
      .eq('is_active', true)
      .limit(500);

    if (search) {
      const pattern = `%${search.replace(/[%_]/g, '\\$&')}%`;
      query = query.or(`name.ilike.${pattern},spec.ilike.${pattern}`);
    }

    if (category && category !== 'All') query = query.eq('category', category);
    if (condition && condition !== 'ALL') query = query.eq('condition', condition);

    if (sort === 'priceAsc') query = query.order('price', { ascending: true });
    else if (sort === 'priceDesc') query = query.order('price', { ascending: false });
    else if (sort === 'newest') query = query.order('year', { ascending: false });
    else query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      if (isConnectionError(error)) {
        markSupabaseUnreachable();
        return res.json({
          ...queryDemoListings(params),
          warning: 'Supabase is unreachable — showing sample listings. Update your project URL in Vercel env vars.',
        });
      }
      return res.status(500).json({ error: error.message });
    }

    return res.json({
      ...mergeAndPaginateListings(data || [], params),
    });
  } catch (err) {
    if (isConnectionError(err)) {
      markSupabaseUnreachable();
      return res.json({
        ...queryDemoListings(params),
        warning: 'Supabase is unreachable — showing sample listings. Update your project URL in Vercel env vars.',
      });
    }
    return res.status(500).json({ error: err.message || 'Failed to load listings' });
  }
}
