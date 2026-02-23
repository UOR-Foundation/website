/**
 * UoR Name Service (UNS) — Type System
 *
 * Decentralized name resolution types aligned with the UOR ontology.
 * UNS maps human-readable names to UOR content-addressed identities
 * (derivation_id, CIDv1, Braille address, IPv6 ULA), providing
 * DNS-equivalent services without centralised authority.
 *
 * All types use UOR ontology namespaces (uns:, u:, cert:, store:).
 */

import type { UorAddress, EpistemicGrade } from "@/types/uor";

// ── Record Types ────────────────────────────────────────────────────────────

/**
 * UNS record types — analogous to DNS record types but content-addressed.
 *
 *   UAAA  — maps a name to a UOR IPv6 address (like DNS A/AAAA)
 *   UCID  — maps a name to a CIDv1 content identifier (like DNS CNAME → content)
 *   UGLP  — maps a name to a UOR Braille glyph address
 *   UPTR  — reverse resolution: IPv6 → name (like DNS PTR)
 *   UTXT  — arbitrary metadata attached to a name (like DNS TXT)
 *   UCRT  — certificate record: links a name to its verification certificate
 *   USOA  — zone authority record (like DNS SOA)
 */
export type UnsRecordType =
  | "uns:UAAA"
  | "uns:UCID"
  | "uns:UGLP"
  | "uns:UPTR"
  | "uns:UTXT"
  | "uns:UCRT"
  | "uns:USOA";

// ── Core Records ────────────────────────────────────────────────────────────

/** A single UNS record — the atomic unit of the name service. */
export interface UnsRecord {
  "@type": "uns:Record";
  /** Globally unique record identifier (URN format). */
  recordId: string;
  /** The human-readable name being resolved (e.g., "atlas.uor.foundation"). */
  name: string;
  /** Record type classification. */
  recordType: UnsRecordType;
  /** The resolved value — content varies by record type. */
  value: string;
  /** TTL in seconds — advisory, since content-addressed records are immutable. */
  ttl: number;
  /** Epistemic grade of the record's provenance. */
  epistemicGrade: EpistemicGrade;
  /** UOR derivation ID certifying this record's content. */
  derivationId: string;
  /** ISO-8601 timestamp of record creation. */
  createdAt: string;
  /** ISO-8601 timestamp of last verification. */
  verifiedAt: string;
}

// ── Zone Management ─────────────────────────────────────────────────────────

/** A UNS zone — analogous to a DNS zone, but self-certifying. */
export interface UnsZone {
  "@type": "uns:Zone";
  /** Zone identifier (derivation-based). */
  zoneId: string;
  /** Zone origin (e.g., "uor.foundation"). */
  origin: string;
  /** UOR address of the zone authority. */
  authority: UorAddress;
  /** IPv6 ULA prefix for this zone (fd00:0075:6f72::/48). */
  ipv6Prefix: string;
  /** Certificate ID for zone integrity. */
  certificateId: string;
  /** Number of records in the zone. */
  recordCount: number;
  /** ISO-8601 timestamp of zone creation. */
  createdAt: string;
}

// ── Resolution ──────────────────────────────────────────────────────────────

/** Forward resolution request. */
export interface UnsResolveRequest {
  /** The name to resolve. */
  name: string;
  /** Optional: filter by record type. */
  recordType?: UnsRecordType;
}

/** Forward resolution response. */
export interface UnsResolveResponse {
  "@type": "uns:ResolveResponse";
  /** The queried name. */
  name: string;
  /** Matched records. */
  records: UnsRecord[];
  /** IPv6 ULA address (if UAAA record exists). */
  ipv6?: string;
  /** CIDv1 content identifier (if UCID record exists). */
  cid?: string;
  /** Braille glyph address (if UGLP record exists). */
  glyph?: UorAddress;
  /** Whether all returned records have valid certificates. */
  verified: boolean;
  /** Resolution timestamp. */
  resolvedAt: string;
}

/** Reverse resolution: IPv6 → name. */
export interface UnsReverseResolveRequest {
  /** The IPv6 ULA address to reverse-resolve. */
  ipv6: string;
}

export interface UnsReverseResolveResponse {
  "@type": "uns:ReverseResolveResponse";
  ipv6: string;
  name: string | null;
  record: UnsRecord | null;
  verified: boolean;
  resolvedAt: string;
}

// ── Registration ────────────────────────────────────────────────────────────

/** Request to register a new name in UNS. */
export interface UnsRegisterRequest {
  /** The name to register. */
  name: string;
  /** The zone to register under. */
  zoneId: string;
  /** Record type to create. */
  recordType: UnsRecordType;
  /** The value for the record. */
  value: string;
  /** Optional TTL override (default: 3600). */
  ttl?: number;
}

export interface UnsRegisterResponse {
  "@type": "uns:RegisterResponse";
  record: UnsRecord;
  zone: UnsZone;
  certificate: UnsCertificate;
}

// ── Certification ───────────────────────────────────────────────────────────

/** Certificate proving the integrity of a UNS record or zone. */
export interface UnsCertificate {
  "@type": "cert:UnsCertificate";
  certificateId: string;
  /** The subject being certified (record ID or zone ID). */
  subject: string;
  /** Derivation ID used to verify content integrity. */
  derivationId: string;
  /** UOR content address of the certified subject. */
  uorAddress: UorAddress;
  /** IPv6 ULA address of the certified subject. */
  ipv6Address: string;
  /** CIDv1 of the certified subject. */
  cid: string;
  /** Epistemic grade of the certificate. */
  epistemicGrade: EpistemicGrade;
  /** ISO-8601 issuance timestamp. */
  issuedAt: string;
  /** Whether the certificate is currently valid. */
  valid: boolean;
}

// ── Health & Status ─────────────────────────────────────────────────────────

/** UNS module health check. */
export interface UnsHealth {
  "@type": "uns:Health";
  status: "healthy" | "degraded" | "failed";
  zoneCount: number;
  recordCount: number;
  certificateCount: number;
  lastVerifiedAt: string;
}
