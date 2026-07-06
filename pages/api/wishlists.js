// pages/api/wishlists.js
import { getSupabase, getSupabaseAdmin, getSupabaseConfigError, isConnectionError } from '../../lib/supabase';

export default async function handler(req, res) {
  const configError = getSupabaseConfigError();

  if (req.method === 'GET') {
    if (configError) {
      return res.json({ wishlists: [], warning: configError });
    }

    try {
      const { status } = req.query;
      const supabase = getSupabase();
      let query = supabase
        .from('wishlists')
        .select('*')
        .order('created_at', { ascending: false });
      if (status && status !== 'all') query = query.eq('status', status);
      const { data, error } = await query;
      if (error) {
        if (isConnectionError(error)) {
          return res.json({
            wishlists: [],
            warning: 'Supabase is unreachable. Wishlists are unavailable until the database is connected.',
          });
        }
        return res.status(500).json({ error: error.message });
      }
      return res.json({ wishlists: data });
    } catch (err) {
      if (isConnectionError(err)) {
        return res.json({
          wishlists: [],
          warning: 'Supabase is unreachable. Wishlists are unavailable until the database is connected.',
        });
      }
      return res.status(500).json({ error: err.message });
    }
  }

  if (configError) {
    return res.status(503).json({ error: configError });
  }

  if (req.method === 'POST') {
    const { submitter_name, submitter_email, department, priority, items, comment } = req.body;
    if (!submitter_name) return res.status(400).json({ error: 'Name is required' });
    if (!items?.length) return res.status(400).json({ error: 'At least one item required' });

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('wishlists')
        .insert({ submitter_name, submitter_email, department, priority, items, comment })
        .select()
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ wishlist: data });
    } catch (err) {
      return res.status(503).json({ error: err.message });
    }
  }

  if (req.method === 'PATCH') {
    const { id, status, admin_note } = req.body;
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { data, error } = await supabaseAdmin
        .from('wishlists')
        .update({ status, admin_note })
        .eq('id', id)
        .select()
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ wishlist: data });
    } catch (err) {
      return res.status(503).json({ error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { error } = await supabaseAdmin.from('wishlists').delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true });
    } catch (err) {
      return res.status(503).json({ error: err.message });
    }
  }

  res.status(405).end();
}
