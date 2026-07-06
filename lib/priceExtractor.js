import axios from 'axios';
import * as cheerio from 'cheerio';
import { parsePrice, hasPrice } from './classifyListing.js';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const FETCH_TIMEOUT = 8000;
const CONCURRENCY = 6;
const DEFAULT_BUDGET_MS = 52_000;

const MARKETPLACE_PRIORITY = [
  'machinio.com',
  'labx.com',
  'equipnet.com',
  'biosurplus.com',
  'ebay.com',
  'spectralabsci.com',
  'mckscientific.com',
  'labswapx.com',
  'dotmed.com',
  'govdeals.com',
  'newlifescientific.com',
  'lab-machines.com',
];

const DOMAIN_SELECTORS = {
  'machinio.com': ['.price', '.listing-price', '.price-value', '[data-listing-price]'],
  'labx.com': ['.listing-price', '.price-display', '.instrument-price', '.price'],
  'equipnet.com': ['.price', '.listing-price', '.equipment-price'],
  'biosurplus.com': ['.price', '.product-price', '.woocommerce-Price-amount'],
  'ebay.com': ['.x-price-primary', '.x-bin-price', '#prcIsum', '[itemprop="price"]'],
  'spectralabsci.com': ['.price', '.product-price', '.woocommerce-Price-amount'],
  'mckscientific.com': ['.price', '.product-price', '.woocommerce-Price-amount'],
  'labswapx.com': ['.price', '.product-price', '.woocommerce-Price-amount'],
  'dotmed.com': ['.price', '.listing-price'],
  'govdeals.com': ['.price', '.current-bid', '.buy-now-price'],
};

function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function isFetchableUrl(url) {
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    const host = u.hostname.toLowerCase();
    if (host.includes('duckduckgo.com') || host.includes('google.com')) return false;
    if (/\.(pdf|jpg|jpeg|png|gif|zip)$/i.test(u.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

function marketplacePriority(url) {
  const host = hostname(url);
  const idx = MARKETPLACE_PRIORITY.findIndex((d) => host.includes(d));
  return idx === -1 ? 99 : idx;
}

function validPrice(n) {
  return typeof n === 'number' && !Number.isNaN(n) && n >= 100 && n <= 50_000_000;
}

function normalizeRawPrice(raw) {
  if (raw == null) return null;
  if (typeof raw === 'number') return validPrice(raw) ? Math.round(raw) : null;
  const s = String(raw).trim();
  if (!s || /contact|request|call|quote|poa|inquire|n\/a/i.test(s)) return null;
  const parsed = parsePrice(s);
  if (parsed) return parsed;
  const digits = parseFloat(s.replace(/[^0-9.]/g, ''));
  return validPrice(digits) ? Math.round(digits) : null;
}

function pickBestPrice(candidates) {
  const valid = candidates.map(normalizeRawPrice).filter(Boolean);
  if (!valid.length) return null;
  return valid[0];
}

function extractJsonLdPrices($) {
  const prices = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || '');
      const nodes = Array.isArray(json) ? json : [json];
      for (const node of nodes) {
        collectOfferPrices(node, prices);
      }
    } catch {
      /* ignore malformed JSON-LD */
    }
  });
  return prices;
}

function collectOfferPrices(node, prices) {
  if (!node || typeof node !== 'object') return;

  if (node['@type'] === 'Product' || node['@type'] === 'Offer') {
    const offers = node.offers
      ? Array.isArray(node.offers)
        ? node.offers
        : [node.offers]
      : [node];
    for (const offer of offers) {
      if (offer?.price != null) prices.push(offer.price);
      if (offer?.lowPrice != null) prices.push(offer.lowPrice);
      if (offer?.highPrice != null) prices.push(offer.highPrice);
    }
    if (node.price != null) prices.push(node.price);
  }

  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') collectOfferPrices(value, prices);
  }
}

function extractMetaPrices($) {
  const prices = [];
  const selectors = [
    'meta[property="product:price:amount"]',
    'meta[property="og:price:amount"]',
    'meta[name="twitter:data1"]',
    'meta[itemprop="price"]',
  ];
  for (const sel of selectors) {
    const val = $(sel).attr('content');
    if (val) prices.push(val);
  }
  return prices;
}

function extractMicrodataPrices($) {
  const prices = [];
  $('[itemprop="price"]').each((_, el) => {
    const content = $(el).attr('content');
    const text = content || $(el).text();
    if (text) prices.push(text);
  });
  return prices;
}

function domainKey(url) {
  const host = hostname(url);
  return Object.keys(DOMAIN_SELECTORS).find((d) => host.includes(d)) || '';
}

function extractSelectorPrices($, url) {
  const prices = [];
  const key = domainKey(url);
  const selectors = DOMAIN_SELECTORS[key] || [];

  const generic = [
    ...selectors,
    '.price',
    '.product-price',
    '.listing-price',
    '.sale-price',
    '.current-price',
    '[class*="price"]',
    '[data-price]',
    '[data-product-price]',
  ];

  const seen = new Set();
  for (const sel of generic) {
    if (seen.has(sel)) continue;
    seen.add(sel);
    $(sel).each((_, el) => {
      const text = $(el).attr('data-price') || $(el).attr('content') || $(el).text();
      if (text?.trim()) prices.push(text.trim());
    });
    if (prices.length >= 3) break;
  }
  return prices;
}

function extractScriptPrices(html) {
  const prices = [];
  const patterns = [
    /"price(?:Amount)?"\s*:\s*["']?(\d[\d,]*\.?\d*)/gi,
    /"listPrice"\s*:\s*["']?(\d[\d,]*\.?\d*)/gi,
    /"salePrice"\s*:\s*["']?(\d[\d,]*\.?\d*)/gi,
    /"amount"\s*:\s*["']?(\d[\d,]{3,}\.?\d*)/gi,
  ];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      prices.push(match[1]);
    }
  }
  return prices;
}

export function extractPriceFromHtml(html, url) {
  if (!html) return null;
  const $ = cheerio.load(html);
  const candidates = [
    ...extractJsonLdPrices($),
    ...extractMetaPrices($),
    ...extractMicrodataPrices($),
    ...extractSelectorPrices($, url),
    ...extractScriptPrices(html),
  ];

  const picked = pickBestPrice(candidates);
  if (picked) return picked;

  const bodyText = $('body').text().replace(/\s+/g, ' ');
  return parsePrice(bodyText);
}

export async function extractPriceFromUrl(url) {
  if (!isFetchableUrl(url)) return null;

  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: FETCH_TIMEOUT,
      maxRedirects: 5,
      maxContentLength: 2_000_000,
      validateStatus: (status) => status < 400,
    });

    if (typeof data !== 'string') return null;
    return extractPriceFromHtml(data, url);
  } catch {
    return null;
  }
}

export async function enrichListingsWithPrices(listings, { budgetMs = DEFAULT_BUDGET_MS } = {}) {
  const deadline = Date.now() + budgetMs;
  const needsPrice = listings
    .filter((l) => !hasPrice(l) && isFetchableUrl(l.source_url))
    .sort((a, b) => marketplacePriority(a.source_url) - marketplacePriority(b.source_url));

  let fetched = 0;
  let pagesChecked = 0;

  for (let i = 0; i < needsPrice.length && Date.now() < deadline; i += CONCURRENCY) {
    const batch = needsPrice.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (listing) => {
        if (Date.now() >= deadline) return;
        pagesChecked += 1;
        const price = await extractPriceFromUrl(listing.source_url);
        if (price) {
          listing.price = price;
          fetched += 1;
        }
      })
    );
  }

  const pricedCount = listings.filter(hasPrice).length;
  return { listings, pricesFetched: fetched, pagesChecked, pricedCount };
}
