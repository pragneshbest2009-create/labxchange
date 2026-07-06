// pages/sourcing/echo-650.js
import Head from 'next/head';
import Link from 'next/link';
import { ECHO_650_BRIEF, queryCuratedListings } from '../../lib/curatedListings';
import { getSearchSourcesForQuery } from '../../lib/searchSources';
import styles from '../../styles/Sourcing.module.css';

const SOURCES = getSearchSourcesForQuery('Labcyte Echo 650');
const OPTIONS = queryCuratedListings({ q: 'echo' });

function contactHref(item) {
  if (item.contact_email) {
    return `mailto:${item.contact_email}?subject=Enquiry: ${encodeURIComponent(item.name)}`;
  }
  return item.source_url;
}

function contactLabel(item) {
  return item.contact_email ? '✉ Contact vendor' : '↗ View & contact on site';
}

export default function Echo650Sourcing() {
  return (
    <>
      <Head>
        <title>Labcyte Echo 650 — Sourcing | LabXChange</title>
        <meta name="description" content="Vendor options and external search sites for Labcyte Echo 650 liquid handler procurement" />
      </Head>

      <main className={styles.main}>
        <Link href="/" className={styles.backLink}>← Back to marketplace</Link>

        <header className={styles.header}>
          <h1>{ECHO_650_BRIEF.instrument}</h1>
          <p className={styles.subtitle}>Procurement research — vendor options &amp; external search sites</p>
        </header>

        <section className={styles.briefCard}>
          <h2>Action for {ECHO_650_BRIEF.assignee}</h2>
          <p>{ECHO_650_BRIEF.task}</p>
          <p className={styles.caution}>⚠ {ECHO_650_BRIEF.caution}</p>
        </section>

        <section className={styles.section}>
          <h2>Vendor options to contact</h2>
          <p className={styles.sectionNote}>Sorted by priority — budget listings flagged for spec verification.</p>
          <div className={styles.optionGrid}>
            {OPTIONS.map((item) => (
              <article key={item.id} className={styles.optionCard}>
                <div className={styles.optionTop}>
                  <h3>{item.name}</h3>
                  {item.priority === 'review' && <span className={styles.badgeReview}>Verify specs</span>}
                  {item.priority === 'high' && <span className={styles.badgeHigh}>Priority</span>}
                </div>
                <p className={styles.optionSpec}>{item.spec}</p>
                {item.notes && <p className={styles.optionNotes}>{item.notes}</p>}
                <div className={styles.optionMeta}>
                  <span className={styles.vendor}>{item.source_name}</span>
                  <span className={styles.price}>
                    {item.price ? `$${item.price.toLocaleString()}` : 'POA'}
                  </span>
                </div>
                <div className={styles.optionActions}>
                  <a href={item.source_url} target="_blank" rel="noreferrer" className={styles.btnPrimary}>
                    Open listing
                  </a>
                  <a href={contactHref(item)} target="_blank" rel="noreferrer" className={styles.btnSecondary}>
                    {contactLabel(item)}
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2>External search websites</h2>
          <p className={styles.sectionNote}>Use these sites to find additional Echo 650 options and compare pricing.</p>
          <ul className={styles.sourceList}>
            {SOURCES.map((source) => (
              <li key={source.id} className={styles.sourceItem}>
                <div>
                  <a href={source.href} target="_blank" rel="noreferrer" className={styles.sourceName}>
                    {source.name}
                  </a>
                  <p className={styles.sourceDesc}>{source.description}</p>
                </div>
                <a href={source.href} target="_blank" rel="noreferrer" className={styles.sourceBtn}>
                  Search →
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.checklist}>
          <h2>Before purchasing — confirm with vendor</h2>
          <ul>
            <li>Exact model (Echo 550 vs 650) and software version</li>
            <li>Tip type, tip inventory, and transducer condition</li>
            <li>Calibration / QC records and last service date</li>
            <li>Included accessories, PC, and license keys</li>
            <li>Installation, training, and warranty terms</li>
          </ul>
        </section>
      </main>
    </>
  );
}
