/**
 * W3C Interoperability Test Suite
 * ════════════════════════════════
 *
 * End-to-end validation that UOR certificates correctly wrap into
 * W3C VC 2.0, resolve as DID Documents, and pass Data Integrity checks.
 */

import { describe, it, expect } from "vitest";
import { generateCertificate } from "../generate";
import {
  wrapAsVerifiableCredential,
  verifyVerifiableCredential,
} from "../vc-envelope";
import {
  resolveDidDocument,
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
    it("wraps a UOR certificate in VC 2.0 structure", async () => {
      const cert = await generateCertificate(TEST_SUBJECT, TEST_ATTRIBUTES);
      const vc = await wrapAsVerifiableCredential(cert);

      // Required VC 2.0 fields
      expect(vc["@context"][0]).toBe("https://www.w3.org/ns/credentials/v2");
      expect(vc.type).toContain("VerifiableCredential");
      expect(vc.type).toContain("UorCertificate");
      expect(vc.issuer).toBeDefined();
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

    it("includes a Data Integrity proof", async () => {
      const cert = await generateCertificate(TEST_SUBJECT, TEST_ATTRIBUTES);
      const vc = await wrapAsVerifiableCredential(cert);

      expect(vc.proof.type).toBe("DataIntegrityProof");
      expect(vc.proof.cryptosuite).toBe("uor-sha256-rdfc-2024");
      expect(vc.proof.proofPurpose).toBe("assertionMethod");
      expect(vc.proof.proofValue).toMatch(/^[0-9a-f]{64}$/); // SHA-256 hex
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

      // Tamper with the proof value
      const tampered = { ...vc, proof: { ...vc.proof, proofValue: "0".repeat(64) } };
      const result = await verifyVerifiableCredential(tampered);

      expect(result.valid).toBe(false);
      expect(result.proofIntegrity).toBe(false);
    });
  });

  // ── DID:UOR Method ────────────────────────────────────────────────────

  describe("DID:UOR Method", () => {
    it("resolves a UOR certificate to a DID Document", async () => {
      const cert = await generateCertificate(TEST_SUBJECT, TEST_ATTRIBUTES);
      const doc = resolveDidDocument(cert);

      expect(doc["@context"][0]).toBe("https://www.w3.org/ns/did/v1");
      expect(doc.id).toBe(`did:uor:${cert["cert:cid"]}`);
      expect(doc.verificationMethod).toHaveLength(1);
      expect(doc.assertionMethod).toHaveLength(1);
      expect(doc.authentication).toHaveLength(1);
      expect(doc.created).toBe(cert["cert:issuedAt"]);
    });

    it("includes content-hash verification method", async () => {
      const cert = await generateCertificate(TEST_SUBJECT, TEST_ATTRIBUTES);
      const doc = resolveDidDocument(cert);
      const vm = doc.verificationMethod[0];

      expect(vm.type).toBe("ContentHashVerification2024");
      expect(vm.controller).toBe(doc.id);
      expect(vm["uor:cid"]).toBe(cert["cert:cid"]);
      expect(vm["uor:hashHex"]).toBe(cert["cert:sourceHash"]);
    });

    it("includes IPv6 service endpoint", async () => {
      const cert = await generateCertificate(TEST_SUBJECT, TEST_ATTRIBUTES);
      const doc = resolveDidDocument(cert);

      expect(doc.service).toHaveLength(1);
      expect(doc.service[0].type).toBe("UorContentAddress");
      expect(doc.service[0].serviceEndpoint).toBe(
        cert["store:ipv6Address"]["u:ipv6"]
      );
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

      // 5. Cross-check: DID verification method references same CID
      expect(did.verificationMethod[0]["uor:cid"]).toBe(cert["cert:cid"]);
    });
  });
});
