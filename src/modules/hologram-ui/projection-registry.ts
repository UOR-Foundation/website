/**
 * UI Projection Registry — Visual Projections of Canonical Identity
 * ═══════════════════════════════════════════════════════════════════
 *
 * The holographic principle: one canonical identity, infinite projections.
 * Most projections map hash → protocol string (DID, CID, WebFinger…).
 * THIS projection maps hash → perceivable React component tree.
 *
 * That IS what a hologram literally is: projecting abstract data
 * into a form that can be perceived and interacted with.
 *
 * Architecture:
 *   1. UIProjectionSpec — declares a visual projection (component type + props schema)
 *   2. UI_PROJECTIONS   — the registry of all visual projection types
 *   3. resolveUIProjection() — maps (identity, type, props) → renderable descriptor
 *   4. LensBlueprint integration — registers `ui:*` element factories
 *
 * Holographic Property:
 *   Given the same hash bytes and the same component type, the visual
 *   projection is deterministic. Hash bytes seed visual parameters
 *   (accent color hue, trend direction, metric values) so every UOR
 *   object has a unique, reproducible visual signature.
 *
 * @module hologram-ui/projection-registry
 */

import type { ProjectionInput } from "@/modules/uns/core/hologram/index";
import { dehydrate } from "@/modules/uns/core/hologram/lens";

// ── Types ───────────────────────────────────────────────────────────────────

/** The six registered UI component types. */
export type UIComponentType =
  | "ui:stat-card"
  | "ui:data-table"
  | "ui:metric-bar"
  | "ui:info-card"
  | "ui:page-shell"
  | "ui:dashboard-grid";

/**
 * Props schema entry — describes one prop with type and default.
 * Used for validation and hash-seeded prop generation.
 */
export interface PropSchema {
  readonly type: "string" | "number" | "boolean" | "node" | "array" | "object";
  readonly required?: boolean;
  readonly defaultValue?: unknown;
  readonly description?: string;
}

/**
 * A UI Projection Specification — one per visual component type.
 *
 * Analogous to HologramSpec (which maps hash → string), but maps
 * hash → visual descriptor (component type + resolved props).
 */
export interface UIProjectionSpec {
  /** The component type identifier. */
  readonly type: UIComponentType;
  /** Human-readable label. */
  readonly label: string;
  /** Props schema — defines expected props and their types. */
  readonly propsSchema: Readonly<Record<string, PropSchema>>;
  /**
   * Seed function: derives deterministic visual parameters from hash bytes.
   * These become default props when explicit props aren't provided.
   */
  readonly seed: (input: ProjectionInput) => Record<string, unknown>;
  /** URL to the component's documentation. */
  readonly spec: string;
}

/**
 * A resolved UI projection — ready to render.
 * Contains the component type and fully resolved props.
 */
export interface UIProjectionResult {
  /** Which component type to render. */
  readonly type: UIComponentType;
  /** Fully resolved props (explicit overrides merged with hash-seeded defaults). */
  readonly props: Record<string, unknown>;
  /** The source identity that produced this projection. */
  readonly source: ProjectionInput;
  /** The spec URL. */
  readonly spec: string;
}

// ── Hash-Seeded Visual Parameters ──────────────────────────────────────────

/**
 * Derive a deterministic hue (0-360) from hash bytes.
 * Uses bytes 0-1 for a smooth distribution across the color wheel.
 */
function seedHue(bytes: Uint8Array): number {
  return ((bytes[0] << 8) | bytes[1]) % 360;
}

/**
 * Derive a deterministic percentage (0-1) from a specific byte.
 */
function seedPercent(bytes: Uint8Array, byteIndex: number): number {
  return (bytes[byteIndex % bytes.length] ?? 0) / 255;
}

/**
 * Derive a deterministic trend (-100 to +100) from hash bytes.
 */
function seedTrend(bytes: Uint8Array): number {
  const raw = bytes[4] ?? 128;
  return Math.round((raw / 255) * 200 - 100);
}

/**
 * Derive a deterministic short label from hash bytes.
 */
function seedLabel(bytes: Uint8Array, prefix: string): string {
  const suffix = Array.from(bytes.slice(0, 3))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}:${suffix}`;
}

// ── Registry ────────────────────────────────────────────────────────────────

const SPEC_BASE = "https://uor.foundation/spec/hologram-ui";

/**
 * All registered UI projection specifications.
 * Each maps a component type to its schema and hash-seeded defaults.
 */
export const UI_PROJECTIONS: ReadonlyMap<UIComponentType, UIProjectionSpec> = new Map([

  ["ui:stat-card", {
    type: "ui:stat-card" as const,
    label: "Stat Card",
    spec: `${SPEC_BASE}/stat-card`,
    propsSchema: {
      label: { type: "string", required: true, description: "Metric label" },
      value: { type: "string", required: true, description: "Metric value" },
      sublabel: { type: "string", description: "Secondary text" },
      trend: { type: "number", description: "Trend percentage" },
      accentVar: { type: "string", description: "CSS accent variable name" },
    },
    seed: (input) => ({
      label: seedLabel(input.hashBytes, "UOR"),
      value: input.hashBytes[2]?.toString() ?? "0",
      trend: seedTrend(input.hashBytes),
      sublabel: `CID: ${input.cid.slice(0, 12)}…`,
    }),
  }],

  ["ui:data-table", {
    type: "ui:data-table" as const,
    label: "Data Table",
    spec: `${SPEC_BASE}/data-table`,
    propsSchema: {
      columns: { type: "array", required: true, description: "Column definitions" },
      data: { type: "array", required: true, description: "Row data" },
      emptyMessage: { type: "string", defaultValue: "No data" },
    },
    seed: (input) => ({
      columns: [
        { key: "field", label: "Field" },
        { key: "value", label: "Value", mono: true },
      ],
      data: [
        { field: "CID", value: input.cid.slice(0, 24) },
        { field: "Hex", value: input.hex.slice(0, 24) },
        { field: "Hue", value: seedHue(input.hashBytes).toString() },
      ],
      getKey: (row: Record<string, unknown>) => String(row.field),
    }),
  }],

  ["ui:metric-bar", {
    type: "ui:metric-bar" as const,
    label: "Metric Bar",
    spec: `${SPEC_BASE}/metric-bar`,
    propsSchema: {
      label: { type: "string", required: true },
      value: { type: "number", required: true, description: "0–1 ratio" },
      color: { type: "string", description: "CSS color" },
      showPercent: { type: "boolean", defaultValue: true },
      sublabel: { type: "string" },
    },
    seed: (input) => ({
      label: seedLabel(input.hashBytes, "Coherence"),
      value: seedPercent(input.hashBytes, 5),
      color: `hsl(${seedHue(input.hashBytes)}, 60%, 55%)`,
      sublabel: `Byte[5] = ${input.hashBytes[5]}`,
    }),
  }],

  ["ui:info-card", {
    type: "ui:info-card" as const,
    label: "Info Card",
    spec: `${SPEC_BASE}/info-card`,
    propsSchema: {
      title: { type: "string", required: true },
      badge: { type: "string" },
      badgeColor: { type: "string" },
      defaultOpen: { type: "boolean", defaultValue: false },
      alwaysOpen: { type: "boolean", defaultValue: false },
      children: { type: "node", required: true },
    },
    seed: (input) => ({
      title: `Object ${input.hex.slice(0, 8)}`,
      badge: input.hashBytes[0] > 127 ? "LOSSLESS" : "LOSSY",
      badgeColor: input.hashBytes[0] > 127
        ? "hsl(152, 44%, 50%)"
        : "hsl(38, 92%, 50%)",
      defaultOpen: true,
    }),
  }],

  ["ui:page-shell", {
    type: "ui:page-shell" as const,
    label: "Page Shell",
    spec: `${SPEC_BASE}/page-shell`,
    propsSchema: {
      title: { type: "string", required: true },
      subtitle: { type: "string" },
      backTo: { type: "string", defaultValue: "/" },
      badge: { type: "string" },
      children: { type: "node", required: true },
    },
    seed: (input) => ({
      title: `Hologram ${input.hex.slice(0, 8)}`,
      subtitle: `CID: ${input.cid.slice(0, 20)}…`,
      badge: `Q${input.hashBytes[0] % 8}`,
    }),
  }],

  ["ui:dashboard-grid", {
    type: "ui:dashboard-grid" as const,
    label: "Dashboard Grid",
    spec: `${SPEC_BASE}/dashboard-grid`,
    propsSchema: {
      cols: { type: "number", defaultValue: 3, description: "Column count (2|3|4)" },
      children: { type: "node", required: true },
    },
    seed: (input) => ({
      cols: ([2, 3, 4] as const)[input.hashBytes[3] % 3],
    }),
  }],
]);

// ── Resolution Function ────────────────────────────────────────────────────

/**
 * Resolve a UI projection from a canonical identity.
 *
 * Merges hash-seeded defaults with explicit prop overrides.
 * Explicit props always win — the hash just provides deterministic fallbacks.
 *
 * @param source    The canonical identity (ProjectionInput).
 * @param type      Which UI component to project into.
 * @param overrides Explicit prop values that override hash-seeded defaults.
 * @returns         A fully resolved UIProjectionResult.
 */
export function resolveUIProjection(
  source: ProjectionInput,
  type: UIComponentType,
  overrides?: Record<string, unknown>,
): UIProjectionResult {
  const spec = UI_PROJECTIONS.get(type);
  if (!spec) {
    throw new Error(
      `[UI Projection] Unknown type: "${type}". Available: ${[...UI_PROJECTIONS.keys()].join(", ")}`
    );
  }

  // Hash-seeded defaults merged with explicit overrides
  const seeded = spec.seed(source);
  const props = { ...seeded, ...(overrides ?? {}) };

  return { type, props, source, spec: spec.spec };
}

/**
 * Resolve ALL UI projections for a given identity.
 * Returns a map of component type → UIProjectionResult.
 */
export function resolveAllUIProjections(
  source: ProjectionInput,
): ReadonlyMap<UIComponentType, UIProjectionResult> {
  const results = new Map<UIComponentType, UIProjectionResult>();
  for (const [type] of UI_PROJECTIONS) {
    results.set(type, resolveUIProjection(source, type));
  }
  return results;
}

// ── Lens Blueprint Integration ─────────────────────────────────────────────
// Register `ui:*` element factories so Executable Blueprints can include
// UI projections as first-class pipeline elements.
//
// Usage in a blueprint:
//   { id: "display", kind: "ui:stat-card", config: { label: "Score" } }
//
// The element takes a ProjectionInput (or any object that gets dehydrated)
// and returns a UIProjectionResult — a serializable descriptor that the
// DynamicProjection React component can render.

async function registerUIElementFactories(): Promise<void> {
  // Dynamic import to break circular dependency:
  // engine.ts → projection-registry.ts → lens-blueprint.ts → index.ts → engine.ts
  const { registerElementFactory } = await import("@/modules/uns/core/hologram/lens-blueprint");

  for (const [type] of UI_PROJECTIONS) {
    registerElementFactory(type, (elementSpec) => ({
      id: elementSpec.id,
      kind: type,
      focus: async (input: unknown) => {
        let pi: ProjectionInput;
        if (
          input &&
          typeof input === "object" &&
          "hashBytes" in (input as Record<string, unknown>) &&
          "cid" in (input as Record<string, unknown>) &&
          "hex" in (input as Record<string, unknown>)
        ) {
          pi = input as ProjectionInput;
        } else {
          const { proof } = await dehydrate(input);
          pi = {
            hashBytes: proof.hashBytes,
            cid: proof.cid,
            hex: proof.hashHex,
          };
        }
        const overrides = elementSpec.config ?? {};
        return resolveUIProjection(pi, type, overrides);
      },
    }));
  }
}

// Lazy initialization — called on first use rather than module load.
let _uiFactoriesRegistered = false;
let _registrationPromise: Promise<void> | null = null;
export function ensureUIElementFactories(): Promise<void> {
  if (_uiFactoriesRegistered) return Promise.resolve();
  if (_registrationPromise) return _registrationPromise;
  _registrationPromise = registerUIElementFactories().then(() => {
    _uiFactoriesRegistered = true;
  });
  return _registrationPromise;
}

// Deferred auto-registration. Uses setTimeout to ensure all ESM modules
// complete their top-level evaluation before we touch ELEMENT_REGISTRY.
// The catch prevents unhandled rejections in test environments where
// the circular dependency may not fully resolve.
setTimeout(() => {
  ensureUIElementFactories().catch(() => {
    // Silently retry on next explicit call — registration will succeed
    // once all modules are fully initialized.
    _registrationPromise = null;
  });
}, 0);
