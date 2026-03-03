/**
 * Foundation Types — Internalized from uor-foundation
 * ════════════════════════════════════════════════════
 *
 * Canonical type definitions for the UOR algebraic substrate.
 * Zero external dependencies.
 *
 * @module hologram/platform/foundation-types
 */

export type Space = "Kernel" | "Bridge" | "User";
export type MetricAxis = "Vertical" | "Horizontal" | "Diagonal";
export type FiberState = "Pinned" | "Free";

export type GeometricCharacter =
  | "RingReflection" | "HypercubeReflection" | "Rotation"
  | "RotationInverse" | "Translation" | "Scaling"
  | "HypercubeTranslation" | "HypercubeProjection" | "HypercubeJoin";

export interface FiberCoordinate {
  bitIndex: number;
  state: FiberState;
  pinnedBy: string | null;
}

export interface FiberPinning {
  coordinate: FiberCoordinate;
  constraintId: string;
  pinnedAt: string;
}

export interface FiberBudget {
  totalFibers: number;
  pinnedCount: number;
  isClosed: boolean;
  fibers: FiberCoordinate[];
  pinnings: FiberPinning[];
}
