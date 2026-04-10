/**
 * CNCF Compatibility Module — Barrel Export.
 * ═════════════════════════════════════════════════════════════════
 *
 * Thin adapter layer that makes UOR's existing capabilities speak
 * CNCF-standard wire formats. No architectural changes — just
 * serialization adapters for interoperability.
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │  CNCF Standard          │  UOR Adapter                      │
 * │─────────────────────────│────────────────────────────────────│
 * │  CloudEvents v1.0       │  cloudevents.ts                    │
 * │  OpenTelemetry (OTLP)   │  otlp.ts                          │
 * │  Argo / Tekton Pipeline │  pipeline.ts                      │
 * │  Envoy / Ingress        │  gateway.ts                       │
 * │  CNCF Landscape Map     │  categories.ts                    │
 * └──────────────────────────────────────────────────────────────┘
 *
 * @version 1.0.0
 */

// ── CloudEvents (Streaming & Messaging) ───────────────────────────────────
export { toCloudEvent, parseCloudEvent, serializeCloudEvent } from "./cloudevents";

// ── OpenTelemetry (Observability) ─────────────────────────────────────────
export { createSpan, batchSpans } from "./otlp";

// ── Pipeline (Continuous Integration & Delivery) ──────────────────────────
export { createPipeline, executePipeline } from "./pipeline";
export type { PipelineRun, PipelineStepResult, PipelineStepStatus } from "./pipeline";

// ── Gateway (API Gateway) ─────────────────────────────────────────────────
export { createGateway, resolveRoute, listGateways, removeGateway, clearGateways } from "./gateway";

// ── Category Registry ─────────────────────────────────────────────────────
export { CNCF_CATEGORIES, getCncfCategory, getCncfCategoriesByMaturity } from "./categories";

// ── Types ─────────────────────────────────────────────────────────────────
export type {
  CncfCategory,
  CncfCategoryDescriptor,
  CloudEvent,
  OciManifest,
  OciDescriptor,
  OtlpSpan,
  UorPipeline,
  PipelineStep,
  IngressRoute,
  GatewayConfig,
} from "./types";
