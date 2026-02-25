/**
 * UOR v2.0.0 — Hologram OS Runtime
 *
 * Maps v2 foundation types to Hologram OS abstractions:
 *
 *   ComputationTrace  →  Process  (executable unit)
 *   Context + Binding  →  FileSystem  (directory + files)
 *   Observable         →  Panel  (dashboard metric)
 *   FiberBudget        →  ProgressTracker
 *   Certificate        →  Attestation
 *
 * Pure data. No UI. No side effects. The thinnest possible bridge
 * between the algebraic substrate and the Hologram rendering layer.
 */

import type { MetricAxis } from "@/types/uor-foundation/enums";
import type { FiberBudget } from "@/types/uor-foundation/bridge/partition";
import { resolution } from "@/modules/ring-core/fiber-budget";

// ── Process: wraps ComputationTrace ────────────────────────────────────────

export interface ProcessStep {
  index: number;
  operation: string;
  input: number;
  output: number;
  certified: boolean;
}

export interface Process {
  pid: string;
  quantum: number;
  steps: ProcessStep[];
  status: "running" | "completed" | "failed";
  allCertified: boolean;
}

export function createProcess(
  traceId: string,
  quantum: number,
  steps: ProcessStep[],
): Process {
  return {
    pid: traceId,
    quantum,
    steps,
    status: steps.length > 0 ? "completed" : "running",
    allCertified: steps.every((s) => s.certified),
  };
}

// ── FileSystem: wraps Context/Binding/Frame ────────────────────────────────

export interface File {
  name: string;
  address: string;
  bindingType: string;
}

export interface Directory {
  contextId: string;
  quantum: number;
  capacity: number;
  files: File[];
}

export interface FileSystemSnapshot {
  directories: Directory[];
  totalFiles: number;
  totalCapacity: number;
}

export function createDirectory(
  contextId: string,
  quantum: number,
  capacity: number,
  files: File[] = [],
): Directory {
  return { contextId, quantum, capacity, files };
}

export function createFileSystem(directories: Directory[]): FileSystemSnapshot {
  return {
    directories,
    totalFiles: directories.reduce((s, d) => s + d.files.length, 0),
    totalCapacity: directories.reduce((s, d) => s + d.capacity, 0),
  };
}

// ── Panel: wraps Observable ────────────────────────────────────────────────

export interface Panel {
  id: string;
  axis: MetricAxis;
  label: string;
  value: number;
  quantum: number;
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

// ── ProgressTracker: wraps FiberBudget ─────────────────────────────────────

export interface ProgressTracker {
  totalFibers: number;
  resolved: number;
  ratio: number;
  closed: boolean;
}

export function createTracker(budget: FiberBudget): ProgressTracker {
  return {
    totalFibers: budget.totalFibers,
    resolved: budget.pinnedCount,
    ratio: resolution(budget),
    closed: budget.isClosed,
  };
}

// ── Attestation: wraps Certificate ─────────────────────────────────────────

export interface Attestation {
  certId: string;
  targetIri: string;
  valid: boolean;
  issuedAt: string;
  kind: "transform" | "isometry" | "involution";
}

export function createAttestation(
  certId: string,
  targetIri: string,
  valid: boolean,
  kind: Attestation["kind"],
): Attestation {
  return { certId, targetIri, valid, issuedAt: new Date().toISOString(), kind };
}

// ── HologramState: the complete OS snapshot ────────────────────────────────

export interface HologramState {
  processes: Process[];
  fileSystem: FileSystemSnapshot;
  dashboard: Record<MetricAxis, Panel[]>;
  tracker: ProgressTracker;
  attestations: Attestation[];
}

export function createHologramState(opts: {
  processes: Process[];
  directories: Directory[];
  panels: Panel[];
  budget: FiberBudget;
  attestations: Attestation[];
}): HologramState {
  return {
    processes: opts.processes,
    fileSystem: createFileSystem(opts.directories),
    dashboard: groupByAxis(opts.panels),
    tracker: createTracker(opts.budget),
    attestations: opts.attestations,
  };
}
