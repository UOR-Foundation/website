/**
 * Fano Plane — Quantum Gate Routing Topology Test Suite
 * ═════════════════════════════════════════════════════
 *
 * Verifies PG(2,2) as the octonionic multiplication graph and
 * its role as a qubit interaction topology for 3-qubit gates.
 */

import { describe, it, expect } from "vitest";
import {
  constructFanoTopology,
  computeInteractions,
  computeGateRoutes,
  connectToAtlas,
  runFanoPlaneAnalysis,
  FANO_AUTOMORPHISM_ORDER,
  FANO_ORDER,
  FANO_INCIDENCE,
  type FanoTopology,
} from "@/modules/atlas/fano-plane";

// ══════════════════════════════════════════════════════════════════════════
// Part I: PG(2,2) Axioms
// ══════════════════════════════════════════════════════════════════════════

describe("Fano Plane — Projective Plane Axioms", () => {
  let topo: FanoTopology;

  it("constructs topology", () => {
    topo = constructFanoTopology();
    expect(topo).toBeDefined();
  });

  it("has 7 points and 7 lines", () => {
    expect(topo.points.length).toBe(FANO_ORDER);
    expect(topo.lines.length).toBe(FANO_ORDER);
  });

  it("each line passes through exactly 3 points", () => {
    for (const line of topo.lines) {
      expect(line.points.length).toBe(FANO_INCIDENCE);
    }
  });

  it("each point lies on exactly 3 lines", () => {
    for (const point of topo.points) {
      expect(point.degree).toBe(FANO_INCIDENCE);
    }
  });

  it("any 2 points determine exactly 1 line (projective axiom)", () => {
    for (let a = 0; a < 7; a++) {
      for (let b = a + 1; b < 7; b++) {
        const shared = topo.lines.filter(l =>
          l.points.includes(a) && l.points.includes(b)
        );
        expect(shared.length).toBe(1);
      }
    }
  });

  it("every pair is collinear (0 non-collinear complements)", () => {
    for (const p of topo.points) {
      expect(p.complementPoints.length).toBe(0);
    }
  });

  it("incidence matrix has row/column sums = 3", () => {
    for (const row of topo.incidenceMatrix) {
      expect(row.reduce((s, v) => s + v, 0)).toBe(3);
    }
    for (let j = 0; j < 7; j++) {
      expect(topo.incidenceMatrix.reduce((s, row) => s + row[j], 0)).toBe(3);
    }
  });

  it("collinearity matrix is symmetric", () => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        expect(topo.collinearityMatrix[i][j]).toBe(topo.collinearityMatrix[j][i]);
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part II: Automorphism Group
// ══════════════════════════════════════════════════════════════════════════

describe("Fano Plane — Automorphism Group", () => {
  it("|Aut(PG(2,2))| = 168 = |GL(3,𝔽₂)| = |PSL(2,7)|", () => {
    const topo = constructFanoTopology();
    expect(topo.verifiedAutomorphisms).toBe(FANO_AUTOMORPHISM_ORDER);
    expect(topo.verifiedAutomorphisms).toBe(168);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part III: Octonionic Multiplication Table
// ══════════════════════════════════════════════════════════════════════════

describe("Fano Plane — Octonion Multiplication", () => {
  let topo: FanoTopology;

  it("builds multiplication table", () => {
    topo = constructFanoTopology();
    expect(topo.multiplicationTable.length).toBe(7);
  });

  it("eᵢ² = -1 for all imaginary units", () => {
    for (let i = 0; i < 7; i++) {
      expect(topo.multiplicationTable[i][i].index).toBe(-1);
      expect(topo.multiplicationTable[i][i].sign).toBe(-1);
    }
  });

  it("anti-commutativity: eᵢeⱼ = -eⱼeᵢ", () => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (i === j) continue;
        const ij = topo.multiplicationTable[i][j];
        const ji = topo.multiplicationTable[j][i];
        expect(ij.index).toBe(ji.index);
        expect(ij.sign).toBe(-ji.sign);
      }
    }
  });

  it("each Fano line encodes a cyclic multiplication triple", () => {
    for (const line of topo.lines) {
      const [a, b, c] = line.points;
      expect(topo.multiplicationTable[a][b].index).toBe(c);
      expect(topo.multiplicationTable[a][b].sign).toBe(1);
    }
  });

  it("multiplication table is complete (no missing entries)", () => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        const entry = topo.multiplicationTable[i][j];
        expect(entry.sign).not.toBe(0);
        // Either scalar (-1, index -1) or imaginary unit
        if (i === j) {
          expect(entry.index).toBe(-1);
        } else {
          expect(entry.index).toBeGreaterThanOrEqual(0);
          expect(entry.index).toBeLessThan(7);
        }
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part IV: Qubit Interaction Patterns
// ══════════════════════════════════════════════════════════════════════════

describe("Fano Plane — Qubit Interactions", () => {
  it("21 qubit pair interactions = C(7,2)", () => {
    const topo = constructFanoTopology();
    const interactions = computeInteractions(topo);
    expect(interactions.length).toBe(21);
  });

  it("direct routes match collinear pairs", () => {
    const topo = constructFanoTopology();
    const interactions = computeInteractions(topo);
    const direct = interactions.filter(i => i.directRoute);
    // Each line has C(3,2)=3 collinear pairs, 7 lines × 3 = 21, but each pair on exactly 1 line
    // So direct pairs = 7 × 3 = 21? No — each pair counted once, 7 lines × 3 pairs = 21 = all pairs
    // Actually: 7 points, each on 3 lines, each line has 3 points → 7×3/2 pairs per... 
    // Total collinear pairs: 7 lines × C(3,2) = 7 × 3 = 21 but each pair on exactly 1 line → 21 direct
    expect(direct.length).toBe(21);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part V: Gate Routing
// ══════════════════════════════════════════════════════════════════════════

describe("Fano Plane — Gate Routing", () => {
  it("35 routes = C(7,3)", () => {
    const topo = constructFanoTopology();
    const routes = computeGateRoutes(topo);
    expect(routes.length).toBe(35);
  });

  it("exactly 7 native (SWAP-free) routes", () => {
    const topo = constructFanoTopology();
    const routes = computeGateRoutes(topo);
    expect(routes.filter(r => r.native).length).toBe(7);
  });

  it("non-native routes have swapCost ≥ 1", () => {
    const topo = constructFanoTopology();
    const routes = computeGateRoutes(topo);
    for (const r of routes) {
      if (!r.native) {
        expect(r.swapCost).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("non-associative interference detected", () => {
    const topo = constructFanoTopology();
    const routes = computeGateRoutes(topo);
    expect(routes.some(r => r.hasInterference)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part VI: Atlas Connection
// ══════════════════════════════════════════════════════════════════════════

describe("Fano Plane — Atlas Connection", () => {
  it("7 Fano lines → 7 propagator channels", () => {
    const topo = constructFanoTopology();
    const atlas = connectToAtlas(topo);
    expect(atlas.lineToPropagator.length).toBe(7);
  });

  it("covers all 96 Atlas vertices", () => {
    const topo = constructFanoTopology();
    const atlas = connectToAtlas(topo);
    expect(atlas.verticesCovered).toBe(96);
  });

  it("48 mirror pairs (F₄)", () => {
    const topo = constructFanoTopology();
    const atlas = connectToAtlas(topo);
    expect(atlas.mirrorPairCount).toBe(48);
  });

  it("G₂ orbit size = 12", () => {
    const topo = constructFanoTopology();
    const atlas = connectToAtlas(topo);
    expect(atlas.g2OrbitSize).toBe(12);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Part VII: Full Report
// ══════════════════════════════════════════════════════════════════════════

describe("Fano Plane — Full Verification Report", () => {
  it("all 18 internal tests pass", () => {
    const report = runFanoPlaneAnalysis();
    for (const t of report.tests) {
      expect(t.holds, `FAIL: ${t.name} — ${t.detail}`).toBe(true);
    }
    expect(report.allPassed).toBe(true);
    expect(report.tests.length).toBe(18);
  });
});
