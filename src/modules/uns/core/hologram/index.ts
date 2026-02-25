/**
 * UOR Hologram Projection Registry
 * ═════════════════════════════════
 *
 * Every UOR object is a hologram: one canonical identity, infinite projections.
 *
 * A projection is a pure function that maps hash bytes to a protocol-native
 * identifier. Just as IPv6, CID, and Braille are projections of the same
 * SHA-256 hash, so are ActivityPub IDs, AT Protocol URIs, WebFinger accounts,
 * and every other standard on earth.
 *
 * One object. One hash. Every standard.
 *
 *   const identity = await singleProofHash(obj);
 *   const hologram = project(identity);
 *   hologram.did         → "did:uor:{cid}"
 *   hologram.activitypub → "https://uor.foundation/ap/objects/{hex}"
 *   hologram.webfinger   → "acct:{hex16}@uor.foundation"
 *
 * @module uns/core/hologram
 */

import type { UorCanonicalIdentity } from "../address";
import { SPECS } from "./specs";
import { SystemEventBus } from "@/modules/observable/system-event-bus";

// ── Types ───────────────────────────────────────────────────────────────────

/** The input every projection receives — derived from singleProofHash(). */
export interface ProjectionInput {
  /** Raw 32-byte SHA-256 digest. */
  readonly hashBytes: Uint8Array;
  /** CIDv1/dag-json/sha2-256/base32lower. */
  readonly cid: string;
  /** SHA-256 lowercase hex (64 chars). */
  readonly hex: string;
}

/** Whether the projection preserves the full 256-bit identity. */
export type Fidelity = "lossless" | "lossy";

/** A projection specification — one per external standard. */
export interface HologramSpec {
  /** Pure function: identity → protocol-native identifier string. */
  readonly project: (input: ProjectionInput) => string;
  /** Does this projection preserve the full 256-bit hash? */
  readonly fidelity: Fidelity;
  /** URL to the standard's specification. */
  readonly spec: string;
  /** Human-readable warning if lossy. */
  readonly lossWarning?: string;
}

/** The complete hologram: every registered projection of one identity. */
export interface Hologram {
  /** The source canonical identity. */
  readonly source: ProjectionInput;
  /** All projections keyed by standard name. */
  readonly projections: Readonly<Record<string, HologramProjection>>;
}

/** A single resolved projection. */
export interface HologramProjection {
  readonly value: string;
  readonly fidelity: Fidelity;
  readonly spec: string;
  readonly lossWarning?: string;
}

// ── Registry ────────────────────────────────────────────────────────────────

/** The live projection registry. Immutable after module load. */
export const PROJECTIONS: ReadonlyMap<string, HologramSpec> = SPECS;

// ── Projection Function ────────────────────────────────────────────────────

/** Input type: either a full canonical identity or a raw projection input. */
type ProjectionSource = UorCanonicalIdentity | ProjectionInput;

/**
 * Normalize any source into a ProjectionInput.
 */
function toInput(source: ProjectionSource): ProjectionInput {
  // If it already has `hex`, it's a ProjectionInput
  if ("hex" in source && "cid" in source && "hashBytes" in source) {
    return source as ProjectionInput;
  }
  // Otherwise it's a UorCanonicalIdentity
  const identity = source as UorCanonicalIdentity;
  const hex = identity["u:canonicalId"].split(":").pop()!;
  return { hashBytes: identity.hashBytes, cid: identity["u:cid"], hex };
}

/**
 * Project a UOR identity through all registered standards.
 *
 * Accepts either a UorCanonicalIdentity (from singleProofHash) or a raw
 * ProjectionInput (from certificate fields). This allows both the identity
 * pipeline and the certificate/DID/VC layers to use the same projection engine.
 *
 * @param source  UorCanonicalIdentity or ProjectionInput.
 * @param target  Optional — project only one standard by name.
 * @returns       The complete hologram, or a single projection if target specified.
 */
export function project(source: ProjectionSource): Hologram;
export function project(source: ProjectionSource, target: string): HologramProjection;
export function project(
  source: ProjectionSource,
  target?: string,
): Hologram | HologramProjection {
  const input = toInput(source);

  if (target) {
    const spec = PROJECTIONS.get(target);
    if (!spec) throw new Error(`Unknown projection: "${target}". Registered: ${[...PROJECTIONS.keys()].join(", ")}`);
    return resolve(spec, input);
  }

  const projections: Record<string, HologramProjection> = {};
  for (const [name, spec] of PROJECTIONS) {
    projections[name] = resolve(spec, input);
  }
  return { source: input, projections };
}

function resolve(spec: HologramSpec, input: ProjectionInput): HologramProjection {
  const value = spec.project(input);

  // Emit to system event bus: hash bytes → projection string as bytes
  const encoder = new TextEncoder();
  SystemEventBus.emit(
    "hologram",
    `project:${spec.fidelity === "lossless" ? "lossless" : "lossy"}`,
    new Uint8Array(input.hashBytes.slice(0, 8)),
    new Uint8Array(encoder.encode(value).slice(0, 16)),
  );

  return {
    value,
    fidelity: spec.fidelity,
    spec: spec.spec,
    ...(spec.lossWarning ? { lossWarning: spec.lossWarning } : {}),
  };
}

// ── Unified Projection (Identity + Coherence merged) ───────────────────────
// Re-export the unified API — the canonical way to project with coherence.

export { unifiedProject, assessByteCoherence } from "./unified";
export type {
  UnifiedHologram,
  UnifiedProjectionResult,
  ProjectionCoherence,
} from "./unified";

// ── Holographic Lens (Composable Projection Circuits) ──────────────────────
// A Lens is a content-addressed circuit of composable elements.
// Same elements + same wiring = same identity. Lenses ARE holograms.

export { composeLens, grindLens, focusLens, refractLens, dehydrate, rehydrate, roundTrip, nestLens, fromProjection, element, sequence, parallel } from "./lens";
export type {
  HolographicLens,
  LensElement,
  LensWire,
  LensMorphism,
  GroundLens,
  FocusResult,
  RefractionModality,
  RefractResult,
  DehydrationResult,
} from "./lens";

// ── Executable Blueprint (Self-Evolving Programs) ──────────────────────────
// The merger of LensBlueprint (WHAT) + PolyTree (HOW) = Executable Blueprint.
// One hash. One program. One identity. The holographic principle applied to code.

export {
  createExecutableBlueprint,
  grindExecutableBlueprint,
  boot,
  resume,
  forkExecutableBlueprint,
  compileScheduler,
  serializeExecutable,
  deserializeExecutable,
  STATIC_SCHEDULER,
  ADAPTIVE_SCHEDULER,
  LIFECYCLE_SCHEDULER,
} from "./executable-blueprint";
export type {
  ExecutableBlueprint,
  GroundExecutableBlueprint,
  IOChannel,
  IOChannelSet,
  RuntimeConstraints,
  SchedulerSpec,
  TransitionRule,
  TransitionEffect,
  HologramSession,
  InteractionResult,
  SuspendedSession,
} from "./executable-blueprint";

// ── Hologram Engine (The Kernel) ───────────────────────────────────────────
// The engine orchestrates the full lifecycle: spawn → tick → project → render.
// It manages a process table of sessions and produces UI projections each tick.

export { HologramEngine } from "./engine";
export type {
  EngineProcess,
  EngineTick,
  EngineSnapshot,
  EngineEvent,
  EngineListener,
} from "./engine";
