// pages/wishlist/[id].js
// Share this URL: https://yourapp.vercel.app/wishlist/shared
// Anyone can open it, submit their wishlist, and see all others

import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function SharedWishlist() {
  const [wishlists, setWishlists] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState('all');
  const [syncing, setSyncing]     = useState(false);
  const [lastSync, setLastSync]   = useState(null);

  // Form state
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [dept, setDept]       = useState('');
  const [priority, setPriority] = useState('Normal');
  const [items, setItems]     = useState([]);
  const [itemInput, setItemInput] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  const load = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/wishlists?status=' + filter);
      const data = await res.json();
      setWishlists(data.wishlists || []);
      setLastSync(new Date());
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  // Auto-sync every 60 seconds
  useEffect(() => {
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [filter]);

  const addItem = () => {
    const v = itemInput.trim();
    if (!v) return;
    setItems(prev => [...prev, v]);
    setItemInput('');
  };

  const submit = async () => {
    if (!name) return alert('Please enter your name');
    if (!items.length) return alert('Please add at least one instrument');
    setSubmitting(true);
    const res = await fetch('/api/wishlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submitter_name: name, submitter_email: email, department: dept, priority, items, comment })
    });
    if (res.ok) {
      setSubmitted(true);
      setItems([]); setName(''); setEmail(''); setDept(''); setComment('');
      await load();
    }
    setSubmitting(false);
  };

  const updateStatus = async (id, status) => {
    await fetch('/api/wishlists', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    await load();
  };

  const deleteWish = async (id) => {
    if (!confirm('Remove this wishlist?')) return;
    await fetch('/api/wishlists', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    await load();
  };

  const timeAgo = (ts) => {
    const d = Date.now() - new Date(ts).getTime();
    if (d < 60000) return 'just now';
    if (d < 3600000) return Math.floor(d/60000) + 'm ago';
    if (d < 86400000) return Math.floor(d/3600000) + 'h ago';
    return Math.floor(d/86400000) + 'd ago';
  };

  return (
    <>
      <Head>
        <title>LabXChange — Equipment Wishlist</title>
      </Head>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 4 }}>🧪 LabXChange — Equipment wishlist</h1>
        <p style={{ color: '#666', marginBottom: 16 }}>
          Anyone with this link can submit their equipment needs. Admin reviews and follows up.
        </p>

        {/* Sync status */}
        <div style={{ background: '#f5f5f5', borderRadius: 8, padding: '8px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#555' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: syncing ? '#f59e0b' : '#10b981', display: 'inline-block' }} />
          {syncing ? 'Syncing…' : lastSync ? `Synced at ${lastSync.toLocaleTimeString()}` : 'Loading…'}
          <button onClick={load} style={{ marginLeft: 'auto', fontSize: 12, padding: '3px 10px', borderRadius: 6, border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>
            Refresh
          </button>
        </div>

        {/* Submit form */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem', marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Add your wishlist</h2>
          {submitted && (
            <div style={{ background: '#d1fae5', color: '#065f46', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 14 }}>
              ✓ Submitted! Our team will be in touch.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name *"
              style={{ height: 38, padding: '0 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }} />
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email (optional)"
              style={{ height: 38, padding: '0 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <select value={dept} onChange={e=>setDept(e.target.value)}
              style={{ height: 38, padding: '0 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: 'white' }}>
              <option value="">Department / role</option>
              {['Analytical R&D','Drug Discovery','DMPK / ADME','Biology','Chemistry / Synthesis','Life Science','Procurement','Other'].map(d => <option key={d}>{d}</option>)}
            </select>
            <select value={priority} onChange={e=>setPriority(e.target.value)}
              style={{ height: 38, padding: '0 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: 'white' }}>
              <option value="Normal">Priority: Normal</option>
              <option value="Urgent">Priority: Urgent</option>
              <option value="Low">Priority: Low</option>
            </select>
          </div>

          {/* Instrument chips */}
          <div style={{ marginBottom: 6, fontSize: 12, color: '#666' }}>Add instruments (press Enter or click +)</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input value={itemInput} onChange={e=>setItemInput(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter'){addItem();e.preventDefault();} }}
              placeholder="e.g. HPLC, mass spectrometer, PCR cycler…"
              style={{ flex: 1, height: 36, padding: '0 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13 }} />
            <button onClick={addItem}
              style={{ height: 36, padding: '0 14px', border: '1px solid #ddd', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 13 }}>
              + Add
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {items.map((it, i) => (
              <span key={i} style={{ background: '#dbeafe', color: '#1e40af', borderRadius: 20, padding: '3px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                {it}
                <button onClick={() => setItems(prev => prev.filter((_,j)=>j!==i))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1e40af', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>

          <textarea value={comment} onChange={e=>setComment(e.target.value)}
            placeholder="Comments, specifications, budget range…"
            style={{ width: '100%', height: 70, padding: '8px 10px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, resize: 'none', boxSizing: 'border-box' }} />

          <button onClick={submit} disabled={submitting}
            style={{ width: '100%', height: 40, marginTop: 8, background: '#1d4ed8', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
            {submitting ? 'Submitting…' : '→ Submit wishlist'}
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, flex: 1 }}>All wishlists</h2>
          {['all','pending','reviewed','contacted'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ fontSize: 12, padding: '5px 12px', borderRadius: 20, border: '1px solid', cursor: 'pointer',
                borderColor: filter===f ? '#1d4ed8' : '#ddd',
                background: filter===f ? '#eff6ff' : 'white',
                color: filter===f ? '#1d4ed8' : '#555', fontWeight: filter===f ? 600 : 400 }}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>

        {/* Wishlist cards */}
        {loading ? <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>Loading…</p> :
          wishlists.length === 0 ? <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>No wishlists yet.</p> :
          wishlists.map(w => {
            const statusColor = { pending: '#fef3c7', reviewed: '#d1fae5', contacted: '#dbeafe', closed: '#f3f4f6' }[w.status];
            const statusText  = { pending: '#92400e', reviewed: '#065f46', contacted: '#1e40af', closed: '#374151' }[w.status];
            const prioColor   = { Urgent: '#fee2e2', Normal: '#eff6ff', Low: '#f3f4f6' }[w.priority||'Normal'];
            const prioText    = { Urgent: '#991b1b', Normal: '#1e40af', Low: '#374151' }[w.priority||'Normal'];
            const initials    = w.submitter_name.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2);
            return (
              <div key={w.id} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#1e40af', flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {w.submitter_name}
                      {w.department && <span style={{ fontSize: 12, fontWeight: 400, color: '#666', marginLeft: 6 }}>· {w.department}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#888' }}>
                      {timeAgo(w.created_at)}{w.submitter_email ? ' · ' + w.submitter_email : ''}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: statusColor, color: statusText, fontWeight: 600 }}>{w.status}</span>
                  <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: prioColor, color: prioText, fontWeight: 600 }}>{w.priority||'Normal'}</span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: w.comment ? 8 : 0 }}>
                  {(w.items||[]).map((it,i) => (
                    <span key={i} style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, background: '#ede9fe', color: '#4c1d95' }}>{it}</span>
                  ))}
                </div>

                {w.comment && (
                  <div style={{ fontSize: 13, color: '#555', background: '#f9fafb', padding: '8px 10px', borderLeft: '3px solid #e5e7eb', marginBottom: 8 }}>
                    "{w.comment}"
                  </div>
                )}

                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  {w.status === 'pending' && (
                    <button onClick={() => updateStatus(w.id, 'reviewed')}
                      style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #1d4ed8', color: '#1d4ed8', background: 'white', cursor: 'pointer' }}>
                      ✓ Mark reviewed
                    </button>
                  )}
                  {w.status === 'reviewed' && (
                    <button onClick={() => updateStatus(w.id, 'contacted')}
                      style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #059669', color: '#059669', background: 'white', cursor: 'pointer' }}>
                      ✉ Mark contacted
                    </button>
                  )}
                  {w.status !== 'pending' && (
                    <button onClick={() => updateStatus(w.id, 'pending')}
                      style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #ddd', color: '#666', background: 'white', cursor: 'pointer' }}>
                      Reset
                    </button>
                  )}
                  <button onClick={() => deleteWish(w.id)}
                    style={{ marginLeft: 'auto', fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', color: '#dc2626', background: 'white', cursor: 'pointer' }}>
                    🗑
                  </button>
                </div>
              </div>
            );
          })
        }
      </main>
    </>
  );
}