import { describe, it, expect } from "vitest";
import { analyzeTypeScript } from "@/modules/code-kg/analyzer";
import { ingestCodeGraph } from "@/modules/code-kg/bridge";
import { buildVisualization } from "@/modules/code-kg/visualizer";
import { Q0 } from "@/modules/ring-core/ring";

const SAMPLE = `
interface Foo {
  bar: string;
}

class MyClass extends Object {
  doStuff(): void {}
}

function helper(x: number): number {
  return x + 1;
}

const MAX = 100;

export { MyClass, helper };
`;

describe("code-kg analyzer", () => {
  it("extracts entities with correct types", async () => {
    const result = await analyzeTypeScript(SAMPLE);
    const names = result.entities.map((e) => e.name);
    expect(names).toContain("Foo");
    expect(names).toContain("MyClass");
    expect(names).toContain("helper");
    expect(names).toContain("MAX");

    const foo = result.entities.find((e) => e.name === "Foo");
    expect(foo?.type).toBe("interface");

    const cls = result.entities.find((e) => e.name === "MyClass");
    expect(cls?.type).toBe("class");
  });

  it("extracts extends relation", async () => {
    const result = await analyzeTypeScript(SAMPLE);
    const ext = result.relations.find((r) => r.type === "extends");
    expect(ext).toBeDefined();
    expect(ext!.source).toBe("MyClass");
    expect(ext!.target).toBe("Object");
  });

  it("extracts export relations", async () => {
    const codeWithExport = `export class Foo {}\nexport function bar() {}`;
    const result = await analyzeTypeScript(codeWithExport);
    const exports = result.relations.filter((r) => r.type === "exports");
    expect(exports.length).toBeGreaterThanOrEqual(1);
  });

  it("produces unique hashes per entity", async () => {
    const result = await analyzeTypeScript(SAMPLE);
    const hashes = result.entities.map((e) => e.hash);
    expect(new Set(hashes).size).toBe(hashes.length);
  });
});

describe("code-kg bridge", () => {
  it("derives UOR identity for each entity", async () => {
    const ring = Q0();
    const analysis = await analyzeTypeScript(SAMPLE);
    const result = await ingestCodeGraph(ring, analysis);

    expect(result.derivedEntities.length).toBe(analysis.entities.length);
    for (const de of result.derivedEntities) {
      expect(de.iri).toMatch(/^https:\/\/uor\.foundation\//);
      expect(de.derivation.epistemicGrade).toBe("A");
      expect(de.derivation.derivationId).toMatch(/^urn:uor:derivation:sha256:/);
    }
  });

  it("produces valid JSON-LD document", async () => {
    const ring = Q0();
    const analysis = await analyzeTypeScript(SAMPLE);
    const result = await ingestCodeGraph(ring, analysis);

    expect(result.document["@context"]).toBeDefined();
    expect(result.document["@graph"].length).toBeGreaterThan(0);
  });
});

describe("code-kg visualizer", () => {
  it("produces nodes and edges for visualization", async () => {
    const ring = Q0();
    const analysis = await analyzeTypeScript(SAMPLE);
    const result = await ingestCodeGraph(ring, analysis);
    const viz = buildVisualization(result);

    expect(viz.nodes.length).toBe(result.derivedEntities.length);
    expect(viz.width).toBeGreaterThan(0);
    for (const node of viz.nodes) {
      expect(node.iri).toMatch(/^https:\/\/uor\.foundation\//);
      expect(node.grade).toBe("A");
    }
  });
});
