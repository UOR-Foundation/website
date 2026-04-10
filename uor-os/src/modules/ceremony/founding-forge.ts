/**
 * Founding Forge — Sovereign Ceremony at n=6 (64-vertex lattice).
 *
 * Runs silently during account creation. Derives a deterministic
 * FoundingBlade from the user's identity, creating the genesis node
 * of their sovereign zero-knowledge graph.
 *
 * Pipeline:
 *   user_id + created_at → singleProofHash → datum (mod 64)
 *   → PRISM coordinates (stratum, spectrum) → moon phase
 *   → content-address the blade → write ceremony_cid to profile
 *
 * Pure derivation. Deterministic. Idempotent.
 */

import { singleProofHash } from "@/modules/uns/core/identity";
import { bytePopcount, byteBasis } from "@/lib/uor-ring";
import { supabase } from "@/integrations/supabase/client";

// ── Constants ───────────────────────────────────────────────────────────────

/** Ring dimension for the blade lattice. */
const N = 6;

/** Moon phases indexed by stratum (popcount 0–6). */
const MOON_PHASES = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗"] as const;

/** The six blade dimensions from the 64-star tetrahedron spec. */
const BLADE_DIMENSIONS = {
  d1: "Protection",
  d2: "Delegation",
  d3: "Memory",
  d4: "Connection",
  d5: "Computation",
  d6: "Value",
} as const;

// ── Types ───────────────────────────────────────────────────────────────────

export interface FoundingBlade {
  "@type": "ceremony:FoundingBlade";
  "ceremony:datum": number;
  "ceremony:stratum": number;
  "ceremony:spectrum": number[];
  "ceremony:phase": string;
  "ceremony:ring": string;
  "ceremony:dimensions": typeof BLADE_DIMENSIONS;
  "ceremony:userId": string;
  "ceremony:timestamp": string;
}

export interface CeremonyResult {
  blade: FoundingBlade;
  ceremonyCid: string;
  canonicalId: string;
  ipv6: string;
  glyph: string;
}

// ── Core forge ──────────────────────────────────────────────────────────────

/**
 * Forge the FoundingBlade for a user.
 *
 * Deterministic: same user_id + timestamp → same blade → same ceremony CID.
 */
async function forgeBlade(userId: string, timestamp: string): Promise<CeremonyResult> {
  // Step 1: Derive sovereign seed from user identity
  const seedIdentity = await singleProofHash({
    "@type": "ceremony:FoundingSeed",
    "ceremony:userId": userId,
    "ceremony:createdAt": timestamp,
    "ceremony:ring": `Z/(2^${N})Z`,
  });

  // Step 2: Extract datum from the first byte of the canonical hash, mod 64
  const hexHash = seedIdentity["u:canonicalId"].split(":").pop() ?? "";
  const firstByte = parseInt(hexHash.slice(0, 2), 16);
  const datum = firstByte % (1 << N); // mod 64

  // Step 3: Compute PRISM coordinates at n=6
  // For a 6-bit value, stratum = popcount, spectrum = active bit indices
  const stratum = bytePopcount(datum); // works for 6-bit values within a byte
  const spectrum = byteBasis(datum).filter(i => i < N); // only bits 0–5
  const phase = MOON_PHASES[stratum] ?? "🌑";

  // Step 4: Construct the blade object
  const blade: FoundingBlade = {
    "@type": "ceremony:FoundingBlade",
    "ceremony:datum": datum,
    "ceremony:stratum": stratum,
    "ceremony:spectrum": spectrum,
    "ceremony:phase": phase,
    "ceremony:ring": `Z/(2^${N})Z`,
    "ceremony:dimensions": BLADE_DIMENSIONS,
    "ceremony:userId": userId,
    "ceremony:timestamp": timestamp,
  };

  // Step 5: Content-address the blade itself → ceremony CID
  const bladeIdentity = await singleProofHash(blade);

  return {
    blade,
    ceremonyCid: bladeIdentity["u:cid"],
    canonicalId: bladeIdentity["u:canonicalId"],
    ipv6: bladeIdentity["u:ipv6"],
    glyph: bladeIdentity["u:glyph"]["u:glyph"],
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Run the founding ceremony for a newly signed-in user.
 *
 * Idempotent: skips if ceremony_cid already exists on the profile.
 * Fire-and-forget safe: catches all errors, logs, never throws.
 */
export async function runFoundingCeremony(userId: string): Promise<CeremonyResult | null> {
  try {
    // Check if ceremony already performed
    const { data: profile } = await supabase
      .from("profiles")
      .select("ceremony_cid, claimed_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (profile?.ceremony_cid) {
      console.log("[ceremony] Already forged, skipping");
      return null;
    }

    const timestamp = profile?.claimed_at ?? new Date().toISOString();

    // Forge the blade
    const result = await forgeBlade(userId, timestamp);

    // Write to profile
    const { error } = await supabase
      .from("profiles")
      .update({
        ceremony_cid: result.ceremonyCid,
        uor_canonical_id: result.canonicalId,
        uor_ipv6: result.ipv6,
        uor_glyph: result.glyph,
        uor_cid: result.ceremonyCid,
      })
      .eq("user_id", userId);

    if (error) {
      console.error("[ceremony] Failed to write ceremony_cid:", error.message);
      return null;
    }

    console.log(
      `[ceremony] FoundingBlade forged — datum=${result.blade["ceremony:datum"]} ` +
      `stratum=${result.blade["ceremony:stratum"]} phase=${result.blade["ceremony:phase"]}`
    );

    return result;
  } catch (err) {
    console.error("[ceremony] Forge failed:", err);
    return null;
  }
}

export { MOON_PHASES, BLADE_DIMENSIONS, N as BLADE_RING_N };
