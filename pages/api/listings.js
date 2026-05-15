// pages/api/listings.js
import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { q, category, condition, sort, page = 1, limit = 20 } = req.query;

  let query = supabase
    .from('listings')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .range((page - 1) * limit, page * limit - 1);

  // Full-text search
  if (q) query = query.textSearch('fts', q, { type: 'websearch' });

  // Filters
  if (category && category !== 'All') query = query.eq('category', category);
  if (condition && condition !== 'ALL') query = query.eq('condition', condition);

  // Sort
  if (sort === 'priceAsc')  query = query.order('price', { ascending: true });
  else if (sort === 'priceDesc') query = query.order('price', { ascending: false });
  else if (sort === 'newest') query = query.order('year', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({ listings: data, total: count, page: Number(page), limit: Number(limit) });
}