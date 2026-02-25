/**
 * Schema.org × UOR Functor — Type Definitions
 * ════════════════════════════════════════════
 *
 * The dual representation: every Schema.org type has both its original
 * JSON-LD form (web-readable) and a UOR canonical form (content-addressed).
 *
 * @module schema-org/types
 */

// ── Schema.org Type Definition ─────────────────────────────────────────────

/** A Schema.org type definition with its full inheritance chain. */
export interface SchemaOrgType {
  /** The type IRI, e.g. "https://schema.org/Person" */
  readonly id: string;
  /** Short name, e.g. "Person" */
  readonly name: string;
  /** Human-readable description */
  readonly description: string;
  /** Parent type IRIs (rdfs:subClassOf) */
  readonly parents: readonly string[];
  /** Direct child type IRIs */
  readonly children: readonly string[];
  /** Properties defined on this type (not inherited) */
  readonly properties: readonly string[];
  /** All properties including inherited */
  readonly allProperties: readonly string[];
  /** The full inheritance chain from this type to Thing */
  readonly ancestorChain: readonly string[];
}

/** A Schema.org property definition. */
export interface SchemaOrgProperty {
  /** The property IRI, e.g. "https://schema.org/name" */
  readonly id: string;
  /** Short name, e.g. "name" */
  readonly name: string;
  /** Human-readable description */
  readonly description: string;
  /** Domain types (which types have this property) */
  readonly domainIncludes: readonly string[];
  /** Range types (what values this property accepts) */
  readonly rangeIncludes: readonly string[];
}

// ── Dual Representation ────────────────────────────────────────────────────

/** The UOR identity of a Schema.org type — the content-addressed dual. */
export interface SchemaOrgUorIdentity {
  /** The Schema.org type name */
  readonly schemaType: string;
  /** UOR derivation ID (urn:uor:derivation:sha256:{hex}) */
  readonly derivationId: string;
  /** CIDv1 */
  readonly cid: string;
  /** SHA-256 hex */
  readonly hashHex: string;
  /** UOR Braille address */
  readonly uorAddress: { "u:glyph": string; "u:length": number };
  /** Content-addressed IPv6 */
  readonly ipv6Address: { "u:ipv6": string; "u:ipv6Prefix": string; "u:ipv6PrefixLength": number; "u:contentBits": number };
  /** The canonical N-Quads payload */
  readonly nquads: string;
}

/** Complete dual representation of a Schema.org type. */
export interface SchemaOrgDualType {
  /** The Schema.org form (human/web-readable) */
  readonly schema: SchemaOrgType;
  /** The UOR form (content-addressed) */
  readonly uor: SchemaOrgUorIdentity;
}

// ── Functor Result ─────────────────────────────────────────────────────────

/** Result of applying the Schema.org → UOR functor to an instance. */
export interface FunctorResult {
  /** The Schema.org @type of the input */
  readonly schemaType: string;
  /** The full UOR identity */
  readonly derivationId: string;
  readonly cid: string;
  readonly hashHex: string;
  readonly uorAddress: { "u:glyph": string; "u:length": number };
  readonly ipv6Address: { "u:ipv6": string; "u:ipv6Prefix": string; "u:ipv6PrefixLength": number; "u:contentBits": number };
  /** The dual JSON-LD representation with both contexts */
  readonly dualJsonLd: Record<string, unknown>;
  /** The canonical N-Quads */
  readonly nquads: string;
}

// ── Registry Stats ─────────────────────────────────────────────────────────

export interface SchemaOrgRegistryStats {
  readonly typeCount: number;
  readonly propertyCount: number;
  readonly maxDepth: number;
  readonly rootType: string;
  readonly timestamp: string;
}
