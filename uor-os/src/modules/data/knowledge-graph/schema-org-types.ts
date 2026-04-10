/**
 * Schema.org Canonical Type Registry
 * ═════════════════════════════════════════════════════════════════
 *
 * Compact registry of schema.org types relevant to UOR operations.
 * Each type declares its parent class, valid properties, required
 * fields, and canonical mapping to UOR namespaces.
 *
 * This is the single source of truth for which schema.org types
 * the system may emit. Any new type must be registered here before
 * it can appear in JSON-LD output — enforcing blueprint-before-build.
 *
 * Reference: https://schema.org/docs/full.html
 *
 * @module knowledge-graph/schema-org-types
 */

// ── Type Spec ────────────────────────────────────────────────────────────

export interface SchemaOrgTypeSpec {
  /** Full schema.org type, e.g. "schema:Person" */
  readonly id: string;
  /** Parent type in the hierarchy */
  readonly parent: string;
  /** Valid properties for this type (including inherited) */
  readonly properties: readonly string[];
  /** Minimum required properties for valid output */
  readonly required?: readonly string[];
  /** UOR namespace this type maps to */
  readonly uorMapping?: string;
  /** Human description */
  readonly description: string;
}

// ── Registry ─────────────────────────────────────────────────────────────

const TYPES: readonly SchemaOrgTypeSpec[] = [
  // ── Root ──────────────────────────────────────────────────────────────
  {
    id: "schema:Thing",
    parent: "",
    properties: [
      "schema:name", "schema:description", "schema:url", "schema:identifier",
      "schema:image", "schema:sameAs", "schema:additionalType",
      "schema:alternateName", "schema:disambiguatingDescription",
      "schema:mainEntityOfPage", "schema:potentialAction",
      "schema:subjectOf", "schema:additionalProperty",
    ],
    description: "The most generic type. Every schema.org type inherits from Thing.",
  },

  // ── Creative Works ───────────────────────────────────────────────────
  {
    id: "schema:CreativeWork",
    parent: "schema:Thing",
    properties: [
      "schema:author", "schema:dateCreated", "schema:dateModified",
      "schema:datePublished", "schema:encodingFormat", "schema:contentSize",
      "schema:license", "schema:version", "schema:text", "schema:about",
      "schema:keywords", "schema:isPartOf", "schema:hasPart",
      "schema:position", "schema:publisher", "schema:copyrightHolder",
    ],
    uorMapping: "store:",
    description: "A creative work including articles, datasets, and software.",
  },
  {
    id: "schema:Dataset",
    parent: "schema:CreativeWork",
    properties: [
      "schema:distribution", "schema:variableMeasured",
      "schema:measurementTechnique", "schema:catalog",
    ],
    required: ["schema:name"],
    uorMapping: "store:StoredObject",
    description: "A dataset — maps to UOR stored objects with JSON content.",
  },
  {
    id: "schema:WebSite",
    parent: "schema:CreativeWork",
    properties: ["schema:issn"],
    required: ["schema:name"],
    uorMapping: "u:",
    description: "A website — maps to UNS name records.",
  },
  {
    id: "schema:SoftwareSourceCode",
    parent: "schema:CreativeWork",
    properties: [
      "schema:codeRepository", "schema:codeSampleType",
      "schema:programmingLanguage", "schema:runtimePlatform",
      "schema:targetProduct",
    ],
    uorMapping: "compute:",
    description: "Source code — maps to UOR compute source.",
  },
  {
    id: "schema:Article",
    parent: "schema:CreativeWork",
    properties: ["schema:articleBody", "schema:articleSection", "schema:wordCount"],
    uorMapping: "store:",
    description: "An article or blog post.",
  },
  {
    id: "schema:MediaObject",
    parent: "schema:CreativeWork",
    properties: [
      "schema:bitrate", "schema:contentUrl", "schema:duration",
      "schema:embedUrl", "schema:uploadDate", "schema:width", "schema:height",
    ],
    uorMapping: "store:",
    description: "A media object (audio, video, image).",
  },
  {
    id: "schema:AudioObject",
    parent: "schema:MediaObject",
    properties: ["schema:transcript", "schema:caption"],
    uorMapping: "store:",
    description: "An audio file — maps to UOR audio tracks.",
  },
  {
    id: "schema:VideoObject",
    parent: "schema:MediaObject",
    properties: ["schema:videoFrameSize", "schema:videoQuality"],
    uorMapping: "store:",
    description: "A video file.",
  },
  {
    id: "schema:ImageObject",
    parent: "schema:MediaObject",
    properties: ["schema:caption", "schema:exifData"],
    uorMapping: "store:",
    description: "An image file.",
  },
  {
    id: "schema:DigitalDocument",
    parent: "schema:CreativeWork",
    properties: ["schema:hasDigitalDocumentPermission"],
    uorMapping: "store:",
    description: "A digital document.",
  },
  {
    id: "schema:Message",
    parent: "schema:CreativeWork",
    properties: [
      "schema:sender", "schema:recipient", "schema:dateSent",
      "schema:dateReceived", "schema:messageAttachment",
    ],
    uorMapping: "conduit:",
    description: "A message — maps to UOR encrypted messages.",
  },

  // ── Software ─────────────────────────────────────────────────────────
  {
    id: "schema:SoftwareApplication",
    parent: "schema:CreativeWork",
    properties: [
      "schema:applicationCategory", "schema:applicationSubCategory",
      "schema:operatingSystem", "schema:softwareVersion",
      "schema:softwareRequirements", "schema:permissions",
      "schema:releaseNotes", "schema:installUrl",
    ],
    required: ["schema:name"],
    uorMapping: "compute:",
    description: "A software application — maps to UOR compute functions.",
  },
  {
    id: "schema:WebApplication",
    parent: "schema:SoftwareApplication",
    properties: ["schema:browserRequirements"],
    uorMapping: "compute:",
    description: "A web application.",
  },

  // ── Organizations & People ───────────────────────────────────────────
  {
    id: "schema:Organization",
    parent: "schema:Thing",
    properties: [
      "schema:legalName", "schema:numberOfEmployees", "schema:founder",
      "schema:foundingDate", "schema:email", "schema:telephone",
      "schema:address", "schema:member", "schema:department",
    ],
    required: ["schema:name"],
    uorMapping: "u:",
    description: "An organization — maps to UOR node operators.",
  },
  {
    id: "schema:Person",
    parent: "schema:Thing",
    properties: [
      "schema:givenName", "schema:familyName", "schema:birthDate",
      "schema:email", "schema:telephone", "schema:address",
      "schema:jobTitle", "schema:worksFor", "schema:knows",
      "schema:affiliation",
    ],
    required: ["schema:name"],
    uorMapping: "u:",
    description: "A person — maps to UOR identity profiles.",
  },

  // ── Actions ──────────────────────────────────────────────────────────
  {
    id: "schema:Action",
    parent: "schema:Thing",
    properties: [
      "schema:agent", "schema:object", "schema:result",
      "schema:startTime", "schema:endTime", "schema:instrument",
      "schema:target", "schema:actionStatus", "schema:error",
    ],
    uorMapping: "op:",
    description: "An action — maps to UOR operations.",
  },
  {
    id: "schema:SearchAction",
    parent: "schema:Action",
    properties: ["schema:query"],
    uorMapping: "query:",
    description: "A search — maps to UOR query operations.",
  },
  {
    id: "schema:CreateAction",
    parent: "schema:Action",
    properties: [],
    uorMapping: "op:",
    description: "Create action — maps to UOR store operations.",
  },
  {
    id: "schema:UpdateAction",
    parent: "schema:Action",
    properties: [],
    uorMapping: "op:",
    description: "Update action — maps to UOR state mutations.",
  },
  {
    id: "schema:DeleteAction",
    parent: "schema:Action",
    properties: [],
    uorMapping: "op:",
    description: "Delete action.",
  },
  {
    id: "schema:CheckAction",
    parent: "schema:Action",
    properties: [],
    uorMapping: "proof:",
    description: "A check/verification — maps to UOR health probes.",
  },
  {
    id: "schema:TransferAction",
    parent: "schema:Action",
    properties: ["schema:fromLocation", "schema:toLocation"],
    uorMapping: "morphism:",
    description: "Transfer — maps to UOR morphisms.",
  },
  {
    id: "schema:CommunicateAction",
    parent: "schema:Action",
    properties: ["schema:about", "schema:language", "schema:recipient"],
    uorMapping: "conduit:",
    description: "Communication — maps to UOR conduit messages.",
  },

  // ── Intangibles ──────────────────────────────────────────────────────
  {
    id: "schema:Intangible",
    parent: "schema:Thing",
    properties: [],
    description: "Abstract concept — parent for PropertyValue, StructuredValue, etc.",
  },
  {
    id: "schema:PropertyValue",
    parent: "schema:Intangible",
    properties: [
      "schema:propertyID", "schema:value", "schema:unitCode",
      "schema:unitText", "schema:minValue", "schema:maxValue",
    ],
    uorMapping: "partition:",
    description: "A property-value pair — maps to UOR partition properties.",
  },
  {
    id: "schema:StructuredValue",
    parent: "schema:Intangible",
    properties: [],
    description: "A structured value.",
  },
  {
    id: "schema:QuantitativeValue",
    parent: "schema:StructuredValue",
    properties: [
      "schema:value", "schema:unitCode", "schema:unitText",
      "schema:minValue", "schema:maxValue",
    ],
    uorMapping: "observable:",
    description: "A quantitative measurement — maps to UOR observables.",
  },
  {
    id: "schema:DefinedTerm",
    parent: "schema:Intangible",
    properties: [
      "schema:termCode", "schema:inDefinedTermSet",
    ],
    uorMapping: "schema:",
    description: "A defined term in a vocabulary — maps to SKOS concepts.",
  },
  {
    id: "schema:DefinedTermSet",
    parent: "schema:CreativeWork",
    properties: ["schema:hasDefinedTerm"],
    uorMapping: "schema:",
    description: "A set of defined terms — maps to SKOS ConceptScheme.",
  },
  {
    id: "schema:EntryPoint",
    parent: "schema:Intangible",
    properties: [
      "schema:httpMethod", "schema:urlTemplate",
      "schema:contentType", "schema:encodingType",
    ],
    uorMapping: "bus/",
    description: "An API entry point — maps to Sovereign Bus endpoints.",
  },

  // ── Events ───────────────────────────────────────────────────────────
  {
    id: "schema:Event",
    parent: "schema:Thing",
    properties: [
      "schema:startDate", "schema:endDate", "schema:location",
      "schema:organizer", "schema:attendee", "schema:eventStatus",
      "schema:duration", "schema:performer", "schema:offers",
    ],
    uorMapping: "trace:",
    description: "An event — maps to UOR trace events.",
  },

  // ── Places ───────────────────────────────────────────────────────────
  {
    id: "schema:Place",
    parent: "schema:Thing",
    properties: [
      "schema:geo", "schema:latitude", "schema:longitude",
      "schema:address", "schema:containedInPlace", "schema:containsPlace",
    ],
    description: "A place or location.",
  },

  // ── Products ─────────────────────────────────────────────────────────
  {
    id: "schema:Product",
    parent: "schema:Thing",
    properties: [
      "schema:brand", "schema:category", "schema:color",
      "schema:model", "schema:sku", "schema:weight",
      "schema:width", "schema:height", "schema:depth",
      "schema:offers", "schema:review", "schema:aggregateRating",
    ],
    description: "A product.",
  },

  // ── Lists & Collections ──────────────────────────────────────────────
  {
    id: "schema:ItemList",
    parent: "schema:Intangible",
    properties: [
      "schema:itemListElement", "schema:itemListOrder",
      "schema:numberOfItems",
    ],
    description: "An ordered or unordered list of items.",
  },
] as const;

// ── Indexes ──────────────────────────────────────────────────────────────

/** All registered schema.org types. */
export const SCHEMA_ORG_TYPES: readonly SchemaOrgTypeSpec[] = TYPES;

/** O(1) lookup by type ID. */
export const SCHEMA_ORG_TYPE_INDEX: ReadonlyMap<string, SchemaOrgTypeSpec> = new Map(
  TYPES.map((t) => [t.id, t]),
);

// ── Hierarchy helpers ───────────────────────────────────────────────────

/**
 * Get all valid properties for a type including inherited ones.
 * Walks up the parent chain collecting properties.
 */
export function getAllProperties(typeId: string): Set<string> {
  const result = new Set<string>();
  let current = SCHEMA_ORG_TYPE_INDEX.get(typeId);
  while (current) {
    for (const p of current.properties) result.add(p);
    current = current.parent ? SCHEMA_ORG_TYPE_INDEX.get(current.parent) : undefined;
  }
  return result;
}

/**
 * Check if typeId is a subtype of parentId (including self).
 */
export function isSubTypeOf(typeId: string, parentId: string): boolean {
  if (typeId === parentId) return true;
  let current = SCHEMA_ORG_TYPE_INDEX.get(typeId);
  while (current?.parent) {
    if (current.parent === parentId) return true;
    current = SCHEMA_ORG_TYPE_INDEX.get(current.parent);
  }
  return false;
}

/**
 * Get the UOR namespace mapping for a schema.org type.
 * Walks up the hierarchy until a mapping is found.
 */
export function getUorMapping(typeId: string): string | undefined {
  let current = SCHEMA_ORG_TYPE_INDEX.get(typeId);
  while (current) {
    if (current.uorMapping) return current.uorMapping;
    current = current.parent ? SCHEMA_ORG_TYPE_INDEX.get(current.parent) : undefined;
  }
  return undefined;
}

/**
 * Mapping from UOR namespaces to their primary schema.org type.
 * Used for reverse lookups: given a UOR operation, what schema.org type to emit.
 */
export const UOR_TO_SCHEMA_ORG: ReadonlyMap<string, string> = new Map(
  TYPES
    .filter((t) => t.uorMapping)
    .map((t) => [t.uorMapping!, t.id]),
);
