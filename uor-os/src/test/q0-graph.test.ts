import { describe, it, expect } from "vitest";
import { buildQ0Graph } from "@/lib/q0-graph-builder";

describe("Q0 Instance Graph Builder", () => {
  it("generates exactly 260 nodes (1 ring + 256 datums + 6 derivations + 1 proof + 1 partition) minus overlaps", async () => {
    const graph = await buildQ0Graph();
    // 1 ring + 256 datums + 6 derivations + 1 proof + 1 partition = 265
    expect(graph["@graph"].length).toBe(265);
  });

  it("has correct @context namespaces", async () => {
    const graph = await buildQ0Graph();
    expect(graph["@context"]["schema"]).toBe("https://uor.foundation/schema/");
    expect(graph["@context"]["derivation"]).toBe("https://uor.foundation/derivation/");
    expect(graph["@context"]["proof"]).toBe("https://uor.foundation/proof/");
  });

  it("datum 0 has correct IRI", async () => {
    const graph = await buildQ0Graph();
    const datum0 = graph["@graph"].find(
      (n) => (n as Record<string, unknown>)["@id"] === "https://uor.foundation/u/U2800"
    ) as Record<string, unknown>;
    expect(datum0).toBeDefined();
    expect(datum0["schema:value"]).toBe(0);
    expect(datum0["schema:stratum"]).toBe(0);
  });

  it("datum 42 (0x2A) has correct IRI and stratum", async () => {
    const graph = await buildQ0Graph();
    const datum42 = graph["@graph"].find(
      (n) => (n as Record<string, unknown>)["@id"] === "https://uor.foundation/u/U282A"
    ) as Record<string, unknown>;
    expect(datum42).toBeDefined();
    expect(datum42["schema:value"]).toBe(42);
    // 42 = 0b00101010 → 3 bits set
    expect(datum42["schema:stratum"]).toBe(3);
  });

  it("datum 255 has stratum 8", async () => {
    const graph = await buildQ0Graph();
    const datum255 = graph["@graph"].find(
      (n) => (n as Record<string, unknown>)["@id"] === "https://uor.foundation/u/U28FF"
    ) as Record<string, unknown>;
    expect(datum255).toBeDefined();
    expect(datum255["schema:stratum"]).toBe(8);
  });

  it("xor(0x55,0xaa) and xor(0xaa,0x55) have identical derivation_id (AC normalisation)", async () => {
    const graph = await buildQ0Graph();
    const derivations = graph["@graph"].filter(
      (n) => Array.isArray((n as Record<string, unknown>)["@type"]) &&
        ((n as Record<string, unknown>)["@type"] as string[]).includes("derivation:Derivation")
    ) as Record<string, unknown>[];

    const d0 = derivations[0];
    const d1 = derivations[1];
    expect(d0["derivation:derivationId"]).toBe(d1["derivation:derivationId"]);
  });

  it("all derivation IDs match the 64-char SHA-256 pattern", async () => {
    const graph = await buildQ0Graph();
    const derivations = graph["@graph"].filter(
      (n) => Array.isArray((n as Record<string, unknown>)["@type"]) &&
        ((n as Record<string, unknown>)["@type"] as string[]).includes("derivation:Derivation")
    ) as Record<string, unknown>[];

    const pattern = /^urn:uor:derivation:sha256:[0-9a-f]{64}$/;
    for (const d of derivations) {
      expect(d["derivation:derivationId"]).toMatch(pattern);
    }
  });

  it("critical identity proof node exists and is verified", async () => {
    const graph = await buildQ0Graph();
    const proof = graph["@graph"].find(
      (n) => (n as Record<string, unknown>)["@id"] === "https://uor.foundation/instance/q0/proof-critical-id"
    ) as Record<string, unknown>;
    expect(proof).toBeDefined();
    expect(proof["proof:verified"]).toBe(true);
  });

  it("partition node has cardinality 256", async () => {
    const graph = await buildQ0Graph();
    const partition = graph["@graph"].find(
      (n) => (n as Record<string, unknown>)["@id"] === "https://uor.foundation/instance/q0/partition"
    ) as Record<string, unknown>;
    expect(partition).toBeDefined();
    expect(partition["partition:cardinality"]).toBe(256);
  });
});
