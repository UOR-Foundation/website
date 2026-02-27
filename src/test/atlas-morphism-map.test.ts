/**
 * Atlas Morphism Map Test Suite
 * ═════════════════════════════
 *
 * Verifies the classification of 356+ hologram projections
 * into 5 categorical operations mapped to exceptional groups.
 */

import { describe, it, expect } from "vitest";
import {
  classifyDomains,
  operationDistribution,
  runMorphismMapVerification,
} from "@/modules/atlas/morphism-map";

describe("Morphism Map: 12 Domains → 5 Categorical Operations", () => {

  it("classifies all 12 domains", () => {
    const cls = classifyDomains();
    expect(cls.length).toBe(12);
  });

  it("uses all 5 categorical operations", () => {
    const cls = classifyDomains();
    const ops = new Set(cls.map(c => c.operation));
    expect(ops.size).toBe(5);
    expect(ops).toContain("product");
    expect(ops).toContain("quotient");
    expect(ops).toContain("filtration");
    expect(ops).toContain("augmentation");
    expect(ops).toContain("embedding");
  });

  it("maps to all 5 exceptional groups", () => {
    const cls = classifyDomains();
    const groups = new Set(cls.map(c => c.exceptionalGroup));
    expect(groups).toContain("G₂");
    expect(groups).toContain("F₄");
    expect(groups).toContain("E₆");
    expect(groups).toContain("E₇");
    expect(groups).toContain("E₈");
  });

  it("covers ≥ 356 projections", () => {
    const cls = classifyDomains();
    const total = cls.reduce((s, c) => s + c.projectionCount, 0);
    expect(total).toBeGreaterThanOrEqual(356);
  });

  it("distribution is 2-2-3-3-2", () => {
    const dist = operationDistribution();
    expect(dist.product.domains).toBe(2);
    expect(dist.quotient.domains).toBe(2);
    expect(dist.filtration.domains).toBe(3);
    expect(dist.augmentation.domains).toBe(3);
    expect(dist.embedding.domains).toBe(2);
  });

  it("Product (G₂): UOR Foundation + IoT & Hardware", () => {
    const cls = classifyDomains().filter(c => c.operation === "product");
    const ids = cls.map(c => c.domainId).sort();
    expect(ids).toEqual(["iot-hardware", "uor-foundation"]);
  });

  it("Quotient (F₄): Identity & Trust + Federation & Social", () => {
    const cls = classifyDomains().filter(c => c.operation === "quotient");
    const ids = cls.map(c => c.domainId).sort();
    expect(ids).toEqual(["federation-social", "identity-trust"]);
  });

  it("Filtration (E₆): Languages + Data & Encoding + Media & Creative", () => {
    const cls = classifyDomains().filter(c => c.operation === "filtration");
    const ids = cls.map(c => c.domainId).sort();
    expect(ids).toEqual(["data-encoding", "languages", "media-creative"]);
  });

  it("Augmentation (E₇): AI & Agents + Network & Cloud + Industry & Science", () => {
    const cls = classifyDomains().filter(c => c.operation === "augmentation");
    const ids = cls.map(c => c.domainId).sort();
    expect(ids).toEqual(["ai-agents", "industry-science", "network-cloud"]);
  });

  it("Embedding (E₈): Web3 & Blockchain + Quantum Computing", () => {
    const cls = classifyDomains().filter(c => c.operation === "embedding");
    const ids = cls.map(c => c.domainId).sort();
    expect(ids).toEqual(["quantum-computing", "web3-blockchain"]);
  });

  it("Filtration has most projections", () => {
    const dist = operationDistribution();
    const filtration = dist.filtration.projections;
    expect(filtration).toBeGreaterThan(dist.product.projections);
    expect(filtration).toBeGreaterThan(dist.quotient.projections);
    expect(filtration).toBeGreaterThan(dist.augmentation.projections);
    expect(filtration).toBeGreaterThan(dist.embedding.projections);
  });

  it("every domain has a structural justification", () => {
    const cls = classifyDomains();
    for (const c of cls) {
      expect(c.justification.length).toBeGreaterThan(20);
    }
  });
});

describe("Full Morphism Map Report", () => {
  it("all 10 verification tests pass", () => {
    const report = runMorphismMapVerification();
    for (const test of report.tests) {
      expect(test.holds).toBe(true);
    }
  });
});
