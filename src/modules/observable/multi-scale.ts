/**
 * Multi-Scale Observer — Holographic Zoom Engine
 * ═══════════════════════════════════════════════
 *
 * The Observer is holographic: the same coherence assessment pattern
 * (H-score → Zone → Remediation) repeats at EVERY scale of the system.
 *
 * Like a fractal, you can zoom from a single byte up to the entire
 * network and at each level the same structure appears:
 *
 *   L0  BYTE        Individual ring element (0–255)
 *   L1  DATUM       Triad unit (value + neg + bnot)
 *   L2  OPERATION   Single morphism / transform
 *   L3  MODULE      Registered UOR module
 *   L4  PROJECTION  Hologram namespace / protocol
 *   L5  NETWORK     Entire system telos
 *
 * This IS the self-reflective property: the system can observe itself
 * at any granularity using the same instrument. Self-replication,
 * self-evolution, and self-verification emerge naturally because the
 * coherence metric is scale-invariant.
 *
 * @module observable/multi-scale
 * @see observable/meta-observer — L3+ implementation
 * @see observable/h-score — L0 foundation
 */

import { popcount, hScore } from "./h-score";

// ── Scale Levels ────────────────────────────────────────────────────────────

export type ScaleLevel = 0 | 1 | 2 | 3 | 4 | 5;

export const SCALE_LABELS: Record<ScaleLevel, {
  name: string;
  description: string;
  icon: string;
  uorLayer: string;
}> = {
  0: { name: "Byte",       description: "Individual ring element in Z/256Z",       icon: "⚛",  uorLayer: "Foundation" },
  1: { name: "Datum",      description: "Triad unit: value + neg(v) + bnot(v)",    icon: "🔺", uorLayer: "Identity" },
  2: { name: "Operation",  description: "Single morphism or transform",            icon: "⚡",  uorLayer: "Transformation" },
  3: { name: "Module",     description: "Registered UOR module",                   icon: "📦", uorLayer: "Structure" },
  4: { name: "Projection", description: "Hologram namespace / protocol bridge",    icon: "🌐", uorLayer: "Resolution" },
  5: { name: "Network",    description: "Entire system telos vector",              icon: "🌌", uorLayer: "Verification" },
};

// ── Coherence Zone (scale-invariant) ────────────────────────────────────────

export type CoherenceZone = "COHERENCE" | "DRIFT" | "COLLAPSE";

export interface ScaleObservation {
  level: ScaleLevel;
  entityId: string;
  label: string;
  hScore: number;
  zone: CoherenceZone;
  /** 0–1: integration capacity at this scale */
  phi: number;
  /** Entropy pump rate at this scale */
  epsilon: number;
  /** Sub-entities (children in the zoom hierarchy) */
  children: string[];
  /** Additional scale-specific metadata */
  meta: Record<string, number | string>;
}

// ── Thresholds (same at every scale — holographic invariance) ────────────────

const ZONE_THRESHOLDS = { low: 2, high: 5 };

function assignZone(h: number): CoherenceZone {
  if (h <= ZONE_THRESHOLDS.low) return "COHERENCE";
  if (h <= ZONE_THRESHOLDS.high) return "DRIFT";
  return "COLLAPSE";
}

// ── L0: Byte-Level Observation ──────────────────────────────────────────────

/**
 * Observe a single byte against the Grade-A graph.
 *
 * This is the atomic unit of observation — the foundation from which
 * all higher scales are composed.
 */
export function observeByte(
  value: number,
  gradeAGraph: number[] = Array.from({ length: 256 }, (_, i) => i)
): ScaleObservation {
  const h = hScore(value, gradeAGraph);
  return {
    level: 0,
    entityId: `byte:${value}`,
    label: `0x${value.toString(16).padStart(2, "0").toUpperCase()}`,
    hScore: h,
    zone: assignZone(h),
    phi: h === 0 ? 1 : 1 / (1 + h),
    epsilon: 0,
    children: [],
    meta: {
      decimal: value,
      binary: value.toString(2).padStart(8, "0"),
      popcount: popcount(value),
      negValue: ((-value) % 256 + 256) % 256,
      bnotValue: value ^ 0xff,
    },
  };
}

// ── L1: Datum-Level Observation ─────────────────────────────────────────────

/**
 * Observe a datum (triad): value + neg(value) + bnot(value).
 *
 * The triad coherence measures whether the critical identity
 * neg(bnot(x)) === succ(x) holds for this datum. A datum is
 * coherent iff all three elements are individually coherent AND
 * the critical identity holds.
 */
export function observeDatum(
  value: number,
  gradeAGraph: number[] = Array.from({ length: 256 }, (_, i) => i)
): ScaleObservation {
  const neg = ((-value) % 256 + 256) % 256;
  const bnot = value ^ 0xff;
  const succ = (value + 1) % 256;
  const negBnot = ((-bnot) % 256 + 256) % 256;

  // H-scores for each element
  const hV = hScore(value, gradeAGraph);
  const hN = hScore(neg, gradeAGraph);
  const hB = hScore(bnot, gradeAGraph);

  // Critical identity violation penalty
  const identityHolds = negBnot === succ;
  const identityPenalty = identityHolds ? 0 : 8;

  // Aggregate: mean of constituent H-scores + identity penalty
  const h = (hV + hN + hB) / 3 + identityPenalty;

  const children = [`byte:${value}`, `byte:${neg}`, `byte:${bnot}`];
  const phi = children.length > 0 ? (hV === 0 ? 1 : 0) + (hN === 0 ? 1 : 0) + (hB === 0 ? 1 : 0) : 0;

  return {
    level: 1,
    entityId: `datum:${value}`,
    label: `Datum(${value})`,
    hScore: h,
    zone: assignZone(h),
    phi: phi / 3,
    epsilon: 0,
    children,
    meta: {
      value, neg, bnot, succ, negBnot,
      criticalIdentityHolds: identityHolds ? 1 : 0,
      triadCoherence: identityHolds && h === 0 ? 1 : 0,
    },
  };
}

// ── L2: Operation-Level Observation ─────────────────────────────────────────

/**
 * Observe a single operation (morphism/transform).
 *
 * Measures how much the operation distorted information:
 * H = popcount(input XOR output). Isometric operations preserve
 * the metric (H ≤ threshold_low).
 */
export function observeOperation(
  opId: string,
  opName: string,
  inputByte: number,
  outputByte: number,
): ScaleObservation {
  const h = popcount((inputByte ^ outputByte) >>> 0);
  const logosClass = h <= ZONE_THRESHOLDS.low ? "isometry"
    : h <= ZONE_THRESHOLDS.high ? "embedding" : "arbitrary";

  return {
    level: 2,
    entityId: `op:${opId}`,
    label: opName,
    hScore: h,
    zone: assignZone(h),
    phi: h === 0 ? 1 : 1 / (1 + h),
    epsilon: 0,
    children: [`byte:${inputByte}`, `byte:${outputByte}`],
    meta: {
      inputByte, outputByte,
      hammingDistance: h,
      logosClass,
      isIsometry: logosClass === "isometry" ? 1 : 0,
    },
  };
}

// ── L3: Module-Level Observation ────────────────────────────────────────────

/**
 * Observe a module: aggregate over its operations.
 *
 * This is the level currently served by MetaObserver. The multi-scale
 * engine computes it from L2 observations, demonstrating composability.
 */
export function observeModule(
  moduleId: string,
  moduleName: string,
  operations: ScaleObservation[],
): ScaleObservation {
  const n = operations.length || 1;
  const totalH = operations.reduce((s, o) => s + o.hScore, 0);
  const meanH = totalH / n;
  const coherentOps = operations.filter(o => o.zone === "COHERENCE").length;
  const isometries = operations.filter(o => o.meta.isIsometry === 1).length;

  return {
    level: 3,
    entityId: `module:${moduleId}`,
    label: moduleName,
    hScore: meanH,
    zone: assignZone(meanH),
    phi: coherentOps / n,
    epsilon: 0,
    children: operations.map(o => o.entityId),
    meta: {
      operationCount: operations.length,
      coherentOps,
      isometries,
      logosCompliance: isometries / n,
      meanHScore: meanH,
    },
  };
}

// ── L4: Projection-Level Observation ────────────────────────────────────────

/**
 * Observe a hologram projection namespace: aggregate over modules
 * that participate in this projection.
 */
export function observeProjection(
  projectionId: string,
  projectionName: string,
  modules: ScaleObservation[],
): ScaleObservation {
  const n = modules.length || 1;
  const totalH = modules.reduce((s, m) => s + m.hScore, 0);
  const meanH = totalH / n;
  const coherentMods = modules.filter(m => m.zone === "COHERENCE").length;
  const meanPhi = modules.reduce((s, m) => s + m.phi, 0) / n;

  return {
    level: 4,
    entityId: `projection:${projectionId}`,
    label: projectionName,
    hScore: meanH,
    zone: assignZone(meanH),
    phi: meanPhi,
    epsilon: 0,
    children: modules.map(m => m.entityId),
    meta: {
      moduleCount: modules.length,
      coherentModules: coherentMods,
      meanPhi,
      coherenceRatio: coherentMods / n,
    },
  };
}

// ── L5: Network-Level Observation ───────────────────────────────────────────

/**
 * Observe the entire network: aggregate over all projections (or modules).
 *
 * This is the highest zoom level — the telos vector of the full system.
 */
export function observeNetwork(
  projections: ScaleObservation[],
): ScaleObservation {
  const n = projections.length || 1;
  const totalH = projections.reduce((s, p) => s + p.hScore, 0);
  const meanH = totalH / n;
  const coherent = projections.filter(p => p.zone === "COHERENCE").length;
  const meanPhi = projections.reduce((s, p) => s + p.phi, 0) / n;

  // Telos: coherenceRatio × meanΦ
  const coherenceRatio = coherent / n;
  const telosProgress = coherenceRatio * meanPhi;

  return {
    level: 5,
    entityId: "network:uor",
    label: "UOR Network",
    hScore: meanH,
    zone: assignZone(meanH),
    phi: meanPhi,
    epsilon: 0,
    children: projections.map(p => p.entityId),
    meta: {
      totalProjections: projections.length,
      coherentProjections: coherent,
      coherenceRatio,
      telosProgress,
      direction: meanH < 1 ? "converging" : meanH > 4 ? "diverging" : "stable",
    },
  };
}

// ── Multi-Scale Observer Class ──────────────────────────────────────────────

/**
 * The Multi-Scale Observer — a holographic zoom lens.
 *
 * Stores observations at all levels and computes cross-scale
 * coherence. The same pattern (H-score → Zone → Φ → Remediation)
 * appears at every scale, demonstrating the self-similar nature
 * of the UOR framework.
 *
 * Usage:
 *   const mso = new MultiScaleObserver();
 *   mso.ingestBytes(new Uint8Array([42, 7, 255]));
 *   mso.getLevel(0)  // All byte-level observations
 *   mso.getLevel(5)  // Network-level aggregate
 *   mso.crossScaleCoherence()  // Are all levels consistent?
 */
export class MultiScaleObserver {
  private observations: Map<ScaleLevel, Map<string, ScaleObservation>> = new Map();
  private gradeAGraph: number[];

  constructor(gradeAGraph?: number[]) {
    this.gradeAGraph = gradeAGraph ?? Array.from({ length: 256 }, (_, i) => i);
    for (let l = 0; l <= 5; l++) {
      this.observations.set(l as ScaleLevel, new Map());
    }
  }

  // ── Ingestion: bottom-up composition ──────────────────────────────────

  /**
   * Ingest raw bytes — the L0 entry point.
   *
   * Automatically composes upward: bytes → datums → operations.
   * Higher levels (module, projection, network) are composed via
   * explicit calls to composeModules() and composeNetwork().
   */
  ingestBytes(bytes: Uint8Array): ScaleObservation[] {
    const byteObs: ScaleObservation[] = [];
    const datumObs: ScaleObservation[] = [];

    for (const b of bytes) {
      const bo = observeByte(b, this.gradeAGraph);
      this.observations.get(0)!.set(bo.entityId, bo);
      byteObs.push(bo);

      const dId = `datum:${b}`;
      if (!this.observations.get(1)!.has(dId)) {
        const d = observeDatum(b, this.gradeAGraph);
        this.observations.get(1)!.set(d.entityId, d);
        datumObs.push(d);
      }
    }

    return byteObs;
  }

  /**
   * Ingest an operation (L2).
   */
  ingestOperation(opId: string, opName: string, inputByte: number, outputByte: number): ScaleObservation {
    const op = observeOperation(opId, opName, inputByte, outputByte);
    this.observations.get(2)!.set(op.entityId, op);
    return op;
  }

  /**
   * Compose module-level observations from stored operations.
   */
  composeModule(moduleId: string, moduleName: string, operationIds: string[]): ScaleObservation {
    const ops = operationIds
      .map(id => this.observations.get(2)!.get(id))
      .filter(Boolean) as ScaleObservation[];
    const mod = observeModule(moduleId, moduleName, ops);
    this.observations.get(3)!.set(mod.entityId, mod);
    return mod;
  }

  /**
   * Compose projection-level from modules.
   */
  composeProjection(projId: string, projName: string, moduleIds: string[]): ScaleObservation {
    const mods = moduleIds
      .map(id => this.observations.get(3)!.get(`module:${id}`))
      .filter(Boolean) as ScaleObservation[];
    const proj = observeProjection(projId, projName, mods);
    this.observations.get(4)!.set(proj.entityId, proj);
    return proj;
  }

  /**
   * Compose network-level from all projections.
   */
  composeNetwork(): ScaleObservation {
    const projs = [...this.observations.get(4)!.values()];
    const net = observeNetwork(projs);
    this.observations.get(5)!.set(net.entityId, net);
    return net;
  }

  // ── Access ────────────────────────────────────────────────────────────

  /** Get all observations at a given scale level. */
  getLevel(level: ScaleLevel): ScaleObservation[] {
    return [...(this.observations.get(level)?.values() ?? [])];
  }

  /** Get a specific observation by entity ID across all levels. */
  getEntity(entityId: string): ScaleObservation | null {
    for (const level of this.observations.values()) {
      const obs = level.get(entityId);
      if (obs) return obs;
    }
    return null;
  }

  /** Get children of an observation (zoom in). */
  zoomIn(entityId: string): ScaleObservation[] {
    const parent = this.getEntity(entityId);
    if (!parent) return [];
    return parent.children
      .map(id => this.getEntity(id))
      .filter(Boolean) as ScaleObservation[];
  }

  /** Find parent observations that contain this entity (zoom out). */
  zoomOut(entityId: string): ScaleObservation[] {
    const results: ScaleObservation[] = [];
    for (const level of this.observations.values()) {
      for (const obs of level.values()) {
        if (obs.children.includes(entityId)) {
          results.push(obs);
        }
      }
    }
    return results;
  }

  // ── Cross-Scale Coherence ─────────────────────────────────────────────

  /**
   * Cross-scale coherence check.
   *
   * The holographic principle demands that coherence at one scale
   * should be reflected at adjacent scales. If L0 bytes are all
   * COHERENCE but L3 modules show COLLAPSE, something is wrong.
   *
   * Returns a per-level summary and flags any inconsistencies.
   */
  crossScaleCoherence(): {
    levels: { level: ScaleLevel; count: number; meanH: number; zone: CoherenceZone; phi: number }[];
    consistent: boolean;
    anomalies: string[];
  } {
    const levels: { level: ScaleLevel; count: number; meanH: number; zone: CoherenceZone; phi: number }[] = [];
    const anomalies: string[] = [];

    for (let l = 0; l <= 5; l++) {
      const obs = this.getLevel(l as ScaleLevel);
      if (obs.length === 0) {
        levels.push({ level: l as ScaleLevel, count: 0, meanH: 0, zone: "COHERENCE", phi: 1 });
        continue;
      }
      const meanH = obs.reduce((s, o) => s + o.hScore, 0) / obs.length;
      const meanPhi = obs.reduce((s, o) => s + o.phi, 0) / obs.length;
      const zone = assignZone(meanH);
      levels.push({ level: l as ScaleLevel, count: obs.length, meanH, zone, phi: meanPhi });
    }

    // Check adjacent-level consistency
    const populated = levels.filter(l => l.count > 0);
    for (let i = 1; i < populated.length; i++) {
      const prev = populated[i - 1];
      const curr = populated[i];
      const zoneDiff = zoneOrd(curr.zone) - zoneOrd(prev.zone);
      if (Math.abs(zoneDiff) > 1) {
        anomalies.push(
          `Scale jump: L${prev.level}(${prev.zone}) → L${curr.level}(${curr.zone}) — ${
            Math.abs(zoneDiff) > 1 ? "non-adjacent zone transition" : ""
          }`
        );
      }
    }

    return {
      levels,
      consistent: anomalies.length === 0,
      anomalies,
    };
  }

  /** Get counts at each level. */
  summary(): { level: ScaleLevel; name: string; count: number }[] {
    return Array.from({ length: 6 }, (_, l) => ({
      level: l as ScaleLevel,
      name: SCALE_LABELS[l as ScaleLevel].name,
      count: this.observations.get(l as ScaleLevel)?.size ?? 0,
    }));
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function zoneOrd(z: CoherenceZone): number {
  return z === "COHERENCE" ? 0 : z === "DRIFT" ? 1 : 2;
}

// ── Pre-built full-stack observation ────────────────────────────────────────

/**
 * Create a fully composed multi-scale observation from raw simulation data.
 *
 * This demonstrates the self-reflective pipeline:
 *   bytes → datums → operations → modules → projections → network
 *
 * @param scenario  "coherent" | "sparse" | "mixed"
 */
export function createFullStackObservation(
  scenario: "coherent" | "sparse" | "mixed" = "coherent"
): MultiScaleObserver {
  const graph = scenario === "sparse"
    ? Array.from({ length: 128 }, (_, i) => i * 2) // Only even numbers
    : Array.from({ length: 256 }, (_, i) => i);     // Full Q0

  const mso = new MultiScaleObserver(graph);

  // Module definitions for simulation
  const modules = [
    { id: "ring-core", name: "Q0 Ring", ops: ["neg", "bnot", "succ", "add", "mul"] },
    { id: "identity", name: "Content Addressing", ops: ["hash", "verify", "resolve"] },
    { id: "hologram", name: "Hologram Projector", ops: ["project", "resolve", "bridge"] },
    { id: "observer", name: "Observer Theory", ops: ["observe", "classify", "remediate"] },
    { id: "trust", name: "Trust Graph", ops: ["attest", "verify", "pagerank"] },
    { id: "certificate", name: "Certificate Engine", ops: ["issue", "verify", "chain"] },
  ];

  // Projections grouping modules
  const projections = [
    { id: "foundation", name: "Foundation Layer", mods: ["ring-core"] },
    { id: "identity-layer", name: "Identity Layer", mods: ["identity", "certificate"] },
    { id: "structure", name: "Structure Layer", mods: ["hologram", "observer"] },
    { id: "social", name: "Social Layer", mods: ["trust"] },
  ];

  // Generate operations per module
  for (const mod of modules) {
    const opIds: string[] = [];
    for (const opName of mod.ops) {
      for (let i = 0; i < 5; i++) {
        const opId = `${mod.id}:${opName}:${i}`;
        const input = Math.floor(Math.random() * 256);
        let output: number;

        if (scenario === "coherent") {
          // Mostly isometric
          output = input ^ (Math.random() > 0.8 ? 1 : 0);
        } else if (scenario === "sparse") {
          // Half operations have high distortion
          output = Math.random() > 0.5 ? (input ^ 0xff) : input;
        } else {
          // Mixed: depends on module
          const drift = mod.id === "trust" ? 0.7 : mod.id === "observer" ? 0.3 : 0.1;
          output = Math.random() < drift
            ? Math.floor(Math.random() * 256)
            : input ^ (Math.random() > 0.7 ? 1 : 0);
        }

        mso.ingestOperation(opId, `${mod.id}.${opName}`, input, output & 0xff);
        // Also ingest the bytes for L0/L1
        mso.ingestBytes(new Uint8Array([input, output & 0xff]));
        opIds.push(`op:${opId}`);
      }
    }
    mso.composeModule(mod.id, mod.name, opIds.map(id => id.replace("op:", "")));
  }

  // Compose projections
  for (const proj of projections) {
    mso.composeProjection(proj.id, proj.name, proj.mods);
  }

  // Compose network
  mso.composeNetwork();

  return mso;
}
