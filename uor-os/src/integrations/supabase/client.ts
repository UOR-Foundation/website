/**
 * Supabase client — standalone-safe.
 *
 * When VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are missing or
 * set to placeholders, the app boots in offline mode with a no-op client
 * so the rest of the OS still renders.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

function isConfigured(): boolean {
  return (
    !!SUPABASE_URL &&
    !!SUPABASE_PUBLISHABLE_KEY &&
    !SUPABASE_URL.includes('placeholder') &&
    !SUPABASE_PUBLISHABLE_KEY.includes('placeholder')
  );
}

export const supabaseConfigured = isConfigured();

function buildClient(): SupabaseClient<Database> {
  if (supabaseConfigured) {
    return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { storage: localStorage, persistSession: true, autoRefreshToken: true },
    });
  }

  console.warn('[uor-os] Supabase not configured — running in offline mode.');

  // Minimal no-op shim that satisfies the SupabaseClient shape used by the app.
  const noop = () => ({ data: null, error: null });
  const noopAsync = async () => ({ data: null, error: null });
  const chainable: any = new Proxy({}, {
    get: () => (..._args: any[]) => chainable,
  });
  // Make terminal calls resolve
  chainable.then = (resolve: any) => resolve({ data: null, error: null });

  const shim: any = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: noopAsync,
      signInWithOAuth: noopAsync,
      signUp: noopAsync,
      signOut: async () => ({ error: null }),
      onAuthStateChange: (_cb: any) => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    from: () => chainable,
    functions: { invoke: noopAsync },
    storage: { from: () => chainable },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }), unsubscribe: () => {} }),
    rpc: noopAsync,
  };

  return shim as SupabaseClient<Database>;
}

export const supabase = buildClient();
