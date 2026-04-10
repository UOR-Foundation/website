/**
 * UOR Proof Cache — deterministic proof generation & cache-first lookup.
 *
 * Every MCP tool result is assigned a UOR proof (SHA-256 fingerprint).
 * Subsequent identical requests are served from the proof cache.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const sb = createClient(supabaseUrl, supabaseKey);

// ── Hashing ─────────────────────────────────────────────────────────────────

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Sort object keys recursively for deterministic serialization. */
function sortKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sortKeys);
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, sortKeys(v)]),
  );
}

/** Canonical input string from tool name + arguments. */
export function canonicalizeInput(
  toolName: string,
  args: Record<string, unknown>,
): string {
  return JSON.stringify({ tool: toolName, args: sortKeys(args) });
}

// ── Lookup ──────────────────────────────────────────────────────────────────

export interface ProofCacheHit {
  proof_id: string;
  output_cached: string;
  epistemic_grade: string;
  hit_count: number;
}

/**
 * Check whether a proven result exists for this input.
 * Returns the cached output if found, null otherwise.
 */
export async function lookupProof(
  inputHash: string,
): Promise<ProofCacheHit | null> {
  try {
    const { data, error } = await sb
      .from("uor_inference_proofs")
      .select("proof_id, output_cached, epistemic_grade, hit_count")
      .eq("input_hash", inputHash)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    // Increment hit count asynchronously (fire-and-forget)
    sb.from("uor_inference_proofs")
      .update({ hit_count: (data.hit_count ?? 0) + 1, last_hit_at: new Date().toISOString() })
      .eq("input_hash", inputHash)
      .then(() => {});

    return data as ProofCacheHit;
  } catch {
    return null;
  }
}

// ── Store ───────────────────────────────────────────────────────────────────

/**
 * Store a new proof after a fresh computation.
 * Only Grade A and B results are cached.
 */
export async function storeProof(
  toolName: string,
  canonicalInput: string,
  inputHash: string,
  outputJson: string,
  epistemicGrade: string,
): Promise<string | null> {
  // Only cache high-trust results
  if (epistemicGrade !== "A" && epistemicGrade !== "B") return null;

  try {
    const outputHash = await sha256(outputJson);
    const proofId = `urn:uor:proof:sha256:${await sha256(inputHash + "=" + outputHash)}`;

    await sb.from("uor_inference_proofs").upsert(
      {
        proof_id: proofId,
        input_hash: inputHash,
        output_hash: outputHash,
        tool_name: toolName,
        input_canonical: canonicalInput,
        output_cached: outputJson,
        epistemic_grade: epistemicGrade,
        hit_count: 0,
      },
      { onConflict: "proof_id" },
    );

    return proofId;
  } catch {
    // Non-critical: if storage fails, the result is still returned fresh
    return null;
  }
}

/** Compute the SHA-256 input hash for a canonical input string. */
export async function hashInput(canonicalInput: string): Promise<string> {
  return sha256(canonicalInput);
}
