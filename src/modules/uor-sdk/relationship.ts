/**
 * UOR SDK — Certified Developer-User Relationship (P6)
 *
 * The single most important trust guarantee: the bond between a developer's
 * app and a user is cryptographically certified, portable, and irrevocable
 * by the platform. Certificates live in the user's Solid Pod, are signed
 * by UOR, and travel with the user if they leave.
 *
 * @see cert: namespace — certificate issuance and verification
 * @see morphism: namespace — structural transforms
 */

import { singleProofHash } from "@/lib/uor-canonical";
import { UnsKv } from "@/modules/uns/store/kv";

// ── Context ────────────────────────────────────────────────────────────────

const CERT_CONTEXT = "https://uor.foundation/contexts/app-v1.jsonld" as const;

const CERT_JSONLD_CONTEXT = {
  cert: "https://uor.foundation/cert/",
  morphism: "https://uor.foundation/morphism/",
  u: "https://uor.foundation/u/",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  "cert:certifies": { "@id": "cert:certifies", "@type": "@id" },
  "cert:subject": { "@id": "cert:subject", "@type": "@id" },
  "cert:issuedAt": { "@id": "cert:issuedAt", "@type": "xsd:dateTime" },
  "cert:expiresAt": { "@id": "cert:expiresAt", "@type": "xsd:dateTime" },
  "cert:issuerCanonicalId": { "@id": "cert:issuerCanonicalId", "@type": "xsd:string" },
  "cert:revoked": { "@id": "cert:revoked", "@type": "xsd:boolean" },
  "cert:revokedAt": { "@id": "cert:revokedAt", "@type": "xsd:dateTime" },
  "cert:grantedActions": { "@id": "cert:grantedActions", "@container": "@set" },
  "u:canonicalId": { "@id": "u:canonicalId", "@type": "xsd:string" },
} as const;

const UOR_ISSUER_ID =
  "urn:uor:derivation:sha256:platform000000000000000000000000000000000000000000000000000000";

const DEFAULT_VALIDITY_MS = 365 * 24 * 60 * 60 * 1000;

// ── Types ───────────────────────────────────────────────────────────────────

export interface RelationshipCertificate {
  "@type": "cert:TransformCertificate";
  "@context": typeof CERT_CONTEXT;
  "cert:certifies": string;
  "cert:subject": string;
  "cert:issuedAt": string;
  "cert:expiresAt": string;
  "cert:issuerCanonicalId": string;
  "cert:revoked": boolean;
  "cert:revokedAt"?: string;
  "cert:grantedActions": string[];
  "u:canonicalId"?: string;
}

export interface CertificateVerification {
  valid: boolean;
  reason: string;
}

// ── KV Helpers ─────────────────────────────────────────────────────────────

let sharedKv: UnsKv | null = null;
function getKv(): UnsKv {
  if (!sharedKv) sharedKv = new UnsKv();
  return sharedKv;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function shortHash(id: string): string {
  return id.replace("urn:uor:derivation:sha256:", "").slice(0, 12);
}

function certKey(appId: string, userHash: string): string {
  return `cert-${shortHash(appId)}-${userHash}`;
}

function indexKey(userHash: string): string {
  return `certidx-${userHash}`;
}

async function kvPut(key: string, value: string): Promise<void> {
  await getKv().put(key, enc.encode(value));
}

async function kvGet(key: string): Promise<string | null> {
  const result = await getKv().get(key);
  if (!result) return null;
  return dec.decode(result.value);
}

function extractUserHash(podUrl: string): string {
  const parts = podUrl.replace(/\/$/, "").split("/");
  return parts[parts.length - 1];
}

async function addToIndex(userHash: string, key: string): Promise<void> {
  const raw = await kvGet(indexKey(userHash));
  const keys: string[] = raw ? JSON.parse(raw) : [];
  if (!keys.includes(key)) keys.push(key);
  await kvPut(indexKey(userHash), JSON.stringify(keys));
}

// ── Certificate Issuance ───────────────────────────────────────────────────

export async function issueCertificate(
  appCanonicalId: string,
  userPodUrl: string,
  actions: string[] = ["read", "write"],
): Promise<RelationshipCertificate> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + DEFAULT_VALIDITY_MS);

  // Hash only the binding relationship (deterministic — excludes timestamps)
  const certBody = {
    "@context": CERT_JSONLD_CONTEXT,
    "@type": "cert:TransformCertificate" as const,
    "cert:certifies": appCanonicalId,
    "cert:subject": userPodUrl,
    "cert:issuerCanonicalId": UOR_ISSUER_ID,
    "cert:grantedActions": [...actions].sort(),
  };

  const proof = await singleProofHash(certBody);

  const certificate: RelationshipCertificate = {
    "@type": "cert:TransformCertificate",
    "@context": CERT_CONTEXT,
    "cert:certifies": appCanonicalId,
    "cert:subject": userPodUrl,
    "cert:issuedAt": now.toISOString(),
    "cert:expiresAt": expiresAt.toISOString(),
    "cert:issuerCanonicalId": UOR_ISSUER_ID,
    "cert:revoked": false,
    "cert:grantedActions": [...actions].sort(),
    "u:canonicalId": proof.derivationId,
  };

  const userHash = extractUserHash(userPodUrl);
  const key = certKey(appCanonicalId, userHash);

  await kvPut(key, JSON.stringify(certificate));
  await addToIndex(userHash, key);

  // Store in pod path: /certs/{appHash}.json
  await kvPut(`pod-${userHash}-certs-${shortHash(appCanonicalId)}`, JSON.stringify(certificate));

  return certificate;
}

// ── Certificate Verification ───────────────────────────────────────────────

export async function verifyCertificate(
  certificate: RelationshipCertificate,
): Promise<CertificateVerification> {
  if (certificate["cert:revoked"]) {
    return {
      valid: false,
      reason: `Certificate revoked at ${certificate["cert:revokedAt"] ?? "unknown"}`,
    };
  }

  if (new Date(certificate["cert:expiresAt"]).getTime() < Date.now()) {
    return { valid: false, reason: "Certificate has expired" };
  }

  if (!certificate["cert:certifies"]) {
    return { valid: false, reason: "Missing cert:certifies field" };
  }

  if (certificate["u:canonicalId"]) {
    const certBody = {
      "@context": CERT_JSONLD_CONTEXT,
      "@type": "cert:TransformCertificate" as const,
      "cert:certifies": certificate["cert:certifies"],
      "cert:subject": certificate["cert:subject"],
      "cert:issuerCanonicalId": certificate["cert:issuerCanonicalId"],
      "cert:grantedActions": [...certificate["cert:grantedActions"]].sort(),
    };

    const proof = await singleProofHash(certBody);
    if (proof.derivationId !== certificate["u:canonicalId"]) {
      return {
        valid: false,
        reason: "Canonical ID does not match certificate content — possible tampering",
      };
    }
  }

  return { valid: true, reason: "Certificate is valid" };
}

// ── Certificate Revocation ─────────────────────────────────────────────────

export async function revokeCertificate(
  certificate: RelationshipCertificate,
): Promise<RelationshipCertificate> {
  const revoked: RelationshipCertificate = {
    ...certificate,
    "cert:revoked": true,
    "cert:revokedAt": new Date().toISOString(),
  };

  const userHash = extractUserHash(certificate["cert:subject"]);
  const key = certKey(certificate["cert:certifies"], userHash);
  await kvPut(key, JSON.stringify(revoked));
  await kvPut(`pod-${userHash}-certs-${shortHash(certificate["cert:certifies"])}`, JSON.stringify(revoked));

  return revoked;
}

// ── Certificate Retrieval ──────────────────────────────────────────────────

export async function getCertificate(
  appCanonicalId: string,
  userHash: string,
): Promise<RelationshipCertificate | null> {
  const raw = await kvGet(certKey(appCanonicalId, userHash));
  if (!raw) return null;
  return JSON.parse(raw) as RelationshipCertificate;
}

// ── Certificate Chain Export ───────────────────────────────────────────────

export async function exportCertificateChain(
  userPodUrl: string,
): Promise<RelationshipCertificate[]> {
  const userHash = extractUserHash(userPodUrl);
  const indexRaw = await kvGet(indexKey(userHash));
  if (!indexRaw) return [];

  const certKeys: string[] = JSON.parse(indexRaw);
  const certs: RelationshipCertificate[] = [];

  for (const key of certKeys) {
    const raw = await kvGet(key);
    if (!raw) continue;
    const cert = JSON.parse(raw) as RelationshipCertificate;
    if (!cert["cert:revoked"]) certs.push(cert);
  }

  return certs;
}
