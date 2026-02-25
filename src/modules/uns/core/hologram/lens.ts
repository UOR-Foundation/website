/**
 * Holographic Lens — Composable Projection Circuits
 * ══════════════════════════════════════════════════
 *
 * A Lens is a content-addressed composition of pure functions.
 *
 * In optics, a compound lens is multiple elements stacked in order.
 * Light enters, passes through each element sequentially, and exits
 * focused. The same compound lens always produces the same focal point.
 *
 *   compose → grind → focus
 *   (build)   (hash)   (run)
 *
 * Pipeline-first design:
 *   Elements are ordered. Output of each feeds into the next.
 *   No wiring needed for the 90% case — just list your elements.
 *
 *   const lens = composeLens("my-pipeline", [hash, sign, project]);
 *   const ground = await grindLens(lens);   // → CID, DID, WebFinger…
 *   const result = await focusLens(lens, inputData);
 *
 * DAG wiring (advanced):
 *   When elements need non-linear data flow, add explicit wires.
 *   Wires use dotted notation: "elementId.portName"
 *
 * Morphism classification:
 *   Every lens declares its morphism type from the UOR hierarchy:
 *     • "transform" — general (may be lossy)
 *     • "isometry"  — preserves all information (invertible)
 *     • "embedding"  — lossy but with compression witness
 *
 * A lens IS a hologram — its identity projects through all 25+ standards.
 *
 * @module uns/core/hologram/lens
 */

import { singleProofHash, type SingleProofResult } from "@/lib/uor-canonical";
import { project, PROJECTIONS, type Hologram, type ProjectionInput } from "./index";

// ── Types ───────────────────────────────────────────────────────────────────

/**
 * A single lens element — one pure function.
 *
 * In the linear (pipeline) case, focus receives the previous element's
 * output as a single value. In the DAG case, it receives a named record.
 */
export interface LensElement {
  /** Unique ID within this lens. */
  readonly id: string;
  /** Classification: a registered projection name, "transform", or "hologram:Lens". */
  readonly kind: string;
  /** The pure function. Deterministic: same input → same output. Always. */
  readonly focus: (input: unknown) => Promise<unknown>;
}

/**
 * A wire for non-linear (DAG) data flow.
 * Uses dotted notation: "elementId.portName" or just "elementId".
 */
export interface LensWire {
  readonly from: string;
  readonly to: string;
}

/** UOR morphism classification for the lens. */
export type LensMorphism = "transform" | "isometry" | "embedding";

/** The complete Holographic Lens — a content-addressed circuit. */
export interface HolographicLens {
  readonly "@context": "https://uor.foundation/contexts/uor-v1.jsonld";
  readonly "@type": "hologram:Lens";
  readonly name: string;
  readonly version: string;
  readonly morphism: LensMorphism;
  /** Ordered elements. In pipeline mode, executed sequentially. */
  readonly elements: readonly LensElement[];
  /** Optional DAG wiring. When absent, elements form a linear pipeline. */
  readonly wires?: readonly LensWire[];
}

/** The result of grinding a lens: its content-addressed identity. */
export interface GroundLens {
  readonly lens: HolographicLens;
  readonly proof: SingleProofResult;
  readonly hologram: Hologram;
}

/** The result of focusing (executing) a lens. */
export interface FocusResult {
  readonly output: unknown;
  readonly trace: readonly string[];
  readonly lensCid: string;
}

// ── Serializable Manifest (for hashing — strips functions) ─────────────────

function toManifest(lens: HolographicLens) {
  return {
    "@context": lens["@context"],
    "@type": lens["@type"],
    name: lens.name,
    version: lens.version,
    morphism: lens.morphism,
    elements: lens.elements.map((e) => ({ id: e.id, kind: e.kind })),
    ...(lens.wires ? { wires: lens.wires } : {}),
  };
}

// ── Element Factories ──────────────────────────────────────────────────────

/**
 * Create a LensElement from a registered hologram projection.
 *
 * The element accepts a ProjectionInput and returns the projection string.
 * This binds directly to the Hologram Projection Registry — zero boilerplate.
 *
 *   const didElement = fromProjection("did");
 *   const btcElement = fromProjection("bitcoin");
 */
export function fromProjection(projectionName: string): LensElement {
  const spec = PROJECTIONS.get(projectionName);
  if (!spec) {
    throw new Error(
      `[Lens] Unknown projection: "${projectionName}". ` +
        `Available: ${[...PROJECTIONS.keys()].join(", ")}`
    );
  }
  return {
    id: projectionName,
    kind: projectionName,
    focus: async (input) => spec.project(input as ProjectionInput),
  };
}

/**
 * Create a LensElement from any pure function.
 *
 *   const upper = element("uppercase", async (s) => (s as string).toUpperCase());
 */
export function element(
  id: string,
  focus: (input: unknown) => Promise<unknown>,
  kind = "transform",
): LensElement {
  return { id, kind, focus };
}

// ── Core API ───────────────────────────────────────────────────────────────

/**
 * Compose a Holographic Lens.
 *
 * Pipeline mode (default): just pass an ordered array of elements.
 *   composeLens("my-pipeline", [a, b, c])
 *
 * DAG mode: pass elements + explicit wires.
 *   composeLens("my-dag", elements, { wires, morphism: "embedding" })
 */
export function composeLens(
  name: string,
  elements: LensElement[],
  options?: {
    version?: string;
    morphism?: LensMorphism;
    wires?: LensWire[];
  },
): HolographicLens {
  if (elements.length === 0) {
    throw new Error("[Lens] A lens must have at least one element.");
  }

  const wires = options?.wires;

  // Validate DAG wiring if provided
  if (wires) {
    const ids = new Set(elements.map((e) => e.id));
    for (const w of wires) {
      const fromId = w.from.split(".")[0];
      const toId = w.to.split(".")[0];
      if (!ids.has(fromId)) throw new Error(`[Lens] Wire references unknown element: "${fromId}"`);
      if (!ids.has(toId)) throw new Error(`[Lens] Wire references unknown element: "${toId}"`);
    }
    // Validate acyclic
    dagSort(elements, wires);
  }

  return {
    "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
    "@type": "hologram:Lens",
    name,
    version: options?.version ?? "1.0.0",
    morphism: options?.morphism ?? "transform",
    elements,
    ...(wires ? { wires } : {}),
  };
}

/**
 * Grind a lens — compute its permanent content-addressed identity.
 *
 * "Grinding" is the optical term for shaping a lens to its final form.
 * After grinding, the lens projects through all 25+ hologram standards.
 * Same elements + same order + same version = same identity. Forever.
 */
export async function grindLens(lens: HolographicLens): Promise<GroundLens> {
  const proof = await singleProofHash(toManifest(lens));
  const input: ProjectionInput = {
    hashBytes: proof.hashBytes,
    cid: proof.cid,
    hex: proof.hashHex,
  };
  return { lens, proof, hologram: project(input) };
}

/**
 * Focus a lens — execute the circuit on input.
 *
 * Pipeline mode: input flows through each element sequentially.
 *   Element₁(input) → Element₂(result₁) → … → ElementN(resultN₋₁) → output
 *
 * DAG mode: data flows along explicit wires. Elements with all inputs
 *   satisfied are executed in deterministic topological order.
 *
 * @param lens   The Holographic Lens to execute.
 * @param input  The input data (single value for pipeline, record for DAG).
 * @returns      FocusResult with output, execution trace, and lens CID.
 */
export async function focusLens(
  lens: HolographicLens,
  input: unknown,
): Promise<FocusResult> {
  const trace: string[] = [];

  let output: unknown;

  if (!lens.wires) {
    // ── Pipeline mode: simple sequential flow ──────────────────────────
    let current = input;
    for (const el of lens.elements) {
      current = await el.focus(current);
      trace.push(el.id);
    }
    output = current;
  } else {
    // ── DAG mode: topological execution with data bus ──────────────────
    const order = dagSort(lens.elements, lens.wires);
    const bus = new Map<string, unknown>();
    bus.set("__input", input);

    for (const id of order) {
      const el = lens.elements.find((e) => e.id === id)!;

      // Gather inputs from wires pointing to this element
      const incoming = lens.wires.filter((w) => w.to.split(".")[0] === id);

      let elInput: unknown;
      if (incoming.length === 0) {
        // Root element — receives the lens input
        elInput = input;
      } else if (incoming.length === 1) {
        // Single wire — pass value directly
        elInput = bus.get(incoming[0].from);
      } else {
        // Multiple wires — collect into a named record
        const record: Record<string, unknown> = {};
        for (const w of incoming) {
          const portName = w.to.split(".")[1] ?? w.from.split(".")[0];
          record[portName] = bus.get(w.from);
        }
        elInput = record;
      }

      const result = await el.focus(elInput);
      bus.set(id, result);
      trace.push(id);
    }

    // Output is the last element's result
    const lastId = order[order.length - 1];
    output = bus.get(lastId);
  }

  const proof = await singleProofHash(toManifest(lens));
  return { output, trace, lensCid: proof.cid };
}

/**
 * Nest a lens inside another lens as a single element.
 * Fractal composition: lenses containing lenses.
 */
export function nestLens(inner: HolographicLens): LensElement {
  return {
    id: `lens:${inner.name}`,
    kind: "hologram:Lens",
    focus: async (input) => {
      const result = await focusLens(inner, input);
      return result.output;
    },
  };
}

// ── Lens Algebra ───────────────────────────────────────────────────────────

/**
 * Sequential composition: lens₁ ∘ lens₂
 * Light passes through lens₁ first, then lens₂.
 * The result is a new lens with combined identity.
 */
export function sequence(
  name: string,
  first: HolographicLens,
  second: HolographicLens,
): HolographicLens {
  return composeLens(name, [nestLens(first), nestLens(second)]);
}

/**
 * Parallel composition: lens₁ ⊗ lens₂ (tensor product)
 * Both lenses receive the same input independently.
 * Output is a record: { [lens₁.name]: result₁, [lens₂.name]: result₂ }
 */
export function parallel(
  name: string,
  ...lenses: HolographicLens[]
): HolographicLens {
  const elements = lenses.map<LensElement>((l) => ({
    id: `lens:${l.name}`,
    kind: "hologram:Lens",
    focus: async (input) => {
      const result = await focusLens(l, input);
      return result.output;
    },
  }));

  // Parallel element: fans input to all children, collects outputs
  const fan: LensElement = {
    id: "__fan",
    kind: "transform",
    focus: async (input) => {
      const results: Record<string, unknown> = {};
      await Promise.all(
        lenses.map(async (l, i) => {
          const r = await elements[i].focus(input);
          results[l.name] = r;
        }),
      );
      return results;
    },
  };

  return composeLens(name, [fan], { morphism: "transform" });
}

// ── DAG Topological Sort ───────────────────────────────────────────────────

function dagSort(elements: readonly LensElement[], wires: readonly LensWire[]): string[] {
  const ids = elements.map((e) => e.id);
  const inDegree = new Map<string, number>(ids.map((id) => [id, 0]));
  const adj = new Map<string, string[]>(ids.map((id) => [id, []]));

  for (const w of wires) {
    const fromId = w.from.split(".")[0];
    const toId = w.to.split(".")[0];
    if (ids.includes(fromId) && ids.includes(toId)) {
      adj.get(fromId)!.push(toId);
      inDegree.set(toId, (inDegree.get(toId) ?? 0) + 1);
    }
  }

  const queue = ids.filter((id) => inDegree.get(id) === 0);
  const sorted: string[] = [];

  while (queue.length > 0) {
    queue.sort(); // deterministic: lexicographic tie-breaking
    const current = queue.shift()!;
    sorted.push(current);
    for (const next of adj.get(current) ?? []) {
      const deg = inDegree.get(next)! - 1;
      inDegree.set(next, deg);
      if (deg === 0) queue.push(next);
    }
  }

  if (sorted.length !== ids.length) {
    throw new Error(
      `[Holographic Lens] Cycle detected. A lens must be a DAG. ` +
        `Sorted ${sorted.length}/${ids.length} elements.`
    );
  }

  return sorted;
}
