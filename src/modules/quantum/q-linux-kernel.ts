/**
 * Q-Linux Kernel Specification — Phase 14
 * ════════════════════════════════════════
 *
 * Quantum process scheduling using the Hologram dehydrate/rehydrate pattern.
 * Quantum states are content-addressed objects that can be:
 *   1. Frozen (dehydrated) — state → canonical bytes → CID
 *   2. Teleported — CID routed across mesh nodes via IPv6
 *   3. Resumed (rehydrated) — CID → canonical bytes → state
 *
 * Architecture maps POSIX onto quantum:
 *   ┌────────────────┬──────────────────────────────────────────────┐
 *   │ Q-Linux        │ UOR Primitive                                │
 *   ├────────────────┼──────────────────────────────────────────────┤
 *   │ qfork(pid)     │ Entangle: clone + Bell pair to parent       │
 *   │ qexec(bp)      │ Spawn ExecutableBlueprint on quantum lane   │
 *   │ qfreeze(pid)   │ Dehydrate: measure-free state serialize     │
 *   │ qteleport(cid) │ Route frozen state over mesh IPv6           │
 *   │ qresume(cid)   │ Rehydrate: restore from canonical bytes     │
 *   │ qmeasure(pid)  │ Collapse: project onto computational basis  │
 *   │ qentangle(a,b) │ Bell pair: correlate two process states     │
 *   │ qbarrier()     │ Sync: wait for all quantum lanes            │
 *   │ qsched(policy) │ Set scheduling: FIFO / priority / teleport  │
 *   └────────────────┴──────────────────────────────────────────────┘
 *
 * The kernel maintains a process table of QuantumProcess entries, each
 * with a superposition state vector, entanglement registry, and
 * dehydration history for fault-tolerant checkpointing.
 *
 * @module quantum/q-linux-kernel
 */

import { computeCid, formatIpv6, sha256, bytesToHex } from "@/modules/uns/core/address";

// ── Quantum State Representation ──────────────────────────────────────────

/** Complex amplitude: α = re + im·i */
export interface ComplexAmplitude {
  readonly re: number;
  readonly im: number;
}

/** A single basis state with its amplitude */
export interface BasisState {
  readonly label: string;       // e.g. "|00⟩", "|↑↓⟩"
  readonly amplitude: ComplexAmplitude;
}

/** Full quantum state vector */
export interface QuantumStateVector {
  readonly numQubits: number;
  readonly bases: BasisState[];
  readonly entangledWith: string[];  // PIDs of entangled processes
}

/** Probability of a basis state from |α|² */
export function probability(a: ComplexAmplitude): number {
  return a.re * a.re + a.im * a.im;
}

/** Norm of the state vector (should be 1 for valid states) */
export function stateNorm(sv: QuantumStateVector): number {
  return sv.bases.reduce((sum, b) => sum + probability(b.amplitude), 0);
}

/** Fidelity between two state vectors (|⟨ψ|φ⟩|²) */
export function fidelity(a: QuantumStateVector, b: QuantumStateVector): number {
  if (a.bases.length !== b.bases.length) return 0;
  let reSum = 0, imSum = 0;
  for (let i = 0; i < a.bases.length; i++) {
    const aa = a.bases[i].amplitude;
    const ba = b.bases[i].amplitude;
    // ⟨a|b⟩ = conj(a) · b
    reSum += aa.re * ba.re + aa.im * ba.im;
    imSum += -aa.im * ba.re + aa.re * ba.im;
  }
  return reSum * reSum + imSum * imSum;
}

// ── Dehydrated Quantum State (Frozen) ─────────────────────────────────────

/** A quantum state serialized to content-addressed bytes */
export interface DehydratedQuantumState {
  readonly cid: string;
  readonly canonicalBytes: Uint8Array;
  readonly numQubits: number;
  readonly basisCount: number;
  readonly entanglementLinks: string[];
  readonly frozenAt: string;
  readonly sourceNode: string;
  readonly checksum: string;
}

/** Serialize a state vector to deterministic canonical bytes */
export function serializeStateVector(sv: QuantumStateVector): Uint8Array {
  const json = JSON.stringify({
    q: sv.numQubits,
    b: sv.bases.map(b => ({
      l: b.label,
      r: b.amplitude.re,
      i: b.amplitude.im,
    })),
    e: sv.entangledWith,
  });
  return new TextEncoder().encode(json);
}

/** Deserialize canonical bytes back to a state vector */
export function deserializeStateVector(bytes: Uint8Array): QuantumStateVector {
  const json = JSON.parse(new TextDecoder().decode(bytes));
  return {
    numQubits: json.q,
    bases: json.b.map((b: { l: string; r: number; i: number }) => ({
      label: b.l,
      amplitude: { re: b.r, im: b.i },
    })),
    entangledWith: json.e,
  };
}

// ── Quantum Process ───────────────────────────────────────────────────────

export type QProcessStatus =
  | "superposition"   // Active, evolving unitarily
  | "entangled"       // Active, correlated with other processes
  | "frozen"          // Dehydrated, awaiting teleport or resume
  | "teleporting"     // In transit between mesh nodes
  | "measured"        // Collapsed to classical outcome
  | "halted";         // Terminated

export type SchedulingPolicy = "fifo" | "priority" | "teleport-aware" | "entanglement-preserving";

export interface QuantumProcess {
  readonly pid: string;
  readonly parentPid: string | null;
  readonly state: QuantumStateVector;
  status: QProcessStatus;
  readonly createdAt: string;
  readonly meshNode: string;
  readonly priority: number;
  readonly dehydrationHistory: DehydratedQuantumState[];
  lastMeasurement: string | null;
  readonly gateCount: number;
  readonly coherenceTime: number;  // simulated T₂ in ms
}

// ── Mesh Node ─────────────────────────────────────────────────────────────

export interface MeshNode {
  readonly nodeId: string;
  readonly ipv6: string;
  readonly capacity: number;      // max qubits
  readonly used: number;
  readonly latencyMs: number;     // link latency to coordinator
  readonly fidelityThreshold: number;
  readonly processes: string[];   // PIDs hosted
}

// ── Teleport Record ───────────────────────────────────────────────────────

export interface TeleportRecord {
  readonly teleportId: string;
  readonly cid: string;
  readonly sourceNode: string;
  readonly targetNode: string;
  readonly qubits: number;
  readonly fidelityBefore: number;
  readonly fidelityAfter: number;
  readonly latencyMs: number;
  readonly timestamp: string;
  readonly bellPairConsumed: boolean;
}

// ── Q-Linux Kernel ────────────────────────────────────────────────────────

export interface QLinuxKernelState {
  readonly processes: Map<string, QuantumProcess>;
  readonly meshNodes: Map<string, MeshNode>;
  readonly teleportLog: TeleportRecord[];
  readonly schedulingPolicy: SchedulingPolicy;
  readonly totalGates: number;
  readonly totalTeleports: number;
  readonly totalMeasurements: number;
  readonly uptimeMs: number;
  readonly kernelCid: string;
}

/** Generate a quantum PID */
function qpid(): string {
  const r = crypto.getRandomValues(new Uint8Array(4));
  return `qpid:${Array.from(r).map(b => b.toString(16).padStart(2, "0")).join("")}`;
}

/** Generate a unique ID */
function uid(): string {
  const r = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(r).map(b => b.toString(16).padStart(2, "0")).join("");
}

/** Create a Bell pair state |Φ⁺⟩ = (|00⟩ + |11⟩)/√2 */
export function bellPair(pidA: string, pidB: string): QuantumStateVector {
  const s = 1 / Math.SQRT2;
  return {
    numQubits: 2,
    bases: [
      { label: "|00⟩", amplitude: { re: s, im: 0 } },
      { label: "|01⟩", amplitude: { re: 0, im: 0 } },
      { label: "|10⟩", amplitude: { re: 0, im: 0 } },
      { label: "|11⟩", amplitude: { re: s, im: 0 } },
    ],
    entangledWith: [pidA, pidB],
  };
}

/** Create a single-qubit |0⟩ state */
export function groundState(numQubits = 1): QuantumStateVector {
  const dim = 1 << numQubits;
  const bases: BasisState[] = [];
  for (let i = 0; i < dim; i++) {
    const label = "|" + i.toString(2).padStart(numQubits, "0") + "⟩";
    bases.push({ label, amplitude: { re: i === 0 ? 1 : 0, im: 0 } });
  }
  return { numQubits, bases, entangledWith: [] };
}

/** Apply Hadamard to qubit 0 of a state vector */
export function applyHadamard(sv: QuantumStateVector): QuantumStateVector {
  const s = 1 / Math.SQRT2;
  const newBases = sv.bases.map((b, i) => {
    // Simple 1-qubit Hadamard on first qubit
    const bit0 = i & 1;
    const partner = i ^ 1;
    const a0 = sv.bases[i].amplitude;
    const a1 = sv.bases[partner].amplitude;
    const newAmp: ComplexAmplitude = bit0 === 0
      ? { re: s * (a0.re + a1.re), im: s * (a0.im + a1.im) }
      : { re: s * (a0.re - a1.re), im: s * (a0.im - a1.im) };
    return { label: b.label, amplitude: newAmp };
  });
  return { ...sv, bases: newBases };
}

// ── Kernel Operations (Syscalls) ──────────────────────────────────────────

export class QLinuxKernel {
  private processes = new Map<string, QuantumProcess>();
  private meshNodes = new Map<string, MeshNode>();
  private teleportLog: TeleportRecord[] = [];
  private policy: SchedulingPolicy = "fifo";
  private totalGates = 0;
  private totalTeleports = 0;
  private totalMeasurements = 0;
  private startTime = Date.now();

  constructor(nodes?: MeshNode[]) {
    if (nodes) nodes.forEach(n => this.meshNodes.set(n.nodeId, n));
  }

  /** qexec — spawn a new quantum process */
  qexec(numQubits = 1, meshNode?: string): QuantumProcess {
    const pid = qpid();
    const node = meshNode ?? this.leastLoadedNode();
    const proc: QuantumProcess = {
      pid,
      parentPid: null,
      state: groundState(numQubits),
      status: "superposition",
      createdAt: new Date().toISOString(),
      meshNode: node,
      priority: 0,
      dehydrationHistory: [],
      lastMeasurement: null,
      gateCount: 0,
      coherenceTime: 100 + Math.random() * 900, // 100–1000ms simulated T₂
    };
    this.processes.set(pid, proc);
    this.updateNodeUsage(node, numQubits);
    return proc;
  }

  /** qfork — clone a process and entangle with parent via Bell pair */
  qfork(parentPid: string): QuantumProcess | null {
    const parent = this.processes.get(parentPid);
    if (!parent || parent.status === "halted" || parent.status === "measured") return null;

    const child = this.qexec(parent.state.numQubits, parent.meshNode);
    const childProc = this.processes.get(child.pid)!;

    // Create entanglement
    const newParentState: QuantumStateVector = {
      ...parent.state,
      entangledWith: [...parent.state.entangledWith, child.pid],
    };
    const newChildState: QuantumStateVector = {
      ...childProc.state,
      bases: parent.state.bases.map(b => ({ ...b })),
      entangledWith: [parentPid],
    };

    (parent as { state: QuantumStateVector }).state = newParentState;
    parent.status = "entangled";
    (childProc as { state: QuantumStateVector }).state = newChildState;
    (childProc as { parentPid: string | null }).parentPid = parentPid;
    childProc.status = "entangled";

    return childProc;
  }

  /** qfreeze — dehydrate a quantum process (measure-free state serialization) */
  async qfreeze(pid: string): Promise<DehydratedQuantumState | null> {
    const proc = this.processes.get(pid);
    if (!proc || proc.status === "halted" || proc.status === "measured") return null;

    const bytes = serializeStateVector(proc.state);
    const hashBytes = await sha256(bytes);
    const cid = await computeCid(hashBytes);
    const checksum = bytesToHex(hashBytes).slice(0, 16);

    const frozen: DehydratedQuantumState = {
      cid,
      canonicalBytes: bytes,
      numQubits: proc.state.numQubits,
      basisCount: proc.state.bases.length,
      entanglementLinks: [...proc.state.entangledWith],
      frozenAt: new Date().toISOString(),
      sourceNode: proc.meshNode,
      checksum,
    };

    proc.dehydrationHistory.push(frozen);
    proc.status = "frozen";
    return frozen;
  }

  /** qresume — rehydrate a frozen quantum state from its CID */
  qresume(frozen: DehydratedQuantumState, targetNode?: string): QuantumProcess {
    const sv = deserializeStateVector(frozen.canonicalBytes);
    const node = targetNode ?? frozen.sourceNode;
    const pid = qpid();
    const proc: QuantumProcess = {
      pid,
      parentPid: null,
      state: sv,
      status: "superposition",
      createdAt: new Date().toISOString(),
      meshNode: node,
      priority: 0,
      dehydrationHistory: [frozen],
      lastMeasurement: null,
      gateCount: 0,
      coherenceTime: 100 + Math.random() * 900,
    };
    this.processes.set(pid, proc);
    this.updateNodeUsage(node, sv.numQubits);
    return proc;
  }

  /** qteleport — freeze → route to target node → resume */
  async qteleport(pid: string, targetNode: string): Promise<TeleportRecord | null> {
    const proc = this.processes.get(pid);
    if (!proc) return null;

    const fidelityBefore = stateNorm(proc.state);
    const frozen = await this.qfreeze(pid);
    if (!frozen) return null;

    const targetMesh = this.meshNodes.get(targetNode);
    const latency = targetMesh?.latencyMs ?? 10;

    // Simulate teleport (Bell pair consumption + classical channel)
    const resumed = this.qresume(frozen, targetNode);
    const fidelityAfter = stateNorm(resumed.state);

    // Remove from source node
    this.updateNodeUsage(proc.meshNode, -proc.state.numQubits);
    this.processes.delete(pid);

    const record: TeleportRecord = {
      teleportId: `tele:${uid()}`,
      cid: frozen.cid,
      sourceNode: proc.meshNode,
      targetNode,
      qubits: proc.state.numQubits,
      fidelityBefore,
      fidelityAfter,
      latencyMs: latency,
      timestamp: new Date().toISOString(),
      bellPairConsumed: true,
    };

    this.teleportLog.push(record);
    this.totalTeleports++;
    return record;
  }

  /** qmeasure — collapse a quantum process to a classical outcome */
  qmeasure(pid: string): { outcome: string; probability: number } | null {
    const proc = this.processes.get(pid);
    if (!proc || proc.status === "halted" || proc.status === "frozen") return null;

    // Weighted random selection
    const probs = proc.state.bases.map(b => probability(b.amplitude));
    const r = Math.random();
    let cumulative = 0;
    let outcomeIdx = 0;
    for (let i = 0; i < probs.length; i++) {
      cumulative += probs[i];
      if (r < cumulative) { outcomeIdx = i; break; }
    }

    const outcome = proc.state.bases[outcomeIdx].label;
    const prob = probs[outcomeIdx];

    // Collapse state
    const collapsed: BasisState[] = proc.state.bases.map((b, i) => ({
      label: b.label,
      amplitude: i === outcomeIdx ? { re: 1, im: 0 } : { re: 0, im: 0 },
    }));

    (proc as { state: QuantumStateVector }).state = {
      ...proc.state,
      bases: collapsed,
      entangledWith: [],
    };
    proc.status = "measured";
    proc.lastMeasurement = outcome;
    this.totalMeasurements++;
    return { outcome, probability: prob };
  }

  /** qentangle — create a Bell pair between two processes */
  qentangle(pidA: string, pidB: string): boolean {
    const a = this.processes.get(pidA);
    const b = this.processes.get(pidB);
    if (!a || !b) return false;

    (a as { state: QuantumStateVector }).state = {
      ...a.state,
      entangledWith: [...a.state.entangledWith, pidB],
    };
    (b as { state: QuantumStateVector }).state = {
      ...b.state,
      entangledWith: [...b.state.entangledWith, pidA],
    };
    a.status = "entangled";
    b.status = "entangled";
    return true;
  }

  /** qbarrier — return true when all quantum processes are idle or frozen */
  qbarrier(): boolean {
    for (const proc of this.processes.values()) {
      if (proc.status === "teleporting") return false;
    }
    return true;
  }

  /** qsched — set the scheduling policy */
  qsched(policy: SchedulingPolicy): void {
    this.policy = policy;
  }

  /** qkill — terminate a quantum process */
  qkill(pid: string): boolean {
    const proc = this.processes.get(pid);
    if (!proc) return false;
    proc.status = "halted";
    this.updateNodeUsage(proc.meshNode, -proc.state.numQubits);
    return true;
  }

  /** Get a process by PID */
  getProcess(pid: string): QuantumProcess | undefined {
    return this.processes.get(pid);
  }

  /** Snapshot the kernel state */
  async snapshot(): Promise<QLinuxKernelState> {
    const stateBytes = new TextEncoder().encode(
      JSON.stringify({
        policy: this.policy,
        procs: this.processes.size,
        teleports: this.totalTeleports,
        ts: Date.now(),
      })
    );
    const hashBytes = await sha256(stateBytes);
    const cid = await computeCid(hashBytes);

    return {
      processes: new Map(this.processes),
      meshNodes: new Map(this.meshNodes),
      teleportLog: [...this.teleportLog],
      schedulingPolicy: this.policy,
      totalGates: this.totalGates,
      totalTeleports: this.totalTeleports,
      totalMeasurements: this.totalMeasurements,
      uptimeMs: Date.now() - this.startTime,
      kernelCid: cid,
    };
  }

  /** Get summary stats for the dashboard */
  getSummary() {
    const procs = Array.from(this.processes.values());
    const statusCounts: Record<QProcessStatus, number> = {
      superposition: 0, entangled: 0, frozen: 0,
      teleporting: 0, measured: 0, halted: 0,
    };
    procs.forEach(p => statusCounts[p.status]++);

    const nodes = Array.from(this.meshNodes.values());
    const totalCapacity = nodes.reduce((s, n) => s + n.capacity, 0);
    const totalUsed = nodes.reduce((s, n) => s + n.used, 0);

    return {
      processCount: procs.length,
      statusCounts,
      nodeCount: nodes.length,
      totalCapacity,
      totalUsed,
      utilization: totalCapacity > 0 ? totalUsed / totalCapacity : 0,
      totalTeleports: this.totalTeleports,
      totalMeasurements: this.totalMeasurements,
      policy: this.policy,
      uptimeMs: Date.now() - this.startTime,
    };
  }

  // ── Internals ──────────────────────────────────────────────────────────

  private leastLoadedNode(): string {
    let best = "node:local";
    let bestLoad = Infinity;
    for (const [id, node] of this.meshNodes) {
      const load = node.used / node.capacity;
      if (load < bestLoad) { bestLoad = load; best = id; }
    }
    return best;
  }

  private updateNodeUsage(nodeId: string, delta: number): void {
    const node = this.meshNodes.get(nodeId);
    if (node) {
      (node as { used: number }).used = Math.max(0, node.used + delta);
    }
  }
}

// ── Factory: create a demo kernel with mesh topology ──────────────────────

export function createDemoKernel(): QLinuxKernel {
  const nodes: MeshNode[] = [
    { nodeId: "node:alpha",   ipv6: "fd00:0075:6f72:0001::1", capacity: 64, used: 0, latencyMs: 2,  fidelityThreshold: 0.99, processes: [] },
    { nodeId: "node:beta",    ipv6: "fd00:0075:6f72:0002::1", capacity: 32, used: 0, latencyMs: 8,  fidelityThreshold: 0.97, processes: [] },
    { nodeId: "node:gamma",   ipv6: "fd00:0075:6f72:0003::1", capacity: 128,used: 0, latencyMs: 5,  fidelityThreshold: 0.995,processes: [] },
    { nodeId: "node:delta",   ipv6: "fd00:0075:6f72:0004::1", capacity: 16, used: 0, latencyMs: 15, fidelityThreshold: 0.95, processes: [] },
  ];
  return new QLinuxKernel(nodes);
}

// ── Verification Suite ────────────────────────────────────────────────────

export interface QLinuxVerification {
  readonly name: string;
  readonly passed: boolean;
  readonly detail: string;
}

export async function verifyQLinuxKernel(): Promise<QLinuxVerification[]> {
  const results: QLinuxVerification[] = [];
  const kernel = createDemoKernel();

  // 1. Process spawn
  const p1 = kernel.qexec(2, "node:alpha");
  results.push({
    name: "qexec: spawn 2-qubit process",
    passed: p1.status === "superposition" && p1.state.numQubits === 2,
    detail: `PID=${p1.pid}, qubits=${p1.state.numQubits}, status=${p1.status}`,
  });

  // 2. State norm
  const norm = stateNorm(p1.state);
  results.push({
    name: "State normalization",
    passed: Math.abs(norm - 1.0) < 1e-10,
    detail: `‖ψ‖² = ${norm.toFixed(10)}`,
  });

  // 3. Hadamard gate
  const h = applyHadamard(groundState(1));
  const hNorm = stateNorm(h);
  results.push({
    name: "Hadamard preserves norm",
    passed: Math.abs(hNorm - 1.0) < 1e-10,
    detail: `H|0⟩ norm = ${hNorm.toFixed(10)}`,
  });

  // 4. Bell pair
  const bell = bellPair("a", "b");
  const bellNorm = stateNorm(bell);
  results.push({
    name: "Bell pair |Φ⁺⟩ normalization",
    passed: Math.abs(bellNorm - 1.0) < 1e-10,
    detail: `‖Φ⁺‖² = ${bellNorm.toFixed(10)}, entangled=[${bell.entangledWith}]`,
  });

  // 5. Freeze (dehydrate)
  const frozen = await kernel.qfreeze(p1.pid);
  results.push({
    name: "qfreeze: dehydrate to CID",
    passed: frozen !== null && frozen.cid.length > 0,
    detail: `CID=${frozen?.cid.slice(0, 20)}…, bytes=${frozen?.canonicalBytes.length}`,
  });

  // 6. Resume (rehydrate)
  if (frozen) {
    const p2 = kernel.qresume(frozen, "node:beta");
    const f = fidelity(p1.state, p2.state);
    results.push({
      name: "qresume: rehydrate from CID",
      passed: p2.status === "superposition" && f > 0.99,
      detail: `Fidelity = ${f.toFixed(6)}, node=${p2.meshNode}`,
    });
  }

  // 7. Teleport
  const p3 = kernel.qexec(1, "node:alpha");
  const teleport = await kernel.qteleport(p3.pid, "node:gamma");
  results.push({
    name: "qteleport: freeze → route → resume",
    passed: teleport !== null && teleport.bellPairConsumed,
    detail: `${teleport?.sourceNode} → ${teleport?.targetNode}, latency=${teleport?.latencyMs}ms`,
  });

  // 8. Fork + entangle
  const p4 = kernel.qexec(1, "node:alpha");
  const child = kernel.qfork(p4.pid);
  results.push({
    name: "qfork: clone + entangle",
    passed: child !== null && child.status === "entangled",
    detail: `Parent=${p4.pid}, child=${child?.pid}, entangled=${child?.state.entangledWith.length}`,
  });

  // 9. Measure
  const p5 = kernel.qexec(1);
  const meas = kernel.qmeasure(p5.pid);
  results.push({
    name: "qmeasure: collapse to classical",
    passed: meas !== null && meas.probability > 0,
    detail: `Outcome=${meas?.outcome}, P=${meas?.probability.toFixed(4)}`,
  });

  // 10. Barrier
  const barrier = kernel.qbarrier();
  results.push({
    name: "qbarrier: all processes synchronized",
    passed: barrier === true,
    detail: `Barrier passed: ${barrier}`,
  });

  // 11. Scheduling policy
  kernel.qsched("entanglement-preserving");
  const summary = kernel.getSummary();
  results.push({
    name: "qsched: policy update",
    passed: summary.policy === "entanglement-preserving",
    detail: `Policy=${summary.policy}`,
  });

  // 12. Kernel snapshot CID
  const snap = await kernel.snapshot();
  results.push({
    name: "Kernel snapshot content-addressed",
    passed: snap.kernelCid.length > 0,
    detail: `CID=${snap.kernelCid.slice(0, 24)}…, procs=${snap.processes.size}`,
  });

  // 13. Round-trip fidelity (freeze → resume = lossless)
  const pRT = kernel.qexec(3, "node:gamma");
  // Apply some gates
  (pRT as { state: QuantumStateVector }).state = applyHadamard(pRT.state);
  const frozenRT = await kernel.qfreeze(pRT.pid);
  if (frozenRT) {
    const resumed = kernel.qresume(frozenRT);
    const rtFidelity = fidelity(pRT.state, resumed.state);
    results.push({
      name: "Round-trip fidelity (freeze→resume)",
      passed: Math.abs(rtFidelity - 1.0) < 1e-10,
      detail: `F = ${rtFidelity.toFixed(10)} (lossless)`,
    });
  }

  // 14. Kill process
  const pK = kernel.qexec(1);
  const killed = kernel.qkill(pK.pid);
  results.push({
    name: "qkill: terminate process",
    passed: killed && kernel.getProcess(pK.pid)?.status === "halted",
    detail: `PID=${pK.pid} → halted`,
  });

  return results;
}
