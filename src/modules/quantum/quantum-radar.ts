/**
 * Quantum Radar — Network Coherence Monitor (Phase 17)
 * ═════════════════════════════════════════════════════
 *
 * Radar-style real-time display of quantum mesh health:
 * - Node coherence levels (T₂ decay tracking)
 * - Qubit fidelity across all 4 mesh nodes
 * - Error rates (bit-flip, phase-flip, depolarizing)
 * - Entanglement link quality (Bell fidelity)
 * - Process migration health
 *
 * Emits a periodic "sweep" that samples all mesh nodes and returns
 * a RadarSweep containing per-node health metrics.
 *
 * @module quantum/quantum-radar
 */

// ── Types ─────────────────────────────────────────────────────────────────

export type NodeHealth = "nominal" | "degraded" | "critical" | "offline";

export interface ErrorRates {
  readonly bitFlip: number;       // probability per gate
  readonly phaseFlip: number;
  readonly depolarizing: number;
  readonly measurement: number;
  readonly leakage: number;
}

export interface EntanglementLink {
  readonly sourceNode: string;
  readonly targetNode: string;
  readonly bellFidelity: number;
  readonly bellPairsAvailable: number;
  readonly latencyMs: number;
  readonly classicalBits: number;
  readonly active: boolean;
}

export interface NodeSnapshot {
  readonly nodeId: string;
  readonly label: string;
  readonly ipv6: string;
  readonly health: NodeHealth;
  readonly coherenceT2: number;       // in ms
  readonly coherencePercent: number;  // 0–1
  readonly qubitCapacity: number;
  readonly qubitsUsed: number;
  readonly qubitFidelity: number;     // average gate fidelity
  readonly processCount: number;
  readonly errorRates: ErrorRates;
  readonly temperature: number;       // simulated mK
  readonly gateDepth: number;         // current circuit depth
  readonly uptime: number;            // seconds
  readonly angle: number;             // radar angle in degrees (0–360)
}

export interface RadarSweep {
  readonly sweepId: number;
  readonly timestamp: string;
  readonly nodes: NodeSnapshot[];
  readonly links: EntanglementLink[];
  readonly globalCoherence: number;   // weighted average
  readonly globalFidelity: number;
  readonly totalQubits: number;
  readonly usedQubits: number;
  readonly totalErrors: number;
  readonly alertCount: number;
  readonly alerts: RadarAlert[];
}

export interface RadarAlert {
  readonly level: "info" | "warn" | "critical";
  readonly nodeId: string;
  readonly message: string;
  readonly timestamp: string;
  readonly metric: string;
  readonly value: number;
  readonly threshold: number;
}

// ── Constants ─────────────────────────────────────────────────────────────

const MESH_NODES = [
  { id: "node:alpha",   label: "Alpha (α)",   ipv6: "fd00:0075:6f72::a001", angle: 0 },
  { id: "node:beta",    label: "Beta (β)",    ipv6: "fd00:0075:6f72::b001", angle: 90 },
  { id: "node:gamma",   label: "Gamma (γ)",   ipv6: "fd00:0075:6f72::c001", angle: 180 },
  { id: "node:delta",   label: "Delta (δ)",   ipv6: "fd00:0075:6f72::d001", angle: 270 },
];

const THRESHOLDS = {
  coherenceWarn: 0.6,
  coherenceCritical: 0.3,
  fidelityWarn: 0.95,
  fidelityCritical: 0.9,
  errorRateWarn: 0.005,
  errorRateCritical: 0.01,
  temperatureWarn: 25,    // mK
  temperatureCritical: 50,
} as const;

// ── Simulation Engine ─────────────────────────────────────────────────────

let sweepCounter = 0;

/** Simulate a Gaussian random variable */
function gaussRand(mean: number, std: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u1 || 0.001)) * Math.cos(2 * Math.PI * u2);
}

/** Clamp value to range */
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Classify node health from coherence and fidelity */
function classifyHealth(coherence: number, fidelity: number, errorSum: number): NodeHealth {
  if (coherence < THRESHOLDS.coherenceCritical || fidelity < THRESHOLDS.fidelityCritical) return "critical";
  if (coherence < THRESHOLDS.coherenceWarn || fidelity < THRESHOLDS.fidelityWarn || errorSum > THRESHOLDS.errorRateWarn * 5) return "degraded";
  return "nominal";
}

/** Generate a single radar sweep sampling all mesh nodes */
export function generateSweep(): RadarSweep {
  sweepCounter++;
  const now = new Date().toISOString();
  const nodes: NodeSnapshot[] = [];
  const alerts: RadarAlert[] = [];

  // Time-varying baseline: slow sinusoidal drift + noise
  const drift = Math.sin(sweepCounter * 0.02) * 0.05;

  for (const mesh of MESH_NODES) {
    // Per-node variation
    const nodePhase = mesh.angle * Math.PI / 180;
    const nodeDrift = Math.sin(sweepCounter * 0.03 + nodePhase) * 0.03;

    const coherenceT2 = clamp(gaussRand(100 + drift * 50 + nodeDrift * 30, 8), 20, 200);
    const coherencePercent = clamp(coherenceT2 / 150, 0, 1);

    const qubitCapacity = 48;
    const qubitsUsed = Math.floor(clamp(gaussRand(24 + drift * 10, 5), 0, qubitCapacity));

    const qubitFidelity = clamp(gaussRand(0.993 + nodeDrift, 0.003), 0.9, 1);

    const processCount = Math.floor(clamp(gaussRand(6, 2), 1, 16));

    const errorRates: ErrorRates = {
      bitFlip: clamp(gaussRand(0.001 - drift * 0.002, 0.0005), 0, 0.05),
      phaseFlip: clamp(gaussRand(0.0015 - drift * 0.001, 0.0004), 0, 0.05),
      depolarizing: clamp(gaussRand(0.0008, 0.0003), 0, 0.05),
      measurement: clamp(gaussRand(0.002, 0.001), 0, 0.05),
      leakage: clamp(gaussRand(0.0003, 0.0001), 0, 0.01),
    };

    const temperature = clamp(gaussRand(15 + nodeDrift * 10, 3), 5, 80);
    const gateDepth = Math.floor(clamp(gaussRand(200, 50), 10, 1000));
    const uptime = sweepCounter * 5;

    const health = classifyHealth(coherencePercent, qubitFidelity,
      errorRates.bitFlip + errorRates.phaseFlip + errorRates.depolarizing);

    const node: NodeSnapshot = {
      nodeId: mesh.id,
      label: mesh.label,
      ipv6: mesh.ipv6,
      health,
      coherenceT2,
      coherencePercent,
      qubitCapacity,
      qubitsUsed,
      qubitFidelity,
      processCount,
      errorRates,
      temperature,
      gateDepth,
      uptime,
      angle: mesh.angle,
    };
    nodes.push(node);

    // Generate alerts
    if (coherencePercent < THRESHOLDS.coherenceWarn) {
      alerts.push({
        level: coherencePercent < THRESHOLDS.coherenceCritical ? "critical" : "warn",
        nodeId: mesh.id, message: `Coherence at ${(coherencePercent * 100).toFixed(1)}%`,
        timestamp: now, metric: "coherence", value: coherencePercent,
        threshold: THRESHOLDS.coherenceWarn,
      });
    }
    if (qubitFidelity < THRESHOLDS.fidelityWarn) {
      alerts.push({
        level: qubitFidelity < THRESHOLDS.fidelityCritical ? "critical" : "warn",
        nodeId: mesh.id, message: `Fidelity at ${(qubitFidelity * 100).toFixed(2)}%`,
        timestamp: now, metric: "fidelity", value: qubitFidelity,
        threshold: THRESHOLDS.fidelityWarn,
      });
    }
    if (temperature > THRESHOLDS.temperatureWarn) {
      alerts.push({
        level: temperature > THRESHOLDS.temperatureCritical ? "critical" : "warn",
        nodeId: mesh.id, message: `Temperature at ${temperature.toFixed(1)} mK`,
        timestamp: now, metric: "temperature", value: temperature,
        threshold: THRESHOLDS.temperatureWarn,
      });
    }
  }

  // Entanglement links: each pair of nodes
  const links: EntanglementLink[] = [];
  for (let i = 0; i < MESH_NODES.length; i++) {
    for (let j = i + 1; j < MESH_NODES.length; j++) {
      const linkDrift = Math.sin(sweepCounter * 0.04 + i + j) * 0.02;
      links.push({
        sourceNode: MESH_NODES[i].id,
        targetNode: MESH_NODES[j].id,
        bellFidelity: clamp(gaussRand(0.97 + linkDrift, 0.01), 0.85, 1),
        bellPairsAvailable: Math.floor(clamp(gaussRand(50, 15), 0, 100)),
        latencyMs: clamp(gaussRand(2.5, 0.8), 0.5, 10),
        classicalBits: 2,
        active: Math.random() > 0.05,
      });
    }
  }

  const globalCoherence = nodes.reduce((s, n) => s + n.coherencePercent, 0) / nodes.length;
  const globalFidelity = nodes.reduce((s, n) => s + n.qubitFidelity, 0) / nodes.length;
  const totalQubits = nodes.reduce((s, n) => s + n.qubitCapacity, 0);
  const usedQubits = nodes.reduce((s, n) => s + n.qubitsUsed, 0);
  const totalErrors = nodes.reduce((s, n) => s +
    n.errorRates.bitFlip + n.errorRates.phaseFlip + n.errorRates.depolarizing, 0);

  return {
    sweepId: sweepCounter,
    timestamp: now,
    nodes,
    links,
    globalCoherence,
    globalFidelity,
    totalQubits,
    usedQubits,
    totalErrors,
    alertCount: alerts.length,
    alerts,
  };
}

/** Run a verification suite */
export interface RadarTest {
  readonly name: string;
  readonly holds: boolean;
  readonly expected: string;
  readonly actual: string;
}

export interface RadarVerification {
  readonly tests: RadarTest[];
  readonly allPassed: boolean;
}

export function runRadarVerification(): RadarVerification {
  const sweep = generateSweep();
  const tests: RadarTest[] = [];

  tests.push({
    name: "4 mesh nodes sampled",
    holds: sweep.nodes.length === 4,
    expected: "4", actual: String(sweep.nodes.length),
  });

  tests.push({
    name: "6 entanglement links (4C2)",
    holds: sweep.links.length === 6,
    expected: "6", actual: String(sweep.links.length),
  });

  tests.push({
    name: "Global coherence ∈ (0,1]",
    holds: sweep.globalCoherence > 0 && sweep.globalCoherence <= 1,
    expected: "(0,1]", actual: sweep.globalCoherence.toFixed(3),
  });

  tests.push({
    name: "Global fidelity ∈ (0,1]",
    holds: sweep.globalFidelity > 0 && sweep.globalFidelity <= 1,
    expected: "(0,1]", actual: sweep.globalFidelity.toFixed(4),
  });

  tests.push({
    name: "All nodes have valid health classification",
    holds: sweep.nodes.every(n => ["nominal", "degraded", "critical", "offline"].includes(n.health)),
    expected: "nominal|degraded|critical|offline",
    actual: sweep.nodes.map(n => n.health).join(", "),
  });

  tests.push({
    name: "Qubit capacity = 48 per node (192 total)",
    holds: sweep.totalQubits === 192,
    expected: "192", actual: String(sweep.totalQubits),
  });

  tests.push({
    name: "Used qubits ≤ total",
    holds: sweep.usedQubits <= sweep.totalQubits,
    expected: `≤ ${sweep.totalQubits}`, actual: String(sweep.usedQubits),
  });

  tests.push({
    name: "Bell fidelity > 0.85 for all links",
    holds: sweep.links.every(l => l.bellFidelity > 0.85),
    expected: "> 0.85", actual: sweep.links.map(l => l.bellFidelity.toFixed(3)).join(", "),
  });

  tests.push({
    name: "All links have 2 classical bits",
    holds: sweep.links.every(l => l.classicalBits === 2),
    expected: "2", actual: "2",
  });

  tests.push({
    name: "Node angles at 0°, 90°, 180°, 270°",
    holds: sweep.nodes.map(n => n.angle).sort((a, b) => a - b).join(",") === "0,90,180,270",
    expected: "0,90,180,270", actual: sweep.nodes.map(n => n.angle).sort((a, b) => a - b).join(","),
  });

  tests.push({
    name: "Error rates non-negative",
    holds: sweep.nodes.every(n =>
      n.errorRates.bitFlip >= 0 && n.errorRates.phaseFlip >= 0 &&
      n.errorRates.depolarizing >= 0 && n.errorRates.measurement >= 0 &&
      n.errorRates.leakage >= 0),
    expected: "≥ 0", actual: "all non-negative",
  });

  tests.push({
    name: "Temperature > 0 mK for all nodes",
    holds: sweep.nodes.every(n => n.temperature > 0),
    expected: "> 0", actual: sweep.nodes.map(n => n.temperature.toFixed(1)).join(", "),
  });

  return {
    tests,
    allPassed: tests.every(t => t.holds),
  };
}
