/**
 * UOR v2.0.0 — Hologram OS Runtime Bridge
 * ════════════════════════════════════════
 *
 * The thinnest possible bridge between the v2 algebraic substrate
 * and the Hologram Engine. Rather than wrapping v2 types in new types,
 * this module provides factory functions that project v2 primitives
 * directly into the engine's existing abstractions.
 *
 * Key simplification (v2.0.0):
 *   - Delegates to HologramEngine for process management
 *   - Uses FiberBudget directly (no ProgressTracker wrapper)
 *   - Observable → Panel mapping is a pure projection
 *   - Certificate → Attestation is a pure projection
 *   - Context/Binding → engine FileDescriptor mapping is native
 *
 * The HologramState is the unified snapshot that combines:
 *   - EngineSnapshot (processes, ticks)
 *   - FiberBudget (resolution progress)
 *   - Panels (observable projections)
 *   - Attestations (certificate projections)
 *
 * Pure data. No classes. No side effects.
 */

import type { MetricAxis } from "@/types/uor-foundation/enums";
import type { FiberBudget } from "@/types/uor-foundation/bridge/partition";
import { resolution } from "@/modules/ring-core/fiber-budget";

// ── Panel: Observable → visual ────────────────────────────────────────────

export interface Panel {
  readonly id: string;
  readonly axis: MetricAxis;
  readonly label: string;
  readonly value: number;
  readonly quantum: number;
}

export function createPanel(
  typeName: string,
  axis: MetricAxis,
  value: number,
  quantum = 0,
): Panel {
  return {
    id: `panel:${typeName}:q${quantum}`,
    axis,
    label: typeName,
    value,
    quantum,
  };
}

/** Group panels by MetricAxis for the tri-panel dashboard layout. */
export function groupByAxis(panels: Panel[]): Record<MetricAxis, Panel[]> {
  return {
    Vertical: panels.filter((p) => p.axis === "Vertical"),
    Horizontal: panels.filter((p) => p.axis === "Horizontal"),
    Diagonal: panels.filter((p) => p.axis === "Diagonal"),
  };
}

// ── Attestation: Certificate → verifiable badge ───────────────────────────

export interface Attestation {
  readonly certId: string;
  readonly targetIri: string;
  readonly valid: boolean;
  readonly issuedAt: string;
  readonly kind: "transform" | "isometry" | "involution";
}

export function createAttestation(
  certId: string,
  targetIri: string,
  valid: boolean,
  kind: Attestation["kind"],
): Attestation {
  return { certId, targetIri, valid, issuedAt: new Date().toISOString(), kind };
}

// ── HologramState: unified OS snapshot ────────────────────────────────────
// Instead of wrapping Process/FileSystem (which the Engine already handles),
// the HologramState captures what the engine DOESN'T: the v2 resolution
// layer (fiber budget, observable panels, certificate attestations).

export interface HologramState {
  /** Engine identity (delegated to HologramEngine.snapshot()) */
  readonly engineId: string;
  /** Process count (from engine) */
  readonly processCount: number;
  /** Tri-axis dashboard panels (from observables) */
  readonly dashboard: Record<MetricAxis, Panel[]>;
  /** Resolution progress (from FiberBudget — no wrapper needed) */
  readonly budget: FiberBudget;
  readonly resolutionRatio: number;
  /** Certificate attestations */
  readonly attestations: Attestation[];
  /** Timestamp */
  readonly timestamp: string;
}

export function createHologramState(opts: {
  engineId?: string;
  processCount?: number;
  panels: Panel[];
  budget: FiberBudget;
  attestations: Attestation[];
}): HologramState {
  return {
    engineId: opts.engineId ?? "hologram:default",
    processCount: opts.processCount ?? 0,
    dashboard: groupByAxis(opts.panels),
    budget: opts.budget,
    resolutionRatio: resolution(opts.budget),
    attestations: opts.attestations,
    timestamp: new Date().toISOString(),
  };
}
