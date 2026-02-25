/**
 * Hologram AI Inference Cache — O(1) Memoization via UOR Content-Addressing
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * The holographic principle applied to inference: identical prompts produce
 * identical CIDs, enabling constant-time lookup of previously computed results.
 *
 * Three-path architecture:
 *   Path 1 — Cache hit:  singleProofHash(input) → uor_inference_proofs → instant replay
 *   Path 2 — Local miss:  WebGPU/WASM inference → cache write → future O(1)
 *   Path 3 — Cloud miss:  Lovable AI Gateway → cache write → future O(1)
 *
 * @module uns/core/hologram/inference-cache
 */

import { singleProofHash } from "@/lib/uor-canonical";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CacheHit {
  output: string;
  proofId: string;
  hitCount: number;
  epistemicGrade: string;
}

export interface CacheWriteInput {
  inputHash: string;
  inputCanonical: string;
  outputText: string;
  toolName: string;
  epistemicGrade?: string;
}

// ── Cache Check (Path 1 — O(1)) ───────────────────────────────────────────

/**
 * Hash the inference input and check the uor_inference_proofs table.
 * Returns cached output if found, null otherwise.
 */
export async function checkInferenceCache(
  prompt: string,
  modelId: string,
): Promise<CacheHit | null> {
  // Deterministic content-address: same prompt + model = same hash
  // Note: we exclude timestamp so identical queries always match
  const proof = await singleProofHash({
    "@type": "uor:AiInferenceInput",
    prompt,
    modelId,
  });

  const { data, error } = await supabase
    .from("uor_inference_proofs")
    .select("output_cached, proof_id, hit_count, epistemic_grade")
    .eq("input_hash", proof.hashHex)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  // Bump hit count asynchronously (fire-and-forget)
  supabase
    .from("uor_inference_proofs")
    .update({ hit_count: data.hit_count + 1, last_hit_at: new Date().toISOString() })
    .eq("input_hash", proof.hashHex)
    .then(() => {});

  return {
    output: data.output_cached,
    proofId: data.proof_id,
    hitCount: data.hit_count + 1,
    epistemicGrade: data.epistemic_grade,
  };
}

/**
 * Get the deterministic input hash for a prompt+model pair.
 */
export async function getInputHash(prompt: string, modelId: string) {
  return singleProofHash({
    "@type": "uor:AiInferenceInput",
    prompt,
    modelId,
  });
}

// ── Cache Write (after inference) ─────────────────────────────────────────

/**
 * Write a completed inference result to the cache for future O(1) lookups.
 */
export async function writeInferenceCache(input: CacheWriteInput): Promise<void> {
  const outputProof = await singleProofHash({
    "@type": "uor:AiInferenceOutput",
    output: input.outputText,
  });

  const { error } = await supabase.from("uor_inference_proofs").insert({

    input_hash: input.inputHash,
    input_canonical: input.inputCanonical,
    output_cached: input.outputText,
    output_hash: outputProof.hashHex,
    proof_id: `proof:${input.inputHash.slice(0, 16)}:${Date.now()}`,
    tool_name: input.toolName,
    epistemic_grade: input.epistemicGrade ?? "B",
    hit_count: 0,
  });

  if (error) {
    // Duplicate key is fine — another tab may have cached it first
    if (!error.message?.includes("duplicate")) {
      console.warn("[inference-cache] write failed:", error.message);
    }
  }
}

// ── Simulated Streaming (for cache hits) ──────────────────────────────────

/**
 * Replay cached text as a simulated token stream.
 * Splits on word boundaries and emits at ~5ms/token for ~200 tok/s feel.
 */
export function replayAsStream(
  text: string,
  onToken: (token: string) => void,
  onDone: () => void,
  intervalMs = 5,
): () => void {
  // Split into natural token-like chunks (words + whitespace)
  const tokens = text.match(/\S+\s*/g) || [text];
  let i = 0;
  let cancelled = false;

  const tick = () => {
    if (cancelled || i >= tokens.length) {
      if (!cancelled) onDone();
      return;
    }
    onToken(tokens[i]);
    i++;
    setTimeout(tick, intervalMs);
  };

  tick();

  // Return cancel function
  return () => { cancelled = true; };
}
