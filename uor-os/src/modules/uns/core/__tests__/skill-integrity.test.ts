import { describe, it, expect } from "vitest";
import { parseSkillMd, verifySkillIntegrity, isSkillTrusted } from "../skill-integrity";

const SAMPLE_SKILL = `---
version: 1.0.0
authentication: bearer
---
# Weather API

Returns current weather data for a given location.

## Endpoints

- GET /api/weather?city={city}
- POST /api/weather/subscribe
`;

describe("Skill.md Integrity", () => {
  // ── Parser ──────────────────────────────────────────────────────────

  it("extracts name from first heading", () => {
    const d = parseSkillMd(SAMPLE_SKILL);
    expect(d.name).toBe("Weather API");
  });

  it("extracts frontmatter fields", () => {
    const d = parseSkillMd(SAMPLE_SKILL);
    expect(d.version).toBe("1.0.0");
    expect(d.authentication).toBe("bearer");
  });

  it("extracts endpoints from bullet lines", () => {
    const d = parseSkillMd(SAMPLE_SKILL);
    expect(d.endpoints).toHaveLength(2);
    expect(d.endpoints![0]).toContain("GET");
  });

  it("extracts description from first body line", () => {
    const d = parseSkillMd(SAMPLE_SKILL);
    expect(d.description).toBe("Returns current weather data for a given location.");
  });

  // ── Integrity pipeline ──────────────────────────────────────────────

  it("produces a 64-char hex hash", async () => {
    const result = await verifySkillIntegrity(SAMPLE_SKILL);
    expect(result.hex).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces deterministic hash for same input", async () => {
    const a = await verifySkillIntegrity(SAMPLE_SKILL);
    const b = await verifySkillIntegrity(SAMPLE_SKILL);
    expect(a.hex).toBe(b.hex);
  });

  it("produces different hash for modified skill", async () => {
    const original = await verifySkillIntegrity(SAMPLE_SKILL);
    const tampered = await verifySkillIntegrity(SAMPLE_SKILL.replace("Weather API", "Tampered API"));
    expect(original.hex).not.toBe(tampered.hex);
  });

  it("generates all four cross-framework projections", async () => {
    const result = await verifySkillIntegrity(SAMPLE_SKILL);
    expect(result.projections.skill).toMatch(/^urn:uor:skill:/);
    expect(result.projections.bitcoin).toMatch(/^[0-9a-f]/); // raw OP_RETURN hex
    expect(result.projections.did).toMatch(/^did:uor:/);
    expect(result.projections.activitypub).toMatch(/uor\.foundation/);
  });

  // ── Trust verification ──────────────────────────────────────────────

  it("trusts skill matching known-good hash", async () => {
    const { hex } = await verifySkillIntegrity(SAMPLE_SKILL);
    expect(await isSkillTrusted(SAMPLE_SKILL, hex)).toBe(true);
  });

  it("rejects tampered skill", async () => {
    const { hex } = await verifySkillIntegrity(SAMPLE_SKILL);
    const tampered = SAMPLE_SKILL + "\n- DELETE /api/weather/nuke";
    expect(await isSkillTrusted(tampered, hex)).toBe(false);
  });

  // ── Versioning chain ────────────────────────────────────────────────

  it("skill versions form a unique hash chain", async () => {
    const v1 = await verifySkillIntegrity(SAMPLE_SKILL);
    const v2 = await verifySkillIntegrity(SAMPLE_SKILL.replace("1.0.0", "2.0.0"));
    expect(v1.hex).not.toBe(v2.hex);
    // Both are valid UOR identities
    expect(v1.cid).toMatch(/^bafy/);
    expect(v2.cid).toMatch(/^bafy/);
  });
});
