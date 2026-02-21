/**
 * UOR JSON-LD Validator — structural validation for W3C JSON-LD 1.1 compliance.
 *
 * Validates that emitted documents conform to the UOR ontology:
 *   1. @context is present and correctly typed
 *   2. All @id values are valid IRIs
 *   3. All @type values match UOR ontology classes
 *
 * This is structural validation (not full JSON-LD processing).
 * For full validation, load into a triplestore.
 */

// ── Known ontology types ────────────────────────────────────────────────────

const KNOWN_TYPES = new Set([
  "schema:Datum",
  "schema:Triad",
  "derivation:Record",
  "proof:CoherenceProof",
  "cert:DerivationCertificate",
  "cert:ModuleCertificate",
  "receipt:CanonicalReceipt",
  "partition:ExteriorSet",
  "partition:UnitSet",
  "partition:IrreducibleSet",
  "partition:ReducibleSet",
]);

// ── IRI validation ──────────────────────────────────────────────────────────

const IRI_PATTERN = /^(https?:\/\/|urn:)/;

function isValidIri(value: string): boolean {
  return IRI_PATTERN.test(value);
}

// ── Validation result ───────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  nodeCount: number;
  typeCounts: Record<string, number>;
}

// ── validateJsonLd ──────────────────────────────────────────────────────────

/**
 * Validate a JSON-LD document for UOR ontology conformance.
 */
export function validateJsonLd(doc: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const typeCounts: Record<string, number> = {};
  let nodeCount = 0;

  if (!doc || typeof doc !== "object") {
    return { valid: false, errors: ["Document is not an object"], warnings, nodeCount, typeCounts };
  }

  const d = doc as Record<string, unknown>;

  // 1. @context validation
  if (!("@context" in d)) {
    errors.push("Missing @context");
  } else {
    const ctx = d["@context"];
    if (typeof ctx !== "object" || ctx === null) {
      errors.push("@context must be an object");
    } else {
      const c = ctx as Record<string, unknown>;
      if (!c["@base"]) warnings.push("@context missing @base");
      if (!c["@vocab"]) warnings.push("@context missing @vocab");
    }
  }

  // 2. @graph validation
  if (!("@graph" in d)) {
    errors.push("Missing @graph");
  } else {
    const graph = d["@graph"];
    if (!Array.isArray(graph)) {
      errors.push("@graph must be an array");
    } else {
      nodeCount = graph.length;
      for (let i = 0; i < graph.length; i++) {
        const node = graph[i];
        if (!node || typeof node !== "object") {
          errors.push(`@graph[${i}]: not an object`);
          continue;
        }
        const n = node as Record<string, unknown>;

        // @id check
        if (!("@id" in n)) {
          errors.push(`@graph[${i}]: missing @id`);
        } else if (typeof n["@id"] !== "string" || !isValidIri(n["@id"] as string)) {
          errors.push(`@graph[${i}]: @id "${n["@id"]}" is not a valid IRI`);
        }

        // @type check
        if (!("@type" in n)) {
          errors.push(`@graph[${i}]: missing @type`);
        } else {
          const t = n["@type"] as string;
          typeCounts[t] = (typeCounts[t] ?? 0) + 1;
          if (!KNOWN_TYPES.has(t)) {
            warnings.push(`@graph[${i}]: @type "${t}" not in known UOR ontology types`);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    nodeCount,
    typeCounts,
  };
}
