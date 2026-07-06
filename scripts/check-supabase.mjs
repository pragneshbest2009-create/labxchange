#!/usr/bin/env node
/**
 * Verify Supabase env vars and connectivity.
 * Usage: node scripts/check-supabase.mjs
 * Loads .env.local if present (Next.js) or .env (scraper).
 */
import { config } from 'dotenv';
import { existsSync } from 'fs';

if (existsSync('.env.local')) config({ path: '.env.local' });
else config();

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
const serviceKey = (process.env.SUPABASE_SERVICE_KEY || '').trim();

console.log('\nLabXChange — Supabase connection check\n');

if (!url) {
  console.error('✗ Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)');
  process.exit(1);
}
if (!anonKey) {
  console.error('✗ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

let host;
try {
  host = new URL(url).hostname;
  console.log(`  URL host: ${host}`);
} catch {
  console.error('✗ Invalid SUPABASE_URL format');
  process.exit(1);
}

try {
  const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
    headers: { apikey: anonKey },
    signal: AbortSignal.timeout(8000),
  });
  console.log(`✓ Supabase API reachable (HTTP ${res.status})`);
  if (!serviceKey) console.warn('  ⚠ SUPABASE_SERVICE_KEY not set (scraper needs this)');
  console.log('\nNext: run supabase/schema.sql in SQL Editor if tables are empty.\n');
} catch (err) {
  const code = err.cause?.code || err.message;
  console.error(`✗ Cannot reach Supabase (${code})`);
  console.error('\nThis usually means:');
  console.error('  • The project was deleted or paused in supabase.com/dashboard');
  console.error('  • The URL in .env.local / Vercel env vars is wrong');
  console.error('\nFix:');
  console.error('  1. Create a new project at https://supabase.com/dashboard');
  console.error('  2. SQL Editor → paste and run supabase/schema.sql');
  console.error('  3. Settings → API → copy Project URL + anon key + service_role key');
  console.error('  4. Update Vercel → Settings → Environment Variables → Redeploy\n');
  process.exit(1);
}
