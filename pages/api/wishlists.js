// pages/api/wishlists.js
import { supabase, supabaseAdmin } from '../../lib/supabase';

export default async function handler(req, res) {
  // GET  — fetch all wishlists (shared page)
  if (req.method === 'GET') {
    const { status } = req.query;
    let query = supabase
      .from('wishlists')
      .select('*')
      .order('created_at', { ascending: false });
    if (status && status !== 'all') query = query.eq('status', status);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ wishlists: data });
  }

  // POST — submit a new wishlist
  if (req.method === 'POST') {
    const { submitter_name, submitter_email, department, priority, items, comment } = req.body;
    if (!submitter_name) return res.status(400).json({ error: 'Name is required' });
    if (!items?.length)  return res.status(400).json({ error: 'At least one item required' });

    const { data, error } = await supabase
      .from('wishlists')
      .insert({ submitter_name, submitter_email, department, priority, items, comment })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ wishlist: data });
  }

  // PATCH — update status (admin)
  if (req.method === 'PATCH') {
    const { id, status, admin_note } = req.body;
    const { data, error } = await supabaseAdmin
      .from('wishlists')
      .update({ status, admin_note })
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ wishlist: data });
  }

  // DELETE
  if (req.method === 'DELETE') {
    const { id } = req.body;
    const { error } = await supabaseAdmin.from('wishlists').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  res.status(405).end();
}