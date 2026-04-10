/**
 * Cloud-to-Local Handoff — Session Transfer via uor:// Deep-Link
 * ═════════════════════════════════════════════════════════════════
 *
 * Generates transfer tokens (browser side) and redeems them (desktop side)
 * to seamlessly migrate an authenticated session + desktop state.
 *
 * @layer desktop/handoff
 */

import { supabase } from "@/integrations/supabase/client";
import { createSnapshot, type SessionSnapshot } from "@/modules/data/sovereign-spaces/continuity/session-state";
import type { WindowState } from "@/modules/platform/desktop/hooks/useWindowManager";

// ── Types ───────────────────────────────────────────────────────────────

export interface HandoffResult {
  targetUrl: string;
  targetLens: string;
  snapshot: SessionSnapshot | null;
}

// ── Generate (browser-side) ─────────────────────────────────────────────

/**
 * Create a transfer token and return a `uor://handoff/{token}` URI.
 * The caller should display this as a clickable link and/or QR code.
 */
export async function generateHandoffLink(params: {
  windows: WindowState[];
  activeWindowId: string | null;
  theme: string;
  targetUrl?: string;
  targetLens?: string;
}): Promise<{ uri: string; token: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) throw new Error("You must be signed in to transfer your session");

  // Capture current session state
  const snapshot = createSnapshot({
    windows: params.windows,
    activeWindowId: params.activeWindowId,
    theme: params.theme,
    deviceId: "browser",
  });

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const res = await fetch(`${supabaseUrl}/functions/v1/portal-transfer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({
      target_url: params.targetUrl ?? "/",
      target_lens: params.targetLens ?? "overview",
      snapshot_data: snapshot,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create transfer token");
  }

  const { token } = await res.json();
  return { uri: `uor://handoff/${token}`, token };
}

// ── Redeem (desktop-side) ───────────────────────────────────────────────

/**
 * Redeem a handoff token: authenticate the user and return the session snapshot.
 */
export async function redeemHandoff(token: string): Promise<HandoffResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const res = await fetch(
    `${supabaseUrl}/functions/v1/portal-transfer?token=${encodeURIComponent(token)}`,
    {
      method: "GET",
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Token invalid or expired");
  }

  const data = await res.json();

  // Sign in via magic link OTP verification
  if (data.hashed_token && data.email) {
    const { error: otpErr } = await supabase.auth.verifyOtp({
      token_hash: data.hashed_token,
      email: data.email,
      type: "magiclink",
    });
    if (otpErr) throw new Error(`Sign-in failed: ${otpErr.message}`);
  }

  return {
    targetUrl: data.target_url ?? "/",
    targetLens: data.target_lens ?? "overview",
    snapshot: data.snapshot_data ?? null,
  };
}
