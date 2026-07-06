/**
 * LabXChange — Daily Equipment Listing Scraper
 * =============================================
 * Runs as a Node.js script (cron job, GitHub Actions, or Supabase Edge Function).
 * Fetches new/updated listings from LabX, BioSurplus, EquipNet, and others.
 * Upserts into Supabase `listings` table and writes a scrape_log entry.
 *
 * SETUP:
 *   npm install @supabase/supabase-js axios cheerio node-cron dotenv
 *
 * ENV VARS (.env file):
 *   SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY=your_service_role_key
 *   RUN_NOW=true   (optional: skip cron, run immediately)
 */

import 'dotenv/config';
import axios from 'axios';
import * as cheerio from 'cheerio';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ──────────────────────────────────────────────
// CATEGORY + TAG CLASSIFIER
// Maps keywords found in listing titles/specs → our standard categories
// ──────────────────────────────────────────────
const CATEGORY_RULES = [
  { keywords: ['hplc','uplc','lc-ms','gc-ms','gc/ms','mass spec','spectrometer','nmr','ftir','uv-vis','spectroscopy','chromatograph'], category: 'Analytical' },
  { keywords: ['reactor','synthesizer','rotovap','rotary evaporator','distillation','reflux','synthesis'], category: 'Synthesis' },
  { keywords: ['pcr','sequencer','centrifuge','incubator','microscope','flow cytometer','cell counter','biosafety cabinet'], category: 'Biology' },
  { keywords: ['bioreactor','fermenter','cell culture','biopharma','upstream','downstream','filtration','tangential'], category: 'Life Science' },
  { keywords: ['liquid handler','plate reader','echo','mosquito','hts','high throughput','assay'], category: 'Drug Discovery' },
  { keywords: ['dmpk','adme','metabolite','clearance','permeability','caco','pampa','microsomal'], category: 'DMPK' },
];

function classifyListing(name, spec) {
  const text = `${name} ${spec}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(k => text.includes(k))) return rule.category;
  }
  return 'Analytical'; // fallback
}

function extractTags(name, spec) {
  const text = `${name} ${spec}`.toLowerCase();
  const ALL_TAGS = ['hplc','uplc','lc-ms','gc-ms','nmr','mass spec','ftir','uv-vis','pcr','qpcr','centrifuge',
    'microscope','flow cytometer','liquid handler','plate reader','bioreactor','nmr','synthesizer',
    'autosampler','detector','incubator','spectrophotometer','cell counter','sequencer','hts','dmpk','adme',
    'echo','labcyte'];
  return ALL_TAGS.filter(t => text.includes(t));
}

function parsePrice(str) {
  if (!str) return null;
  const n = parseFloat(str.replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : n;
}

// ──────────────────────────────────────────────
// SOURCE SCRAPERS
// Each returns: [{ name, spec, condition, price, negotiable, source_name, source_url,
//                  contact_name, contact_email, year, tags, category }]
// ──────────────────────────────────────────────

/**
 * LabX.com — world's largest used lab equipment marketplace
 * They have a public search page. We scrape the results list.
 */
async function scrapeLabX() {
  const results = [];
  const SEARCH_TERMS = ['HPLC', 'mass spectrometer', 'NMR', 'PCR', 'centrifuge', 'liquid handler', 'bioreactor', 'Labcyte Echo', 'Echo 650'];

  for (const term of SEARCH_TERMS) {
    try {
      const url = `https://www.labx.com/listing/search?q=${encodeURIComponent(term)}&type=instrument`;
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LabXChange-Bot/1.0)' },
        timeout: 10000
      });
      const $ = cheerio.load(data);

      // LabX listing cards (selector may need adjustment if site updates)
      $('.listing-card, .instrument-result, [data-listing-id]').each((_, el) => {
        const name    = $(el).find('.listing-title, h3, .instrument-name').first().text().trim();
        const spec    = $(el).find('.listing-description, .spec, .subtitle').first().text().trim();
        const priceRaw = $(el).find('.listing-price, .price').first().text().trim();
        const href    = $(el).find('a').first().attr('href');
        const contact = $(el).find('.seller-name, .contact-name').first().text().trim();
        const email   = $(el).find('a[href^="mailto:"]').first().attr('href')?.replace('mailto:','') || '';
        const yearRaw  = $(el).find('.listing-year, .year').first().text().trim();

        if (!name) return;

        results.push({
          name,
          spec: spec || '',
          condition: 'USED',
          price: parsePrice(priceRaw),
          negotiable: priceRaw.toLowerCase().includes('obo') || priceRaw.toLowerCase().includes('negotiable'),
          source_name: 'LabX.com',
          source_url: href ? (href.startsWith('http') ? href : `https://www.labx.com${href}`) : url,
          contact_name: contact || null,
          contact_email: email || null,
          year: parseInt(yearRaw) || null,
          category: classifyListing(name, spec),
          tags: extractTags(name, spec),
          scraped_at: new Date().toISOString()
        });
      });
    } catch (err) {
      console.warn(`LabX scrape failed for "${term}":`, err.message);
    }
  }
  return results;
}

/**
 * BioSurplus.com — used biotech & pharma equipment
 */
async function scrapeBioSurplus() {
  const results = [];
  const CATEGORIES = ['hplc-systems', 'mass-spectrometers', 'liquid-handlers', 'centrifuges', 'bioreactors'];

  for (const cat of CATEGORIES) {
    try {
      const url = `https://www.biosurplus.com/category/${cat}/`;
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LabXChange-Bot/1.0)' },
        timeout: 10000
      });
      const $ = cheerio.load(data);

      $('.product, .equipment-item, .listing').each((_, el) => {
        const name    = $(el).find('h2, h3, .product-title').first().text().trim();
        const spec    = $(el).find('.description, p').first().text().trim();
        const priceRaw = $(el).find('.price, .product-price').first().text().trim();
        const href    = $(el).find('a').first().attr('href');

        if (!name) return;

        results.push({
          name,
          spec: spec || '',
          condition: 'USED',
          price: parsePrice(priceRaw),
          negotiable: true,
          source_name: 'BioSurplus.com',
          source_url: href ? (href.startsWith('http') ? href : `https://www.biosurplus.com${href}`) : url,
          contact_name: 'BioSurplus Sales',
          contact_email: 'sales@biosurplus.com',
          year: null,
          category: classifyListing(name, spec),
          tags: extractTags(name, spec),
          scraped_at: new Date().toISOString()
        });
      });
    } catch (err) {
      console.warn(`BioSurplus scrape failed for "${cat}":`, err.message);
    }
  }
  return results;
}

/**
 * EquipNet.com — global used industrial & lab equipment
 */
async function scrapeEquipNet() {
  const results = [];
  try {
    const url = 'https://www.equipnet.com/equipment/laboratory/';
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LabXChange-Bot/1.0)' },
      timeout: 10000
    });
    const $ = cheerio.load(data);

    $('.equipment-listing, .product-card, .listing-item').each((_, el) => {
      const name    = $(el).find('h2, h3, .title').first().text().trim();
      const spec    = $(el).find('.description, .details').first().text().trim();
      const priceRaw = $(el).find('.price').first().text().trim();
      const href    = $(el).find('a').first().attr('href');

      if (!name) return;

      results.push({
        name,
        spec: spec || '',
        condition: 'USED',
        price: parsePrice(priceRaw),
        negotiable: true,
        source_name: 'EquipNet.com',
        source_url: href ? (href.startsWith('http') ? href : `https://www.equipnet.com${href}`) : url,
        contact_name: 'EquipNet Sales',
        contact_email: 'sales@equipnet.com',
        year: null,
        category: classifyListing(name, spec),
        tags: extractTags(name, spec),
        scraped_at: new Date().toISOString()
      });
    });
  } catch (err) {
    console.warn('EquipNet scrape failed:', err.message);
  }
  return results;
}

/**
 * Aggregate all scrapers + fallback mock data for dev/testing
 */
async function scrapeAll() {
  console.log('[Scraper] Starting all sources...');
  const [labx, biosurplus, equipnet] = await Promise.all([
    scrapeLabX(),
    scrapeBioSurplus(),
    scrapeEquipNet()
  ]);
  const all = [...labx, ...biosurplus, ...equipnet];
  console.log(`[Scraper] Total raw listings fetched: ${all.length}`);
  return all;
}

// ──────────────────────────────────────────────
// DEDUP + UPSERT TO SUPABASE
// Uses (name + source_name) as unique key to avoid duplicates
// ──────────────────────────────────────────────
async function upsertListings(listings) {
  let added = 0, updated = 0, errors = 0;

  for (const listing of listings) {
    try {
      // Check if listing with same name+source already exists
      const { data: existing } = await supabase
        .from('listings')
        .select('id, price')
        .eq('name', listing.name)
        .eq('source_name', listing.source_name)
        .single();

      if (existing) {
        // Update if price changed or scraped_at needs refresh
        if (existing.price !== listing.price) {
          await supabase.from('listings').update({
            price: listing.price,
            spec: listing.spec,
            scraped_at: listing.scraped_at
          }).eq('id', existing.id);
          updated++;
        }
      } else {
        // Insert new listing
        const { error } = await supabase.from('listings').insert(listing);
        if (error) { console.error('Insert error:', error.message); errors++; }
        else added++;
      }
    } catch (err) {
      console.error('Upsert error:', err.message);
      errors++;
    }
  }

  return { added, updated, errors };
}

// ──────────────────────────────────────────────
// MAIN SYNC FUNCTION
// ──────────────────────────────────────────────
async function runDailySync() {
  console.log(`\n[LabXChange Sync] ${new Date().toISOString()}`);
  let totalAdded = 0, totalUpdated = 0;

  const sources = [
    { name: 'LabX.com',      fn: scrapeLabX },
    { name: 'BioSurplus.com', fn: scrapeBioSurplus },
    { name: 'EquipNet.com',  fn: scrapeEquipNet },
  ];

  for (const src of sources) {
    console.log(`  → Scraping ${src.name}...`);
    try {
      const listings = await src.fn();
      const { added, updated, errors } = await upsertListings(listings);
      totalAdded += added; totalUpdated += updated;
      console.log(`     ✓ ${added} added, ${updated} updated, ${errors} errors`);

      await supabase.from('scrape_log').insert({
        source: src.name,
        status: 'success',
        listings_added: added,
        listings_updated: updated
      });
    } catch (err) {
      console.error(`  ✗ ${src.name} failed:`, err.message);
      await supabase.from('scrape_log').insert({
        source: src.name,
        status: 'error',
        error_message: err.message
      });
    }
  }

  console.log(`\n[LabXChange Sync] Done — ${totalAdded} new, ${totalUpdated} updated\n`);
}

// ──────────────────────────────────────────────
// ENTRY POINT
// ──────────────────────────────────────────────
if (process.env.RUN_NOW === 'true') {
  // Run immediately (useful for GitHub Actions)
  runDailySync().catch(console.error);
} else {
  // Schedule: every day at 06:00 UTC
  console.log('[LabXChange Scraper] Scheduled — runs daily at 06:00 UTC');
  cron.schedule('0 6 * * *', () => runDailySync().catch(console.error));
  // Also run immediately on start
  runDailySync().catch(console.error);
}
