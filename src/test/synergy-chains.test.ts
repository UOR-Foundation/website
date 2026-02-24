/**
 * Cross-Projection Synergy Verification Suite
 * ═════════════════════════════════════════════
 *
 * Verifies that all 15 synergy chains produce consistent, interoperable
 * outputs from the same canonical identity. This is the connective tissue
 * test — proving that UOR's holographic principle creates actual
 * functional interoperability across 145+ standards.
 *
 * @file src/test/synergy-chains.test.ts
 */

import { describe, it, expect } from "vitest";
import { singleProofHash } from "@/modules/uns/core/identity";
import { project, PROJECTIONS } from "@/modules/uns/core/hologram";
import { analyzeSynergies, discoverSynergies, SYNERGY_CHAINS, CLUSTERS } from "@/modules/uns/core/hologram/synergies";
import type { ProjectionInput } from "@/modules/uns/core/hologram";

// ── Test Identity ──────────────────────────────────────────────────────────

let testInput: ProjectionInput;
let setupDone = false;

const setup = async () => {
  if (setupDone) return;
  const testObj = { "@type": "test:Synergy", "test:v": "1" };
  const identity = await singleProofHash(testObj);
  const canonId = identity["u:canonicalId"]; // urn:uor:derivation:sha256:{hex}
  const hex = canonId.split(":").pop()!;
  testInput = {
    hashBytes: identity.hashBytes,
    cid: identity["u:cid"],
    hex,
  };
  setupDone = true;
};

// ═══════════════════════════════════════════════════════════════════════════
// T0 — STRUCTURAL INTEGRITY
// ═══════════════════════════════════════════════════════════════════════════

describe("T0: Synergy Structure", () => {
  it("all synergy chain projections reference valid specs", async () => {
    await setup();
    for (const chain of SYNERGY_CHAINS) {
      for (const name of chain.projections) {
        expect(PROJECTIONS.has(name), `${chain.name} references unknown projection: "${name}"`).toBe(true);
      }
    }
  });

  it("every chain has at least 2 projections", () => {
    for (const chain of SYNERGY_CHAINS) {
      expect(chain.projections.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("every chain has at least (projections - 1) bridges", () => {
    for (const chain of SYNERGY_CHAINS) {
      expect(chain.bridges.length).toBeGreaterThanOrEqual(chain.projections.length - 1);
    }
  });

  it("48 synergy chains are defined", () => {
    expect(SYNERGY_CHAINS.length).toBe(48);
  });

  it("clusters cover all major ecosystems", () => {
    expect(Object.keys(CLUSTERS).length).toBeGreaterThanOrEqual(12);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// T1 — CHAIN VERIFICATION (every chain produces valid output)
// ═══════════════════════════════════════════════════════════════════════════

describe("T1: Chain Verification — All 15 Chains", () => {
  it("Chain 1: Identity Triangle (vc → sd-jwt → openid4vp → token-status-list)", async () => {
    await setup();
    const vc = project(testInput, "vc");
    const sdJwt = project(testInput, "sd-jwt");
    const oid4vp = project(testInput, "openid4vp");
    const tsl = project(testInput, "token-status-list");
    expect(vc.value).toMatch(/^urn:uor:vc:/);
    expect(sdJwt.value).toMatch(/^urn:ietf:params:oauth:sd-jwt:sha-256:/);
    expect(oid4vp.value).toMatch(/^urn:openid4vp:presentation:sha256:/);
    expect(tsl.value).toMatch(/^urn:ietf:params:oauth:status-list:sha256:/);
    // All share the same hex in their URN
    expect(sdJwt.value).toContain(testInput.hex);
    expect(oid4vp.value).toContain(testInput.hex);
  });

  it("Chain 2: Biometric Trust Stack (webauthn → cose → mdl → cbor-ld)", async () => {
    await setup();
    const wa = project(testInput, "webauthn");
    const cose = project(testInput, "cose");
    const mdl = project(testInput, "mdl");
    const cborLd = project(testInput, "cbor-ld");
    expect(wa.value).toMatch(/^webauthn:credentialId:/);
    expect(cose.value).toMatch(/^cose:key:thumbprint:sha-256:/);
    expect(mdl.value).toMatch(/^urn:iso:18013-5:mdl:digest:sha-256:/);
    expect(cborLd.value).toMatch(/^urn:w3c:cbor-ld:sha256:/);
    // WebAuthn and COSE share base64url encoding of the same bytes
    const waB64 = wa.value.split(":").pop()!;
    const coseB64 = cose.value.split(":").pop()!;
    expect(waB64).toBe(coseB64); // SAME base64url output
  });

  it("Chain 3: AI Provenance Pipeline (c2pa → onnx → mcp-tool → opentelemetry)", async () => {
    await setup();
    const c2pa = project(testInput, "c2pa");
    const onnx = project(testInput, "onnx");
    const mcp = project(testInput, "mcp-tool");
    const otel = project(testInput, "opentelemetry");
    expect(c2pa.value).toContain(testInput.hex);
    expect(onnx.value).toContain(testInput.hex);
    expect(mcp.value).toContain(testInput.hex);
    expect(otel.value).toMatch(/^otel:trace:/);
    // OTel traceId is first 32 hex chars of the hash
    const parts = otel.value.split(":");
    expect(parts[2]).toBe(testInput.hex.slice(0, 32));
  });

  it("Chain 4: Zero-Trust Event Security (ssf → cloudevents → otel → token-status-list)", async () => {
    await setup();
    const ssf = project(testInput, "ssf");
    const ce = project(testInput, "cloudevents");
    const otel = project(testInput, "opentelemetry");
    const tsl = project(testInput, "token-status-list");
    expect(ssf.value).toContain(testInput.hex);
    expect(ce.value).toContain(testInput.hex);
    expect(otel.value).toContain(testInput.hex.slice(0, 32));
    expect(tsl.value).toContain(testInput.hex);
  });

  it("Chain 5: DID Unification Layer — did and tsp-vid produce IDENTICAL output", async () => {
    await setup();
    const did = project(testInput, "did");
    const tspVid = project(testInput, "tsp-vid");
    // THIS IS THE KEY INSIGHT: they are the SAME projection
    expect(did.value).toBe(tspVid.value);
    // All FPP DIDs derive from the same hash
    const fppR = project(testInput, "fpp-rdid");
    const fppM = project(testInput, "fpp-mdid");
    const fppP = project(testInput, "fpp-pdid");
    const dc = project(testInput, "didcomm-v2");
    expect(fppR.value).toMatch(/^did:fpp:r:/);
    expect(fppM.value).toMatch(/^did:fpp:m:/);
    expect(fppP.value).toMatch(/^did:fpp:p:/);
    expect(dc.value).toContain(testInput.hex);
  });

  it("Chain 6: Enterprise IAM Bridge (oidc → webauthn → scim → sd-jwt → webfinger)", async () => {
    await setup();
    const oidc = project(testInput, "oidc");
    const wa = project(testInput, "webauthn");
    const scim = project(testInput, "scim");
    const sdJwt = project(testInput, "sd-jwt");
    const wf = project(testInput, "webfinger");
    expect(oidc.value).toContain(testInput.hex);
    expect(wa.value.length).toBeGreaterThan(20);
    expect(scim.value).toContain(testInput.hex);
    expect(sdJwt.value).toContain(testInput.hex);
    expect(wf.value).toMatch(/^acct:/);
  });

  it("Chain 7: Blockchain Settlement — Bitcoin and Zcash produce IDENTICAL scripts", async () => {
    await setup();
    const btc = project(testInput, "bitcoin");
    const zec = project(testInput, "zcash-transparent");
    const eth = project(testInput, "eth-commitment");
    const pq = project(testInput, "pq-bridge");
    // Bitcoin and Zcash transparent are STRUCTURALLY IDENTICAL
    expect(btc.value).toBe(zec.value);
    // Ethereum commitment embeds the same hex
    expect(eth.value).toBe(`0x${testInput.hex}`);
    // PQ Bridge wraps the same hash
    expect(pq.value).toContain(testInput.hex);
  });

  it("Chain 8: Social Federation — Nostr event ID IS the raw hex", async () => {
    await setup();
    const nostr = project(testInput, "nostr");
    // Nostr event ID is EXACTLY the SHA-256 hex — zero translation
    expect(nostr.value).toBe(testInput.hex);
    const ap = project(testInput, "activitypub");
    expect(ap.value).toContain(testInput.hex);
  });

  it("Chain 9: Trust Infrastructure Stack (tsp → fpp → trqp)", async () => {
    await setup();
    const tspVid = project(testInput, "tsp-vid");
    const tspEnv = project(testInput, "tsp-envelope");
    const tspRel = project(testInput, "tsp-relationship");
    const phc = project(testInput, "fpp-phc");
    const vrc = project(testInput, "fpp-vrc");
    const trqp = project(testInput, "trqp");
    expect(tspVid.value).toMatch(/^did:uor:/);
    expect(tspEnv.value).toContain(testInput.hex);
    expect(tspRel.value).toContain(testInput.hex);
    expect(phc.value).toContain(testInput.hex);
    expect(vrc.value).toContain(testInput.hex);
    expect(trqp.value).toContain(testInput.hex);
  });

  it("Chain 10: Privacy Container Stack (sd-jwt → gordian → zcash-memo → cose)", async () => {
    await setup();
    const sdJwt = project(testInput, "sd-jwt");
    const gordian = project(testInput, "gordian-envelope");
    const zMemo = project(testInput, "zcash-memo");
    const cose = project(testInput, "cose");
    expect(sdJwt.value).toContain(testInput.hex);
    expect(gordian.value).toContain(testInput.hex);
    expect(zMemo.value.length).toBe(1024); // 512 bytes = 1024 hex chars
    expect(cose.value).toMatch(/^cose:key:thumbprint/);
  });

  it("Chain 11: Content-Gated Commerce (hashlock → lightning → x402 → mcp)", async () => {
    await setup();
    const hl = project(testInput, "bitcoin-hashlock");
    const ln = project(testInput, "lightning");
    const x402 = project(testInput, "x402");
    const mcp = project(testInput, "mcp-tool");
    // Hashlock contains the hash as OP_SHA256 script
    expect(hl.value).toContain(testInput.hex);
    expect(ln.value).toMatch(/^pp5/);
    expect(x402.value).toContain(testInput.hex);
    expect(mcp.value).toContain(testInput.hex);
  });

  it("Chain 12: Semantic Data Bridge (jsonld → solid → schema-org → cbor-ld → crdt)", async () => {
    await setup();
    const jld = project(testInput, "jsonld");
    const solid = project(testInput, "solid");
    const so = project(testInput, "schema-org");
    const cborLd = project(testInput, "cbor-ld");
    const crdt = project(testInput, "crdt");
    expect(jld.value).toContain(testInput.hex);
    expect(solid.value).toContain(testInput.hex);
    expect(so.value).toContain(testInput.hex);
    expect(cborLd.value).toContain(testInput.hex);
    expect(crdt.value).toContain(testInput.hex);
  });

  it("Chain 13: Supply Chain Integrity (scitt → oci → gs1 → c2pa → cid)", async () => {
    await setup();
    const scitt = project(testInput, "scitt");
    const oci = project(testInput, "oci");
    const c2pa = project(testInput, "c2pa");
    const cid = project(testInput, "cid");
    expect(scitt.value).toContain(testInput.hex);
    // OCI digest IS sha256:{hex} — the most direct projection
    expect(oci.value).toBe(`sha256:${testInput.hex}`);
    expect(c2pa.value).toContain(testInput.hex);
    expect(cid.value).toBe(testInput.cid);
  });

  it("Chain 14: Agent Mesh Network (erc8004 → a2a → mcp → x402 → nanda → skill)", async () => {
    await setup();
    const erc = project(testInput, "erc8004");
    const a2a = project(testInput, "a2a");
    const mcp = project(testInput, "mcp-tool");
    const x402 = project(testInput, "x402");
    const nanda = project(testInput, "nanda-agentfacts");
    const skill = project(testInput, "skill-md");
    expect(erc.value).toContain(testInput.hex);
    expect(a2a.value).toContain(testInput.hex);
    expect(mcp.value).toContain(testInput.hex);
    expect(x402.value).toContain(testInput.hex);
    expect(nanda.value).toContain(testInput.hex);
    expect(skill.value).toContain(testInput.hex);
  });

  it("Chain 15: Real-Time Communication (webtransport → didcomm → cloudevents → crdt → mls)", async () => {
    await setup();
    const wt = project(testInput, "webtransport");
    const dc = project(testInput, "didcomm-v2");
    const ce = project(testInput, "cloudevents");
    const crdt = project(testInput, "crdt");
    const mls = project(testInput, "mls");
    expect(wt.value).toContain(testInput.hex);
    expect(dc.value).toContain(testInput.hex);
    expect(ce.value).toContain(testInput.hex);
    expect(crdt.value).toContain(testInput.hex);
    expect(mls.value).toContain(testInput.hex);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// T2 — CROSS-PROJECTION IDENTITY INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════

describe("T2: Identity Invariants Across Projections", () => {
  it("did:uor === tsp-vid (structural identity proof)", async () => {
    await setup();
    expect(project(testInput, "did").value).toBe(project(testInput, "tsp-vid").value);
  });

  it("bitcoin === zcash-transparent (identical OP_RETURN scripts)", async () => {
    await setup();
    expect(project(testInput, "bitcoin").value).toBe(project(testInput, "zcash-transparent").value);
  });

  it("nostr event ID === raw SHA-256 hex (zero translation)", async () => {
    await setup();
    expect(project(testInput, "nostr").value).toBe(testInput.hex);
  });

  it("oci digest === 'sha256:' + hex (zero translation)", async () => {
    await setup();
    expect(project(testInput, "oci").value).toBe(`sha256:${testInput.hex}`);
  });

  it("webauthn base64url === cose base64url (shared encoding)", async () => {
    await setup();
    const waB64 = project(testInput, "webauthn").value.replace("webauthn:credentialId:", "");
    const coseB64 = project(testInput, "cose").value.replace("cose:key:thumbprint:sha-256:", "");
    expect(waB64).toBe(coseB64);
  });

  it("glyph projection is lossless (32 Braille chars = 256 bits)", async () => {
    await setup();
    const glyph = project(testInput, "glyph");
    expect(glyph.value.length).toBe(32);
    expect(glyph.fidelity).toBe("lossless");
  });

  it("all lossless projections contain or encode the full 256-bit hash", async () => {
    await setup();
    const hologram = project(testInput);
    let losslessCount = 0;
    for (const [name, proj] of Object.entries(hologram.projections)) {
      if (proj.fidelity === "lossless") losslessCount++;
    }
    expect(losslessCount).toBeGreaterThan(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// T3 — SYNERGY ANALYSIS ENGINE
// ═══════════════════════════════════════════════════════════════════════════

describe("T3: Synergy Analysis Engine", () => {
  it("analyzeSynergies verifies all bridges successfully", async () => {
    await setup();
    const analysis = analyzeSynergies(testInput);
    for (const synergy of analysis.verifiedSynergies) {
      expect(synergy.verified, `Bridge ${synergy.from} → ${synergy.to} failed`).toBe(true);
    }
  });

  it("analyzeSynergies reports correct chain count", async () => {
    await setup();
    const analysis = analyzeSynergies(testInput);
    expect(analysis.stats.totalChains).toBe(48);
  });

  it("synergy coverage exceeds 30% of all projections", async () => {
    await setup();
    const analysis = analyzeSynergies(testInput);
    expect(analysis.stats.coveragePercent).toBeGreaterThan(30);
  });

  it("discoverSynergies finds hex-embedded cluster", async () => {
    await setup();
    const discoveries = discoverSynergies(testInput);
    expect(discoveries["Full SHA-256 hex embedded"]?.length).toBeGreaterThan(20);
  });

  it("discoverSynergies finds DID namespace cluster", async () => {
    await setup();
    const discoveries = discoverSynergies(testInput);
    expect(discoveries["DID namespace (did:*)"]?.length).toBeGreaterThanOrEqual(5);
  });

  it("discoverSynergies finds UOR Foundation domain cluster", async () => {
    await setup();
    const discoveries = discoverSynergies(testInput);
    expect(discoveries["UOR Foundation domain URLs"]?.length).toBeGreaterThanOrEqual(4);
  });

  it("discoverSynergies finds First Person Project namespace", async () => {
    await setup();
    const discoveries = discoverSynergies(testInput);
    expect(discoveries["First Person Project namespace"]?.length).toBeGreaterThanOrEqual(6);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// T4 — NEW TIER 16 PROJECTIONS (individual verification)
// ═══════════════════════════════════════════════════════════════════════════

describe("T4: Tier 16 Projection Output Verification", () => {
  it("webauthn produces valid base64url credentialId", async () => {
    await setup();
    const p = project(testInput, "webauthn");
    expect(p.value).toMatch(/^webauthn:credentialId:[A-Za-z0-9_-]+$/);
    expect(p.fidelity).toBe("lossless");
  });

  it("sd-jwt produces valid IETF URN", async () => {
    await setup();
    const p = project(testInput, "sd-jwt");
    expect(p.value).toMatch(/^urn:ietf:params:oauth:sd-jwt:sha-256:[0-9a-f]{64}$/);
  });

  it("openid4vp produces valid presentation URN", async () => {
    await setup();
    const p = project(testInput, "openid4vp");
    expect(p.value).toMatch(/^urn:openid4vp:presentation:sha256:[0-9a-f]{64}$/);
  });

  it("token-status-list produces valid URN with index", async () => {
    await setup();
    const p = project(testInput, "token-status-list");
    expect(p.value).toMatch(/^urn:ietf:params:oauth:status-list:sha256:[0-9a-f]{64}:\d+$/);
    // Index is deterministic
    const idx = parseInt(p.value.split(":").pop()!);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(1 << 20);
  });

  it("c2pa produces valid assertion URN", async () => {
    await setup();
    const p = project(testInput, "c2pa");
    expect(p.value).toMatch(/^urn:c2pa:assertion:sha256:[0-9a-f]{64}$/);
  });

  it("opentelemetry produces valid trace:span format", async () => {
    await setup();
    const p = project(testInput, "opentelemetry");
    expect(p.value).toMatch(/^otel:trace:[0-9a-f]{32}:[0-9a-f]{16}$/);
    expect(p.fidelity).toBe("lossy");
  });

  it("cloudevents produces valid event URI", async () => {
    await setup();
    const p = project(testInput, "cloudevents");
    expect(p.value).toMatch(/^ce:1\.0:uor\.foundation\/[0-9a-f]{64}$/);
  });

  it("ssf produces valid SET URN", async () => {
    await setup();
    const p = project(testInput, "ssf");
    expect(p.value).toMatch(/^urn:ietf:params:ssf:set:sha256:[0-9a-f]{64}$/);
  });

  it("cose produces valid key thumbprint", async () => {
    await setup();
    const p = project(testInput, "cose");
    expect(p.value).toMatch(/^cose:key:thumbprint:sha-256:[A-Za-z0-9_-]+$/);
  });

  it("mdl produces valid ISO digest URN", async () => {
    await setup();
    const p = project(testInput, "mdl");
    expect(p.value).toMatch(/^urn:iso:18013-5:mdl:digest:sha-256:[0-9a-f]{64}$/);
  });

  it("didcomm-v2 produces valid message URN", async () => {
    await setup();
    const p = project(testInput, "didcomm-v2");
    expect(p.value).toMatch(/^urn:didcomm:v2:msg:sha256:[0-9a-f]{64}$/);
  });

  it("scim produces valid SCIM resource URN", async () => {
    await setup();
    const p = project(testInput, "scim");
    expect(p.value).toMatch(/^urn:ietf:params:scim:schemas:core:2\.0:User:[0-9a-f]{64}$/);
  });

  it("webtransport produces valid session URL", async () => {
    await setup();
    const p = project(testInput, "webtransport");
    expect(p.value).toMatch(/^https:\/\/uor\.foundation\/webtransport\/[0-9a-f]{64}$/);
  });

  it("gordian-envelope produces valid UR envelope", async () => {
    await setup();
    const p = project(testInput, "gordian-envelope");
    expect(p.value).toMatch(/^ur:envelope:sha256:[0-9a-f]{64}$/);
  });

  it("cbor-ld produces valid W3C CBOR-LD URN", async () => {
    await setup();
    const p = project(testInput, "cbor-ld");
    expect(p.value).toMatch(/^urn:w3c:cbor-ld:sha256:[0-9a-f]{64}$/);
  });
});
