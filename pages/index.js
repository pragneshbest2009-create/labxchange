// pages/index.js
import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/Home.module.css';

const CATEGORIES = ['All','Analytical','Synthesis','Biology','Life Science','Drug Discovery','DMPK'];

export default function Home() {
  const [listings, setListings]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(false);
  const [query, setQuery]         = useState('');
  const [condition, setCondition] = useState('ALL');
  const [category, setCategory]   = useState('All');
  const [sort, setSort]           = useState('rel');
  const [page, setPage]           = useState(1);
  const [wishlist, setWishlist]   = useState([]);  // local shortlist

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ q: query, category, condition, sort, page, limit: 20 });
    const res = await fetch('/api/listings?' + params);
    const data = await res.json();
    setListings(data.listings || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [query, category, condition, sort, page]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const t = setInterval(fetchListings, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [fetchListings]);

  const toggleWish = (id) => {
    setWishlist(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const wishedItems = listings.filter(l => wishlist.includes(l.id));
  const wishlistUrl = '/wishlist/new'; // pass wishedItems via query or localStorage

  return (
    <>
      <Head>
        <title>LabXChange — Pharma & Life Science Equipment Marketplace</title>
        <meta name="description" content="Search new and used scientific instruments for pharma, drug discovery, DMPK, and life science" />
      </Head>

      <main className={styles.main}>
        <header className={styles.header}>
          <h1>🧪 LabXChange</h1>
          <p>Scientific & pharma equipment marketplace — updated daily</p>
          <Link href="/wishlist/shared" className={styles.sharedLink}>
            → Open shared wishlist page
          </Link>
        </header>

        {/* Search bar */}
        <div className={styles.searchBox}>
          <div className={styles.searchRow}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchListings()}
              placeholder="Search by instrument, spec, or keyword…"
              className={styles.searchInput}
            />
            <button onClick={fetchListings} className={styles.searchBtn} disabled={loading}>
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>

          {/* Condition tabs */}
          <div className={styles.filterRow}>
            <span className={styles.filterLabel}>Condition:</span>
            {['ALL','NEW','USED'].map(c => (
              <button key={c}
                className={[styles.tab, condition===c ? styles.tabActive : ''].join(' ')}
                onClick={() => setCondition(c)}>
                {c==='ALL' ? 'All' : c==='NEW' ? 'New' : 'Used'}
              </button>
            ))}
            <span className={styles.divider} />
            <span className={styles.filterLabel}>Category:</span>
            {CATEGORIES.map(c => (
              <button key={c}
                className={[styles.tab, category===c ? styles.tabActive : ''].join(' ')}
                onClick={() => setCategory(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Results header */}
        <div className={styles.resultsHeader}>
          <span className={styles.resultsCount}>
            {loading ? 'Loading…' : `${total} instruments`}
          </span>
          <select value={sort} onChange={e => setSort(e.target.value)} className={styles.sortSelect}>
            <option value="rel">Relevance</option>
            <option value="priceAsc">Price: Low to high</option>
            <option value="priceDesc">Price: High to low</option>
            <option value="newest">Newest first</option>
          </select>
        </div>

        {/* Wishlist bar */}
        {wishlist.length > 0 && (
          <div className={styles.wishBar}>
            <span>❤ {wishlist.length} item{wishlist.length!==1?'s':''} shortlisted</span>
            <Link href={{ pathname: '/wishlist/new', query: { ids: wishlist.join(',') } }}
              className={styles.wishBtn}>
              Submit wishlist →
            </Link>
          </div>
        )}

        {/* Listing cards */}
        <div className={styles.cardGrid}>
          {listings.map(item => (
            <div key={item.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.cardLeft}>
                  <h3 className={styles.cardTitle}>{item.name}</h3>
                  <p className={styles.cardSpec}>{item.spec}</p>
                  <div className={styles.cardBadges}>
                    <span className={item.condition==='NEW' ? styles.badgeNew : styles.badgeUsed}>
                      {item.condition} · {item.year}
                    </span>
                    <span className={styles.badgeCat}>{item.category}</span>
                  </div>
                </div>
                <div className={styles.cardPrice}>
                  <div className={styles.priceVal}>
                    {item.price ? `\$${item.price.toLocaleString()}` : 'POA'}
                  </div>
                  <div className={styles.priceNote}>
                    {item.negotiable ? 'Negotiable' : 'Fixed'}
                  </div>
                </div>
              </div>
              <div className={styles.cardMeta}>
                <span>🌐 <a href={item.source_url} target="_blank" rel="noreferrer">{item.source_name}</a></span>
                {item.contact_name && <span>👤 {item.contact_name}</span>}
                {item.contact_email && <span>✉ <a href={`mailto:${item.contact_email}`}>{item.contact_email}</a></span>}
              </div>
              <div className={styles.cardActions}>
                <button
                  className={[styles.btnWish, wishlist.includes(item.id) ? styles.wished : ''].join(' ')}
                  onClick={() => toggleWish(item.id)}>
                  {wishlist.includes(item.id) ? '❤ Shortlisted' : '♡ Shortlist'}
                </button>
                <a href={`mailto:${item.contact_email}?subject=Enquiry: ${item.name}`}
                   className={styles.btnContact}>
                  ✉ Contact vendor
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className={styles.pagination}>
            <button onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Prev</button>
            <span>Page {page} of {Math.ceil(total/20)}</span>
            <button onClick={() => setPage(p=>p+1)} disabled={page>=Math.ceil(total/20)}>Next →</button>
          </div>
        )}
      </main>
    </>
  );
}