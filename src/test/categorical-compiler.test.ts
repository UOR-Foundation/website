/**
 * Categorical Quantum Circuit Compiler — Test Suite
 * ══════════════════════════════════════════════════
 */

import { describe, it, expect } from "vitest";
import {
  parseMorphisms,
  parseChain,
  decomposeMorphism,
  decomposeAll,
  optimizePrimitives,
  compile,
  compileFromPairs,
  compileFromChain,
} from "@/modules/atlas/categorical-compiler";
import {
  identityMorphism,
  findMorphism,
  dagger,
} from "@/modules/atlas/dagger-compact";
import { getAtlas, ATLAS_VERTEX_COUNT } from "@/modules/atlas/atlas";

/**
 * Helper: get a short BFS-reachable chain of vertices from vertex 0.
 */
function getReachableChain(start: number, length: number): number[] {
  const atlas = getAtlas();
  const chain = [start];
  const visited = new Set<number>([start]);
  for (let i = 0; i < length; i++) {
    const current = chain[chain.length - 1];
    const next = atlas.vertices[current].neighbors.find(n => !visited.has(n));
    if (next === undefined) break;
    chain.push(next);
    visited.add(next);
  }
  return chain;
}

/** Helper: find two connected vertices. */
function getNeighborPair(): [number, number] {
  const atlas = getAtlas();
  return [0, atlas.vertices[0].neighbors[0]];
}

// ══════════════════════════════════════════════════════════════════════════
// Part I: Parsing
// ══════════════════════════════════════════════════════════════════════════

describe("Parsing — vertex pairs to morphisms", () => {
  it("parses single neighbor pair", () => {
    const [a, b] = getNeighborPair();
    const morphisms = parseMorphisms([[a, b]]);
    expect(morphisms.length).toBe(1);
    expect(morphisms[0].source).toBe(a);
    expect(morphisms[0].target).toBe(b);
  });

  it("parses multiple neighbor pairs", () => {
    const atlas = getAtlas();
    const pairs: [number, number][] = [0, 1, 2].map(v => [v, atlas.vertices[v].neighbors[0]]);
    const morphisms = parseMorphisms(pairs);
    expect(morphisms.length).toBe(3);
  });

  it("parses a vertex chain via neighbors", () => {
    const chain = getReachableChain(0, 3);
    const morphisms = parseChain(chain);
    expect(morphisms.length).toBe(chain.length - 1);
  });

  it("identity morphism from same vertex", () => {
    const morphisms = parseMorphisms([[0, 0]]);
    expect(morphisms[0].length).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part II: Decomposition
// ══════════════════════════════════════════════════════════════════════════

describe("Decomposition — morphisms to categorical primitives", () => {
  it("identity morphism → identity primitive", () => {
    const m = identityMorphism(0);
    const dec = decomposeMorphism(m);
    expect(dec.primitiveCount).toBe(1);
    expect(dec.primitives[0].kind).toBe("identity");
    expect(dec.involvesDagger).toBe(false);
  });

  it("mirror pair morphism → teleportation (cup + dagger + cap)", () => {
    const v = 0;
    const tv = dagger(v);
    if (v === tv) return; // skip if self-dual
    const m = findMorphism(v, tv);
    if (!m) return; // not reachable
    const dec = decomposeMorphism(m);
    expect(dec.isTeleportation).toBe(true);
    expect(dec.involvesDagger).toBe(true);
    const kinds = dec.primitives.map(p => p.kind);
    expect(kinds).toContain("cup");
    expect(kinds).toContain("cap");
    expect(kinds).toContain("dagger");
  });

  it("multi-step morphism → compose + edges", () => {
    const chain = getReachableChain(0, 3);
    if (chain.length < 3) return;
    const m = findMorphism(chain[0], chain[chain.length - 1]);
    if (!m || m.length <= 1) return;
    const dec = decomposeMorphism(m);
    expect(dec.primitives.some(p => p.kind === "compose" || p.kind === "edge")).toBe(true);
    expect(dec.primitiveCount).toBeGreaterThan(1);
  });

  it("decomposeAll handles mixed morphisms", () => {
    const [a, b] = getNeighborPair();
    const morphisms = [
      identityMorphism(10),
      findMorphism(a, b)!,
    ];
    const decs = decomposeAll(morphisms);
    expect(decs.length).toBe(2);
    expect(decs[0].primitives[0].kind).toBe("identity");
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part III: Optimization
// ══════════════════════════════════════════════════════════════════════════

describe("Optimization — categorical identity elimination", () => {
  it("eliminates identity primitives", () => {
    const morphisms = [identityMorphism(0), identityMorphism(5)];
    const decs = decomposeAll(morphisms);
    const { optimized, idElims } = optimizePrimitives(decs);
    expect(idElims).toBe(2);
    expect(optimized.every(p => p.kind !== "identity")).toBe(true);
  });

  it("preserves non-trivial primitives", () => {
    const [a, b] = getNeighborPair();
    const m = findMorphism(a, b)!;
    const decs = decomposeAll([m]);
    const { optimized } = optimizePrimitives(decs);
    expect(optimized.length).toBeGreaterThan(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part IV: Full Compilation
// ══════════════════════════════════════════════════════════════════════════

describe("Full Compilation Pipeline", () => {
  it("compiles a single-edge morphism to Clifford+T", () => {
    const [a, b] = getNeighborPair();
    const morphisms = [findMorphism(a, b)!];
    const result = compile(morphisms, "clifford+t");
    expect(result.outputCircuit.length).toBeGreaterThan(0);
    expect(result.rewritePlan.allRewritten).toBe(true);
    expect(result.stats.inputMorphismCount).toBe(1);
  });

  it("compiles from vertex chain", () => {
    const chain = getReachableChain(0, 4);
    const result = compileFromChain(chain, "clifford+t");
    expect(result.stats.inputMorphismCount).toBe(chain.length - 1);
    expect(result.rewritePlan.allRewritten).toBe(true);
  });

  it("compiles to Pauli set", () => {
    const [a, b] = getNeighborPair();
    const result = compileFromPairs([[a, b]], "pauli");
    expect(result.rewritePlan.allRewritten).toBe(true);
    expect(result.targetGateSet).toBe("pauli");
  });

  it("compiles to Clifford set", () => {
    const [a, b] = getNeighborPair();
    const result = compileFromPairs([[a, b]], "clifford");
    expect(result.rewritePlan.allRewritten).toBe(true);
    expect(result.targetGateSet).toBe("clifford");
  });

  it("all output gates belong to target set (Clifford+T)", () => {
    const chain = getReachableChain(0, 5);
    const result = compileFromChain(chain, "clifford+t");
    const targetNames = new Set([
      "H", "S", "S†", "CNOT", "CZ", "T", "T†", "I", "X", "Y", "Z",
    ]);
    for (const gate of result.outputCircuit) {
      expect(targetNames.has(gate.gate.name)).toBe(true);
    }
  });

  it("compilation stats are consistent", () => {
    const chain = getReachableChain(0, 4);
    const result = compileFromChain(chain, "clifford+t");
    expect(result.stats.inputMorphismCount).toBe(chain.length - 1);
    expect(result.stats.totalPrimitives).toBeGreaterThanOrEqual(1);
    expect(result.stats.gatesAfter).toBe(result.outputCircuit.length);
  });

  it("mirror pair compilation involves daggers", () => {
    const v = 0;
    const tv = dagger(v);
    if (v === tv) return;
    const m = findMorphism(v, tv);
    if (!m) return;
    const result = compile([m], "clifford+t");
    expect(result.decomposition[0].involvesDagger).toBe(true);
  });

  it("prints summary", () => {
    const chain = getReachableChain(0, 3);
    const result = compileFromChain(chain, "clifford+t");
    expect(result.summary).toContain("Categorical Quantum Circuit Compiler");
    expect(result.summary).toContain("OUTPUT CIRCUIT");
    console.log("\n" + result.summary);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part V: Edge Cases
// ══════════════════════════════════════════════════════════════════════════

describe("Edge Cases", () => {
  it("single identity morphism compiles cleanly", () => {
    const result = compile([identityMorphism(42)], "clifford+t");
    expect(result.stats.identityEliminations).toBeGreaterThanOrEqual(1);
  });

  it("long neighbor chain compiles without error", () => {
    const chain = getReachableChain(0, 10);
    const result = compileFromChain(chain, "clifford+t");
    expect(result.stats.inputMorphismCount).toBe(chain.length - 1);
    expect(result.rewritePlan.allRewritten).toBe(true);
  });

  it("sample mirror pairs compile", () => {
    for (let v = 0; v < 5; v++) {
      const tv = dagger(v);
      if (v === tv) continue;
      const m = findMorphism(v, tv);
      if (!m) continue;
      const result = compile([m], "clifford+t");
      expect(result.rewritePlan.allRewritten).toBe(true);
    }
  });
});
