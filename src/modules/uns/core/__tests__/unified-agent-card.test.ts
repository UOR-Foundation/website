import { describe, it, expect } from "vitest";
import { createUnifiedCard, verifyModelSkillCoherence } from "../unified-agent-card";

const AGENT = {
  name: "Atlas-7",
  description: "Semantic search agent with multimodal embedding capabilities",
  capabilities: ["semantic-search", "embedding", "classification"],
  model: "atlas-7-v3.onnx",
  endpoints: ["POST /api/search", "GET /api/embed"],
  version: "3.0.0",
} as const;

describe("Unified Agent Card", () => {
  it("creates a card with valid hex and CID", async () => {
    const card = await createUnifiedCard(AGENT);
    expect(card.hex).toMatch(/^[0-9a-f]{64}$/);
    expect(card.cid).toMatch(/^ba/); // CIDv1 (various codecs)
  });

  it("is deterministic — same agent always produces same card", async () => {
    const a = await createUnifiedCard(AGENT);
    const b = await createUnifiedCard(AGENT);
    expect(a.hex).toBe(b.hex);
  });

  it("different agents produce different cards", async () => {
    const a = await createUnifiedCard(AGENT);
    const b = await createUnifiedCard({ ...AGENT, name: "Atlas-8" });
    expect(a.hex).not.toBe(b.hex);
  });

  it("projects into all nine ecosystems", async () => {
    const card = await createUnifiedCard(AGENT);
    const eco = card.ecosystems;
    expect(eco.identity).toMatch(/^did:uor:/);
    expect(eco.credential).toMatch(/^urn:uor:vc:/);
    expect(eco.onChain).toMatch(/^erc8004:/);
    expect(eco.model).toMatch(/^urn:uor:onnx:model:/);
    expect(eco.skill).toMatch(/^urn:uor:skill:/);
    expect(eco.service).toMatch(/^urn:uor:oasf:/);
    expect(eco.payment).toMatch(/^x402:sha256:/);
    expect(eco.discovery).toMatch(/uor\.foundation/);
    expect(eco.settlement).toMatch(/^[0-9a-f]/);
    expect(eco.nandaIndex).toMatch(/^nanda:index:/);
    expect(eco.nandaFacts).toMatch(/projectnanda\.org\/agentfacts\//);
    expect(eco.nandaResolve).toMatch(/^nanda:resolve:/);
  });

  it("all ecosystem hashes resolve to the same identity", async () => {
    const card = await createUnifiedCard(AGENT);
    const hashes = [
      card.ecosystems.onChain.split(":").pop()!,
      card.ecosystems.model.split(":").pop()!,
      card.ecosystems.skill.split(":").pop()!,
      card.ecosystems.payment.split(":").pop()!,
    ];
    for (const h of hashes) {
      expect(h).toBe(card.hex);
    }
  });

  it("projects into ALL registered hologram projections", async () => {
    const card = await createUnifiedCard(AGENT);
    expect(card.projections.size).toBeGreaterThanOrEqual(37);
  });

  // ── ONNX ↔ skill.md Integrity Proof ─────────────────────────────────

  it("verifies ONNX ↔ skill.md coherence", async () => {
    const card = await createUnifiedCard(AGENT);
    const proof = verifyModelSkillCoherence(card);
    expect(proof.coherent).toBe(true);
    expect(proof.modelHash).toBe(proof.skillHash);
    expect(proof.proof).toContain("≡");
  });

  it("preserves JSON-LD structure", async () => {
    const card = await createUnifiedCard(AGENT);
    expect(card.jsonLd["@context"]).toBe("https://schema.org");
    expect(card.jsonLd["@type"]).toBe("SoftwareApplication");
    expect(card.jsonLd["name"]).toBe("Atlas-7");
  });
});
