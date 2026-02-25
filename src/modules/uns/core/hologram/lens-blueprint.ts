/**
 * Lens Blueprint — Serializable, Content-Addressed Lens Circuits
 * ═══════════════════════════════════════════════════════════════
 *
 * A LensBlueprint is a fully serializable representation of a HolographicLens.
 * It captures everything needed to reconstruct and execute the lens in any
 * environment running a hologram implementation:
 *
 *   Blueprint → UOR Address → Store → Load → Instantiate → Execute
 *
 * The key insight: lenses contain functions (non-serializable), but blueprints
 * contain element *specifications* (serializable). An element registry maps
 * specifications back to live functions at instantiation time.
 *
 * This makes lenses into shareable, composable, content-addressed objects —
 * effectively programs that run on any UOR-compatible system.
 *
 * @module uns/core/hologram/lens-blueprint
 */

import { singleProofHash, type SingleProofResult } from "@/lib/uor-canonical";
import { project, PROJECTIONS, type Hologram, type ProjectionInput } from "./index";
import {
  composeLens,
  element,
  dehydrate,
  rehydrate,
  type HolographicLens,
  type LensElement,
  type LensWire,
  type LensMorphism,
  type RefractionModality,
} from "./lens";

// ── Blueprint Types ────────────────────────────────────────────────────────

/**
 * A serializable element specification.
 * Contains everything needed to reconstitute a live LensElement.
 */
export interface ElementSpec {
  /** Element ID (unique within the blueprint). */
  readonly id: string;
  /** Element kind — maps to a registered factory in the element registry. */
  readonly kind: string;
  /** Optional configuration passed to the factory. */
  readonly config?: Record<string, unknown>;
  /** Whether this element supports bidirectional refraction. */
  readonly bidirectional?: boolean;
  /** Human-readable description of what this element does. */
  readonly description?: string;
  /** For 'projection' kind: which hologram projection to use. */
  readonly projection?: string;
  /** For 'dehydrate'/'rehydrate' kind: target modality. */
  readonly modality?: RefractionModality;
}

/**
 * The complete LensBlueprint — a serializable, content-addressed lens circuit.
 *
 * This is the "schematic" of a lens. It can be:
 *   - Serialized to JSON and stored anywhere
 *   - Content-addressed via UOR (single deterministic address)
 *   - Shared across environments (local, mobile, edge, cloud)
 *   - Composed with other blueprints (fractal composition)
 *   - Instantiated into a live HolographicLens for execution
 */
export interface LensBlueprint {
  readonly "@context": "https://uor.foundation/contexts/lens-v1.jsonld";
  readonly "@type": "uor:LensBlueprint";
  /** Human-readable name. */
  readonly name: string;
  /** Semantic version. */
  readonly version: string;
  /** Morphism classification. */
  readonly morphism: LensMorphism;
  /** The problem this lens solves. */
  readonly problem?: string;
  /** Human-readable description. */
  readonly description?: string;
  /** Searchable tags. */
  readonly tags?: readonly string[];
  /** Ordered element specifications. */
  readonly elements: readonly ElementSpec[];
  /** Optional DAG wiring. */
  readonly wires?: readonly LensWire[];
  /** Nested sub-blueprint references (by CID). */
  readonly imports?: readonly string[];
  /** Arbitrary metadata. */
  readonly metadata?: Record<string, unknown>;
}

/**
 * A ground (content-addressed) blueprint with its UOR identity.
 */
export interface GroundBlueprint {
  readonly blueprint: LensBlueprint;
  readonly proof: SingleProofResult;
  readonly hologram: Hologram;
}

/**
 * The result of instantiating a blueprint into a live lens.
 */
export interface InstantiatedLens {
  readonly lens: HolographicLens;
  readonly blueprint: LensBlueprint;
  readonly proof: SingleProofResult;
  /** Elements that couldn't be resolved (graceful degradation). */
  readonly unresolved: readonly string[];
}

// ── Element Registry ───────────────────────────────────────────────────────

/**
 * An element factory: takes a spec and returns a live LensElement.
 * Factories are registered globally so any blueprint can reference them.
 */
export type ElementFactory = (spec: ElementSpec) => LensElement;

/** Global element registry: kind → factory. */
const ELEMENT_REGISTRY = new Map<string, ElementFactory>();

/**
 * Register an element factory.
 * Once registered, any blueprint referencing this kind can be instantiated.
 */
export function registerElementFactory(kind: string, factory: ElementFactory): void {
  ELEMENT_REGISTRY.set(kind, factory);
}

/**
 * Get all registered element kinds.
 */
export function getRegisteredKinds(): string[] {
  return [...ELEMENT_REGISTRY.keys()];
}

/**
 * Check if a kind is registered.
 */
export function isKindRegistered(kind: string): boolean {
  return ELEMENT_REGISTRY.has(kind);
}

// ── Built-in Element Factories ─────────────────────────────────────────────

/**
 * Register the core built-in element types.
 * These are available in every UOR environment.
 */
function registerBuiltins(): void {
  // identity: passthrough — useful as a placeholder or entry point
  registerElementFactory("identity", (spec) =>
    element(spec.id, async (input) => input, "identity", async (input) => input)
  );

  // json-parse: string → object
  registerElementFactory("json-parse", (spec) =>
    element(spec.id, async (input) => JSON.parse(input as string), "transform")
  );

  // json-stringify: object → string
  registerElementFactory("json-stringify", (spec) =>
    element(
      spec.id,
      async (input) => JSON.stringify(input, null, 2),
      "transform",
      async (input) => JSON.parse(input as string),
    )
  );

  // field-extract: extract a field from an object
  registerElementFactory("field-extract", (spec) => {
    const field = (spec.config?.field as string) ?? "value";
    return element(spec.id, async (input) => {
      const obj = input as Record<string, unknown>;
      return obj[field];
    }, "transform");
  });

  // field-merge: merge fields into a single object
  registerElementFactory("field-merge", (spec) => {
    const defaults = (spec.config?.defaults as Record<string, unknown>) ?? {};
    return element(spec.id, async (input) => {
      const obj = input as Record<string, unknown>;
      return { ...defaults, ...obj };
    }, "transform");
  });

  // filter: keep only specified keys
  registerElementFactory("filter", (spec) => {
    const keys = (spec.config?.keys as string[]) ?? [];
    return element(spec.id, async (input) => {
      const obj = input as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      for (const k of keys) {
        if (k in obj) result[k] = obj[k];
      }
      return result;
    }, "transform");
  });

  // template: apply a string template
  registerElementFactory("template", (spec) => {
    const tpl = (spec.config?.template as string) ?? "{{value}}";
    return element(spec.id, async (input) => {
      const obj = input as Record<string, unknown>;
      return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => String(obj[key] ?? ""));
    }, "transform");
  });

  // semantic-chunk: split text into semantic chunks
  registerElementFactory("semantic-chunk", (spec) => {
    const maxChunkSize = (spec.config?.maxChunkSize as number) ?? 512;
    const separator = (spec.config?.separator as string) ?? "\n\n";
    return element(spec.id, async (input) => {
      const text = typeof input === "string" ? input : JSON.stringify(input);
      const paragraphs = text.split(separator).filter(Boolean);
      const chunks: string[] = [];
      let current = "";
      for (const p of paragraphs) {
        if (current.length + p.length > maxChunkSize && current) {
          chunks.push(current.trim());
          current = "";
        }
        current += (current ? separator : "") + p;
      }
      if (current.trim()) chunks.push(current.trim());
      return chunks;
    }, "transform");
  });

  // content-hash: hash each item in an array, producing content-addressed anchors
  registerElementFactory("content-hash", (spec) =>
    element(spec.id, async (input) => {
      const items = Array.isArray(input) ? input : [input];
      return Promise.all(
        items.map(async (item) => {
          const proof = await singleProofHash(
            typeof item === "string" ? { content: item } : item
          );
          return {
            content: item,
            cid: proof.cid,
            derivationId: proof.derivationId,
            hashHex: proof.hashHex,
          };
        })
      );
    }, "isometry")
  );

  // priority-rank: score and sort items by configurable criteria
  registerElementFactory("priority-rank", (spec) => {
    const weights = (spec.config?.weights as Record<string, number>) ?? {};
    return element(spec.id, async (input) => {
      const items = Array.isArray(input) ? input : [input];
      return items
        .map((item) => {
          const obj = item as Record<string, unknown>;
          let score = 0;
          for (const [key, weight] of Object.entries(weights)) {
            const val = obj[key];
            if (typeof val === "number") score += val * weight;
            else if (typeof val === "string") score += val.length * weight;
            else if (val) score += weight;
          }
          return { ...obj, _score: score };
        })
        .sort((a, b) => (b._score as number) - (a._score as number));
    }, "transform");
  });

  // chain-link: link items into a hash-chain (each item references previous CID)
  registerElementFactory("chain-link", (spec) =>
    element(spec.id, async (input) => {
      const items = Array.isArray(input) ? input : [input];
      const chain: Array<Record<string, unknown>> = [];
      let previousCid: string | null = null;
      for (const item of items) {
        const obj = typeof item === "object" && item !== null ? item as Record<string, unknown> : { content: item };
        const linked = { ...obj, previousCid, sequence: chain.length };
        const proof = await singleProofHash(linked);
        chain.push({
          ...linked,
          cid: proof.cid,
          derivationId: proof.derivationId,
        });
        previousCid = proof.cid;
      }
      return chain;
    }, "isometry")
  );

  // aggregate: reduce array to summary object
  registerElementFactory("aggregate", (spec) => {
    const summaryFields = (spec.config?.fields as string[]) ?? [];
    return element(spec.id, async (input) => {
      const items = Array.isArray(input) ? input : [input];
      const totalItems = items.length;
      const firstCid = (items[0] as Record<string, unknown>)?.cid ?? null;
      const lastCid = (items[items.length - 1] as Record<string, unknown>)?.cid ?? null;

      // Collect specified fields across all items
      const collected: Record<string, unknown[]> = {};
      for (const field of summaryFields) {
        collected[field] = items
          .map((i) => (i as Record<string, unknown>)[field])
          .filter((v) => v !== undefined);
      }

      const summary = {
        totalItems,
        firstCid,
        lastCid,
        fields: collected,
        items,
      };

      // Content-address the whole chain
      const proof = await singleProofHash(summary);
      return {
        ...summary,
        chainCid: proof.cid,
        chainDerivationId: proof.derivationId,
      };
    }, "isometry");
  });
}

// ── Holographic Element Factories (Projection-Native) ──────────────────────

/**
 * Register element factories that bind directly to the hologram system.
 * These make every projection and modality a first-class blueprint element.
 */
function registerHolographicFactories(): void {
  // projection: apply any named hologram projection
  // Use { kind: "projection", projection: "did" } in a blueprint
  registerElementFactory("projection", (spec) => {
    const projName = spec.projection ?? (spec.config?.projection as string) ?? "cid";
    const projSpec = PROJECTIONS.get(projName);
    if (!projSpec) {
      console.warn(`[LensBlueprint] Unknown projection "${projName}", using cid`);
    }
    return element(spec.id, async (input) => {
      // If input is already a ProjectionInput, project directly
      if (input && typeof input === "object" && "hashBytes" in (input as any)) {
        const pi = input as ProjectionInput;
        const resolved = projSpec ?? PROJECTIONS.get("cid")!;
        return resolved.project(pi);
      }
      // Otherwise dehydrate first, then project
      const { proof } = await dehydrate(input);
      const pi: ProjectionInput = {
        hashBytes: proof.hashBytes,
        cid: proof.cid,
        hex: proof.hashHex,
      };
      const resolved = projSpec ?? PROJECTIONS.get("cid")!;
      return resolved.project(pi);
    }, projName);
  });

  // dehydrate: canonicalize any object → SingleProofResult
  registerElementFactory("dehydrate", (spec) =>
    element(spec.id, async (input) => {
      const result = await dehydrate(input);
      return result.proof;
    }, "isometry")
  );

  // rehydrate: SingleProofResult → target modality
  registerElementFactory("rehydrate", (spec) => {
    const modality = spec.modality ?? (spec.config?.modality as RefractionModality) ?? "jsonld";
    return element(spec.id, async (input) => {
      return rehydrate(input as SingleProofResult, modality);
    }, "isometry");
  });

  // hologram: project through ALL standards at once
  registerElementFactory("hologram", (spec) =>
    element(spec.id, async (input) => {
      if (input && typeof input === "object" && "hashBytes" in (input as any)) {
        return project(input as ProjectionInput);
      }
      const { proof } = await dehydrate(input);
      return project({
        hashBytes: proof.hashBytes,
        cid: proof.cid,
        hex: proof.hashHex,
      });
    }, "isometry")
  );

  // blueprint-ref: reference another blueprint by CID (lazy resolution)
  // The referenced blueprint must be loaded into the registry at runtime
  registerElementFactory("blueprint-ref", (spec) => {
    const refCid = (spec.config?.cid as string) ?? "";
    return element(spec.id, async (input) => {
      // At runtime, check if the referenced blueprint has been loaded
      const factory = ELEMENT_REGISTRY.get(`blueprint:${refCid}`);
      if (factory) {
        const el = factory(spec);
        return el.focus(input);
      }
      // Graceful: return input with reference metadata
      return {
        _unresolvedBlueprint: refCid,
        input,
      };
    }, "hologram:Lens");
  });

  // multi-project: fan input to multiple named projections, return record
  registerElementFactory("multi-project", (spec) => {
    const projections = (spec.config?.projections as string[]) ?? ["cid", "did", "webfinger"];
    return element(spec.id, async (input) => {
      const { proof } = await dehydrate(input);
      const pi: ProjectionInput = {
        hashBytes: proof.hashBytes,
        cid: proof.cid,
        hex: proof.hashHex,
      };
      const result: Record<string, string> = {};
      for (const name of projections) {
        const ps = PROJECTIONS.get(name);
        if (ps) result[name] = ps.project(pi);
      }
      return result;
    }, "isometry");
  });
}

// Initialize all factories on module load
registerBuiltins();
registerHolographicFactories();


// ── Core API ───────────────────────────────────────────────────────────────

/**
 * Create a LensBlueprint from a specification.
 */
export function createBlueprint(spec: {
  name: string;
  version?: string;
  morphism?: LensMorphism;
  problem?: string;
  description?: string;
  tags?: string[];
  elements: ElementSpec[];
  wires?: LensWire[];
  imports?: string[];
  metadata?: Record<string, unknown>;
}): LensBlueprint {
  return {
    "@context": "https://uor.foundation/contexts/lens-v1.jsonld",
    "@type": "uor:LensBlueprint",
    name: spec.name,
    version: spec.version ?? "1.0.0",
    morphism: spec.morphism ?? "transform",
    ...(spec.problem ? { problem: spec.problem } : {}),
    ...(spec.description ? { description: spec.description } : {}),
    ...(spec.tags ? { tags: spec.tags } : {}),
    elements: spec.elements,
    ...(spec.wires ? { wires: spec.wires } : {}),
    ...(spec.imports ? { imports: spec.imports } : {}),
    ...(spec.metadata ? { metadata: spec.metadata } : {}),
  };
}

/**
 * Grind a blueprint — compute its permanent UOR address.
 *
 * Same elements + same config + same version = same address. Forever.
 * This IS the content-addressed identity of the lens-as-object.
 */
export async function grindBlueprint(
  blueprint: LensBlueprint
): Promise<GroundBlueprint> {
  const proof = await singleProofHash(blueprint);
  const input: ProjectionInput = {
    hashBytes: proof.hashBytes,
    cid: proof.cid,
    hex: proof.hashHex,
  };
  const hologram = project(input);
  return { blueprint, proof, hologram };
}

/**
 * Instantiate a blueprint into a live, executable HolographicLens.
 *
 * Resolves each ElementSpec through the element registry to produce
 * live LensElement objects. Unknown kinds are logged but don't fail —
 * the lens gracefully degrades.
 */
export function instantiateBlueprint(blueprint: LensBlueprint): InstantiatedLens {
  const liveElements: LensElement[] = [];
  const unresolved: string[] = [];

  for (const spec of blueprint.elements) {
    const factory = ELEMENT_REGISTRY.get(spec.kind);
    if (factory) {
      liveElements.push(factory(spec));
    } else {
      // Graceful degradation: passthrough for unknown kinds
      console.warn(
        `[LensBlueprint] Unknown element kind "${spec.kind}" for "${spec.id}". ` +
        `Using passthrough. Registered: ${getRegisteredKinds().join(", ")}`
      );
      liveElements.push(
        element(spec.id, async (input) => input, spec.kind)
      );
      unresolved.push(spec.id);
    }
  }

  const lens = composeLens(blueprint.name, liveElements, {
    version: blueprint.version,
    morphism: blueprint.morphism,
    wires: blueprint.wires ? [...blueprint.wires] : undefined,
  });

  // Compute proof synchronously-ish (we return a sync result, proof computed on demand)
  const proof = {} as SingleProofResult; // Will be computed on first grind

  return { lens, blueprint, proof, unresolved };
}

/**
 * Full pipeline: create → grind → instantiate.
 *
 * Returns a live lens with its content-addressed identity, ready to execute.
 */
export async function buildLens(spec: {
  name: string;
  version?: string;
  morphism?: LensMorphism;
  problem?: string;
  description?: string;
  tags?: string[];
  elements: ElementSpec[];
  wires?: LensWire[];
  metadata?: Record<string, unknown>;
}): Promise<{
  ground: GroundBlueprint;
  instance: InstantiatedLens;
}> {
  const blueprint = createBlueprint(spec);
  const ground = await grindBlueprint(blueprint);
  const instance = instantiateBlueprint(blueprint);
  return {
    ground,
    instance: { ...instance, proof: ground.proof },
  };
}

/**
 * Serialize a blueprint to a portable JSON string.
 * This is what gets stored, shared, and transmitted.
 */
export function serializeBlueprint(blueprint: LensBlueprint): string {
  return JSON.stringify(blueprint, null, 2);
}

/**
 * Deserialize a JSON string back into a LensBlueprint.
 */
export function deserializeBlueprint(json: string): LensBlueprint {
  const parsed = JSON.parse(json);
  if (parsed["@type"] !== "uor:LensBlueprint") {
    throw new Error(
      `[LensBlueprint] Invalid blueprint: expected @type "uor:LensBlueprint", got "${parsed["@type"]}"`
    );
  }
  return parsed as LensBlueprint;
}

/**
 * Compose multiple blueprints into a new one (fractal composition).
 *
 * The resulting blueprint chains all elements sequentially with namespaced IDs.
 * Morphism is inferred: isometry only if ALL children are isometry.
 */
export function composeBlueprints(
  name: string,
  ...blueprints: LensBlueprint[]
): LensBlueprint {
  const allElements: ElementSpec[] = [];
  const allWires: LensWire[] = [];
  const allImports: string[] = [];

  for (const bp of blueprints) {
    const prefix = bp.name.replace(/\s+/g, "-").toLowerCase();
    for (const el of bp.elements) {
      allElements.push({ ...el, id: `${prefix}/${el.id}` });
    }
    if (bp.wires) {
      for (const w of bp.wires) {
        allWires.push({
          from: `${prefix}/${w.from}`,
          to: `${prefix}/${w.to}`,
        });
      }
    }
    if (bp.imports) allImports.push(...bp.imports);
  }

  return createBlueprint({
    name,
    morphism: blueprints.every((b) => b.morphism === "isometry") ? "isometry" : "transform",
    elements: allElements,
    wires: allWires.length > 0 ? allWires : undefined,
    imports: allImports.length > 0 ? allImports : undefined,
    tags: [...new Set(blueprints.flatMap((b) => b.tags ?? []))],
    description: `Composed from: ${blueprints.map((b) => b.name).join(" + ")}`,
  });
}

/**
 * Fork a blueprint: clone with modifications.
 *
 * Creates a new blueprint from an existing one with overrides.
 * The forked blueprint gets its own UOR address (different config = different identity).
 */
export function forkBlueprint(
  base: LensBlueprint,
  overrides: {
    name?: string;
    version?: string;
    elements?: ElementSpec[];
    replaceElements?: Record<string, Partial<ElementSpec>>;
    appendElements?: ElementSpec[];
    removeElements?: string[];
    tags?: string[];
    problem?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  },
): LensBlueprint {
  let elements = [...base.elements] as ElementSpec[];

  // Replace specific elements
  if (overrides.replaceElements) {
    elements = elements.map((el) => {
      const patch = overrides.replaceElements![el.id];
      return patch ? { ...el, ...patch } as ElementSpec : el;
    });
  }

  // Remove elements
  if (overrides.removeElements) {
    elements = elements.filter((el) => !overrides.removeElements!.includes(el.id));
  }

  // Append elements
  if (overrides.appendElements) {
    elements.push(...overrides.appendElements);
  }

  // Full replacement
  if (overrides.elements) {
    elements = overrides.elements;
  }

  return createBlueprint({
    name: overrides.name ?? `${base.name} (fork)`,
    version: overrides.version ?? base.version,
    morphism: base.morphism,
    problem: overrides.problem ?? base.problem,
    description: overrides.description ?? base.description,
    tags: overrides.tags ?? (base.tags ? [...base.tags] : undefined),
    elements,
    wires: base.wires ? [...base.wires] : undefined,
    imports: base.imports ? [...base.imports] : undefined,
    metadata: overrides.metadata ?? base.metadata,
  });
}
