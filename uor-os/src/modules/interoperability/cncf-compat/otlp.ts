/**
 * CNCF Compatibility — OpenTelemetry (OTLP) Trace Adapter.
 * ═════════════════════════════════════════════════════════════════
 *
 * Converts SystemEventBus events into OTLP-compatible spans.
 * Enables trace export to Jaeger, Grafana, Datadog, etc.
 *
 * @see https://opentelemetry.io/docs/specs/otel/trace/api/
 * @version 1.0.0
 */

import type { OtlpSpan } from "./types";

let _spanCounter = 0;

/** Generate a 32-char hex trace ID. */
function generateTraceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Generate a 16-char hex span ID. */
function generateSpanId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Create an OTLP span from a system operation.
 */
export function createSpan(opts: {
  name: string;
  kind?: OtlpSpan["kind"];
  traceId?: string;
  parentSpanId?: string;
  attributes?: Record<string, string | number>;
  durationMs?: number;
}): OtlpSpan {
  const traceId = opts.traceId ?? generateTraceId();
  const spanId = generateSpanId();
  const startNs = BigInt(Date.now()) * 1_000_000n;
  const durationNs = BigInt(opts.durationMs ?? 0) * 1_000_000n;

  const attributes = Object.entries(opts.attributes ?? {}).map(([key, value]) => ({
    key,
    value: typeof value === "number" ? { intValue: value } : { stringValue: value },
  }));

  return {
    traceId,
    spanId,
    parentSpanId: opts.parentSpanId,
    name: opts.name,
    kind: opts.kind ?? "INTERNAL",
    startTimeUnixNano: startNs.toString(),
    endTimeUnixNano: (startNs + durationNs).toString(),
    attributes,
    status: { code: "OK" },
  };
}

/**
 * Batch spans into OTLP JSON export format.
 */
export function batchSpans(spans: OtlpSpan[]): {
  resourceSpans: Array<{
    resource: { attributes: Array<{ key: string; value: { stringValue: string } }> };
    scopeSpans: Array<{ scope: { name: string; version: string }; spans: OtlpSpan[] }>;
  }>;
} {
  return {
    resourceSpans: [
      {
        resource: {
          attributes: [
            { key: "service.name", value: { stringValue: "uor-os" } },
            { key: "service.version", value: { stringValue: "3.0.0" } },
          ],
        },
        scopeSpans: [
          {
            scope: { name: "uor-instrumentation", version: "1.0.0" },
            spans,
          },
        ],
      },
    ],
  };
}
