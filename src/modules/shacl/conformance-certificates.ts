/**
 * Conformance Group 5: Certificates (cert: namespace)
 *
 * Source: conformance/src/tests/fixtures/test4_certificates.rs
 * Validates Dilithium-3 (ML-DSA-65) keypair generation, signing, and verification.
 *
 * @see spec/src/namespaces/cert.rs — Certificate namespace definitions
 */

import {
  generateKeypair,
  signRecord,
  verifyRecord,
} from "@/modules/uns/core/keypair";
import type { ConformanceGroup, ConformanceResult } from "./conformance-types";
import { result } from "./conformance-types";

const FIX = "test4_certificates.rs";
const CIT = "spec/src/namespaces/cert.rs";

export async function testCertificates(): Promise<ConformanceGroup> {
  const results: ConformanceResult[] = [];
  const keypair = await generateKeypair();

  // C5.1  Algorithm is CRYSTALS-Dilithium-3
  results.push(result(
    "C5.1", FIX, "cert:Algorithm",
    keypair.algorithm === "CRYSTALS-Dilithium-3",
    "CRYSTALS-Dilithium-3",
    keypair.algorithm,
    CIT
  ));

  // C5.2  Public key length = 1952 bytes (ML-DSA-65 spec)
  results.push(result(
    "C5.2", FIX, "cert:PublicKey",
    keypair.publicKeyBytes.length === 1952,
    1952,
    keypair.publicKeyBytes.length,
    CIT + " — ML-DSA-65 public key size"
  ));

  // C5.3  signRecord → verifyRecord round-trip: true
  const testRecord = { "@type": "test:Record", "test:value": "hello" };
  const signed = await signRecord(testRecord, keypair);
  const verified = await verifyRecord(signed);
  results.push(result(
    "C5.3", FIX, "cert:Signature",
    verified === true,
    true,
    verified,
    CIT + " — sign → verify round-trip"
  ));

  // C5.4  Tampered field → verifyRecord: false
  const tampered = { ...signed, "test:value": "tampered" } as typeof signed;
  const tamperedVerified = await verifyRecord(tampered);
  results.push(result(
    "C5.4", FIX, "cert:Signature",
    tamperedVerified === false,
    false,
    tamperedVerified,
    CIT + " — tampered record must fail verification"
  ));

  return { id: "certificates", name: "Certificates", fixtureRef: FIX, results };
}
