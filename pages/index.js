// pages/index.js
import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import styles from '../styles/Home.module.css';

const CATEGORIES = ['All','Analytical','Synthesis','Biology','Life Science','Drug Discovery','DMPK'];

export default function Home() {
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchInfo, setSearchInfo] = useState('');
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [condition, setCondition] = useState('ALL');
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('rel');
  const [pricedOnly, setPricedOnly] = useState(true);
  const [pricedCount, setPricedCount] = useState(0);
  const [page, setPage] = useState(1);
  const [wishlist, setWishlist] = useState([]);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({
      q: searchQuery,
      category,
      condition,
      sort,
      page,
      limit: 20,
      pricedOnly: pricedOnly ? '1' : '0',
    });
    try {
      const res = await fetch('/api/search?' + params);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setListings(data.listings || []);
      setTotal(data.total || 0);
      setPricedCount(data.pricedCount || 0);
      setSearchInfo(data.message || '');
    } catch (err) {
      setListings([]);
      setTotal(0);
      setError(err.message || 'Search agent could not reach the web. Try again.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, category, condition, sort, page, pricedOnly]);

  const runSearch = () => {
    setPage(1);
    setSearchQuery(query.trim());
  };

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const contactHref = (item) => {
    if (item.contact_email) {
      return `mailto:${item.contact_email}?subject=Enquiry: ${encodeURIComponent(item.name)}`;
    }
    return item.source_url;
  };

  const contactLabel = (item) => (
    item.contact_email ? '✉ Contact vendor' : '↗ View listing'
  );

  const toggleWish = (id) => {
    setWishlist((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <>
      <Head>
        <title>LabXChange — Pharma & Life Science Equipment Marketplace</title>
        <meta name="description" content="Search lab and pharma equipment across the internet — LabX, EquipNet, Machinio, and more" />
      </Head>

      <main className={styles.main}>
        <header className={styles.header}>
          <h1>🧪 LabXChange</h1>
          <p>Search used &amp; new lab equipment across the internet</p>
          <Link href="/wishlist/shared" className={styles.sharedLink}>
            → Open shared wishlist page
          </Link>
          <Link href="/sourcing/echo-650" className={styles.sharedLink}>
            → Labcyte Echo 650 sourcing
          </Link>
        </header>

        <div className={styles.searchBox}>
          <div className={styles.searchRow}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              placeholder="Search any instrument — biotage, HPLC, Echo 650, centrifuge…"
              className={styles.searchInput}
            />
            <button onClick={runSearch} className={styles.searchBtn} disabled={loading}>
              {loading ? 'Searching (up to 1 min)…' : 'Search'}
            </button>
          </div>
          <p className={styles.searchHint}>
            Deep search across LabX, EquipNet, Machinio, BioSurplus, and the wider web — may take up to 1 minute to fetch listed prices.
          </p>

          <div className={styles.filterRow}>
            <span className={styles.filterLabel}>Condition:</span>
            {['ALL','NEW','USED'].map((c) => (
              <button
                key={c}
                type="button"
                className={[styles.tab, condition === c ? styles.tabActive : ''].join(' ')}
                onClick={() => { setCondition(c); setPage(1); }}>
                {c === 'ALL' ? 'All' : c === 'NEW' ? 'New' : 'Used'}
              </button>
            ))}
            <span className={styles.divider} />
            <span className={styles.filterLabel}>Category:</span>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className={[styles.tab, category === c ? styles.tabActive : ''].join(' ')}
                onClick={() => { setCategory(c); setPage(1); }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className={styles.errorBanner} role="alert">{error}</div>
        )}

        <div className={styles.resultsHeader}>
          <span className={styles.resultsCount}>
            {loading
              ? 'Deep search in progress — checking listing pages for prices…'
              : `${total} result${total === 1 ? '' : 's'}${pricedCount > 0 ? ` · ${pricedCount} with listed prices` : ''}`}
            {searchInfo && !loading && <span className={styles.agentNote}> · {searchInfo}</span>}
          </span>
          <div className={styles.resultsControls}>
            <label className={styles.pricedToggle}>
              <input
                type="checkbox"
                checked={pricedOnly}
                onChange={(e) => { setPricedOnly(e.target.checked); setPage(1); }}
              />
              Listed prices only
            </label>
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              className={styles.sortSelect}>
              <option value="rel">Relevance</option>
              <option value="priceAsc">Price: Low to high</option>
              <option value="priceDesc">Price: High to low</option>
            </select>
          </div>
        </div>

        {wishlist.length > 0 && (
          <div className={styles.wishBar}>
            <span>❤ {wishlist.length} shortlisted</span>
            <Link href={{ pathname: '/wishlist/new', query: { ids: wishlist.join(',') } }} className={styles.wishBtn}>
              Submit wishlist →
            </Link>
          </div>
        )}

        {!loading && total === 0 && searchQuery && (
          <div className={styles.noResults}>
            <h2>No results for &ldquo;{searchQuery}&rdquo;</h2>
            <p>
              {pricedOnly
                ? 'No listings with a listed price were found. Uncheck “Listed prices only” to see all matches.'
                : 'Try a broader term, a different category, or check spelling.'}
            </p>
          </div>
        )}

        <div className={styles.cardGrid}>
          {listings.map((item) => (
            <div key={item.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.cardLeft}>
                  <h3 className={styles.cardTitle}>{item.name}</h3>
                  <p className={styles.cardSpec}>{item.spec}</p>
                  {item.notes && <p className={styles.cardNotes}>{item.notes}</p>}
                  <div className={styles.cardBadges}>
                    <span className={item.condition === 'NEW' ? styles.badgeNew : styles.badgeUsed}>
                      {item.condition}{item.year ? ` · ${item.year}` : ''}
                    </span>
                    <span className={styles.badgeCat}>{item.category}</span>
                    {item.external && <span className={styles.badgeWeb}>Web</span>}
                  </div>
                </div>
                <div className={styles.cardPrice}>
                  {item.price ? (
                    <>
                      <div className={styles.priceVal}>${item.price.toLocaleString()}</div>
                      <div className={styles.priceNote}>
                        {item.negotiable ? 'Negotiable' : 'Listed price'}
                      </div>
                    </>
                  ) : (
                    <div className={styles.priceContact}>Contact for price</div>
                  )}
                </div>
              </div>
              <div className={styles.cardMeta}>
                <span>🌐 <a href={item.source_url} target="_blank" rel="noreferrer">{item.source_name}</a></span>
              </div>
              <div className={styles.cardActions}>
                <button
                  type="button"
                  className={[styles.btnWish, wishlist.includes(item.id) ? styles.wished : ''].join(' ')}
                  onClick={() => toggleWish(item.id)}>
                  {wishlist.includes(item.id) ? '❤ Shortlisted' : '♡ Shortlist'}
                </button>
                <a
                  href={contactHref(item)}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.btnContact}>
                  {contactLabel(item)}
                </a>
              </div>
            </div>
          ))}
        </div>

        {total > 20 && (
          <div className={styles.pagination}>
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
            <span>Page {page} of {Math.ceil(total / 20)}</span>
            <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(total / 20)}>Next →</button>
          </div>
        )}
      </main>
    </>
  );
}
