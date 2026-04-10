/**
 * UOR Knowledge Graph — Blueprint Type Registry.
 *
 * Maps rdfType → attribute schema expectations.
 * Ensures blueprints conform to known UOR types.
 *
 * The UOR framework defines types, categories, and transformations.
 * This registry is the enforcement layer for graph nodes.
 *
 * @module knowledge-graph/blueprint-registry
 */

import type { ObjectBlueprint } from "./blueprint";

// ── Types ───────────────────────────────────────────────────────────────────

export interface AttributeSchemaEntry {
  /** RDF predicate (e.g. "schema:name") */
  predicate: string;
  /** Expected value type */
  valueType: "literal" | "reference";
  /** Is this attribute required? */
  required: boolean;
  /** Description for documentation */
  description?: string;
}

export interface AttributeSchema {
  /** The rdfType this schema applies to */
  rdfType: string;
  /** Human-readable label */
  label: string;
  /** Required and optional attributes */
  attributes: AttributeSchemaEntry[];
}

export interface ValidationIssue {
  severity: "error" | "warning";
  message: string;
  predicate?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

// ── Registry ────────────────────────────────────────────────────────────────

const registry = new Map<string, AttributeSchema>();

export function registerNodeType(rdfType: string, schema: AttributeSchema): void {
  registry.set(rdfType, schema);
}

export function getNodeTypeSchema(rdfType: string): AttributeSchema | undefined {
  return registry.get(rdfType);
}

export function getAllRegisteredTypes(): string[] {
  return Array.from(registry.keys());
}

/**
 * Validate a blueprint against the registered schema for its rdfType.
 * Returns { valid: true, issues: [] } if no schema is registered (open world).
 */
export function validateBlueprint(bp: ObjectBlueprint): ValidationResult {
  const rdfType = bp.spaceDefinition.rdfType;
  const schema = registry.get(rdfType);

  if (!schema) {
    return { valid: true, issues: [] };
  }

  const issues: ValidationIssue[] = [];
  const presentPredicates = new Set(bp.attributes.map((a) => a.predicate));

  // Check required attributes
  for (const entry of schema.attributes) {
    if (entry.required && !presentPredicates.has(entry.predicate)) {
      issues.push({
        severity: "error",
        message: `Missing required attribute: ${entry.predicate}`,
        predicate: entry.predicate,
      });
    }
  }

  // Check value types match
  for (const attr of bp.attributes) {
    const schemaEntry = schema.attributes.find((e) => e.predicate === attr.predicate);
    if (schemaEntry && schemaEntry.valueType !== attr.valueType) {
      issues.push({
        severity: "warning",
        message: `Attribute ${attr.predicate} expected valueType "${schemaEntry.valueType}" but got "${attr.valueType}"`,
        predicate: attr.predicate,
      });
    }
  }

  return {
    valid: issues.filter((i) => i.severity === "error").length === 0,
    issues,
  };
}

// ── Pre-register known UOR types ────────────────────────────────────────────

registerNodeType("schema:Dataset", {
  rdfType: "schema:Dataset",
  label: "Dataset",
  attributes: [
    { predicate: "schema:filename", valueType: "literal", required: true, description: "Source filename" },
    { predicate: "schema:mimeType", valueType: "literal", required: false, description: "MIME type" },
    { predicate: "schema:size", valueType: "literal", required: false, description: "File size in bytes" },
    { predicate: "schema:hasColumn", valueType: "reference", required: false, description: "Column sub-nodes" },
  ],
});

registerNodeType("schema:MediaObject", {
  rdfType: "schema:MediaObject",
  label: "Media Object",
  attributes: [
    { predicate: "schema:filename", valueType: "literal", required: true },
    { predicate: "schema:mimeType", valueType: "literal", required: true },
    { predicate: "schema:size", valueType: "literal", required: false },
  ],
});

registerNodeType("schema:WebPage", {
  rdfType: "schema:WebPage",
  label: "Web Page",
  attributes: [
    { predicate: "schema:filename", valueType: "literal", required: true, description: "URL or title" },
  ],
});

registerNodeType("schema:Column", {
  rdfType: "schema:Column",
  label: "Data Column",
  attributes: [
    { predicate: "schema:columnName", valueType: "literal", required: true },
    { predicate: "schema:dataType", valueType: "literal", required: false },
  ],
});

registerNodeType("schema:URL", {
  rdfType: "schema:URL",
  label: "URL Entity",
  attributes: [
    { predicate: "schema:value", valueType: "literal", required: true },
    { predicate: "schema:entityType", valueType: "literal", required: true },
  ],
});

registerNodeType("schema:ContactPoint", {
  rdfType: "schema:ContactPoint",
  label: "Contact Point (Email)",
  attributes: [
    { predicate: "schema:value", valueType: "literal", required: true },
    { predicate: "schema:entityType", valueType: "literal", required: true },
  ],
});

registerNodeType("schema:Date", {
  rdfType: "schema:Date",
  label: "Date Entity",
  attributes: [
    { predicate: "schema:value", valueType: "literal", required: true },
  ],
});

registerNodeType("schema:MonetaryAmount", {
  rdfType: "schema:MonetaryAmount",
  label: "Monetary Amount",
  attributes: [
    { predicate: "schema:value", valueType: "literal", required: true },
  ],
});

registerNodeType("schema:Thing", {
  rdfType: "schema:Thing",
  label: "Generic Entity",
  attributes: [
    { predicate: "schema:value", valueType: "literal", required: false },
  ],
});
