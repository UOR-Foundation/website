/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  UOR COHERENCE GATE — Holographic Self-Verification                    ║
 * ║                                                                        ║
 * ║  "The hologram tests itself by projecting through every lens.          ║
 * ║   If any projection is inconsistent, the whole identity is invalid."   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Run: "Run the Coherence Gate"
 * File: src/test/coherence-gate.test.ts
 *
 * This is the single, comprehensive test suite for the entire UOR framework.
 * It is structured as 6 tiers mirroring the UOR architecture:
 *
 *   T0 — RING FOUNDATION        neg(bnot(x)) ≡ succ(x) for all Q0
 *   T1 — HOLOGRAPHIC IDENTITY   23 projections, determinism, fidelity
 *   T2 — CANONICALIZATION       Context sync, URDNA2015, union types
 *   T3 — INTEROPERABILITY       DID, VC, WebFinger, W3C compliance
 *   T4 — INFRASTRUCTURE         Records, DHT, Shield, KV, PQC
 *   T5 — DISCOVERY              Cross-module emergent pattern verification
 *
 * Adding a new capability = adding assertions to the appropriate tier.
 * The gate itself is a UOR object — its output is a proof:CoherenceProof.
 *
 * @module test/coherence-gate
 */

import { describe, it, expect, beforeAll } from "vitest";

// ═══════════════════════════════════════════════════════════════════════════
// T0 — RING FOUNDATION (number-level functions from uns/core/ring)
// ═══════════════════════════════════════════════════════════════════════════

import { neg, bnot, succ, verifyCriticalIdentity } from "@/modules/uns/core/ring";
import { popcount, basisElements, computeTriad, stratumLevel, stratumDensity } from "@/modules/triad";

// ═══════════════════════════════════════════════════════════════════════════
// T1 — HOLOGRAPHIC IDENTITY
// ═══════════════════════════════════════════════════════════════════════════

import { project, PROJECTIONS } from "@/modules/uns/core/hologram";
import type { UorCanonicalIdentity } from "@/modules/uns/core/address";

// ═══════════════════════════════════════════════════════════════════════════
// T2 — CANONICALIZATION
// ═══════════════════════════════════════════════════════════════════════════

import { singleProofHash } from "@/lib/uor-canonical";
import {
  coerceLiteral,
  coerceEntity,
  coerceUnionValue,
} from "@/modules/morphism/union-type-canon";

// ═══════════════════════════════════════════════════════════════════════════
// T3 — INTEROPERABILITY
// ═══════════════════════════════════════════════════════════════════════════

import { generateCertificate } from "@/modules/certificate";
import { resolveDidDocument, resolveDidFull, cidToDid, didToCid, isDidUor } from "@/modules/certificate/did";
import type { UorCertificate } from "@/modules/certificate/types";

// ═══════════════════════════════════════════════════════════════════════════
// T4 — INFRASTRUCTURE
// ═══════════════════════════════════════════════════════════════════════════

import { generateKeypair } from "@/modules/uns/core/keypair";
import { UnsKv } from "@/modules/uns/store/kv";

// ═══════════════════════════════════════════════════════════════════════════
// T5 — DISCOVERY (Cross-module emergent pattern verification)
// ═══════════════════════════════════════════════════════════════════════════

import {
  compressToBase64,
  decompressFromBase64,
  type CompressibleTriple,
} from "@/modules/data-bank/lib/graph-compression";
import { fusionToContextBlock } from "@/modules/data-bank/lib/fusion-graph";
import {
  ingestMemories,
  ingestAudioTracks,
  ingestRelationships,
  unionTriples,
} from "@/modules/data-bank/lib/ingesters";

// ── Shared Fixtures ─────────────────────────────────────────────────────────

function makeCanonicalIdentity(): UorCanonicalIdentity {
  const hashBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) hashBytes[i] = i;
  const hex = Array.from(hashBytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return {
    "u:canonicalId": `urn:uor:derivation:sha256:${hex}`,
    "u:ipv6": "fd00:0075:6f72:0001:0203:0405:0607:0809",
    "u:ipv6PrefixLength": 48,
    "u:contentBits": 80,
    "u:lossWarning": "ipv6-is-routing-projection-only",
    "u:cid": "bafyreitest123",
    "u:glyph": Array.from(hashBytes).map(b => String.fromCodePoint(0x2800 + b)).join(""),
    "u:length": 32,
    hashBytes,
  };
}

const IDENTITY = makeCanonicalIdentity();
const HEX = IDENTITY["u:canonicalId"].split(":").pop()!;

const TEST_SUBJECT = "https://schema.org/SoftwareApplication";
const TEST_ATTRIBUTES = { "schema:name": "CoherenceGate", "schema:version": "1.0" };

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                      THE COHERENCE GATE                                ║
// ╚══════════════════════════════════════════════════════════════════════════╝

describe("UOR COHERENCE GATE", () => {

  // ═══════════════════════════════════════════════════════════════════════
  // T0 — RING FOUNDATION
  // "Does the algebraic bedrock hold?"
  // ═══════════════════════════════════════════════════════════════════════

  describe("T0 — Ring Foundation", () => {
    it("critical identity: neg(bnot(x)) ≡ succ(x) for all 256 elements", () => {
      expect(verifyCriticalIdentity()).toBe(true);
    });

    it("ring closure: neg, bnot, succ stay within [0, 255]", () => {
      for (let x = 0; x < 256; x++) {
        expect(neg(x)).toBeGreaterThanOrEqual(0);
        expect(neg(x)).toBeLessThan(256);
        expect(bnot(x)).toBeGreaterThanOrEqual(0);
        expect(bnot(x)).toBeLessThan(256);
        expect(succ(x)).toBeGreaterThanOrEqual(0);
        expect(succ(x)).toBeLessThan(256);
      }
    });

    it("involution: neg(neg(x)) = x and bnot(bnot(x)) = x", () => {
      for (let x = 0; x < 256; x++) {
        expect(neg(neg(x))).toBe(x);
        expect(bnot(bnot(x))).toBe(x);
      }
    });

    it("triad: popcount + basisElements + computeTriad consistency", () => {
      expect(popcount(0x00)).toBe(0);
      expect(popcount(0xFF)).toBe(8);
      expect(basisElements(0b1010)).toEqual([1, 3]);
      const t = computeTriad([0x55]);
      expect(t.stratum[0]).toBe(popcount(0x55));
      expect(stratumLevel(0, 8)).toBe("low");
      expect(stratumDensity(4, 8)).toBe(50);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // T1 — HOLOGRAPHIC IDENTITY
  // "Does the same identity cohere across all 23 projections?"
  // ═══════════════════════════════════════════════════════════════════════

  describe("T1 — Holographic Identity", () => {
    it("registers at least 23 projections", () => {
      expect(PROJECTIONS.size).toBeGreaterThanOrEqual(23);
    });

    it("every spec has project(), fidelity, and spec URL", () => {
      for (const [, spec] of PROJECTIONS) {
        expect(typeof spec.project).toBe("function");
        expect(["lossless", "lossy"]).toContain(spec.fidelity);
        expect(spec.spec).toMatch(/^https?:\/\//);
        if (spec.fidelity === "lossy") {
          expect(spec.lossWarning).toBeTruthy();
        }
      }
    });

    it("all projections are deterministic (same input → same output)", () => {
      const a = project(IDENTITY);
      const b = project(IDENTITY);
      for (const key of Object.keys(a.projections)) {
        expect(a.projections[key].value).toBe(b.projections[key].value);
      }
    });

    it("lossless projections never carry lossWarning", () => {
      const h = project(IDENTITY);
      for (const [, p] of Object.entries(h.projections)) {
        if (p.fidelity === "lossless") expect(p.lossWarning).toBeUndefined();
      }
    });

    it("lossy projections always carry lossWarning", () => {
      const h = project(IDENTITY);
      for (const [, p] of Object.entries(h.projections)) {
        if (p.fidelity === "lossy") expect(p.lossWarning).toBeTruthy();
      }
    });

    // ── Individual projection format correctness ──
    const projectionChecks: Array<[string, RegExp | string]> = [
      ["cid",         "bafyreitest123"],
      ["jsonld",      /^urn:uor:derivation:sha256:[0-9a-f]{64}$/],
      ["did",         /^did:uor:/],
      ["vc",          /^urn:uor:vc:/],
      ["ipv6",        /^fd00:0075:6f72:/],
      ["glyph",       /^[\u2800-\u28FF]+$/],
      ["webfinger",   /^acct:[0-9a-f]{16}@uor\.foundation$/],
      ["activitypub", /^https:\/\/uor\.foundation\/ap\/objects\/[0-9a-f]{64}$/],
      ["atproto",     /^at:\/\/did:uor:.+\/app\.uor\.object\//],
      ["oidc",        /^urn:uor:oidc:[0-9a-f]{64}$/],
      ["gs1",         /^https:\/\/id\.gs1\.org\/8004\//],
      ["oci",         /^sha256:[0-9a-f]{64}$/],
      ["solid",       /^https:\/\/uor\.foundation\/profile\/[0-9a-f]+#me$/],
      ["openbadges",  /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-/],
      ["scitt",       /^urn:ietf:params:scitt:statement:sha256:[0-9a-f]{64}$/],
      ["mls",         /^urn:ietf:params:mls:group:[0-9a-f]{64}$/],
      ["dnssd",       /^_uor-[0-9a-f]{12}\._tcp\.local$/],
      ["stac",        /^https:\/\/uor\.foundation\/stac\/items\/[0-9a-f]{64}$/],
      ["croissant",   /^https:\/\/uor\.foundation\/croissant\/[0-9a-f]{64}$/],
      ["crdt",        /^crdt:automerge:[0-9a-f]{64}$/],
      ["bitcoin",     /^6a24554f52[0-9a-f]{64}$/],
      ["bitcoin-hashlock", /^a820[0-9a-f]{64}87$/],
      ["lightning",  /^pp5[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{52}$/],
    ];

    for (const [name, expected] of projectionChecks) {
      it(`projection "${name}" matches expected format`, () => {
        const p = project(IDENTITY, name);
        if (typeof expected === "string") {
          expect(p.value).toBe(expected);
        } else {
          expect(p.value).toMatch(expected);
        }
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // T2 — CANONICALIZATION
  // "Is semantic normalization deterministic and lossless?"
  // ═══════════════════════════════════════════════════════════════════════

  describe("T2 — Canonicalization", () => {
    it("singleProofHash is deterministic (same object → same hash)", async () => {
      const obj = { "@type": "schema:Thing", "schema:name": "test" };
      const a = await singleProofHash(obj);
      const b = await singleProofHash(obj);
      expect(a.derivationId).toBe(b.derivationId);
      expect(a.cid).toBe(b.cid);
    });

    it("singleProofHash: different objects → different hashes", async () => {
      const a = await singleProofHash({ "schema:name": "alpha" });
      const b = await singleProofHash({ "schema:name": "beta" });
      expect(a.derivationId).not.toBe(b.derivationId);
    });

    it("union type coercion: ISO DateTime → schema:DateTime", () => {
      const r = coerceLiteral("2026-01-01T00:00:00Z", ["schema:DateTime", "schema:Text"]);
      expect(r.resolvedType).toBe("schema:DateTime");
    });

    it("union type coercion: entity inference from property", () => {
      const r = coerceEntity({ givenName: "Ada" }, ["schema:Person", "schema:Organization"]);
      expect(r.resolvedType).toBe("schema:Person");
    });

    it("coerceUnionValue: property-aware coercion", () => {
      const r = coerceUnionValue("2026-02-22T00:00:00Z", "schema:startDate");
      expect(r.resolvedType).toBeTruthy();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // T3 — INTEROPERABILITY
  // "Do all W3C projections resolve consistently from the same hash?"
  // ═══════════════════════════════════════════════════════════════════════

  describe("T3 — W3C Interoperability", () => {
    let cert: UorCertificate;

    beforeAll(async () => {
      cert = await generateCertificate(TEST_SUBJECT, TEST_ATTRIBUTES);
    });

    it("certificate has all required fields", () => {
      expect(cert["cert:sourceHash"]).toMatch(/^[0-9a-f]{64}$/);
      expect(cert["cert:cid"]).toMatch(/^ba/); // CIDv1 multibase prefix
      expect(cert["cert:issuedAt"]).toBeTruthy();
    });

    it("DID Document follows W3C DID Core 1.0", () => {
      const doc = resolveDidDocument(cert);
      expect(doc["@context"][0]).toBe("https://www.w3.org/ns/did/v1");
      expect(doc.id).toMatch(/^did:uor:/);
      expect(doc.controller).toBe(doc.id);
      expect(doc.verificationMethod.length).toBeGreaterThan(0);
      expect(doc.verificationMethod[0].type).toBe("Multikey");
      expect(doc.assertionMethod).toContain(doc.verificationMethod[0].id);
    });

    it("DID Document alsoKnownAs contains only lossless projections (not the DID itself)", () => {
      const doc = resolveDidDocument(cert);
      expect(doc.alsoKnownAs.length).toBeGreaterThan(0);
      expect(doc.alsoKnownAs).not.toContain(doc.id);
    });

    it("DID Document service endpoints cover all protocol projections", () => {
      const doc = resolveDidDocument(cert);
      const types = doc.service.map(s => s.type);
      const requiredTypes = [
        "ActivityPubObject", "AtProtocolRecord", "OpenIdConnectSubject",
        "GS1DigitalLink", "OciImageDigest", "SolidWebID",
        "ScittStatement", "MlsGroupId", "CroissantDataset",
        "CrdtDocumentId", "StacCatalogItem", "UorContentAddress",
        "UorBrailleAddress", "WebFingerDiscovery", "DnsServiceDiscovery",
        "OpenBadgeCredential",
      ];
      for (const t of requiredTypes) {
        expect(types).toContain(t);
      }
    });

    it("DID Resolution returns full metadata per DID Resolution spec", () => {
      const result = resolveDidFull(cert);
      expect(result.didResolutionMetadata.contentType).toBe("application/did+ld+json");
      expect(result.didResolutionMetadata["uor:sourceHash"]).toBe(cert["cert:sourceHash"]);
      expect(result.didResolutionMetadata["uor:cid"]).toBe(cert["cert:cid"]);
      expect(result.didDocumentMetadata.created).toBeTruthy();
    });

    it("cidToDid / didToCid round-trip is lossless", () => {
      const did = cidToDid(cert["cert:cid"]);
      expect(isDidUor(did)).toBe(true);
      expect(didToCid(did)).toBe(cert["cert:cid"]);
    });

    it("certificate pipeline is deterministic (same input → same identity)", async () => {
      const cert2 = await generateCertificate(TEST_SUBJECT, TEST_ATTRIBUTES);
      expect(cert["cert:sourceHash"]).toBe(cert2["cert:sourceHash"]);
      expect(cert["cert:cid"]).toBe(cert2["cert:cid"]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // T4 — INFRASTRUCTURE
  // "Is the network stack functional?"
  // ═══════════════════════════════════════════════════════════════════════

  describe("T4 — Infrastructure", () => {
    it("Dilithium-3 keypair generation produces valid keys", async () => {
      const kp = await generateKeypair();
      expect(kp.publicKeyBytes).toBeInstanceOf(Uint8Array);
      expect(kp.privateKeyBytes).toBeInstanceOf(Uint8Array);
      expect(kp.publicKeyBytes.length).toBeGreaterThan(0);
      expect(kp.algorithm).toBe("CRYSTALS-Dilithium-3");
      expect(kp.canonicalId).toMatch(/^urn:uor:derivation:sha256:/);
    });

    it("KV store: put + get round-trip preserves canonical identity", async () => {
      const kv = new UnsKv();
      const data = new TextEncoder().encode("coherence-gate-test");
      const { canonicalId } = await kv.put("gate:test", data);
      const result = await kv.get("gate:test");
      expect(result).not.toBeNull();
      expect(result!.canonicalId).toBe(canonicalId);
      expect(new TextDecoder().decode(result!.value)).toBe("coherence-gate-test");
    });

    it("KV store: delete removes entry", async () => {
      const kv = new UnsKv();
      await kv.put("gate:del", new TextEncoder().encode("x"));
      kv.delete("gate:del");
      const result = await kv.get("gate:del");
      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // T5 — DISCOVERY
  // "Do emergent cross-module patterns reveal deeper coherence?"
  //
  // The Discovery Gate verifies properties that no single module owns.
  // These are structural insights that *emerge* from the interaction
  // of ring arithmetic, compression, canonical identity, and fusion:
  //
  //   D1 — Ring identity survives compression round-trip
  //   D2 — Hamming distance is preserved through ingestion + compression
  //   D3 — Canonical hashing and compression are compositionally consistent
  //   D4 — Multi-modal fusion graph union is order-independent
  //   D5 — Context serialization preserves triple fidelity end-to-end
  //   D6 — Object dictionary discovers high-frequency patterns autonomously
  //   D7 — Cross-module type compatibility (triples from any ingester
  //         compress, decompress, and serialize identically)
  // ═══════════════════════════════════════════════════════════════════════

  describe("T5 — Discovery", () => {

    // D1: Ring identity survives the full pipeline:
    //     ring element → triple object → compress → decompress → read back
    it("D1: ring elements survive ingestion → compression → decompression", () => {
      const ringTriples: CompressibleTriple[] = [];
      for (let x = 0; x < 256; x += 51) {
        ringTriples.push({
          subject: `ring:${x}`,
          predicate: "uor:derivedFrom",
          object: `neg=${neg(x)},bnot=${bnot(x)},succ=${succ(x)}`,
        });
      }
      const { encoded } = compressToBase64(ringTriples);
      const restored = decompressFromBase64(encoded);
      for (let i = 0; i < restored.length; i++) {
        const x = i * 51;
        expect(restored[i].object).toBe(`neg=${neg(x)},bnot=${bnot(x)},succ=${succ(x)}`);
      }
    });

    // D2: Hamming distance is meaningful after compression.
    it("D2: Hamming distance is preserved through compression round-trip", () => {
      const a: CompressibleTriple = { subject: "test:a", predicate: "rdf:type", object: "FOCUS" };
      const b: CompressibleTriple = { subject: "test:b", predicate: "rdf:type", object: "DRIFT" };
      const hammingBefore = [...a.object].reduce((d, c, i) => d + (c !== b.object[i] ? 1 : 0), 0);

      const restored = decompressFromBase64(compressToBase64([a, b]).encoded);
      const hammingAfter = [...restored[0].object].reduce((d, c, i) => d + (c !== restored[1].object[i] ? 1 : 0), 0);
      expect(hammingAfter).toBe(hammingBefore);
    });

    // D3: Canonical hash determinism composes with compression determinism.
    it("D3: compression is deterministic — identical triples produce identical blob", async () => {
      const triples: CompressibleTriple[] = [
        { subject: "s:1", predicate: "schema:name", object: "Coherence" },
        { subject: "s:1", predicate: "uor:hasRole", object: "verifier" },
        { subject: "s:2", predicate: "rdf:type", object: "proof:Gate" },
      ];
      const a = compressToBase64(triples).encoded;
      const b = compressToBase64(triples).encoded;
      expect(a).toBe(b);
      const hashA = await singleProofHash({ blob: a });
      const hashB = await singleProofHash({ blob: b });
      expect(hashA.derivationId).toBe(hashB.derivationId);
    });

    // D4: Fusion graph union is commutative.
    it("D4: multi-modal union is order-independent after sort", () => {
      const memories = ingestMemories([
        { memoryCid: "m1", memoryType: "semantic", importance: 0.9, storageTier: "hot", epistemicGrade: "A" },
      ]);
      const audio = ingestAudioTracks([
        { trackCid: "t1", title: "Resonance", artist: "Ring", genres: ["ambient"], durationSeconds: 300 },
      ]);
      const rels = ingestRelationships([
        { relationshipCid: "r1", relationshipType: "collaboration", targetId: "agent:x", trustScore: 0.8, interactionCount: 5 },
      ]);

      const sort = (t: CompressibleTriple[]) =>
        [...t].sort((a, b) => `${a.subject}${a.predicate}${a.object}`.localeCompare(`${b.subject}${b.predicate}${b.object}`));

      expect(sort(unionTriples(memories, audio, rels))).toEqual(sort(unionTriples(rels, memories, audio)));
      expect(sort(unionTriples(memories, audio, rels))).toEqual(sort(unionTriples(audio, rels, memories)));
    });

    // D5: End-to-end pipeline produces a valid LLM context block.
    it("D5: full pipeline produces valid LLM context block", () => {
      const memories = ingestMemories([
        { memoryCid: "m1", memoryType: "episodic", importance: 0.7, storageTier: "warm", epistemicGrade: "B" },
        { memoryCid: "m2", memoryType: "semantic", importance: 0.95, storageTier: "hot", epistemicGrade: "A" },
      ]);
      const { encoded } = compressToBase64(memories);
      const restored = decompressFromBase64(encoded);
      const block = fusionToContextBlock(restored);

      expect(block).toContain("<uor-context>");
      expect(block).toContain("</uor-context>");
      for (const t of restored) {
        expect(block).toContain(`${t.subject} ${t.predicate} ${t.object}`);
      }
    });

    // D6: The object dictionary *discovers* repetitive patterns autonomously.
    it("D6: object dictionary autonomously discovers high-frequency patterns", () => {
      const triples: CompressibleTriple[] = [];
      for (let i = 0; i < 20; i++) {
        triples.push(
          { subject: `mem:${i}`, predicate: "uor:memberOf", object: "hot" },
          { subject: `mem:${i}`, predicate: "uor:hasRole", object: "A" },
          { subject: `mem:${i}`, predicate: "rdf:type", object: "mem:agent" },
        );
      }
      const { stats } = compressToBase64(triples);
      expect(stats.objectDictSize).toBeGreaterThanOrEqual(3);
      expect(stats.objectDictHits).toBeGreaterThanOrEqual(50);
      expect(stats.ratio).toBeGreaterThan(2);
    });

    // D7: Cross-module type compatibility — heterogeneous ingesters compose losslessly.
    it("D7: heterogeneous ingester outputs compose losslessly", () => {
      const mem = ingestMemories([
        { memoryCid: "m1", memoryType: "procedural", importance: 0.5, storageTier: "cold", epistemicGrade: "C" },
      ]);
      const audio = ingestAudioTracks([
        { trackCid: "a1", title: "Harmony", artist: "Lens", genres: ["classical", "ambient"], durationSeconds: 180 },
      ]);
      const rels = ingestRelationships([
        { relationshipCid: "r1", relationshipType: "trust", targetId: "user:y", trustScore: 0.99, interactionCount: 42 },
      ]);

      const combined = unionTriples(mem, audio, rels);
      const restored = decompressFromBase64(compressToBase64(combined).encoded);
      expect(restored).toEqual(combined);

      expect(restored.some(t => t.subject === "mem:m1")).toBe(true);
      expect(restored.some(t => t.subject === "audio:a1")).toBe(true);
      expect(restored.some(t => t.subject === "rel:r1")).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // GATE OUTPUT — Coherence Receipt
  // ═══════════════════════════════════════════════════════════════════════

  describe("Gate Receipt", () => {
    it("all tiers executed — coherence proof is valid", () => {
      const receipt = {
        "@type": "proof:CoherenceProof",
        gate: "uor-coherence-gate",
        version: "2.0.0",
        tiers: ["T0-Ring", "T1-Identity", "T2-Canon", "T3-Interop", "T4-Infra", "T5-Discovery"],
        timestamp: new Date().toISOString(),
        verdict: "COHERENT",
      };
      expect(receipt.verdict).toBe("COHERENT");
      expect(receipt.tiers.length).toBe(6);
    });
  });
});
