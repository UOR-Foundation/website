/**
 * UOR Union Type Canonicalization — R2-compliant type coercion for Schema.org unions.
 *
 * THE PROBLEM:
 *   ~180 schema.org properties accept union type ranges (Person | Organization,
 *   Date | DateTime | Text, Place | PostalAddress | Text, etc.). Without canonical
 *   reduction, two agents encoding the same entity via different union paths compute
 *   different derivation_ids → incorrectly conclude they are different entities.
 *
 * THE SOLUTION — Three reduction rules applied in order:
 *   1. Literal coercion: String + union includes Date|DateTime|Text → most restrictive match
 *   2. Entity coercion: Object without @type → infer from property presence
 *   3. Record as morphism:Transform (R2): Every reduction is content-addressed and auditable
 *
 * Uses the Single Proof Hashing Standard (URDNA2015) for all identity computation.
 * Every coercion is recorded as a morphism:Transform, preserving both source union
 * and resolved type for full auditability.
 *
 * Pure functions. No side effects except optional transform recording.
 */

import { singleProofHash } from "@/lib/uor-canonical";

// ── Schema.org union type definitions ──────────────────────────────────────

/**
 * Known Schema.org properties with union type ranges.
 * Maps property name → ordered list of types (most specific first).
 */
export const UNION_TYPE_RANGES: Record<string, readonly string[]> = {
  // Person | Organization unions
  "schema:author":      ["schema:Person", "schema:Organization"],
  "schema:creator":     ["schema:Person", "schema:Organization"],
  "schema:publisher":   ["schema:Person", "schema:Organization"],
  "schema:contributor": ["schema:Person", "schema:Organization"],
  "schema:funder":      ["schema:Person", "schema:Organization"],
  "schema:sponsor":     ["schema:Person", "schema:Organization"],
  "schema:provider":    ["schema:Person", "schema:Organization"],
  "schema:seller":      ["schema:Person", "schema:Organization"],
  "schema:sender":      ["schema:Person", "schema:Organization"],
  "schema:recipient":   ["schema:Person", "schema:Organization"],

  // Place | PostalAddress | Text unions
  "schema:location":       ["schema:Place", "schema:PostalAddress", "schema:Text"],
  "schema:contentLocation":["schema:Place", "schema:PostalAddress", "schema:Text"],
  "schema:jobLocation":    ["schema:Place", "schema:PostalAddress", "schema:Text"],

  // Date | DateTime | Text unions
  "schema:startDate":      ["schema:DateTime", "schema:Date", "schema:Text"],
  "schema:endDate":        ["schema:DateTime", "schema:Date", "schema:Text"],
  "schema:datePublished":  ["schema:DateTime", "schema:Date", "schema:Text"],
  "schema:dateCreated":    ["schema:DateTime", "schema:Date", "schema:Text"],
  "schema:dateModified":   ["schema:DateTime", "schema:Date", "schema:Text"],
  "schema:birthDate":      ["schema:Date", "schema:Text"],
  "schema:deathDate":      ["schema:Date", "schema:Text"],
  "schema:foundingDate":   ["schema:Date", "schema:Text"],
  "schema:dissolutionDate":["schema:Date", "schema:Text"],

  // Number | Text unions
  "schema:price":          ["schema:Number", "schema:Text"],
  "schema:elevation":      ["schema:Number", "schema:Text"],

  // URL | Text unions
  "schema:url":            ["schema:URL", "schema:Text"],
  "schema:sameAs":         ["schema:URL", "schema:Text"],
  "schema:image":          ["schema:ImageObject", "schema:URL"],
  "schema:logo":           ["schema:ImageObject", "schema:URL"],
} as const;

// ── Regex patterns for literal type detection ──────────────────────────────

/** ISO 8601 DateTime pattern: YYYY-MM-DDTHH:MM:SS[.sss][Z|±HH:MM] */
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;

/** ISO 8601 Date pattern: YYYY-MM-DD */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Numeric pattern (integer or decimal) */
const NUMBER_RE = /^-?\d+(\.\d+)?$/;

/** URL pattern (loose — starts with http:// or https://) */
const URL_RE = /^https?:\/\/.+/;

// ── Entity property → type inference maps ──────────────────────────────────

/**
 * Discriminating properties for entity type inference.
 * If an object (without @type) has ANY of these properties, it is inferred
 * as the corresponding type. Checked in order — first match wins.
 */
const ENTITY_DISCRIMINATORS: Array<{
  type: string;
  properties: readonly string[];
}> = [
  // schema:Person discriminators
  {
    type: "schema:Person",
    properties: [
      "givenName", "familyName", "birthDate", "deathDate",
      "schema:givenName", "schema:familyName", "schema:birthDate",
      "sdo:givenName", "sdo:familyName",
    ],
  },
  // schema:Organization discriminators
  {
    type: "schema:Organization",
    properties: [
      "legalName", "foundingDate", "dissolutionDate", "numberOfEmployees",
      "schema:legalName", "schema:foundingDate",
      "sdo:legalName", "sdo:foundingDate",
    ],
  },
  // schema:PostalAddress discriminators
  {
    type: "schema:PostalAddress",
    properties: [
      "streetAddress", "addressLocality", "addressRegion", "postalCode",
      "schema:streetAddress", "schema:addressLocality", "schema:postalCode",
      "sdo:streetAddress", "sdo:addressLocality",
    ],
  },
  // schema:Place discriminators
  {
    type: "schema:Place",
    properties: [
      "geo", "latitude", "longitude", "hasMap", "containedInPlace",
      "schema:geo", "schema:latitude", "schema:longitude",
      "sdo:geo", "sdo:latitude",
    ],
  },
  // schema:ImageObject discriminators
  {
    type: "schema:ImageObject",
    properties: [
      "contentUrl", "encodingFormat", "width", "height", "thumbnail",
      "schema:contentUrl", "schema:encodingFormat",
      "sdo:contentUrl",
    ],
  },
];

// ── Coercion result types ──────────────────────────────────────────────────

export interface CoercionResult {
  /** The coerced value (may be transformed) */
  value: unknown;
  /** The resolved canonical type */
  resolvedType: string;
  /** The original source type (or "unknown" if untyped) */
  sourceType: string;
  /** Which rule was applied: "literal" | "entity" | "none" */
  rule: "literal" | "entity" | "none";
  /** Whether coercion was applied (false = value was already canonical) */
  coerced: boolean;
}

export interface UnionCanonResult {
  /** The fully canonicalized object */
  canonicalized: Record<string, unknown>;
  /** All coercions applied during canonicalization */
  coercions: CoercionRecord[];
}

export interface CoercionRecord {
  /** The property that was coerced */
  property: string;
  /** Source type before coercion */
  sourceType: string;
  /** Resolved type after coercion */
  resolvedType: string;
  /** Which rule applied */
  rule: "literal" | "entity";
  /** Content-addressed transform ID (if recorded) */
  transformId?: string;
}

// ── Rule 1: Literal Coercion ───────────────────────────────────────────────

/**
 * Rule 1 — Literal Coercion.
 *
 * When a string value appears in a union that includes Date|DateTime|Text,
 * apply the most restrictive match: DateTime regex > Date regex > Number > URL > Text.
 *
 * This ensures '2026-02-22' always resolves to schema:Date regardless of
 * which agent encoded it, and '2026-02-22T00:00:00Z' always resolves to
 * schema:DateTime.
 */
export function coerceLiteral(
  value: unknown,
  unionTypes: readonly string[]
): CoercionResult {
  // Only applies to string values
  if (typeof value !== "string") {
    return { value, resolvedType: "unknown", sourceType: "unknown", rule: "none", coerced: false };
  }

  const str = value.trim();

  // DateTime check (most restrictive first)
  if (unionTypes.includes("schema:DateTime") && DATETIME_RE.test(str)) {
    return {
      value: str,
      resolvedType: "schema:DateTime",
      sourceType: "schema:Text",
      rule: "literal",
      coerced: true,
    };
  }

  // Date check
  if (unionTypes.includes("schema:Date") && DATE_RE.test(str)) {
    // If DateTime is in the union, promote Date strings to DateTime at midnight UTC
    if (unionTypes.includes("schema:DateTime")) {
      return {
        value: `${str}T00:00:00Z`,
        resolvedType: "schema:DateTime",
        sourceType: "schema:Date",
        rule: "literal",
        coerced: true,
      };
    }
    return {
      value: str,
      resolvedType: "schema:Date",
      sourceType: "schema:Text",
      rule: "literal",
      coerced: true,
    };
  }

  // Number check
  if (unionTypes.includes("schema:Number") && NUMBER_RE.test(str)) {
    return {
      value: parseFloat(str),
      resolvedType: "schema:Number",
      sourceType: "schema:Text",
      rule: "literal",
      coerced: true,
    };
  }

  // URL check
  if (unionTypes.includes("schema:URL") && URL_RE.test(str)) {
    return {
      value: str,
      resolvedType: "schema:URL",
      sourceType: "schema:Text",
      rule: "literal",
      coerced: true,
    };
  }

  // Falls through to Text (no coercion needed — already the least restrictive)
  if (unionTypes.includes("schema:Text")) {
    return { value: str, resolvedType: "schema:Text", sourceType: "schema:Text", rule: "none", coerced: false };
  }

  return { value, resolvedType: "unknown", sourceType: "schema:Text", rule: "none", coerced: false };
}

// ── Rule 2: Entity Coercion ────────────────────────────────────────────────

/**
 * Rule 2 — Entity Coercion.
 *
 * When an object without @type appears in a union that includes entity types,
 * infer the type from discriminating properties. {givenName} → Person,
 * {legalName} → Organization, {streetAddress} → PostalAddress, etc.
 */
export function coerceEntity(
  value: unknown,
  unionTypes: readonly string[]
): CoercionResult {
  // Only applies to objects without @type
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return { value, resolvedType: "unknown", sourceType: "unknown", rule: "none", coerced: false };
  }

  const obj = value as Record<string, unknown>;

  // If @type is already set, no coercion needed
  if (obj["@type"]) {
    const existingType = String(obj["@type"]);
    return { value: obj, resolvedType: existingType, sourceType: existingType, rule: "none", coerced: false };
  }

  const keys = new Set(Object.keys(obj));

  // Check discriminators in order
  for (const disc of ENTITY_DISCRIMINATORS) {
    // Only consider types that are in the union range
    if (!unionTypes.includes(disc.type)) continue;

    // Check if any discriminating property is present
    const hasDiscriminator = disc.properties.some((p) => keys.has(p));
    if (hasDiscriminator) {
      return {
        value: { ...obj, "@type": disc.type },
        resolvedType: disc.type,
        sourceType: "unknown",
        rule: "entity",
        coerced: true,
      };
    }
  }

  return { value, resolvedType: "unknown", sourceType: "unknown", rule: "none", coerced: false };
}

// ── Combined coercion ──────────────────────────────────────────────────────

/**
 * Apply both coercion rules in order for a single property value.
 * Returns the coercion result with the resolved type.
 */
export function coerceUnionValue(
  value: unknown,
  propertyName: string
): CoercionResult {
  const unionTypes = UNION_TYPE_RANGES[propertyName];
  if (!unionTypes) {
    // Not a union-typed property — no coercion needed
    return { value, resolvedType: "unknown", sourceType: "unknown", rule: "none", coerced: false };
  }

  // Rule 1: Literal coercion (strings → most restrictive type)
  if (typeof value === "string") {
    return coerceLiteral(value, unionTypes);
  }

  // Rule 2: Entity coercion (untyped objects → inferred type)
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return coerceEntity(value, unionTypes);
  }

  return { value, resolvedType: "unknown", sourceType: typeof value, rule: "none", coerced: false };
}

// ── Rule 3: Record as morphism:Transform ───────────────────────────────────

/**
 * Record a union type coercion as a content-addressed morphism:Transform.
 *
 * Every coercion is an auditable transform from the source union representation
 * to the canonical resolved type. Uses URDNA2015 Single Proof Hash for the
 * transform ID — any agent can independently verify the coercion.
 */
export async function recordCoercionTransform(
  property: string,
  sourceType: string,
  resolvedType: string,
  rule: "literal" | "entity",
  sourceValue: unknown,
  resolvedValue: unknown
): Promise<{
  transformId: string;
  derivationId: string;
}> {
  const proof = await singleProofHash({
    "@context": {
      morphism: "https://uor.foundation/morphism/",
      schema: "https://schema.org/",
    },
    "@type": "morphism:Transform",
    "morphism:source": sourceType,
    "morphism:target": resolvedType,
    "morphism:property": property,
    "morphism:rule": `morphism:UnionCoercion_${rule}`,
    "morphism:sourceValue": typeof sourceValue === "string" ? sourceValue : JSON.stringify(sourceValue),
    "morphism:resolvedValue": typeof resolvedValue === "string" ? resolvedValue : JSON.stringify(resolvedValue),
  });

  return {
    transformId: `urn:uor:morphism:union:${proof.cid.slice(0, 24)}`,
    derivationId: proof.derivationId,
  };
}

// ── Full object canonicalization ────────────────────────────────────────────

/**
 * Canonicalize all union-typed properties in a Schema.org JSON-LD object.
 *
 * Walks the top-level properties, applies coercion rules, and records
 * every coercion as a morphism:Transform.
 *
 * After canonicalization, calling singleProofHash on the result produces
 * the SAME derivation_id regardless of which union path was used to encode
 * the original data.
 *
 * @param obj   A Schema.org JSON-LD object (with or without @context)
 * @param record  If true, record each coercion as a morphism:Transform (default: true)
 * @returns The canonicalized object and list of coercions applied
 */
export async function canonicalizeUnionTypes(
  obj: Record<string, unknown>,
  record = true
): Promise<UnionCanonResult> {
  const canonicalized = { ...obj };
  const coercions: CoercionRecord[] = [];

  for (const [key, value] of Object.entries(obj)) {
    // Skip JSON-LD keywords
    if (key.startsWith("@")) continue;

    // Normalize property name: support both "author" and "schema:author"
    const propertyName = key.includes(":") ? key : `schema:${key}`;

    const result = coerceUnionValue(value, propertyName);

    if (result.coerced) {
      // Apply the coerced value
      canonicalized[key] = result.value;

      const coercion: CoercionRecord = {
        property: propertyName,
        sourceType: result.sourceType,
        resolvedType: result.resolvedType,
        rule: result.rule as "literal" | "entity",
      };

      // Rule 3: Record as morphism:Transform
      if (record) {
        const transform = await recordCoercionTransform(
          propertyName,
          result.sourceType,
          result.resolvedType,
          result.rule as "literal" | "entity",
          value,
          result.value
        );
        coercion.transformId = transform.transformId;
      }

      coercions.push(coercion);
    }
  }

  return { canonicalized, coercions };
}
