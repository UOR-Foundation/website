/**
 * useSovereignty — React hook for sovereign identity lifecycle
 * ═════════════════════════════════════════════════════════════
 *
 * Bridges QSovereignty kernel extension to React component state.
 * Manages the full lifecycle: auth detection → genesis → resumption.
 *
 * Usage:
 *   const { sovereign, isLoading, error, runGenesis } = useSovereignty();
 *
 * The hook:
 *   1. Listens for auth state changes
 *   2. Checks if a sovereign identity already exists (profile.uor_canonical_id)
 *   3. If new user → enables ceremony trigger (runGenesis)
 *   4. If returning user → reconstructs sovereign state from profile
 *
 * @module qkernel/hooks/useSovereignty
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { getBackend } from "@/hologram/platform";
import { QSovereignty, type SovereignIdentity, type GenesisResult, type AuthUser } from "../q-sovereignty";
import { QFs } from "../q-fs";
import { QMmu } from "../q-mmu";
import { QSecurity } from "../q-security";
import { QEcc } from "../q-ecc";
import type { ThreeWordName } from "../q-three-word";

// ── Types ──────────────────────────────────────────────────────────

export interface SovereigntyState {
  /** The sovereign identity (null if not yet created) */
  sovereign: SovereignIdentity | null;
  /** The genesis result (available immediately after ceremony) */
  genesisResult: GenesisResult | null;
  /** Whether the hook is initializing / checking auth */
  isLoading: boolean;
  /** Whether a genesis ceremony is in progress */
  isCeremonyActive: boolean;
  /** Whether the user needs to go through the ceremony */
  needsCeremony: boolean;
  /** The authenticated user (null if not logged in) */
  authUser: AuthUser | null;
  /** Error state */
  error: string | null;
  /** Three-word name shortcut */
  threeWordName: ThreeWordName | null;
  /** Execute the founding ceremony */
  runGenesis: () => Promise<GenesisResult | null>;
  /** Persist the genesis result to the user's profile */
  persistGenesis: (result: GenesisResult) => Promise<boolean>;
}

// ── Kernel Singleton ───────────────────────────────────────────────
// A single kernel instance shared across all hook consumers.
// This prevents multiple genesis attempts.

let kernelFs: QFs | null = null;
let kernelSecurity: QSecurity | null = null;
let kernelEcc: QEcc | null = null;
let kernelSovereignty: QSovereignty | null = null;

function getKernel(): QSovereignty {
  if (!kernelSovereignty) {
    kernelEcc = new QEcc();
    kernelSecurity = new QSecurity(kernelEcc);
    const mmu = new QMmu();
    kernelFs = new QFs(mmu);
    kernelSovereignty = new QSovereignty(kernelFs, kernelSecurity, kernelEcc);
  }
  return kernelSovereignty;
}

// ── Hook ───────────────────────────────────────────────────────────

export function useSovereignty(): SovereigntyState {
  const [sovereign, setSovereign] = useState<SovereignIdentity | null>(null);
  const [genesisResult, setGenesisResult] = useState<GenesisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCeremonyActive, setIsCeremonyActive] = useState(false);
  const [needsCeremony, setNeedsCeremony] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  // ── Auth State Detection ───────────────────────────────────────
  useEffect(() => {
    mounted.current = true;

    const checkAuth = async () => {
      try {
        const backend = getBackend();
        const { data: { session } } = await backend.auth.getSession();
        if (!session?.user || !mounted.current) {
          setIsLoading(false);
          return;
        }

        const user: AuthUser = {
          id: session.user.id,
          email: session.user.email,
          displayName: session.user.user_metadata?.display_name,
        };
        setAuthUser(user);

        // Check if sovereign identity already exists in profile
        const { data: profile } = await backend
          .from("profiles")
          .select("uor_canonical_id, uor_cid, uor_glyph, uor_ipv6")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (profile?.uor_canonical_id) {
          // Returning user — identity already exists
          // The kernel sovereignty was created in a previous session;
          // we expose what we have from the profile
          setNeedsCeremony(false);
        } else {
          // New user — needs founding ceremony
          setNeedsCeremony(true);
        }
      } catch (err) {
        if (mounted.current) {
          setError(err instanceof Error ? err.message : "Auth check failed");
        }
      } finally {
        if (mounted.current) setIsLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = getBackend().auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted.current) return;

        if (event === "SIGNED_OUT") {
          setAuthUser(null);
          setSovereign(null);
          setGenesisResult(null);
          setNeedsCeremony(false);
          return;
        }

        if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
          const user: AuthUser = {
            id: session.user.id,
            email: session.user.email,
            displayName: session.user.user_metadata?.display_name,
          };
          setAuthUser(user);

          const { data: profile } = await getBackend()
            .from("profiles")
            .select("uor_canonical_id")
            .eq("user_id", session.user.id)
            .maybeSingle();

          setNeedsCeremony(!profile?.uor_canonical_id);
        }
      }
    );

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── Genesis Ceremony ───────────────────────────────────────────
  const runGenesis = useCallback(async (): Promise<GenesisResult | null> => {
    if (!authUser) {
      setError("No authenticated user. Cannot run genesis");
      return null;
    }

    if (isCeremonyActive) {
      setError("Ceremony already in progress");
      return null;
    }

    setIsCeremonyActive(true);
    setError(null);

    try {
      const kernel = getKernel();
      const result = await kernel.genesis(authUser);

      if (mounted.current) {
        setSovereign(result.sovereign);
        setGenesisResult(result);
        setNeedsCeremony(false);
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Genesis failed";
      if (mounted.current) setError(message);
      console.error("[QSovereignty] Genesis failed:", err);
      return null;
    } finally {
      if (mounted.current) setIsCeremonyActive(false);
    }
  }, [authUser, isCeremonyActive]);

  // ── Persist to Profile ─────────────────────────────────────────
  // SECURITY SEAL: This method is intentionally restricted.
  // Full sovereign profile persistence (ceremony_cid, trust_node_cid,
  // disclosure_policy_cid, collapse_intact) ONLY happens through
  // the vault-isolated ceremony in MySpacePanel.
  // This hook can update display fields but NOT ceremony-critical fields.
  const persistGenesis = useCallback(async (result: GenesisResult): Promise<boolean> => {
    if (!authUser) return false;

    console.warn(
      "[SecuritySeal] useSovereignty.persistGenesis called — " +
      "only non-ceremony fields will be updated. " +
      "Full sovereign persistence requires MySpacePanel → CeremonyVault."
    );

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          uor_canonical_id: result.sovereign.identity["u:canonicalId"],
          uor_cid: result.sovereign.identity["u:cid"],
          uor_glyph: result.sovereign.identity["u:glyph"],
          uor_ipv6: result.sovereign.identity["u:ipv6"],
          display_name: result.sovereign.threeWordName.display,
          // NOTE: ceremony_cid, trust_node_cid, disclosure_policy_cid,
          // collapse_intact, pqc_algorithm are SEALED — only writable
          // through the CeremonyVault in MySpacePanel.
        })
        .eq("user_id", authUser.id);

      if (updateError) throw updateError;
      return true;
    } catch (err) {
      console.error("[QSovereignty] Persist failed:", err);
      if (mounted.current) {
        setError(err instanceof Error ? err.message : "Persist failed");
      }
      return false;
    }
  }, [authUser]);

  return {
    sovereign,
    genesisResult,
    isLoading,
    isCeremonyActive,
    needsCeremony,
    authUser,
    error,
    threeWordName: sovereign?.threeWordName ?? null,
    runGenesis,
    persistGenesis,
  };
}
