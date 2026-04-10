/**
 * Persistence Provider Registry.
 * ═══════════════════════════════
 *
 * Manages the active persistence provider.
 * Default: Supabase when authenticated, local when offline/anonymous.
 */

import type { PersistenceProvider } from "./types";
import { supabaseProvider } from "./supabase-provider";
import { localProvider } from "./local-provider";

let activeProvider: PersistenceProvider = localProvider;
let initialized = false;

/**
 * Get the current active persistence provider.
 */
export function getProvider(): PersistenceProvider {
  return activeProvider;
}

/**
 * Set a custom persistence provider (for backend swaps).
 */
export function setProvider(provider: PersistenceProvider): void {
  activeProvider = provider;
  initialized = true;
  console.log(`[Persistence] Provider set to: ${provider.name}`);
}

/**
 * Auto-detect and initialize the appropriate provider.
 * Called once on app boot.
 */
export async function initProvider(): Promise<PersistenceProvider> {
  if (initialized) return activeProvider;

  try {
    // Dynamically import to avoid hard coupling
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: { session } } = await supabase.auth.getSession();

    if (session && navigator.onLine) {
      activeProvider = supabaseProvider;
    } else {
      activeProvider = localProvider;
    }
  } catch {
    activeProvider = localProvider;
  }

  initialized = true;
  console.log(`[Persistence] Initialized: ${activeProvider.name}`);
  return activeProvider;
}

// Re-export types and providers
export type { PersistenceProvider, ChangeEntry, SovereignBundle } from "./types";
export { supabaseProvider } from "./supabase-provider";
export { localProvider } from "./local-provider";
