// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

function readConfig() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_KEY || '').trim();
  return { url, anonKey, serviceKey };
}

export function isSupabaseConfigured() {
  const { url, anonKey } = readConfig();
  return Boolean(url && anonKey && /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url));
}

export function getSupabaseConfigError() {
  const { url, anonKey } = readConfig();
  if (!url) return 'Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL).';
  if (!anonKey) return 'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.';
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(url)) {
    return 'NEXT_PUBLIC_SUPABASE_URL must look like https://your-project.supabase.co';
  }
  return null;
}

let _client = null;
let _admin = null;
let _reachability = { ok: null, checkedAt: 0 };
const REACHABILITY_TTL_MS = 120_000;

function fetchWithTimeout(url, options = {}) {
  const timeoutMs = Number(process.env.SUPABASE_FETCH_TIMEOUT_MS || 5000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const { signal, ...rest } = options;

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return fetch(url, { ...rest, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function createSupabaseClient(key) {
  const { url } = readConfig();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithTimeout },
  });
}

export function getSupabase() {
  const configError = getSupabaseConfigError();
  if (configError) throw new Error(configError);

  if (!_client) {
    const { anonKey } = readConfig();
    _client = createSupabaseClient(anonKey);
  }
  return _client;
}

export function getSupabaseAdmin() {
  const configError = getSupabaseConfigError();
  if (configError) throw new Error(configError);

  if (!_admin) {
    const { serviceKey } = readConfig();
    if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_KEY.');
    _admin = createSupabaseClient(serviceKey);
  }
  return _admin;
}

export function isConnectionError(error) {
  const msg = String(error?.message || error || '').toLowerCase();
  return (
    msg.includes('fetch failed') ||
    msg.includes('enotfound') ||
    msg.includes('econnrefused') ||
    msg.includes('getaddrinfo') ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('aborted')
  );
}

export async function isSupabaseReachable() {
  const configError = getSupabaseConfigError();
  if (configError) return false;

  if (Date.now() - _reachability.checkedAt < REACHABILITY_TTL_MS && _reachability.ok !== null) {
    return _reachability.ok;
  }

  const { url, anonKey } = readConfig();
  try {
    const res = await fetchWithTimeout(`${url.replace(/\/$/, '')}/rest/v1/`, {
      headers: { apikey: anonKey },
    });
    _reachability = { ok: true, checkedAt: Date.now() };
    return true;
  } catch (error) {
    _reachability = { ok: false, checkedAt: Date.now() };
    return false;
  }
}

export function markSupabaseUnreachable() {
  _reachability = { ok: false, checkedAt: Date.now() };
}

// Backward-compatible named exports used by API routes.
export const supabase = {
  from: (...args) => getSupabase().from(...args),
};

export const supabaseAdmin = {
  from: (...args) => getSupabaseAdmin().from(...args),
};
