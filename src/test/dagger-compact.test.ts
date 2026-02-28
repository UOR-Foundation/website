/**
 * Dagger-Compact Category — Axiom Verification Test Suite
 * ═══════════════════════════════════════════════════════
 *
 * Maps Bergholm-Biamonte QC category structure onto Atlas:
 *   - Dagger functor = τ-mirror involution
 *   - Cup/Cap = Bell states from 48 mirror pairs
 *   - Snake equations = zigzag identities
 */

import { describe, it, expect } from "vitest";
import {
  dagger,
  daggerMorphism,
  composeMorphisms,
  identityMorphism,
  findMorphism,
  constructCups,
  constructCaps,
  verifySnakeEquation,
  verifyDaggerCompact,
  analyzeBellStates,
} from "@/modules/atlas/dagger-compact";
import { getAtlas, ATLAS_VERTEX_COUNT } from "@/modules/atlas/atlas";

// ══════════════════════════════════════════════════════════════════════════
// Part I: Dagger Functor — τ-Mirror Involution
// ══════════════════════════════════════════════════════════════════════════

describe("Dagger Functor — Involutivity", () => {
  it("τ² = id for all 96 vertices", () => {
    for (let i = 0; i < ATLAS_VERTEX_COUNT; i++) {
      expect(dagger(dagger(i))).toBe(i);
    }
  });

  it("τ(v) ≠ v for all vertices (no fixed points)", () => {
    for (let i = 0; i < ATLAS_VERTEX_COUNT; i++) {
      expect(dagger(i)).not.toBe(i);
    }
  });

  it("τ maps to valid vertex indices", () => {
    for (let i = 0; i < ATLAS_VERTEX_COUNT; i++) {
      const d = dagger(i);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThan(ATLAS_VERTEX_COUNT);
    }
  });
});

describe("Dagger Functor — Contravariance", () => {
  it("(g∘f)† = f†∘g† for edge morphisms", () => {
    const atlas = getAtlas();
    let tested = 0;

    for (const v of atlas.vertices) {
      for (const n1 of v.neighbors) {
        for (const n2 of atlas.vertices[n1].neighbors) {
          if (n2 === v.index) continue;

          const f = { source: v.index, target: n1, path: [v.index, n1], length: 1 };
          const g = { source: n1, target: n2, path: [n1, n2], length: 1 };

          const gf = composeMorphisms(f, g)!;
          const gfDagger = daggerMorphism(gf);

          const fDagger = daggerMorphism(f);
          const gDagger = daggerMorphism(g);
          const fDaggerGDagger = composeMorphisms(gDagger, fDagger)!;

          expect(gfDagger.source).toBe(fDaggerGDagger.source);
          expect(gfDagger.target).toBe(fDaggerGDagger.target);

          tested++;
          if (tested >= 100) return;
        }
      }
    }
    expect(tested).toBeGreaterThan(0);
  });

  it("dagger of identity is identity", () => {
    for (let i = 0; i < ATLAS_VERTEX_COUNT; i++) {
      const id = identityMorphism(i);
      const idDagger = daggerMorphism(id);
      expect(idDagger.source).toBe(dagger(i));
      expect(idDagger.target).toBe(dagger(i));
      expect(idDagger.length).toBe(0);
    }
  });

  it("dagger reverses morphism direction", () => {
    // Use a known edge: vertex 0 and its first neighbor
    const atlas = getAtlas();
    const neighbor = atlas.vertices[0].neighbors[0];
    const m = findMorphism(0, neighbor);
    expect(m).not.toBeNull();
    const md = daggerMorphism(m!);
    expect(md.source).toBe(dagger(m!.target));
    expect(md.target).toBe(dagger(m!.source));
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part II: Compact Structure — Cup/Cap (Bell States)
// ══════════════════════════════════════════════════════════════════════════

describe("Compact Structure — Cup Morphisms", () => {
  it("48 cup morphisms (one per mirror pair)", () => {
    const cups = constructCups();
    expect(cups.length).toBe(48);
  });

  it("cup.dual = τ(cup.object) for all cups", () => {
    const cups = constructCups();
    for (const cup of cups) {
      expect(cup.dual).toBe(dagger(cup.object));
    }
  });

  it("cups cover all 96 vertices", () => {
    const cups = constructCups();
    const covered = new Set<number>();
    for (const cup of cups) {
      covered.add(cup.object);
      covered.add(cup.dual);
    }
    expect(covered.size).toBe(ATLAS_VERTEX_COUNT);
  });

  it("no cup is self-paired (v ≠ τ(v))", () => {
    const cups = constructCups();
    for (const cup of cups) {
      expect(cup.object).not.toBe(cup.dual);
    }
  });
});

describe("Compact Structure — Cap Morphisms", () => {
  it("48 cap morphisms matching cups", () => {
    const caps = constructCaps();
    expect(caps.length).toBe(48);
  });

  it("cap structure mirrors cup structure", () => {
    const cups = constructCups();
    const caps = constructCaps();
    for (let i = 0; i < cups.length; i++) {
      expect(caps[i].object).toBe(cups[i].object);
      expect(caps[i].dual).toBe(cups[i].dual);
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part III: Snake Equations (Zigzag Identities)
// ══════════════════════════════════════════════════════════════════════════

describe("Snake Equations", () => {
  it("left snake holds for all 96 objects", () => {
    for (let i = 0; i < ATLAS_VERTEX_COUNT; i++) {
      const result = verifySnakeEquation(i);
      expect(result.leftSnakeHolds, `Left snake failed for vertex ${i}`).toBe(true);
    }
  });

  it("right snake holds for all 96 objects", () => {
    for (let i = 0; i < ATLAS_VERTEX_COUNT; i++) {
      const result = verifySnakeEquation(i);
      expect(result.rightSnakeHolds, `Right snake failed for vertex ${i}`).toBe(true);
    }
  });

  it("dual is correct in snake results", () => {
    for (let i = 0; i < ATLAS_VERTEX_COUNT; i++) {
      const result = verifySnakeEquation(i);
      expect(result.dual).toBe(dagger(i));
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part IV: Full Dagger-Compact Verification
// ══════════════════════════════════════════════════════════════════════════

describe("Full Dagger-Compact Verification", () => {
  const report = verifyDaggerCompact();

  it("Atlas IS a dagger-compact category", () => {
    expect(report.isDaggerCompact).toBe(true);
  });

  it("dagger is involutive", () => {
    expect(report.daggerInvolutive).toBe(true);
  });

  it("dagger is contravariant", () => {
    expect(report.daggerContravariant).toBe(true);
  });

  it("all objects have duals", () => {
    expect(report.allObjectsHaveDuals).toBe(true);
  });

  it("48 mirror pairs → 48 cups, 48 caps", () => {
    expect(report.mirrorPairCount).toBe(48);
    expect(report.cups.length).toBe(48);
    expect(report.caps.length).toBe(48);
  });

  it("all snake equations hold", () => {
    expect(report.allSnakesHold).toBe(true);
    expect(report.snakeResults.length).toBe(ATLAS_VERTEX_COUNT);
  });

  it("prints summary", () => {
    console.log("\n" + report.summary);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part V: Bell State Analysis
// ══════════════════════════════════════════════════════════════════════════

describe("Bell State Analysis", () => {
  const analysis = analyzeBellStates();

  it("48 Bell states", () => {
    expect(analysis.totalBellStates).toBe(48);
  });

  it("mirror pairs are never adjacent (τ-axiom)", () => {
    // Mirror pairs must not be neighbors — verified by Atlas construction
    const atlas = getAtlas();
    for (const [v, tv] of atlas.mirrorPairs()) {
      expect(atlas.vertices[v].neighbors.includes(tv)).toBe(false);
    }
  });

  it("sign class distribution covers all pairs", () => {
    let total = 0;
    for (const count of analysis.signClassDistribution.values()) {
      total += count;
    }
    expect(total).toBe(48);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part VI: Morphism Composition
// ══════════════════════════════════════════════════════════════════════════

describe("Morphism Infrastructure", () => {
  it("identity morphism composes correctly", () => {
    const id = identityMorphism(42);
    const m = findMorphism(42, 43);
    if (m) {
      const composed = composeMorphisms(id, m);
      expect(composed).not.toBeNull();
      expect(composed!.source).toBe(42);
      expect(composed!.target).toBe(43);
    }
  });

  it("BFS finds paths between connected vertices", () => {
    // Use a vertex and a known reachable target (neighbor's neighbor)
    const atlas = getAtlas();
    const v0 = 0;
    const n1 = atlas.vertices[v0].neighbors[0];
    const n2 = atlas.vertices[n1].neighbors.find(n => n !== v0)!;
    const m = findMorphism(v0, n2);
    expect(m).not.toBeNull();
    expect(m!.source).toBe(v0);
    expect(m!.target).toBe(n2);
    expect(m!.length).toBe(2);
  });

  it("composition requires matching endpoints", () => {
    const f = { source: 0, target: 1, path: [0, 1], length: 1 };
    const g = { source: 5, target: 6, path: [5, 6], length: 1 };
    expect(composeMorphisms(f, g)).toBeNull();
  });
});
