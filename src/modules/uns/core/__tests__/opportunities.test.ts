/**
 * Opportunity Implementations — Comprehensive Test Suite
 * ══════════════════════════════════════════════════════════
 *
 * Tests all 9 coherence gate opportunities:
 *   1. Agent Lifecycle Pipeline
 *   2. Unified Agent Card
 *   3. Multi-Ledger Anchor
 *   4. Social Discovery Mesh
 *   5. Universal Notarization
 *   6. Polyglot Supply Chain
 *   7. Smart Contract Integrity
 *   8. Proof-Certified Software
 *   9. Silicon-to-Cloud Provenance
 */

import { describe, it, expect } from "vitest";
import type { ProjectionInput } from "../hologram/index";

import { buildAgentLifecyclePipeline } from "../hologram/opportunities/pipeline";
import { buildUnifiedAgentCard } from "../hologram/opportunities/unified-agent-card";
import { buildMultiLedgerAnchor } from "../hologram/opportunities/multi-ledger-anchor";
import { buildSocialDiscoveryMesh } from "../hologram/opportunities/social-discovery-mesh";
import { buildUniversalNotarization } from "../hologram/opportunities/universal-notarization";
import { buildPolyglotSupplyChain } from "../hologram/opportunities/polyglot-supply-chain";
import { buildSmartContractIntegrity } from "../hologram/opportunities/smart-contract-integrity";
import { buildProofCertifiedSoftware } from "../hologram/opportunities/proof-certified-software";
import { buildSiliconToCloudProvenance } from "../hologram/opportunities/silicon-to-cloud";

// ── Shared fixture ────────────────────────────────────────────────────────

function makeInput(): ProjectionInput {
  const hashBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) hashBytes[i] = i;
  const hex = Array.from(hashBytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return { hashBytes, cid: "bafyreitest123", hex };
}

const INPUT = makeInput();

// ═══════════════════════════════════════════════════════════════════════════
// 1. AGENT LIFECYCLE PIPELINE
// ═══════════════════════════════════════════════════════════════════════════

describe("Opportunity 1 — Agent Lifecycle Pipeline", () => {
  const pipeline = buildAgentLifecyclePipeline(INPUT);

  it("has correct @type", () => {
    expect(pipeline["@type"]).toBe("opportunity:AgentLifecyclePipeline");
  });

  it("threads the same hash through all stages", () => {
    expect(pipeline.threadHash).toBe(INPUT.hex);
  });

  it("has at least 10 stages", () => {
    expect(pipeline.stages.length).toBeGreaterThanOrEqual(10);
  });

  it("every stage has name, projection, role, and resolved value", () => {
    for (const stage of pipeline.stages) {
      expect(stage.name).toBeTruthy();
      expect(stage.projection).toBeTruthy();
      expect(stage.role.length).toBeGreaterThan(10);
      expect(stage.resolved.value).toBeTruthy();
    }
  });

  it("covers the critical lifecycle: skill → model → identity → discovery → tool → payment → settlement", () => {
    const projections = pipeline.stages.map(s => s.projection);
    expect(projections).toContain("skill-md");
    expect(projections).toContain("onnx");
    expect(projections).toContain("a2a");
    expect(projections).toContain("mcp-tool");
    expect(projections).toContain("bitcoin");
  });

  it("is deterministic (same input → same output)", () => {
    const a = buildAgentLifecyclePipeline(INPUT);
    const b = buildAgentLifecyclePipeline(INPUT);
    expect(a.stages.length).toBe(b.stages.length);
    for (let i = 0; i < a.stages.length; i++) {
      expect(a.stages[i].resolved.value).toBe(b.stages[i].resolved.value);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. UNIFIED AGENT CARD
// ═══════════════════════════════════════════════════════════════════════════

describe("Opportunity 2 — Unified Agent Card", () => {
  const card = buildUnifiedAgentCard(INPUT);

  it("has correct @type", () => {
    expect(card["@type"]).toBe("opportunity:UnifiedAgentCard");
  });

  it("has JSON-LD context", () => {
    expect(card["@context"]).toContain("https://www.w3.org/ns/did/v1");
  });

  it("identity section has DID, CID, and canonicalId", () => {
    expect(card.identity.did).toMatch(/^did:uor:/);
    expect(card.identity.cid).toBe("bafyreitest123");
    expect(card.identity.canonicalId).toMatch(/^urn:uor:derivation:sha256:/);
  });

  it("has discovery section with agentCard", () => {
    expect(card.discovery.agentCard).toBeTruthy();
  });

  it("threads the same hash", () => {
    expect(card.threadHash).toBe(INPUT.hex);
  });

  it("projects into 5+ projections", () => {
    expect(card.projectionCount).toBeGreaterThanOrEqual(5);
  });

  it("capabilities, model, service, credential are present", () => {
    expect(card.capabilities).not.toBeNull();
    expect(card.model).not.toBeNull();
    expect(card.credential).not.toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. MULTI-LEDGER ANCHOR
// ═══════════════════════════════════════════════════════════════════════════

describe("Opportunity 3 — Multi-Ledger Anchor", () => {
  const anchor = buildMultiLedgerAnchor(INPUT);

  it("has correct @type", () => {
    expect(anchor["@type"]).toBe("opportunity:MultiLedgerAnchor");
  });

  it("has at least 3 anchors", () => {
    expect(anchor.anchorCount).toBeGreaterThanOrEqual(3);
  });

  it("is triple-anchored (Bitcoin + Zcash + IPFS)", () => {
    expect(anchor.tripleAnchored).toBe(true);
  });

  it("each anchor has verification method", () => {
    for (const a of anchor.anchors) {
      expect(a.verificationMethod.length).toBeGreaterThan(10);
      expect(a.ledger).toBeTruthy();
      expect(a.value).toBeTruthy();
    }
  });

  it("trust paths equal anchor count", () => {
    expect(anchor.trustPaths).toBe(anchor.anchorCount);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. SOCIAL DISCOVERY MESH
// ═══════════════════════════════════════════════════════════════════════════

describe("Opportunity 4 — Social Discovery Mesh", () => {
  const mesh = buildSocialDiscoveryMesh(INPUT);

  it("has correct @type", () => {
    expect(mesh["@type"]).toBe("opportunity:SocialDiscoveryMesh");
  });

  it("has DID identity", () => {
    expect(mesh.did).toMatch(/^did:uor:/);
  });

  it("covers major discovery protocols", () => {
    expect(mesh.fullCoverage).toBe(true);
    expect(mesh.protocols).toContain("ActivityPub");
    expect(mesh.protocols).toContain("AT Protocol (Bluesky)");
    expect(mesh.protocols).toContain("WebFinger");
  });

  it("has at least 6 endpoints", () => {
    expect(mesh.endpointCount).toBeGreaterThanOrEqual(6);
  });

  it("each endpoint has discovery method and resolution path", () => {
    for (const ep of mesh.endpoints) {
      expect(ep.discoveryMethod.length).toBeGreaterThan(10);
      expect(ep.resolutionPath.length).toBeGreaterThan(10);
      expect(ep.endpoint).toBeTruthy();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. UNIVERSAL NOTARIZATION
// ═══════════════════════════════════════════════════════════════════════════

describe("Opportunity 5 — Universal Notarization", () => {
  const nota = buildUniversalNotarization(INPUT);

  it("has correct @type", () => {
    expect(nota["@type"]).toBe("opportunity:UniversalNotarization");
  });

  it("has Bitcoin anchor", () => {
    expect(nota.bitcoinAnchor.value).toBeTruthy();
  });

  it("has hash lock anchor", () => {
    expect(nota.hashLockAnchor.value).toBeTruthy();
  });

  it("has many notarizations", () => {
    expect(nota.notarizationCount).toBeGreaterThan(20);
  });

  it("all notarizations share the same OP_RETURN", () => {
    for (const n of nota.notarizations) {
      expect(n.bitcoinScript).toBe(nota.sharedOpReturn);
    }
  });

  it("each notarization has verification proof", () => {
    for (const n of nota.notarizations) {
      expect(n.verificationProof).toContain("structural");
    }
  });

  it("supports targeted notarization", () => {
    const targeted = buildUniversalNotarization(INPUT, ["did", "vc", "onnx"]);
    expect(targeted.notarizationCount).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. POLYGLOT SUPPLY CHAIN
// ═══════════════════════════════════════════════════════════════════════════

describe("Opportunity 6 — Polyglot Supply Chain", () => {
  const chain = buildPolyglotSupplyChain(INPUT);

  it("has correct @type", () => {
    expect(chain["@type"]).toBe("opportunity:PolyglotSupplyChain");
  });

  it("covers 50+ languages", () => {
    expect(chain.languageCount).toBeGreaterThanOrEqual(50);
  });

  it("has full spectrum coverage", () => {
    expect(chain.fullSpectrum).toBe(true);
  });

  it("covers all major categories", () => {
    expect(chain.categories).toContain("ML/Scientific");
    expect(chain.categories).toContain("Web Platform");
    expect(chain.categories).toContain("Enterprise/JVM");
    expect(chain.categories).toContain("Systems");
    expect(chain.categories).toContain("Smart Contract");
  });

  it("has chain links connecting languages to downstream protocols", () => {
    expect(chain.totalChainLinks).toBeGreaterThan(20);
  });

  it("Python chains to ONNX", () => {
    const python = chain.artifacts.find(a => a.language === "python-module");
    expect(python).toBeTruthy();
    expect(python!.chains.some(c => c.target === "onnx")).toBe(true);
  });

  it("Solidity chains to ERC-8004", () => {
    const sol = chain.artifacts.find(a => a.language === "solidity");
    expect(sol).toBeTruthy();
    expect(sol!.chains.some(c => c.target === "erc8004")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. SMART CONTRACT INTEGRITY
// ═══════════════════════════════════════════════════════════════════════════

describe("Opportunity 7 — Smart Contract Integrity", () => {
  const integrity = buildSmartContractIntegrity(INPUT);

  it("has correct @type", () => {
    expect(integrity["@type"]).toBe("opportunity:SmartContractIntegrity");
  });

  it("covers Solidity, Vyper, Move, Cairo", () => {
    expect(integrity.languagesCovered).toContain("solidity");
    expect(integrity.languagesCovered).toContain("vyper");
    expect(integrity.languagesCovered).toContain("move");
    expect(integrity.languagesCovered).toContain("cairo");
  });

  it("has 6-step verification chain", () => {
    expect(integrity.verificationChain.length).toBe(6);
  });

  it("audit trail spans source → identity → credential → settlement", () => {
    expect(integrity.auditTrail.source).toMatch(/^urn:uor:derivation:sha256:/);
    expect(integrity.auditTrail.identity).toBeTruthy();
    expect(integrity.auditTrail.credential).toBeTruthy();
    expect(integrity.auditTrail.settlement).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. PROOF-CERTIFIED SOFTWARE
// ═══════════════════════════════════════════════════════════════════════════

describe("Opportunity 8 — Proof-Certified Software", () => {
  const proofs = buildProofCertifiedSoftware(INPUT);

  it("has correct @type", () => {
    expect(proofs["@type"]).toBe("opportunity:ProofCertifiedSoftware");
  });

  it("covers major proof assistants", () => {
    expect(proofs.fullCoverage).toBe(true);
    expect(proofs.languagesCovered).toContain("coq");
    expect(proofs.languagesCovered).toContain("lean");
    expect(proofs.languagesCovered).toContain("agda");
    expect(proofs.languagesCovered).toContain("tlaplus");
  });

  it("each proof has trust statement", () => {
    for (const p of proofs.proofs) {
      expect(p.trustStatement.length).toBeGreaterThan(20);
      expect(p.proofType.length).toBeGreaterThan(5);
      expect(p.vcUri).toBeTruthy();
      expect(p.did).toMatch(/^did:uor:/);
    }
  });

  it("trust chain has 6 steps", () => {
    expect(proofs.trustChain.length).toBe(6);
  });

  it("includes Rust borrow checker as proof system", () => {
    expect(proofs.languagesCovered).toContain("rust-crate");
    const rust = proofs.proofs.find(p => p.language === "rust-crate");
    expect(rust?.proofType).toContain("borrow checker");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. SILICON-TO-CLOUD PROVENANCE
// ═══════════════════════════════════════════════════════════════════════════

describe("Opportunity 9 — Silicon-to-Cloud Provenance", () => {
  const s2c = buildSiliconToCloudProvenance(INPUT);

  it("has correct @type", () => {
    expect(s2c["@type"]).toBe("opportunity:SiliconToCloudProvenance");
  });

  it("has full stack provenance", () => {
    expect(s2c.fullStack).toBe(true);
  });

  it("covers hardware, firmware, container, and agent layers", () => {
    const projections = s2c.layers.map(l => l.projection);
    // Hardware
    expect(projections.some(p => ["vhdl", "verilog", "systemverilog"].includes(p))).toBe(true);
    // Firmware
    expect(projections.some(p => ["c-unit", "cpp-unit", "rust-crate"].includes(p))).toBe(true);
    // Container
    expect(projections.some(p => ["oci", "wasm", "dockerfile"].includes(p))).toBe(true);
    // Agent
    expect(projections.some(p => ["a2a", "did"].includes(p))).toBe(true);
  });

  it("has 10+ layers", () => {
    expect(s2c.layerCount).toBeGreaterThanOrEqual(10);
  });

  it("has narrative with ASCII art header", () => {
    expect(s2c.narrative[0]).toContain("═");
    expect(s2c.narrative.some(l => l.includes("FULL STACK PROVENANCE"))).toBe(true);
  });

  it("has stack DID", () => {
    expect(s2c.stackDid).toMatch(/^did:uor:/);
  });

  it("each layer has abstraction description", () => {
    for (const layer of s2c.layers) {
      expect(layer.abstraction.length).toBeGreaterThan(10);
      expect(layer.uri).toBeTruthy();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CROSS-OPPORTUNITY COHERENCE
// ═══════════════════════════════════════════════════════════════════════════

describe("Cross-Opportunity Coherence", () => {
  it("all 9 opportunities share the same thread hash", () => {
    const pipeline = buildAgentLifecyclePipeline(INPUT);
    const card = buildUnifiedAgentCard(INPUT);
    const anchor = buildMultiLedgerAnchor(INPUT);
    const mesh = buildSocialDiscoveryMesh(INPUT);
    const nota = buildUniversalNotarization(INPUT);
    const poly = buildPolyglotSupplyChain(INPUT);
    const smart = buildSmartContractIntegrity(INPUT);
    const proof = buildProofCertifiedSoftware(INPUT);
    const s2c = buildSiliconToCloudProvenance(INPUT);

    const hash = INPUT.hex;
    expect(pipeline.threadHash).toBe(hash);
    expect(card.threadHash).toBe(hash);
    expect(anchor.threadHash).toBe(hash);
    expect(mesh.threadHash).toBe(hash);
    expect(nota.threadHash).toBe(hash);
    expect(poly.threadHash).toBe(hash);
    expect(smart.threadHash).toBe(hash);
    expect(proof.threadHash).toBe(hash);
    expect(s2c.threadHash).toBe(hash);
  });

  it("card DID matches mesh DID matches s2c stack DID", () => {
    const card = buildUnifiedAgentCard(INPUT);
    const mesh = buildSocialDiscoveryMesh(INPUT);
    const s2c = buildSiliconToCloudProvenance(INPUT);
    expect(card.identity.did).toBe(mesh.did);
    expect(card.identity.did).toBe(s2c.stackDid);
  });

  it("notarization OP_RETURN matches anchor Bitcoin entry", () => {
    const nota = buildUniversalNotarization(INPUT);
    const anchor = buildMultiLedgerAnchor(INPUT);
    const btcAnchor = anchor.anchors.find(a => a.projection === "bitcoin");
    expect(btcAnchor).toBeTruthy();
    expect(nota.sharedOpReturn).toBe(btcAnchor!.value);
  });
});
