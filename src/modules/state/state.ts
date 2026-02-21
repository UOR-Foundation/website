/**
 * UOR State Module — state: namespace implementation.
 *
 * Computes state:Frame objects for any value in Z/(2^n)Z.
 * A state:Frame describes the lifecycle context of a value:
 *   - Its partition component and binding
 *   - Entry/exit conditions for agent coordination
 *   - All possible transitions (one per ring operation)
 *
 * Delegates to:
 *   - ring-core for all arithmetic
 *   - lib/uor-ring for classifyByte
 *   - identity for IRI computation
 *
 * Zero duplication — reuses existing ring operations.
 */

import { UORRing, fromBytes } from "@/modules/ring-core/ring";
import { classifyByte } from "@/lib/uor-ring";
import { supabase } from "@/integrations/supabase/client";

// ── Types ───────────────────────────────────────────────────────────────────

export interface StateBinding {
  "@type": "state:StateBinding";
  "state:value": number;
  "state:quantum": number;
  "state:ringModulus": number;
  "state:component": string;
  "state:componentReason": string;
  "state:isIrreducible": boolean;
}

export interface EntryCondition {
  "@type": "state:EntryCondition";
  "state:isStableEntry": boolean;
  "state:reason": string;
}

export interface ExitCondition {
  "@type": "state:ExitCondition";
  "state:isPhaseBoundary": boolean;
  "state:isExterior": boolean;
  "state:reason": string;
}

export interface StateTransition {
  "@type": "state:Transition";
  "state:operation": string;
  "state:fromState": number;
  "state:toState": number;
  "state:fromComponent": string;
  "state:toComponent": string;
  "state:componentChanged": boolean;
  "state:formula": string;
}

export interface StateFrame {
  "@context": string;
  "@id": string;
  "@type": "state:Frame";
  summary: {
    value: number;
    component: string;
    stable_entry: boolean;
    phase_boundary: boolean;
    transition_count: number;
    critical_identity_holds: boolean;
  };
  "state:binding": StateBinding;
  "state:entryCondition": EntryCondition;
  "state:exitCondition": ExitCondition;
  "state:transitions": StateTransition[];
  "state:transitionCount": number;
  "state:reachableComponents": string[];
  "state:criticalIdentityHolds": boolean;
  "state:timestamp": string;
}

// ── Unary operation names ───────────────────────────────────────────────────

const UNARY_OPS = ["neg", "bnot", "succ", "pred"] as const;

// ── Compute state frame ────────────────────────────────────────────────────

/**
 * Compute a full state:Frame for a value x in ring R_n.
 * Mirrors the API's `/user/state` endpoint exactly.
 */
export function computeStateFrame(ring: UORRing, x: number): StateFrame {
  const bytes = ring.toBytes(x);
  const m = Number(ring.cycle);

  // Classification via existing classifyByte
  const classification = classifyByte(x, ring.bits);
  const component = classification.component;
  const reason = classification.reason;

  // Flags
  const isIdentity = x === 0;
  const isUnit = x === 1 || x === m - 1;
  const isPhaseBoundary = x === Math.floor(m / 2);
  const isIrreducible = x % 2 !== 0 && !isUnit;

  // Critical identity
  const negBnot = fromBytes(ring.neg(ring.bnot(bytes)));
  const succX = fromBytes(ring.succ(bytes));
  const critHolds = negBnot === succX;

  // Entry condition
  const entryCondition: EntryCondition = {
    "@type": "state:EntryCondition",
    "state:isStableEntry": isIdentity || isUnit,
    "state:reason": isIdentity
      ? `x=0 is the additive identity — canonical entry point for ring R_${ring.bits}`
      : isUnit
      ? `x=${x} is a ring unit (invertible) — stable coordination anchor`
      : `x=${x} is not an identity or unit — not a preferred entry state`,
  };

  // Exit condition
  const exitCondition: ExitCondition = {
    "@type": "state:ExitCondition",
    "state:isPhaseBoundary": isPhaseBoundary,
    "state:isExterior": component === "partition:ExteriorSet",
    "state:reason": isPhaseBoundary
      ? `x=${x} = 2^${ring.bits - 1} is a phase boundary — operations change character near this value`
      : component === "partition:ExteriorSet"
      ? `x=${x} is an exterior element — exit condition satisfied`
      : `x=${x} is interior — no exit condition triggered`,
  };

  // Transitions (unary only for state exploration)
  const transitions: StateTransition[] = UNARY_OPS.map((op) => {
    const resultBytes = ring[op](bytes);
    const nextVal = fromBytes(resultBytes);
    const nextClass = classifyByte(nextVal, ring.bits);
    return {
      "@type": "state:Transition",
      "state:operation": `op:${op}`,
      "state:fromState": x,
      "state:toState": nextVal,
      "state:fromComponent": component,
      "state:toComponent": nextClass.component,
      "state:componentChanged": component !== nextClass.component,
      "state:formula": `${op}(${x}) = ${nextVal}`,
    };
  });

  const reachableComponents = [...new Set(transitions.map((t) => t["state:toComponent"]))];

  return {
    "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
    "@id": `https://uor.foundation/instance/state-x${x}-n${ring.bits}`,
    "@type": "state:Frame",
    summary: {
      value: x,
      component,
      stable_entry: isIdentity || isUnit,
      phase_boundary: isPhaseBoundary,
      transition_count: transitions.length,
      critical_identity_holds: critHolds,
    },
    "state:binding": {
      "@type": "state:StateBinding",
      "state:value": x,
      "state:quantum": ring.quantum,
      "state:ringModulus": m,
      "state:component": component,
      "state:componentReason": reason,
      "state:isIrreducible": isIrreducible,
    },
    "state:entryCondition": entryCondition,
    "state:exitCondition": exitCondition,
    "state:transitions": transitions,
    "state:transitionCount": transitions.length,
    "state:reachableComponents": reachableComponents,
    "state:criticalIdentityHolds": critHolds,
    "state:timestamp": new Date().toISOString(),
  };
}

// ── Persistence ─────────────────────────────────────────────────────────────

export async function persistStateFrame(frame: StateFrame): Promise<void> {
  const { error } = await supabase.from("uor_state_frames" as any).insert({
    value: frame.summary.value,
    quantum: frame["state:binding"]["state:quantum"],
    component: frame.summary.component,
    is_stable_entry: frame.summary.stable_entry,
    is_phase_boundary: frame.summary.phase_boundary,
    transition_count: frame.summary.transition_count,
    critical_identity_holds: frame.summary.critical_identity_holds,
    frame_data: frame as unknown as Record<string, unknown>,
  } as any);
  if (error) throw new Error(`persistStateFrame failed: ${error.message}`);
}

export async function getRecentStateFrames(limit = 20): Promise<StateFrame[]> {
  const { data, error } = await supabase
    .from("uor_state_frames" as any)
    .select("frame_data")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.frame_data as StateFrame);
}
