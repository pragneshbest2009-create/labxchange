// pages/index.js
import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import SearchResultsModal from '../components/SearchResultsModal';
import styles from '../styles/Home.module.css';

const CATEGORIES = ['All','Analytical','Synthesis','Biology','Life Science','Drug Discovery','DMPK'];

export default function Home() {
  const [listings, setListings]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [warning, setWarning]     = useState('');
  const [query, setQuery]         = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [condition, setCondition] = useState('ALL');
  const [category, setCategory]   = useState('All');
  const [sort, setSort]           = useState('rel');
  const [page, setPage]           = useState(1);
  const [wishlist, setWishlist]   = useState([]);
  const [searchSources, setSearchSources] = useState([]);
  const [showSources, setShowSources] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [externalTab, setExternalTab] = useState('labx');

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError('');
    setWarning('');
    const params = new URLSearchParams({ q: searchQuery, category, condition, sort, page, limit: 20 });
    try {
      const res = await fetch('/api/listings?' + params);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setListings(data.listings || []);
      setTotal(data.total || 0);
      if (data.warning) setWarning(data.warning);
      if (searchQuery && (data.listings || []).length === 0) setShowSources(true);
    } catch (err) {
      setListings([]);
      setTotal(0);
      setError(err.message || 'Unable to load listings. Check your Supabase connection.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, category, condition, sort, page]);

  const runSearch = () => {
    const term = query.trim();
    setPage(1);
    setSearchQuery(term);
    if (term) {
      setShowSearchModal(true);
      setShowSources(true);
      setExternalTab('labx');
    }
  };

  useEffect(() => { fetchListings(); }, [fetchListings]);

  useEffect(() => {
    const q = searchQuery || query || 'liquid handler';
    fetch('/api/search-sources?q=' + encodeURIComponent(q))
      .then((r) => r.json())
      .then((data) => setSearchSources(data.sources || []))
      .catch(() => setSearchSources([]));
  }, [searchQuery, query]);

  useEffect(() => {
    if (!showSearchModal) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setShowSearchModal(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showSearchModal]);

  const contactHref = (item) => {
    if (item.contact_email) {
      return `mailto:${item.contact_email}?subject=Enquiry: ${encodeURIComponent(item.name)}`;
    }
    return item.source_url;
  };

  const contactLabel = (item) => (
    item.contact_email ? '✉ Contact vendor' : '↗ View & contact'
  );

  const activeSearchTerm = searchQuery || query;
  const labxSearchUrl = activeSearchTerm
    ? `https://www.labx.com/listing/search?q=${encodeURIComponent(activeSearchTerm)}&type=instrument`
    : 'https://www.labx.com/listing/search?type=instrument';

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
          <Link href="/sourcing/echo-650" className={styles.sharedLink}>
            → Labcyte Echo 650 sourcing (vendor list)
          </Link>
        </header>

        {/* Search bar */}
        <div className={styles.searchBox}>
          <div className={styles.searchRow}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runSearch()}
              placeholder="Search our synced inventory (e.g. HPLC, biotage, Echo 650)…"
              className={styles.searchInput}
            />
            <a
              href={labxSearchUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.labxBtn}
              title="Search live listings on LabX.com">
              LabX ↗
            </a>
            <button onClick={runSearch} className={styles.searchBtn} disabled={loading}>
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>
          <p className={styles.searchHint}>
            Click <strong>Search</strong> to query our database and open a popup with live LabX, EquipNet, and other marketplace results for the same term.
          </p>

          {/* Condition tabs */}
          <div className={styles.filterRow}>
            <span className={styles.filterLabel}>Condition:</span>
            {['ALL','NEW','USED'].map(c => (
              <button key={c}
                className={[styles.tab, condition===c ? styles.tabActive : ''].join(' ')}
                onClick={() => { setCondition(c); setPage(1); }}>
                {c==='ALL' ? 'All' : c==='NEW' ? 'New' : 'Used'}
              </button>
            ))}
            <span className={styles.divider} />
            <span className={styles.filterLabel}>Category:</span>
            {CATEGORIES.map(c => (
              <button key={c}
                className={[styles.tab, category===c ? styles.tabActive : ''].join(' ')}
                onClick={() => { setCategory(c); setPage(1); }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {searchQuery && !showSearchModal && (
          <button type="button" className={styles.reopenModal} onClick={() => setShowSearchModal(true)}>
            ↗ Reopen live external search for &ldquo;{searchQuery}&rdquo;
          </button>
        )}

        <div className={styles.sourcesBox}>
          <button
            type="button"
            className={styles.sourcesToggle}
            onClick={() => setShowSources((v) => !v)}
            aria-expanded={showSources}>
            {showSources ? '▾' : '▸'} Search external websites ({searchSources.length})
          </button>
          {showSources && (
            <ul className={styles.sourcesList}>
              {searchSources.map((source) => (
                <li key={source.id} className={styles.sourceRow}>
                  <div>
                    <a href={source.href} target="_blank" rel="noreferrer">{source.name}</a>
                    <span className={styles.sourceDesc}>{source.description}</span>
                  </div>
                  <a href={source.href} target="_blank" rel="noreferrer" className={styles.sourceGo}>Open →</a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {warning && (
          <div className={styles.warningBanner} role="status">
            {warning}
          </div>
        )}

        {error && (
          <div className={styles.errorBanner} role="alert">
            {error}
          </div>
        )}

        {/* Results header */}
        <div className={styles.resultsHeader}>
          <span className={styles.resultsCount}>
            {loading ? 'Loading…' : `${total} instruments`}
          </span>
          <select value={sort} onChange={e => { setSort(e.target.value); setPage(1); }} className={styles.sortSelect}>
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

        {/* No results — point to LabX and external sites */}
        {!loading && searchQuery && total === 0 && (
          <div className={styles.noResults}>
            <h2>No &ldquo;{searchQuery}&rdquo; in our synced inventory</h2>
            <p>
              LabXChange searches your database ({total} matches). LabX.com has many more listings
              that are not synced here yet.
            </p>
            <div className={styles.noResultsActions}>
              <a href={labxSearchUrl} target="_blank" rel="noreferrer" className={styles.btnLabxPrimary}>
                Search &ldquo;{searchQuery}&rdquo; on LabX.com →
              </a>
            </div>
            <p className={styles.noResultsNote}>
              Tip: expand <strong>Search external websites</strong> below for EquipNet, Machinio, and other dealers.
            </p>
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
                  {item.notes && <p className={styles.cardNotes}>{item.notes}</p>}
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
                <a href={contactHref(item)}
                   target={item.contact_email ? undefined : '_blank'}
                   rel={item.contact_email ? undefined : 'noreferrer'}
                   className={styles.btnContact}>
                  {contactLabel(item)}
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

      <SearchResultsModal
        open={showSearchModal}
        term={searchQuery}
        internalListings={listings}
        internalTotal={total}
        internalLoading={loading}
        sources={searchSources}
        activeTab={externalTab}
        onTabChange={setExternalTab}
        onClose={() => setShowSearchModal(false)}
      />
    </>
  );
}