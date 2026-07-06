import styles from '../styles/SearchModal.module.css';

export default function SearchResultsModal({
  open,
  term,
  internalListings,
  internalTotal,
  internalLoading,
  sources,
  activeTab,
  onTabChange,
  onClose,
}) {
  if (!open || !term) return null;

  const active = sources.find((s) => s.id === activeTab) || sources[0];

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={`Search results for ${term}`}>
      <div className={styles.modal}>
        <header className={styles.header}>
          <div>
            <h2>Search: &ldquo;{term}&rdquo;</h2>
            <p className={styles.subtitle}>
              Our database + live external marketplace results
            </p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <section className={styles.internalSection}>
          <h3>
            Our synced inventory
            {internalLoading ? ' — loading…' : ` (${internalTotal})`}
          </h3>
          {internalLoading ? (
            <p className={styles.muted}>Searching database…</p>
          ) : internalListings.length === 0 ? (
            <p className={styles.muted}>
              No matches in our database. Check the live external results below — LabX and other sites may have listings for &ldquo;{term}&rdquo;.
            </p>
          ) : (
            <ul className={styles.internalList}>
              {internalListings.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <strong>{item.name}</strong>
                  {item.price ? ` — $${item.price.toLocaleString()}` : ' — POA'}
                  <span className={styles.sourceTag}>{item.source_name}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.externalSection}>
          <h3>Live external search</h3>
          <div className={styles.tabRow}>
            {sources.map((source) => (
              <button
                key={source.id}
                type="button"
                className={[styles.tab, activeTab === source.id ? styles.tabActive : ''].join(' ')}
                onClick={() => onTabChange(source.id)}>
                {source.name}
              </button>
            ))}
          </div>

          {active && (
            <div className={styles.frameWrap}>
              <div className={styles.frameBar}>
                <span>{active.name}</span>
                <a href={active.href} target="_blank" rel="noreferrer" className={styles.openNew}>
                  Open full page ↗
                </a>
              </div>
              <iframe
                key={`${active.id}-${term}`}
                title={`${active.name} search for ${term}`}
                src={active.href}
                className={styles.frame}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
              />
              <p className={styles.frameNote}>
                If the preview is blank, the site may block embedding — use <strong>Open full page ↗</strong> above.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
