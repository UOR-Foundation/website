/**
 * W3C Interoperability Test Suite
 * ════════════════════════════════
 *
 * End-to-end validation that UOR certificates correctly wrap into
 * W3C VC 2.0, resolve as DID Documents, and pass Data Integrity checks.
 *
 * Tests validate against:
 *   - VC Data Model 2.0 (https://www.w3.org/TR/vc-data-model-2.0/)
 *   - Data Integrity 1.0 (https://www.w3.org/TR/vc-data-integrity/)
 *   - DID Core 1.0 (https://www.w3.org/TR/did-core/)
 *   - DID Resolution (https://www.w3.org/TR/did-resolution/)
 */

import { describe, it, expect } from "vitest";
import { generateCertificate } from "../generate";
import {
  wrapAsVerifiableCredential,
  verifyVerifiableCredential,
} from "../vc-envelope";
import {
  resolveDidDocument,
  resolveDidFull,
  cidToDid,
  didToCid,
  isDidUor,
} from "../did";

const TEST_SUBJECT = "project:w3c-test";
const TEST_ATTRIBUTES = {
  "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
  "@type": "cert:TestObject",
  name: "W3C Interoperability Test",
  version: "1.0.0",
};

describe("W3C Interoperability", () => {
  // ── VC 2.0 Envelope ───────────────────────────────────────────────────

  describe("Verifiable Credentials 2.0", () => {
    it("wraps a UOR certificate in VC 2.0 structure (§4)", async () => {
      const cert = await generateCertificate(TEST_SUBJECT, TEST_ATTRIBUTES);
      const vc = await wrapAsVerifiableCredential(cert);

      // Required VC 2.0 fields per §4
      expect(vc["@context"][0]).toBe("https://www.w3.org/ns/credentials/v2");
      expect(vc.type).toContain("VerifiableCredential");
      expect(vc.type).toContain("UorCertificate");
      expect(vc.issuer).toBeDefined();
      expect(vc.issuer.id).toMatch(/^did:uor:/);
      expect(vc.issuer.name).toBe("UOR Foundation");
      expect(vc.validFrom).toBe(cert["cert:issuedAt"]);
      expect(vc.credentialSubject).toBeDefined();
      expect(vc.credentialSubject.id).toMatch(/^did:uor:/);
    });

    it("preserves the full UOR certificate losslessly", async () => {
      const cert = await generateCertificate(TEST_SUBJECT, TEST_ATTRIBUTES);
      const vc = await wrapAsVerifiableCredential(cert);
      const embedded = vc.credentialSubject["uor:certificate"];

      expect(embedded["cert:cid"]).toBe(cert["cert:cid"]);
      expect(embedded["cert:canonicalPayload"]).toBe(cert["cert:canonicalPayload"]);
      expect(embedded["cert:sourceHash"]).toBe(cert["cert:sourceHash"]);
      expect(embedded["cert:coherence"]).toEqual(cert["cert:coherence"]);
    });

    it("includes a Data Integrity proof with multibase proofValue (DI §2.1)", async () => {
      const cert = await generateCertificate(TEST_SUBJECT, TEST_ATTRIBUTES);
      const vc = await wrapAsVerifiableCredential(cert);

      expect(vc.proof.type).toBe("DataIntegrityProof");
      expect(vc.proof.cryptosuite).toBe("uor-sha256-rdfc-2024");
      expect(vc.proof.proofPurpose).toBe("assertionMethod");
      // proofValue MUST be multibase 'f' prefix + hex (DI §2.1)
      expect(vc.proof.proofValue).toMatch(/^f[0-9a-f]{64}$/);
      expect(vc.proof["uor:coherenceIdentity"]).toBe("neg(bnot(x)) ≡ succ(x)");
    });

    it("passes VC verification", async () => {
      const cert = await generateCertificate(TEST_SUBJECT, TEST_ATTRIBUTES);
      const vc = await wrapAsVerifiableCredential(cert);
      const result = await verifyVerifiableCredential(vc);

      expect(result.valid).toBe(true);
      expect(result.vcStructure).toBe(true);
      expect(result.proofIntegrity).toBe(true);
      expect(result.coherenceValid).toBe(true);
    });

    it("detects tampered payload", async () => {
      const cert = await generateCertificate(TEST_SUBJECT, TEST_ATTRIBUTES);
      const vc = await wrapAsVerifiableCredential(cert);

      // Tamper with the proof value (still must be multibase format)
      const tampered = { ...vc, proof: { ...vc.proof, proofValue: "f" + "0".repeat(64) } };
      const result = await verifyVerifiableCredential(tampered);

      expect(result.valid).toBe(false);
      expect(result.proofIntegrity).toBe(false);
    });
  });

  // ── DID:UOR Method ────────────────────────────────────────────────────

  describe("DID:UOR Method", () => {
    it("resolves a UOR certificate to a DID Document (DID Core §5)", async () => {
      const cert = await generateCertificate(TEST_SUBJECT, TEST_ATTRIBUTES);
      const doc = resolveDidDocument(cert);

      // DID Core §4.1: context
      expect(doc["@context"][0]).toBe("https://www.w3.org/ns/did/v1");
      // DID Core §5.1: id
      expect(doc.id).toBe(`did:uor:${cert["cert:cid"]}`);
      // DID Core §5.1.2: controller
      expect(doc.controller).toBe(doc.id);
      // DID Core §5.1.1: alsoKnownAs
      expect(doc.alsoKnownAs).toBeDefined();
      expect(doc.alsoKnownAs.length).toBeGreaterThan(0);
      // DID Core §5.2: verificationMethod
      expect(doc.verificationMethod).toHaveLength(1);
      expect(doc.assertionMethod).toHaveLength(1);
      expect(doc.authentication).toHaveLength(1);
    });

    it("uses Multikey verification method with publicKeyMultibase", async () => {
      const cert = await generateCertificate(TEST_SUBJECT, TEST_ATTRIBUTES);
      const doc = resolveDidDocument(cert);
      const vm = doc.verificationMethod[0];

      // Per DID Core §5.2 and Multikey spec
      expect(vm.type).toBe("Multikey");
      expect(vm.controller).toBe(doc.id);
      // publicKeyMultibase MUST start with multibase prefix
      expect(vm.publicKeyMultibase).toMatch(/^f[0-9a-f]+$/);
      expect(vm.publicKeyMultibase).toBe(`f${cert["cert:sourceHash"]}`);
    });

    it("includes service endpoints derived from hologram projections", async () => {
      const cert = await generateCertificate(TEST_SUBJECT, TEST_ATTRIBUTES);
      const doc = resolveDidDocument(cert);

      expect(doc.service.length).toBeGreaterThanOrEqual(3);
      const types = doc.service.map(s => s.type);
      expect(types).toContain("UorContentAddress");
      expect(types).toContain("UorBrailleAddress");
      // ActivityPub — W3C federated object endpoint
      expect(types).toContain("ActivityPubObject");
      const apService = doc.service.find(s => s.type === "ActivityPubObject")!;
      expect(apService.serviceEndpoint).toMatch(/^https:\/\/uor\.foundation\/ap\/objects\/[0-9a-f]{64}$/);
      // AT Protocol — Bluesky-compatible AT URI
      expect(types).toContain("AtProtocolRecord");
      const atService = doc.service.find(s => s.type === "AtProtocolRecord")!;
      expect(atService.serviceEndpoint).toMatch(/^at:\/\/did:uor:.+\/app\.uor\.object\//);
      expect(atService.id).toMatch(/#atproto$/);
      // OpenID Connect — OIDC subject claim
      expect(types).toContain("OpenIdConnectSubject");
      const oidcService = doc.service.find(s => s.type === "OpenIdConnectSubject")!;
      expect(oidcService.serviceEndpoint).toMatch(/^urn:uor:oidc:[0-9a-f]{64}$/);
      expect(oidcService.id).toMatch(/#oidc$/);
      // DNS-SD / mDNS — local network discovery
      expect(types).toContain("DnsServiceDiscovery");
      const dnssdService = doc.service.find(s => s.type === "DnsServiceDiscovery")!;
      expect(dnssdService.serviceEndpoint).toMatch(/^_uor-[0-9a-f]{12}\._tcp\.local$/);
      expect(dnssdService.id).toMatch(/#dnssd$/);
    });

    it("provides full resolution with metadata (DID Resolution §3)", async () => {
      const cert = await generateCertificate(TEST_SUBJECT, TEST_ATTRIBUTES);
      const result = resolveDidFull(cert);

      // Resolution metadata
      expect(result.didResolutionMetadata.contentType).toBe("application/did+ld+json");
      expect(result.didResolutionMetadata.created).toBe(cert["cert:issuedAt"]);
      expect(result.didResolutionMetadata["uor:cid"]).toBe(cert["cert:cid"]);

      // Document metadata
      expect(result.didDocumentMetadata.created).toBe(cert["cert:issuedAt"]);

      // Document
      expect(result.didDocument.id).toBe(`did:uor:${cert["cert:cid"]}`);
    });

    it("round-trips CID ↔ DID", () => {
      const cid = "baguqeera36eqvryakwfqysyaxq67fyvs526j4a41dw3vcve5qetvni4r2j3a";
      const did = cidToDid(cid);
      expect(did).toBe(`did:uor:${cid}`);
      expect(didToCid(did)).toBe(cid);
    });

    it("validates did:uor format", () => {
      expect(isDidUor("did:uor:baguqeera36")).toBe(true);
      expect(isDidUor("did:web:example.com")).toBe(false);
      expect(isDidUor("did:uor:")).toBe(false);
      expect(isDidUor("not-a-did")).toBe(false);
    });
  });

  // ── Full Pipeline ─────────────────────────────────────────────────────

  describe("Full W3C Pipeline", () => {
    it("generates certificate → wraps VC → resolves DID → verifies", async () => {
      // 1. Generate UOR certificate
      const cert = await generateCertificate(TEST_SUBJECT, TEST_ATTRIBUTES);
      expect(cert["cert:cid"]).toBeDefined();

      // 2. Wrap in W3C VC 2.0
      const vc = await wrapAsVerifiableCredential(cert);
      expect(vc.type).toContain("VerifiableCredential");

      // 3. Resolve DID Document
      const did = resolveDidDocument(cert);
      expect(did.id).toBe(vc.credentialSubject.id);

      // 4. Verify the VC
      const result = await verifyVerifiableCredential(vc);
      expect(result.valid).toBe(true);

      // 5. Cross-check: DID publicKeyMultibase contains source hash
      expect(did.verificationMethod[0].publicKeyMultibase).toBe(
        `f${cert["cert:sourceHash"]}`
      );

      // 6. Cross-check: alsoKnownAs includes CID (hologram projection)
      expect(did.alsoKnownAs).toContain(cert["cert:cid"]);
    });
  });
});
