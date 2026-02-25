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

import { singleProofHash, canonicalizeToNQuads, type SingleProofResult } from "@/lib/uor-canonical";
import { project, PROJECTIONS, type Hologram, type ProjectionInput } from "./index";

// ── Types ───────────────────────────────────────────────────────────────────

/**
 * A single lens element — one pure function.
 *
 * In the linear (pipeline) case, focus receives the previous element's
 * output as a single value. In the DAG case, it receives a named record.
 *
 * Bidirectional elements MAY provide a `refract` inverse function.
 * When present, the lens can operate in reverse (rehydration).
 */
export interface LensElement {
  /** Unique ID within this lens. */
  readonly id: string;
  /** Classification: a registered projection name, "transform", or "hologram:Lens". */
  readonly kind: string;
  /** The pure function. Deterministic: same input → same output. Always. */
  readonly focus: (input: unknown) => Promise<unknown>;
  /** Optional inverse function for rehydration. When present, the element is bidirectional. */
  readonly refract?: (input: unknown) => Promise<unknown>;
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

// ── Refraction Types (Bidirectional Lens) ──────────────────────────────────

/**
 * Supported rehydration modalities — the target "language" for refraction.
 *
 * Each modality is a deterministic function from canonical form (N-Quads +
 * SingleProofResult) to a specific representation. The lens provides the
 * blueprint; the modality provides the target form factor.
 *
 *   "nquads"       → raw W3C URDNA2015 N-Quads string
 *   "jsonld"       → expanded JSON-LD document (from N-Quads)
 *   "compact-json" → deterministic sorted-key JSON (no @context)
 *   "turtle"       → Terse RDF Triple Language (N3 subset)
 *   "hologram"     → full hologram: all 25+ protocol projections
 *   "identity"     → SingleProofResult passthrough
 */
export type RefractionModality =
  | "nquads"
  | "jsonld"
  | "compact-json"
  | "turtle"
  | "hologram"
  | "identity";

/**
 * The result of refracting (rehydrating) through a lens.
 *
 * Refraction is the inverse of focus: it takes a canonical form and
 * unpacks it into a desired modality, running any bidirectional elements
 * in reverse order.
 */
export interface RefractResult {
  /** The rehydrated output in the requested modality. */
  readonly output: unknown;
  /** The modality used for rehydration. */
  readonly modality: RefractionModality;
  /** Morphism classification of the refraction. */
  readonly morphism: LensMorphism;
  /** Execution trace (element IDs in reverse order). */
  readonly trace: readonly string[];
  /** CID of the lens used (same as focus — lens identity is fixed). */
  readonly lensCid: string;
  /** The SingleProofResult that was the source of the refraction. */
  readonly proof: SingleProofResult;
}

/**
 * The result of dehydration: any object → canonical UOR form.
 *
 * Dehydration collapses any object into its canonical, content-addressed
 * representation. This is a morphism:Isometry — lossless, invertible.
 */
export interface DehydrationResult {
  /** The SingleProofResult containing all identity forms. */
  readonly proof: SingleProofResult;
  /** The full hologram (all protocol projections). */
  readonly hologram: Hologram;
  /** The original object, preserved for round-trip verification. */
  readonly original: unknown;
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
 * Optionally provide a `refract` inverse for bidirectional lenses.
 *
 *   const upper = element("uppercase",
 *     async (s) => (s as string).toUpperCase(),
 *     "transform",
 *     async (s) => (s as string).toLowerCase(),   // inverse
 *   );
 */
export function element(
  id: string,
  focus: (input: unknown) => Promise<unknown>,
  kind = "transform",
  refract?: (input: unknown) => Promise<unknown>,
): LensElement {
  return { id, kind, focus, ...(refract ? { refract } : {}) };
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

// ── Refraction (Bidirectional Lens — Rehydration) ──────────────────────────

/**
 * Standard rehydration targets — built-in refraction modalities.
 *
 * Each is a pure function: SingleProofResult → target representation.
 * These form the "spectral lines" of the EOR decoder: one canonical form,
 * refracted into any desired modality.
 */
const REFRACTION_TARGETS: Record<
  RefractionModality,
  (proof: SingleProofResult, original?: unknown) => Promise<unknown>
> = {
  /**
   * nquads: Raw URDNA2015 canonical N-Quads string.
   * The most fundamental form — byte-identical on any W3C-compliant system.
   */
  nquads: async (proof) => proof.nquads,

  /**
   * jsonld: Expanded JSON-LD document reconstructed from N-Quads.
   * Uses jsonld.fromRDF to parse the canonical N-Quads back into JSON-LD.
   * This is a lossless round-trip when the original was JSON-LD.
   */
  jsonld: async (proof) => {
    const jsonldLib = await import("jsonld");
    const expanded = await (jsonldLib.default as any).fromRDF(proof.nquads, {
      format: "application/n-quads",
    });
    return expanded;
  },

  /**
   * compact-json: Deterministic sorted-key JSON.
   * Strips all JSON-LD semantics (@context, @type, @id) and returns a
   * compact, human-readable JSON representation. Lossy for RDF metadata
   * but lossless for the payload data.
   */
  "compact-json": async (proof) => {
    const jsonldLib = await import("jsonld");
    const expanded = await (jsonldLib.default as any).fromRDF(proof.nquads, {
      format: "application/n-quads",
    });
    // Flatten and strip JSON-LD wrappers for maximum readability
    if (Array.isArray(expanded) && expanded.length === 1) {
      return expanded[0];
    }
    return expanded;
  },

  /**
   * turtle: Terse RDF Triple Language (Turtle/N3 subset).
   * A human-readable RDF serialization produced from canonical N-Quads.
   * Each N-Quad line "S P O ." is valid Turtle as-is (minus graph component).
   */
  turtle: async (proof) => {
    // N-Quads → Turtle: strip the graph component (4th position) from each quad
    const lines = proof.nquads.trim().split("\n").filter(Boolean);
    const triples = lines.map((line) => {
      // N-Quad format: <S> <P> <O> <G> .
      // Turtle format: <S> <P> <O> .
      const parts = line.trim().replace(/ \.$/, "").split(" ");
      // If there's a graph component (4th part before '.'), remove it
      if (parts.length >= 4) {
        // Check if 4th part looks like a graph URI
        const last = parts[parts.length - 1];
        if (last.startsWith("<") && last.endsWith(">")) {
          parts.pop(); // Remove graph
        }
      }
      return parts.join(" ") + " .";
    });
    return triples.join("\n");
  },

  /**
   * hologram: The full hologram — all 25+ protocol projections.
   * Returns the complete Hologram object with every registered standard.
   */
  hologram: async (proof) => {
    const input: ProjectionInput = {
      hashBytes: proof.hashBytes,
      cid: proof.cid,
      hex: proof.hashHex,
    };
    return project(input);
  },

  /**
   * identity: SingleProofResult passthrough.
   * Returns the canonical form itself — useful for piping into other lenses.
   */
  identity: async (proof) => proof,
};

/**
 * Refract a lens — execute the circuit in reverse (rehydration).
 *
 * Given a canonical form (SingleProofResult) and a target modality,
 * this runs any bidirectional elements in reverse order and then
 * applies the standard rehydration target.
 *
 * If the lens has bidirectional elements (with `refract` functions),
 * those are executed in reverse pipeline order before the modality
 * transform. This enables custom rehydration logic.
 *
 * The refraction is classified by the lens's morphism type:
 *   • "isometry"  — lossless round-trip guaranteed
 *   • "embedding" — lossy, with compression witness
 *   • "transform" — general, may be lossy
 *
 * @param lens      The Holographic Lens to refract through.
 * @param proof     The SingleProofResult to rehydrate.
 * @param modality  The target modality (default: "jsonld").
 * @param original  Optional original object (for round-trip verification).
 * @returns         RefractResult with rehydrated output.
 */
export async function refractLens(
  lens: HolographicLens,
  proof: SingleProofResult,
  modality: RefractionModality = "jsonld",
  original?: unknown,
): Promise<RefractResult> {
  const trace: string[] = [];

  // Step 1: Apply the standard rehydration target
  let current: unknown = await REFRACTION_TARGETS[modality](proof, original);
  trace.push(`modality:${modality}`);

  // Step 2: Run bidirectional elements in reverse (if any have refract)
  const reversedElements = [...lens.elements].reverse();
  for (const el of reversedElements) {
    if (el.refract) {
      current = await el.refract(current);
      trace.push(`refract:${el.id}`);
    }
  }

  const lensProof = await singleProofHash(toManifest(lens));

  return {
    output: current,
    modality,
    morphism: lens.morphism,
    trace,
    lensCid: lensProof.cid,
    proof,
  };
}

/**
 * Dehydrate any object into its canonical UOR form.
 *
 * This is the universal encoder: any JavaScript object → content-addressed
 * canonical representation with all identity forms (CID, DID, IPv6, Braille).
 *
 * Dehydration is always a morphism:Isometry — lossless and invertible
 * (given the canonical bytes, the original semantics can be reconstructed).
 *
 *   const { proof, hologram } = await dehydrate(myObj);
 *   // proof.nquads       — canonical N-Quads (source of truth)
 *   // proof.cid          — IPFS CIDv1
 *   // hologram           — all 25+ protocol projections
 *
 * @param obj  Any JavaScript object (JSON-LD or plain).
 * @returns    DehydrationResult with proof, hologram, and original.
 */
export async function dehydrate(obj: unknown): Promise<DehydrationResult> {
  const proof = await singleProofHash(obj);
  const input: ProjectionInput = {
    hashBytes: proof.hashBytes,
    cid: proof.cid,
    hex: proof.hashHex,
  };
  const hologram = project(input);
  return { proof, hologram, original: obj };
}

/**
 * Rehydrate a canonical form into a target modality.
 *
 * This is the universal decoder: canonical bytes → any desired representation.
 * The modality specifies the "language" and form factor of the output.
 *
 * Can be used standalone (without a lens) for direct modality conversion,
 * or through `refractLens()` for lens-guided rehydration with custom
 * bidirectional elements.
 *
 *   const jsonld = await rehydrate(proof, "jsonld");
 *   const turtle = await rehydrate(proof, "turtle");
 *   const holo   = await rehydrate(proof, "hologram");
 *
 * @param proof     SingleProofResult from dehydration or singleProofHash.
 * @param modality  Target modality (default: "jsonld").
 * @returns         The rehydrated object in the requested modality.
 */
export async function rehydrate(
  proof: SingleProofResult,
  modality: RefractionModality = "jsonld",
): Promise<unknown> {
  return REFRACTION_TARGETS[modality](proof);
}

/**
 * Full round-trip: dehydrate → refract → verify.
 *
 * Takes any object, dehydrates it to canonical form, then refracts it
 * through a lens into the target modality. Returns both the rehydrated
 * output and the dehydration proof for verification.
 *
 * This is the UOR encoder-decoder in a single function call:
 *   Object → URDNA2015 → SHA-256 → Canonical Form → Target Modality
 *
 * @param lens      The lens to refract through.
 * @param obj       Any JavaScript object.
 * @param modality  Target modality for rehydration.
 * @returns         Object containing refract result + dehydration proof.
 */
export async function roundTrip(
  lens: HolographicLens,
  obj: unknown,
  modality: RefractionModality = "jsonld",
): Promise<{ dehydrated: DehydrationResult; refracted: RefractResult }> {
  const dehydrated = await dehydrate(obj);
  const refracted = await refractLens(lens, dehydrated.proof, modality, obj);
  return { dehydrated, refracted };
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
