/**
 * Schema.org → UOR Functor
 * ════════════════════════
 *
 * F : SchemaOrg → UOR
 *
 * A single functor that maps ANY Schema.org type or instance to its
 * UOR content-addressed identity. No per-type code needed — URDNA2015
 * handles all 806+ types uniformly.
 *
 * The functor preserves:
 *   • Composition  (Person → Thing inheritance via derivation chains)
 *   • Identity     (same content = same CID, always)
 *   • Structure    (property ranges, domains intact in canonical form)
 *
 * @module schema-org/functor
 */

import { singleProofHash } from "@/lib/uor-canonical";
import type { FunctorResult, SchemaOrgUorIdentity } from "./types";
import { SCHEMA_ORG_HIERARCHY, getAncestorChain } from "./vocabulary";

// ── Dual Context ───────────────────────────────────────────────────────────
// Inline context avoids network fetch of https://schema.org — any agent
// can reproduce this locally. Only the properties we use in type definitions
// and instance canonicalization are included.

const SCHEMA_ORG_INLINE_CONTEXT: Record<string, unknown> = {
  schema: "https://schema.org/",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  "rdfs:Class": { "@id": "rdfs:Class" },
  "rdfs:label": { "@id": "rdfs:label" },
  "rdfs:subClassOf": { "@id": "rdfs:subClassOf", "@type": "@id", "@container": "@set" },
  name: { "@id": "schema:name" },
  description: { "@id": "schema:description" },
  url: { "@id": "schema:url", "@type": "@id" },
  image: { "@id": "schema:image", "@type": "@id" },
  email: { "@id": "schema:email" },
  telephone: { "@id": "schema:telephone" },
  birthDate: { "@id": "schema:birthDate" },
  deathDate: { "@id": "schema:deathDate" },
  address: { "@id": "schema:address" },
  identifier: { "@id": "schema:identifier" },
  sameAs: { "@id": "schema:sameAs", "@type": "@id" },
  author: { "@id": "schema:author", "@type": "@id" },
  datePublished: { "@id": "schema:datePublished" },
  dateCreated: { "@id": "schema:dateCreated" },
  dateModified: { "@id": "schema:dateModified" },
  headline: { "@id": "schema:headline" },
  text: { "@id": "schema:text" },
  location: { "@id": "schema:location" },
  startDate: { "@id": "schema:startDate" },
  endDate: { "@id": "schema:endDate" },
  price: { "@id": "schema:price" },
  priceCurrency: { "@id": "schema:priceCurrency" },
};

const DUAL_CONTEXT = [
  SCHEMA_ORG_INLINE_CONTEXT,
  { uor: "https://uor.foundation/ns/", derivation: "https://uor.foundation/derivation/" },
] as const;

// ── Type Identity Cache ────────────────────────────────────────────────────
// Content-addressing a type definition is deterministic, so we cache results.

const typeIdentityCache = new Map<string, SchemaOrgUorIdentity>();

/**
 * Content-address a Schema.org TYPE DEFINITION.
 *
 * The canonical form of a type includes its name, parent chain,
 * and position in the hierarchy — making the identity structurally
 * complete and deterministic.
 */
export async function addressType(typeName: string): Promise<SchemaOrgUorIdentity> {
  const cached = typeIdentityCache.get(typeName);
  if (cached) return cached;

  const parents = SCHEMA_ORG_HIERARCHY[typeName];
  if (!parents && typeName !== "Thing") {
    throw new Error(`Unknown Schema.org type: ${typeName}`);
  }

  const ancestorChain = getAncestorChain(typeName);

  // Canonical JSON-LD representation of the type definition
  const typeDefinition = {
    "@context": DUAL_CONTEXT,
    "@type": "rdfs:Class",
    "@id": `https://schema.org/${typeName}`,
    "rdfs:label": typeName,
    "rdfs:subClassOf": (parents ?? []).map((p) => ({
      "@id": `https://schema.org/${p}`,
    })),
    "uor:ancestorChain": ancestorChain,
    "uor:hierarchyDepth": ancestorChain.length - 1,
  };

  const proof = await singleProofHash(typeDefinition);

  const identity: SchemaOrgUorIdentity = {
    schemaType: typeName,
    derivationId: proof.derivationId,
    cid: proof.cid,
    hashHex: proof.hashHex,
    uorAddress: proof.uorAddress,
    ipv6Address: proof.ipv6Address,
    nquads: proof.nquads,
  };

  typeIdentityCache.set(typeName, identity);
  return identity;
}

/**
 * Content-address a Schema.org INSTANCE.
 *
 * Takes any JSON-LD object with a `@type` from Schema.org and returns
 * its UOR identity + dual representation.
 *
 * This is THE functor: F(instance) → UOR identity.
 */
export async function schemaToUor(
  instance: Record<string, unknown>
): Promise<FunctorResult> {
  // Determine Schema.org type
  const rawType = instance["@type"] as string | undefined;
  if (!rawType) {
    throw new Error("Instance must have @type for Schema.org functor");
  }
  const schemaType = rawType.replace("https://schema.org/", "").replace("schema:", "");

  // Build the dual JSON-LD — carries both Schema.org and UOR contexts
  const dualJsonLd: Record<string, unknown> = {
    ...instance,
    "@context": DUAL_CONTEXT,
  };

  // Content-address the instance
  const proof = await singleProofHash(dualJsonLd);

  return {
    schemaType,
    derivationId: proof.derivationId,
    cid: proof.cid,
    hashHex: proof.hashHex,
    uorAddress: proof.uorAddress,
    ipv6Address: proof.ipv6Address,
    dualJsonLd,
    nquads: proof.nquads,
  };
}

/**
 * Batch-address all Schema.org types.
 *
 * Returns a Map<typeName, UorIdentity> for the entire vocabulary.
 * Processes in parallel for performance.
 */
export async function addressAllTypes(
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, SchemaOrgUorIdentity>> {
  const typeNames = Object.keys(SCHEMA_ORG_HIERARCHY);
  const total = typeNames.length;
  let done = 0;

  // Process in batches of 50 for controlled parallelism
  const BATCH_SIZE = 50;
  const results = new Map<string, SchemaOrgUorIdentity>();

  for (let i = 0; i < typeNames.length; i += BATCH_SIZE) {
    const batch = typeNames.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (name) => {
        const identity = await addressType(name);
        done++;
        onProgress?.(done, total);
        return [name, identity] as const;
      })
    );
    for (const [name, identity] of batchResults) {
      results.set(name, identity);
    }
  }

  return results;
}

/**
 * Verify a Schema.org type's UOR identity by recomputation.
 * Returns true iff the recomputed derivation_id matches.
 */
export async function verifyTypeIdentity(
  typeName: string,
  expectedDerivationId: string
): Promise<boolean> {
  // Clear cache to force recomputation
  typeIdentityCache.delete(typeName);
  const identity = await addressType(typeName);
  return identity.derivationId === expectedDerivationId;
}

/**
 * Get the cached type identity registry size.
 */
export function getCacheSize(): number {
  return typeIdentityCache.size;
}

/**
 * Clear the type identity cache.
 */
export function clearCache(): void {
  typeIdentityCache.clear();
}
