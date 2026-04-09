/**
 * UOR Knowledge Graph — Object Blueprint System.
 *
 * Edge-Defined Nodes: a node IS its attributes/edges.
 * Dehydrate any KGNode into a portable JSON-LD blueprint,
 * share it, and rehydrate it back to the exact same node + edges.
 *
 * Architecture:
 *   Any KGNode + edges
 *     ↓ decomposeToBlueprint()
 *   ObjectBlueprint (JSON-LD, serializable, shareable)
 *     ↓ singleProofHash()
 *   GroundObjectBlueprint (blueprint + UOR identity)
 *     ↓ materializeFromBlueprint()
 *   Fully reconstructed KGNode + all edges
 *
 * @module knowledge-graph/blueprint
 */

import { localGraphStore, type KGNode, type KGEdge } from "./local-store";
import { singleProofHash } from "@/modules/uns/core/identity";
import { canonicalJsonLd } from "@/lib/uor-address";

// ── Types ───────────────────────────────────────────────────────────────────

export interface BlueprintAttribute {
  /** RDF predicate (e.g. "schema:hasColumn", "schema:name") */
  predicate: string;
  /** "literal" for data values, "reference" for edges to other nodes */
  valueType: "literal" | "reference";
  /** The value (for literals) */
  value?: unknown;
  /** Target UOR address (for references) */
  targetAddress?: string;
  /** Embedded child blueprint (for recursive decomposition) */
  childBlueprint?: ObjectBlueprint;
}

export interface SpaceDefinition {
  /** Node kind (e.g. "file", "entity", "column") */
  kind: string;
  /** Semantic domain */
  localDomain: string;
  /** JSON-LD @type */
  rdfType: string;
}

export interface CompositionRule {
  /** The predicate that links parent → child */
  parentPredicate: string;
  /** How to decompose: "recursive" embeds children, "reference" links by address */
  decomposition: "recursive" | "reference";
}

export interface DerivationRule {
  /** The operation used to derive identity */
  operation: string;
  /** Input space references */
  inputs: string[];
  /** Derivation plan identifier */
  plan: string;
}

export interface ObjectBlueprint {
  "@context": string;
  "@type": "uor:ObjectBlueprint";
  /** When this blueprint was created */
  createdAt: string;
  /** Space definition — what kind of node this is */
  spaceDefinition: SpaceDefinition;
  /** All attributes: both literal properties and reference edges */
  attributes: BlueprintAttribute[];
  /** How this node composes with parents */
  compositionRules: CompositionRule[];
  /** How identity was derived */
  derivationRules: DerivationRule[];
}

export interface GroundObjectBlueprint {
  /** The blueprint content */
  blueprint: ObjectBlueprint;
  /** UOR canonical ID derived from blueprint content */
  uorCanonicalId: string;
  /** UOR CID (IPFS-compatible) */
  uorCid: string;
  /** Braille glyph */
  uorGlyph: string;
  /** IPv6 address */
  uorIpv6: string;
}

// ── Constants ───────────────────────────────────────────────────────────────

const BLUEPRINT_CONTEXT = "https://uor.foundation/contexts/object-blueprint-v1.jsonld";

// ── Decompose: KGNode → ObjectBlueprint ─────────────────────────────────────

/**
 * Decompose a KG node into an ObjectBlueprint.
 * The node is defined purely by its attribute edges — properties become
 * literal attributes, edges become reference attributes.
 */
export async function decomposeToBlueprint(
  nodeAddress: string
): Promise<GroundObjectBlueprint> {
  const node = await localGraphStore.getNode(nodeAddress);
  if (!node) {
    throw new Error(`Node not found: ${nodeAddress}`);
  }

  const outEdges = await localGraphStore.queryBySubject(nodeAddress);

  const blueprint = nodeToBlueprint(node, outEdges);
  return groundBlueprint(blueprint);
}

/**
 * Recursively decompose a node and its referenced children into a single
 * self-contained blueprint. Child nodes referenced by edges are embedded
 * inline as nested blueprints up to maxDepth.
 */
export async function decomposeRecursive(
  nodeAddress: string,
  maxDepth: number = 3
): Promise<GroundObjectBlueprint> {
  const visited = new Set<string>();

  async function decompose(addr: string, depth: number): Promise<ObjectBlueprint> {
    visited.add(addr);
    const node = await localGraphStore.getNode(addr);
    if (!node) throw new Error(`Node not found: ${addr}`);

    const outEdges = await localGraphStore.queryBySubject(addr);
    const bp = nodeToBlueprint(node, outEdges);

    // Embed child blueprints for reference attributes
    if (depth < maxDepth) {
      for (const attr of bp.attributes) {
        if (attr.valueType === "reference" && attr.targetAddress && !visited.has(attr.targetAddress)) {
          const childNode = await localGraphStore.getNode(attr.targetAddress);
          if (childNode) {
            attr.childBlueprint = await decompose(attr.targetAddress, depth + 1);
          }
        }
      }
    }

    return bp;
  }

  const blueprint = await decompose(nodeAddress, 0);
  return groundBlueprint(blueprint);
}

// ── Materialize: ObjectBlueprint → KGNode + Edges ───────────────────────────

/**
 * Materialize a blueprint back into a KGNode and its edges.
 * Does NOT write to the store — caller decides when to persist.
 */
export async function materializeFromBlueprint(
  blueprint: ObjectBlueprint
): Promise<{ node: KGNode; edges: KGEdge[] }> {
  // Compute UOR address from blueprint content
  const ground = await groundBlueprint(blueprint);
  const nodeAddr = ground.uorCanonicalId;
  const now = Date.now();

  // Reconstruct properties from literal attributes
  const properties: Record<string, unknown> = {};
  for (const attr of blueprint.attributes) {
    if (attr.valueType === "literal" && attr.value !== undefined) {
      // Extract simple property name from predicate
      const propName = attr.predicate.includes(":")
        ? attr.predicate.split(":").pop()!
        : attr.predicate;
      properties[propName] = attr.value;
    }
  }

  const node: KGNode = {
    uorAddress: nodeAddr,
    uorCid: ground.uorCid,
    label: (properties.name as string) || (properties.filename as string) || blueprint.spaceDefinition.kind,
    nodeType: blueprint.spaceDefinition.kind,
    rdfType: blueprint.spaceDefinition.rdfType,
    properties,
    createdAt: now,
    updatedAt: now,
    syncState: "local",
  };

  // Reconstruct edges from reference attributes
  const edges: KGEdge[] = [];
  for (const attr of blueprint.attributes) {
    if (attr.valueType === "reference" && attr.targetAddress) {
      edges.push({
        id: `${nodeAddr}|${attr.predicate}|${attr.targetAddress}`,
        subject: nodeAddr,
        predicate: attr.predicate,
        object: attr.targetAddress,
        graphIri: "urn:uor:local",
        createdAt: now,
        syncState: "local",
      });
    }
  }

  return { node, edges };
}

// ── Serialization ───────────────────────────────────────────────────────────

/** Deterministic JSON serialization (sorted keys via canonicalJsonLd). */
export function serializeBlueprint(bp: GroundObjectBlueprint): string {
  return canonicalJsonLd(bp);
}

/** Parse and validate a serialized blueprint. */
export function deserializeBlueprint(json: string): GroundObjectBlueprint {
  const parsed = JSON.parse(json) as GroundObjectBlueprint;
  if (!parsed.blueprint || !parsed.uorCanonicalId) {
    throw new Error("Invalid blueprint: missing required fields");
  }
  if (parsed.blueprint["@type"] !== "uor:ObjectBlueprint") {
    throw new Error("Invalid blueprint: @type must be uor:ObjectBlueprint");
  }
  return parsed;
}

// ── Verification ────────────────────────────────────────────────────────────

/**
 * Verify a ground blueprint's integrity by recomputing UOR identity
 * from the blueprint content and comparing.
 */
export async function verifyBlueprint(bp: GroundObjectBlueprint): Promise<boolean> {
  const recomputed = await groundBlueprint(bp.blueprint);
  return recomputed.uorCanonicalId === bp.uorCanonicalId;
}

// ── Internal helpers ────────────────────────────────────────────────────────

function nodeToBlueprint(node: KGNode, outEdges: KGEdge[]): ObjectBlueprint {
  const attributes: BlueprintAttribute[] = [];

  // Properties → literal attributes
  for (const [key, value] of Object.entries(node.properties)) {
    if (value !== undefined && value !== null) {
      attributes.push({
        predicate: `schema:${key}`,
        valueType: "literal",
        value,
      });
    }
  }

  // Quality score as attribute
  if (node.qualityScore !== undefined) {
    attributes.push({
      predicate: "schema:qualityScore",
      valueType: "literal",
      value: node.qualityScore,
    });
  }

  // Stratum level as attribute
  if (node.stratumLevel) {
    attributes.push({
      predicate: "u:stratumLevel",
      valueType: "literal",
      value: node.stratumLevel,
    });
  }

  // Edges → reference attributes
  const compositionPredicates = new Set<string>();
  for (const edge of outEdges) {
    attributes.push({
      predicate: edge.predicate,
      valueType: "reference",
      targetAddress: edge.object,
    });
    compositionPredicates.add(edge.predicate);
  }

  // Build composition rules from observed edge predicates
  const compositionRules: CompositionRule[] = Array.from(compositionPredicates).map((pred) => ({
    parentPredicate: pred,
    decomposition: "reference" as const,
  }));

  return {
    "@context": BLUEPRINT_CONTEXT,
    "@type": "uor:ObjectBlueprint",
    createdAt: new Date().toISOString(),
    spaceDefinition: {
      kind: node.nodeType,
      localDomain: domainFromType(node.rdfType || "schema:Thing"),
      rdfType: node.rdfType || "schema:Thing",
    },
    attributes,
    compositionRules,
    derivationRules: [
      {
        operation: "sha256",
        inputs: ["canonical-blueprint-bytes"],
        plan: "UOR-blueprint-v1",
      },
    ],
  };
}

function domainFromType(rdfType: string): string {
  if (rdfType.includes("Dataset") || rdfType.includes("DataFeed")) return "DataSpace";
  if (rdfType.includes("Image") || rdfType.includes("Media")) return "MediaSpace";
  if (rdfType.includes("WebPage")) return "WebSpace";
  if (rdfType.includes("Column")) return "SchemaSpace";
  if (rdfType.includes("Contact") || rdfType.includes("URL")) return "EntitySpace";
  if (rdfType.includes("Date") || rdfType.includes("Monetary")) return "EntitySpace";
  return "ConceptSpace";
}

async function groundBlueprint(blueprint: ObjectBlueprint): Promise<GroundObjectBlueprint> {
  // Strip createdAt for identity computation (it changes every call)
  const forHashing = { ...blueprint, createdAt: undefined };
  const identity = await singleProofHash(forHashing);

  return {
    blueprint,
    uorCanonicalId: identity["u:canonicalId"],
    uorCid: identity["u:cid"],
    uorGlyph: identity["u:glyph"],
    uorIpv6: identity["u:ipv6"],
  };
}
