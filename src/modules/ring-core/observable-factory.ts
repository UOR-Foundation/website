/**
 * UOR v2.0.0 — Observable Factory
 *
 * Creates typed observable instances aligned to MetricAxis.
 * Each factory function returns a plain object satisfying the
 * corresponding v2 interface. No classes — just data.
 *
 * 13 observable subtypes organized into 3 axes:
 *   Vertical:   StratumObservable, RingMetric
 *   Horizontal: HammingMetric, CascadeObservable, CascadeLength
 *   Diagonal:   CurvatureObservable, HolonomyObservable,
 *               CatastropheObservable, CatastropheThreshold, DihedralElement
 *   Generic:    MetricObservable, PathObservable
 */

import type { MetricAxis } from "@/types/uor-foundation/enums";
import { OBSERVABLE_AXIS } from "@/types/uor-foundation/bridge/observable";
import { bytePopcount, byteBasis } from "@/lib/uor-ring";

// ── Shared base builder ────────────────────────────────────────────────────

function base(typeName: string, val: number, q: number) {
  const axis = OBSERVABLE_AXIS[typeName] as MetricAxis;
  return {
    iri: () => `observable:${typeName}:q${q}:${val}`,
    value: () => val,
    axis: () => axis,
    quantum: () => q,
  };
}

// ── Vertical ───────────────────────────────────────────────────────────────

export function stratum(val: number, q = 0) {
  const bytes = splitBytes(val, q);
  return { ...base("StratumObservable", val, q), stratumVector: () => bytes.map(bytePopcount) };
}

export function ringMetric(val: number, ref: number, q = 0) {
  const m = 1 << (8 * (q + 1));
  const d = Math.min(Math.abs(val - ref), m - Math.abs(val - ref));
  return { ...base("RingMetric", val, q), distance: () => d, reference: () => ref };
}

// ── Horizontal ─────────────────────────────────────────────────────────────

export function hammingMetric(val: number, ref: number, q = 0) {
  const xored = val ^ ref;
  let d = 0;
  for (let v = xored; v; v >>>= 1) d += v & 1;
  return { ...base("HammingMetric", val, q), distance: () => d, reference: () => ref };
}

export function cascadeObs(val: number, len: number, q = 0) {
  return { ...base("CascadeObservable", val, q), cascadeLength: () => len };
}

export function cascadeLength(val: number, steps: number, q = 0) {
  return { ...base("CascadeLength", val, q), totalSteps: () => steps };
}

// ── Diagonal ───────────────────────────────────────────────────────────────

export function curvature(val: number, curv: number, q = 0) {
  return { ...base("CurvatureObservable", val, q), curvature: () => curv };
}

export function holonomy(val: number, angle: number, loopPath: string[], q = 0) {
  return { ...base("HolonomyObservable", val, q), angle: () => angle, loopPath: () => loopPath };
}

export function catastrophe(val: number, detected: boolean, type: string, q = 0) {
  return { ...base("CatastropheObservable", val, q), detected: () => detected, catastropheType: () => type };
}

export function catastropheThreshold(val: number, threshold: number, q = 0) {
  return { ...base("CatastropheThreshold", val, q), threshold: () => threshold };
}

export function dihedralElement(val: number, rotation: number, isRefl: boolean, q = 0) {
  return { ...base("DihedralElement", val, q), rotation: () => rotation, isReflection: () => isRefl };
}

// ── Generic ────────────────────────────────────────────────────────────────

export function metricObs(val: number, metric: number, axis: MetricAxis, q = 0) {
  return { ...base("MetricObservable", val, q), metricValue: () => metric, metricAxis: () => axis };
}

export function pathObs(val: number, path: number[], q = 0) {
  return { ...base("PathObservable", val, q), path: () => path, pathLength: () => path.length };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function splitBytes(val: number, q: number): number[] {
  const width = q + 1;
  const bytes: number[] = [];
  let v = val;
  for (let i = width - 1; i >= 0; i--) {
    bytes[i] = v & 0xff;
    v >>>= 8;
  }
  return bytes;
}

/** All 13 observable type names. */
export const OBSERVABLE_TYPES = Object.keys(OBSERVABLE_AXIS);
