/**
 * Conformance Group 7: Involution Certificates (cert:InvolutionCertificate)
 *
 * Validates that neg and bnot are true involutions over the full ring,
 * and issues a cert:InvolutionCertificate for each.
 *
 * @see spec/src/namespaces/cert.rs — cert:InvolutionCertificate
 * @see spec/src/namespaces/op.rs — op:Neg, op:Bnot involution property
 */

import { neg, bnot } from "@/lib/uor-ring";
import type { ConformanceGroup } from "./conformance-types";
import { result } from "./conformance-types";

const FIX = "involution_certificates.rs";
const CIT = "spec/src/namespaces/cert.rs — cert:InvolutionCertificate";

export function testInvolutions(): ConformanceGroup {
  // C7.1  neg is an involution: ∀x ∈ Z/256Z, neg(neg(x)) = x
  let negPass = true;
  for (let x = 0; x < 256; x++) {
    if (neg(neg(x)) !== x) { negPass = false; break; }
  }

  // C7.2  bnot is an involution: ∀x ∈ Z/256Z, bnot(bnot(x)) = x
  let bnotPass = true;
  for (let x = 0; x < 256; x++) {
    if (bnot(bnot(x)) !== x) { bnotPass = false; break; }
  }

  // C7.3  cert:InvolutionCertificate.cert:verified = true for both
  const cert = {
    "@type": "cert:InvolutionCertificate",
    "cert:negVerified": negPass,
    "cert:bnotVerified": bnotPass,
    "cert:verified": negPass && bnotPass,
    "cert:ringSize": 256,
  };

  const r = [
    result("C7.1", FIX, "op:Neg", negPass, "neg(neg(x))=x ∀x", negPass ? "256/256 verified" : "FAILED", CIT),
    result("C7.2", FIX, "op:Bnot", bnotPass, "bnot(bnot(x))=x ∀x", bnotPass ? "256/256 verified" : "FAILED", CIT),
    result("C7.3", FIX, "cert:InvolutionCertificate", cert["cert:verified"], true, cert["cert:verified"], CIT),
  ];

  return { id: "involutions", name: "Involution Certificates", fixtureRef: FIX, results: r };
}
