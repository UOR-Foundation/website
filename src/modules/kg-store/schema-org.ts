/**
 * UOR Schema.org Extension — Semantic Web Surface.
 *
 * Converts UNS objects (records, functions, store objects) into
 * schema.org JSON-LD representations with UOR derivation attribution.
 *
 * Every output carries:
 *   - Dual @context (schema.org + UOR)
 *   - derivation:derivationId as schema:identifier
 *   - UOR partition properties as schema:additionalProperty
 *   - Epistemic grade (never above C without derivation ID)
 *
 * Also provides content negotiation (JSON-LD, Turtle, N-Triples)
 * and sitemap/robots.txt generation for LOD discoverability.
 *
 * @see GET /uns/schema-org/{canonicalId}
 * @see .well-known/uor.json
 */

// ── Constants ───────────────────────────────────────────────────────────────

const DUAL_CONTEXT = [
  "https://schema.org",
  "https://uor.foundation/contexts/uns-v1.jsonld",
] as const;

const DERIVATION_ID_PATTERN = /^urn:uor:derivation:sha256:[0-9a-f]{64}$/;

// ── Helpers ─────────────────────────────────────────────────────────────────

function epistemicGrade(derivationId?: string): "A" | "C" | "D" {
  if (derivationId && DERIVATION_ID_PATTERN.test(derivationId)) return "A";
  return "C";
}

function makeIdentifier(derivationId: string) {
  return {
    "@type": "schema:PropertyValue",
    "schema:propertyID": "derivation:derivationId",
    "schema:value": derivationId,
  };
}

function makeAdditionalProperty(propertyID: string, value: unknown) {
  return {
    "@type": "schema:PropertyValue",
    "schema:propertyID": propertyID,
    "schema:value": value,
  };
}

// ── Minimal type interfaces (avoids circular imports) ───────────────────────

export interface SchemaOrgRecord {
  "uns:name"?: string;
  "uns:canonicalId"?: string;
  "u:canonicalId"?: string;
  "u:ipv6"?: string;
  "derivation:derivationId"?: string;
  "partition:density"?: number;
  [key: string]: unknown;
}

export interface SchemaOrgFunction {
  canonicalId: string;
  name?: string;
  sourceHash?: string;
  deployedAt?: string;
  [key: string]: unknown;
}

export interface SchemaOrgStoredObject {
  canonicalId: string;
  cid?: string;
  byteLength?: number;
  createdAt?: string;
  [key: string]: unknown;
}

// ── Converters ──────────────────────────────────────────────────────────────

/**
 * Convert a UNS Name Record → schema.org JSON-LD (schema:WebSite).
 */
export function recordToSchemaOrg(record: SchemaOrgRecord): object {
  const canonicalId =
    record["uns:canonicalId"] || record["u:canonicalId"] || "";
  const derivationId =
    record["derivation:derivationId"] || canonicalId;
  const ipv6 = record["u:ipv6"] || "";

  const identifiers = [makeIdentifier(derivationId)];

  const additionalProperties: object[] = [];
  if (record["partition:density"] !== undefined) {
    additionalProperties.push(
      makeAdditionalProperty("partition:density", record["partition:density"])
    );
  }

  return {
    "@context": DUAL_CONTEXT,
    "@type": "schema:WebSite",
    "schema:name": record["uns:name"] ?? "UNS Name Record",
    "schema:url": ipv6 ? `[${ipv6}]` : undefined,
    "schema:identifier": identifiers,
    "schema:additionalProperty": additionalProperties,
    epistemic_grade: epistemicGrade(derivationId),
    "uor:canonicalId": canonicalId,
  };
}

/**
 * Convert a UNS Compute function → schema:SoftwareApplication.
 */
export function functionToSchemaOrg(fn: SchemaOrgFunction): object {
  const derivationId = fn.canonicalId;

  return {
    "@context": DUAL_CONTEXT,
    "@type": "schema:SoftwareApplication",
    "schema:name": fn.name ?? "UNS Compute Function",
    "schema:identifier": [makeIdentifier(derivationId)],
    "schema:applicationCategory": "Computation",
    "schema:datePublished": fn.deployedAt,
    epistemic_grade: epistemicGrade(derivationId),
    "uor:canonicalId": fn.canonicalId,
  };
}

/**
 * Convert a UNS Store object → schema:Dataset or schema:CreativeWork.
 *
 * JSON content → Dataset; everything else → CreativeWork.
 */
export function objectToSchemaOrg(
  obj: SchemaOrgStoredObject,
  contentType: string
): object {
  const isJson =
    contentType.includes("json") || contentType.includes("ld+json");
  const schemaType = isJson ? "schema:Dataset" : "schema:CreativeWork";
  const derivationId = obj.canonicalId;

  return {
    "@context": DUAL_CONTEXT,
    "@type": schemaType,
    "schema:identifier": [makeIdentifier(derivationId)],
    "schema:encodingFormat": contentType,
    "schema:contentSize": obj.byteLength
      ? `${obj.byteLength} bytes`
      : undefined,
    "schema:dateCreated": obj.createdAt,
    epistemic_grade: epistemicGrade(derivationId),
    "uor:canonicalId": obj.canonicalId,
  };
}

/**
 * Generate schema:Organization for the UNS node operator.
 */
export function nodeToSchemaOrg(
  nodeCanonicalId: string,
  nodeName: string
): object {
  return {
    "@context": DUAL_CONTEXT,
    "@type": "schema:Organization",
    "schema:name": nodeName,
    "schema:identifier": [makeIdentifier(nodeCanonicalId)],
    epistemic_grade: epistemicGrade(nodeCanonicalId),
    "uor:canonicalId": nodeCanonicalId,
  };
}

// ── Content Negotiation ─────────────────────────────────────────────────────

export type SerializationFormat = "json-ld" | "turtle" | "n-triples";

/**
 * Determine serialization format from Accept header.
 */
export function negotiateFormat(accept?: string): SerializationFormat {
  if (!accept) return "json-ld";
  if (accept.includes("text/turtle")) return "turtle";
  if (accept.includes("application/n-triples")) return "n-triples";
  return "json-ld";
}

/**
 * Serialize a schema.org JSON-LD object to the requested format.
 *
 * - json-ld: returns JSON string
 * - turtle: returns simplified Turtle serialization
 * - n-triples: returns N-Triples serialization
 */
export function serializeSchemaOrg(
  obj: Record<string, unknown>,
  format: SerializationFormat
): { body: string; contentType: string } {
  if (format === "json-ld") {
    return {
      body: JSON.stringify(obj, null, 2),
      contentType: "application/ld+json",
    };
  }

  // Simplified Turtle/N-Triples from JSON-LD structure
  const id = (obj["uor:canonicalId"] as string) || "_:b0";
  const type = obj["@type"] as string;
  const triples: string[] = [];

  triples.push(`<${id}> a <https://schema.org/${type.replace("schema:", "")}> .`);

  const identifiers = obj["schema:identifier"] as Array<Record<string, unknown>> | undefined;
  if (identifiers) {
    for (const ident of identifiers) {
      const propId = ident["schema:propertyID"] as string;
      const val = ident["schema:value"] as string;
      triples.push(
        `<${id}> <https://schema.org/identifier> "${val}"^^<${propId}> .`
      );
    }
  }

  if (obj["schema:name"]) {
    triples.push(
      `<${id}> <https://schema.org/name> "${obj["schema:name"]}" .`
    );
  }

  const body = triples.join("\n");

  if (format === "turtle") {
    return { body, contentType: "text/turtle" };
  }
  return { body, contentType: "application/n-triples" };
}

// ── Sitemap Generation ──────────────────────────────────────────────────────

export interface SitemapEntry {
  canonicalId: string;
  ipv6?: string;
}

/**
 * Generate an XML sitemap for all UNS name records.
 * Content-addressed URLs use changefreq=never (immutable).
 */
export function generateSitemap(
  entries: SitemapEntry[],
  baseUrl: string = "https://uor.foundation"
): string {
  const urls = entries
    .map((e) => {
      const loc = e.ipv6
        ? `${baseUrl}/uns/schema-org/${encodeURIComponent(e.canonicalId)}`
        : `${baseUrl}/uns/schema-org/${encodeURIComponent(e.canonicalId)}`;
      return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>never</changefreq>\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

/**
 * Generate robots.txt with sitemap directive.
 */
export function generateRobotsTxt(
  baseUrl: string = "https://uor.foundation"
): string {
  return [
    "User-agent: *",
    "Allow: /uns/schema-org/",
    `Sitemap: ${baseUrl}/uns/graph/sitemap.xml`,
    "",
  ].join("\n");
}
