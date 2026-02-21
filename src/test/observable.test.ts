/**
 * Tests for the UOR Observable Module (observable: namespace).
 */

import { describe, it, expect } from "vitest";
import { recordObservable, queryObservables } from "@/modules/observable";

describe("observable module", () => {
  it("recordObservable creates content-addressed observable IRI", async () => {
    const obs = await recordObservable(42.5, "sensor:temp-001", 0, 3);

    expect(obs["@type"]).toBe("observable:Observable");
    expect(obs.observableIri).toMatch(/^urn:uor:observable:/);
    expect(obs.value).toBe(42.5);
    expect(obs.source).toBe("sensor:temp-001");
    expect(obs.stratum).toBe(3);
    expect(obs.quantum).toBe(0);
  });

  it("observable IRI is content-addressed (different values → different IRIs)", async () => {
    const o1 = await recordObservable(1, "src-a", 0);
    const o2 = await recordObservable(2, "src-a", 0);
    expect(o1.observableIri).not.toBe(o2.observableIri);
  });

  it("supports optional contextId", async () => {
    const obs = await recordObservable(100, "ctx-test", 0, 0, "urn:uor:context:abc");
    expect(obs.contextId).toBe("urn:uor:context:abc");
  });

  it("defaults contextId to null", async () => {
    const obs = await recordObservable(100, "ctx-test", 0);
    expect(obs.contextId).toBeNull();
  });
});
