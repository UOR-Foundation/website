/**
 * CNCF Compatibility — CloudEvents v1.0 Adapter.
 * ═════════════════════════════════════════════════════════════════
 *
 * Wraps any SystemEvent or ComposeEvent into a CloudEvents v1.0 envelope.
 * This makes every event the system emits consumable by any CNCF tool.
 *
 * @see https://cloudevents.io/
 * @version 1.0.0
 */

import type { CloudEvent } from "./types";

let _idCounter = 0;

/**
 * Wrap an arbitrary payload into a CloudEvents v1.0 envelope.
 *
 * @param type   Event type (reverse DNS, e.g. "io.uor.container.start")
 * @param source Event source URI (e.g. "/modules/compose/orchestrator")
 * @param data   Event payload
 * @param opts   Optional overrides (subject, datacontenttype, etc.)
 */
export function toCloudEvent<T = unknown>(
  type: string,
  source: string,
  data: T,
  opts?: Partial<Pick<CloudEvent, "subject" | "datacontenttype" | "dataschema">>,
): CloudEvent<T> {
  return {
    specversion: "1.0",
    type,
    source,
    id: `uor-${Date.now()}-${++_idCounter}`,
    time: new Date().toISOString(),
    datacontenttype: opts?.datacontenttype ?? "application/json",
    dataschema: opts?.dataschema,
    subject: opts?.subject,
    data,
  };
}

/**
 * Parse a JSON string into a typed CloudEvent.
 * Throws if the envelope doesn't match CloudEvents v1.0.
 */
export function parseCloudEvent<T = unknown>(json: string): CloudEvent<T> {
  const parsed = JSON.parse(json);
  if (parsed.specversion !== "1.0") {
    throw new Error(`Unsupported CloudEvents specversion: ${parsed.specversion}`);
  }
  if (!parsed.type || !parsed.source || !parsed.id) {
    throw new Error("Invalid CloudEvent: missing required fields (type, source, id)");
  }
  return parsed as CloudEvent<T>;
}

/**
 * Serialize a CloudEvent to JSON string.
 */
export function serializeCloudEvent<T>(event: CloudEvent<T>): string {
  return JSON.stringify(event);
}
