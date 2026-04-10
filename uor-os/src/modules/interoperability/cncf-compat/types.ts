/**
 * CNCF Compatibility — Types.
 * ═════════════════════════════════════════════════════════════════
 *
 * Type definitions for CNCF landscape interoperability.
 * Each type maps a CNCF standard to its UOR equivalent.
 *
 * @version 1.0.0
 */

// ── CNCF Landscape Categories ─────────────────────────────────────────────

/**
 * The official CNCF project categories, extracted from cncf.io/projects.
 * These are the exact labels used on the CNCF landscape.
 */
export type CncfCategory =
  | "Container Runtime"
  | "Scheduling & Orchestration"
  | "Coordination & Service Discovery"
  | "Cloud Native Network"
  | "Streaming & Messaging"
  | "Service Proxy"
  | "Cloud Native Storage"
  | "Application Definition & Image Build"
  | "Container Registry"
  | "Security & Compliance"
  | "Key Management"
  | "Observability"
  | "Continuous Integration & Delivery"
  | "Automation & Configuration"
  | "Service Mesh"
  | "Database"
  | "Chaos Engineering"
  | "API Gateway"
  | "Remote Procedure Call"
  | "ML Serving"
  | "Continuous Optimization"
  | "Feature Flagging"
  | "System Audit";

/**
 * Descriptor mapping a CNCF category to the UOR modules that implement it.
 */
export interface CncfCategoryDescriptor {
  /** CNCF category name (exact match). */
  category: CncfCategory;
  /** Short description. */
  description: string;
  /** UOR modules that cover this category. */
  uorModules: string[];
  /** Representative CNCF projects in this category. */
  cncfProjects: string[];
  /** Maturity: "graduated" | "incubating" | "sandbox" | "planned". */
  uorMaturity: "complete" | "partial" | "planned";
  /** Icon key for UI rendering. */
  iconKey: string;
}

// ── CloudEvents v1.0 ──────────────────────────────────────────────────────

/**
 * CloudEvents v1.0 envelope.
 * @see https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md
 */
export interface CloudEvent<T = unknown> {
  /** CloudEvents spec version — always "1.0". */
  specversion: "1.0";
  /** Event type (reverse DNS, e.g. "io.uor.compose.start"). */
  type: string;
  /** Event source URI. */
  source: string;
  /** Unique event ID. */
  id: string;
  /** Timestamp in RFC 3339 format. */
  time: string;
  /** Content type of the data field. */
  datacontenttype?: string;
  /** Schema URI for the data field. */
  dataschema?: string;
  /** Subject (optional context). */
  subject?: string;
  /** Event payload. */
  data?: T;
}

// ── OCI Distribution ──────────────────────────────────────────────────────

/**
 * OCI Image Manifest — minimal type for compatibility.
 * @see https://github.com/opencontainers/image-spec/blob/main/manifest.md
 */
export interface OciManifest {
  schemaVersion: 2;
  mediaType: "application/vnd.oci.image.manifest.v1+json";
  config: OciDescriptor;
  layers: OciDescriptor[];
  annotations?: Record<string, string>;
}

export interface OciDescriptor {
  mediaType: string;
  digest: string;
  size: number;
  annotations?: Record<string, string>;
}

// ── OTLP Trace ────────────────────────────────────────────────────────────

/**
 * Minimal OTLP-compatible span for trace export.
 * @see https://opentelemetry.io/docs/specs/otel/trace/api/
 */
export interface OtlpSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: "INTERNAL" | "SERVER" | "CLIENT" | "PRODUCER" | "CONSUMER";
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: Array<{ key: string; value: { stringValue?: string; intValue?: number } }>;
  status: { code: "OK" | "ERROR" | "UNSET"; message?: string };
}

// ── Pipeline (CI/CD) ──────────────────────────────────────────────────────

/**
 * UOR Pipeline step — a single build/test/deploy stage.
 * Maps to kernel::cascade::CascadeComposition.
 */
export interface PipelineStep {
  name: string;
  image: string;
  command: string[];
  env?: Record<string, string>;
  dependsOn?: string[];
  timeout?: number;
}

/**
 * UOR Pipeline — a CI/CD pipeline spec.
 * Equivalent to Argo Workflow or Tekton Pipeline.
 */
export interface UorPipeline {
  "@type": "uor:Pipeline";
  name: string;
  version: string;
  steps: PipelineStep[];
  triggers?: Array<{ event: string; filter?: string }>;
}

// ── Gateway / Ingress ─────────────────────────────────────────────────────

/**
 * Ingress route entry — maps external HTTP paths to bus operations.
 * Equivalent to Envoy VirtualHost or Kubernetes Ingress rules.
 */
export interface IngressRoute {
  /** HTTP path prefix. */
  path: string;
  /** HTTP methods allowed. */
  methods: Array<"GET" | "POST" | "PUT" | "DELETE" | "PATCH">;
  /** Target bus operation (namespace/operation). */
  busTarget: string;
  /** Rate limit (requests per second). */
  rateLimit?: number;
  /** Required authentication. */
  auth?: "none" | "token" | "certificate";
}

/**
 * Gateway configuration — the ingress routing table.
 */
export interface GatewayConfig {
  "@type": "uor:Gateway";
  name: string;
  routes: IngressRoute[];
  tls?: { certSecret: string; keySecret: string };
}
