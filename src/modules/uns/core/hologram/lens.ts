/**
 * Holographic Lens — Composable Projection Circuits
 * ══════════════════════════════════════════════════
 *
 * A Lens is the holographic equivalent of a circuit:
 *
 *   • Each ELEMENT is a projection or transform (a Lego block)
 *   • Each WIRE defines data flow between elements (order matters)
 *   • The LENS itself is content-addressed — same wiring = same identity
 *   • A Lens IS a hologram: it projects through all 25+ standards
 *
 * Optical metaphor:
 *   A compound lens focuses light through multiple elements in sequence.
 *   Each element bends the beam. The same compound lens always produces
 *   the same focal point. Swap two elements → different image → different hash.
 *
 * Implementation:
 *   Lens = JSON-LD → URDNA2015 → SHA-256 → CID → Hologram (all projections)
 *   Focus = topological sort of DAG → sequential pure execution
 *
 * @module uns/core/hologram/lens
 */

import { singleProofHash, type SingleProofResult } from "@/lib/uor-canonical";
import { project, type Hologram, type ProjectionInput } from "./index";

// ── Types ───────────────────────────────────────────────────────────────────

/** A port on a lens element — typed input or output slot. */
export interface LensPort {
  /** Machine-readable port name (e.g. "hashBytes", "document"). */
  readonly name: string;
  /** Semantic type hint (e.g. "Uint8Array", "string", "json"). */
  readonly type: string;
}

/** A single element in the lens — one functional unit. */
export interface LensElement {
  /** Unique ID within this lens (e.g. "canonicalize", "sign"). */
  readonly id: string;
  /** What this element does — a registered projection name or "transform". */
  readonly kind: string;
  /** Input ports this element accepts. */
  readonly inputs: readonly LensPort[];
  /** Output ports this element produces. */
  readonly outputs: readonly LensPort[];
  /**
   * The pure function. Takes named inputs, returns named outputs.
   * Must be deterministic: same input → same output. Always.
   */
  readonly focus: (inputs: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

/** A wire connecting one element's output port to another's input port. */
export interface LensWire {
  readonly from: { readonly element: string; readonly port: string };
  readonly to: { readonly element: string; readonly port: string };
}

/** The complete Holographic Lens — a content-addressed circuit. */
export interface HolographicLens {
  /** JSON-LD context for canonical hashing. */
  readonly "@context": "https://uor.foundation/contexts/uor-v1.jsonld";
  readonly "@type": "hologram:Lens";
  /** Human-readable name. */
  readonly name: string;
  /** Lens version. */
  readonly version: string;
  /** The elements (Lego blocks). */
  readonly elements: readonly LensElement[];
  /** The wiring (connections — order matters). */
  readonly wires: readonly LensWire[];
  /** External input ports (what the lens accepts from outside). */
  readonly input: readonly LensPort[];
  /** External output ports (what the lens emits). */
  readonly output: readonly LensPort[];
}

/** The result of grinding a lens: its content-addressed identity. */
export interface GroundLens {
  /** The lens definition. */
  readonly lens: HolographicLens;
  /** Content-addressed identity (CID, hex, derivationId, etc.). */
  readonly proof: SingleProofResult;
  /** Full hologram: all 25+ projections of this lens's identity. */
  readonly hologram: Hologram;
}

/** The result of focusing (executing) a lens on input. */
export interface FocusResult {
  /** The final output values. */
  readonly output: Record<string, unknown>;
  /** Execution trace: element IDs in execution order. */
  readonly trace: readonly string[];
  /** The lens's content-addressed identity. */
  readonly lensCid: string;
}

// ── Serializable Manifest (for hashing — no functions) ─────────────────────

interface LensManifest {
  "@context": string;
  "@type": string;
  name: string;
  version: string;
  elements: Array<{
    id: string;
    kind: string;
    inputs: readonly LensPort[];
    outputs: readonly LensPort[];
  }>;
  wires: readonly LensWire[];
  input: readonly LensPort[];
  output: readonly LensPort[];
}

function toManifest(lens: HolographicLens): LensManifest {
  return {
    "@context": lens["@context"],
    "@type": lens["@type"],
    name: lens.name,
    version: lens.version,
    elements: lens.elements.map((e) => ({
      id: e.id,
      kind: e.kind,
      inputs: e.inputs,
      outputs: e.outputs,
    })),
    wires: lens.wires,
    input: lens.input,
    output: lens.output,
  };
}

// ── Topological Sort ───────────────────────────────────────────────────────

function topoSort(elements: readonly LensElement[], wires: readonly LensWire[]): string[] {
  const ids = elements.map((e) => e.id);
  const inDegree = new Map<string, number>(ids.map((id) => [id, 0]));
  const adj = new Map<string, string[]>(ids.map((id) => [id, []]));

  for (const w of wires) {
    adj.get(w.from.element)!.push(w.to.element);
    inDegree.set(w.to.element, (inDegree.get(w.to.element) ?? 0) + 1);
  }

  const queue = ids.filter((id) => inDegree.get(id) === 0);
  const sorted: string[] = [];

  while (queue.length > 0) {
    // Deterministic: sort lexicographically so same topology = same order
    queue.sort();
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
      `[Holographic Lens] Cycle detected in wiring. A lens must be a DAG. ` +
        `Sorted ${sorted.length} of ${ids.length} elements.`
    );
  }

  return sorted;
}

// ── Core API ───────────────────────────────────────────────────────────────

/**
 * Compose a Holographic Lens from elements and wiring.
 *
 * This is the "assembly" step — like placing Lego blocks and snapping
 * them together. The result is a complete, validated lens definition.
 */
export function composeLens(config: {
  name: string;
  version?: string;
  elements: LensElement[];
  wires: LensWire[];
  input: LensPort[];
  output: LensPort[];
}): HolographicLens {
  // Validate: all wire endpoints reference real elements and ports
  const elementMap = new Map(config.elements.map((e) => [e.id, e]));

  for (const w of config.wires) {
    const fromEl = elementMap.get(w.from.element);
    if (!fromEl) throw new Error(`Wire references unknown element: "${w.from.element}"`);
    if (!fromEl.outputs.some((p) => p.name === w.from.port)) {
      throw new Error(`Element "${w.from.element}" has no output port "${w.from.port}"`);
    }
    const toEl = elementMap.get(w.to.element);
    if (!toEl) throw new Error(`Wire references unknown element: "${w.to.element}"`);
    if (!toEl.inputs.some((p) => p.name === w.to.port)) {
      throw new Error(`Element "${w.to.element}" has no input port "${w.to.port}"`);
    }
  }

  // Validate DAG (will throw on cycle)
  topoSort(config.elements, config.wires);

  return {
    "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
    "@type": "hologram:Lens",
    name: config.name,
    version: config.version ?? "1.0.0",
    elements: config.elements,
    wires: config.wires,
    input: config.input,
    output: config.output,
  };
}

/**
 * Grind a lens — compute its content-addressed identity and hologram.
 *
 * "Grinding" is the optical term for shaping a lens to its final form.
 * After grinding, the lens has a permanent UOR identity that projects
 * through all 25+ standards: DID, ActivityPub, WebFinger, IPFS, Bitcoin…
 *
 * Same elements + same wiring + same version = same identity. Forever.
 */
export async function grindLens(lens: HolographicLens): Promise<GroundLens> {
  const manifest = toManifest(lens);
  const proof = await singleProofHash(manifest);

  const input: ProjectionInput = {
    hashBytes: proof.hashBytes,
    cid: proof.cid,
    hex: proof.hashHex,
  };
  const hologram = project(input);

  return { lens, proof, hologram };
}

/**
 * Focus a lens — execute the circuit on concrete input.
 *
 * "Focusing" is the optical act of passing light through a compound lens.
 * Each element transforms the beam in sequence (topological order).
 * The result is deterministic: same lens + same input = same output.
 *
 * @param lens     The Holographic Lens to execute.
 * @param input    Named input values matching the lens's input ports.
 * @returns        FocusResult with output values, execution trace, and lens CID.
 */
export async function focusLens(
  lens: HolographicLens,
  input: Record<string, unknown>,
): Promise<FocusResult> {
  const order = topoSort(lens.elements, lens.wires);
  const elementMap = new Map(lens.elements.map((e) => [e.id, e]));

  // Data bus: element.port → value
  const bus = new Map<string, unknown>();

  // Seed external inputs into the bus
  // Convention: external inputs are wired FROM a virtual "__input" element
  for (const [key, value] of Object.entries(input)) {
    bus.set(`__input.${key}`, value);
  }

  // Also seed wires from __input
  for (const w of lens.wires) {
    if (w.from.element === "__input") {
      bus.set(`__input.${w.from.port}`, input[w.from.port]);
    }
  }

  const trace: string[] = [];

  for (const id of order) {
    const element = elementMap.get(id)!;

    // Gather inputs for this element from the bus
    const elementInputs: Record<string, unknown> = {};
    for (const w of lens.wires) {
      if (w.to.element === id) {
        elementInputs[w.to.port] = bus.get(`${w.from.element}.${w.from.port}`);
      }
    }

    // Execute the element's pure function
    const result = await element.focus(elementInputs);

    // Write outputs to the bus
    for (const [port, value] of Object.entries(result)) {
      bus.set(`${id}.${port}`, value);
    }

    trace.push(id);
  }

  // Collect final outputs from the bus
  const output: Record<string, unknown> = {};
  for (const w of lens.wires) {
    if (w.to.element === "__output") {
      output[w.to.port] = bus.get(`${w.from.element}.${w.from.port}`);
    }
  }

  // Also collect from output port declarations if directly named
  for (const p of lens.output) {
    if (!(p.name in output)) {
      // Try to find the last element that outputs this port name
      for (const w of lens.wires) {
        if (w.to.element === "__output" && w.to.port === p.name) {
          output[p.name] = bus.get(`${w.from.element}.${w.from.port}`);
        }
      }
    }
  }

  const proof = await singleProofHash(toManifest(lens));

  return { output, trace, lensCid: proof.cid };
}

/**
 * Nest a lens inside another lens as a single element.
 *
 * This is composition: Lens A contains Lens B as one of its elements.
 * The nested lens's focus function calls focusLens recursively.
 * The outer lens's identity reflects the inner lens's topology.
 */
export function nestLens(inner: HolographicLens): LensElement {
  return {
    id: `lens:${inner.name}`,
    kind: "hologram:Lens",
    inputs: [...inner.input],
    outputs: [...inner.output],
    focus: async (inputs) => {
      const result = await focusLens(inner, inputs);
      return result.output;
    },
  };
}
