/**
 * UOR Certificate Module
 * ══════════════════════════════════════════════════════════════════════
 *
 * A self-contained, self-documenting module for encoding, decoding,
 * and verifying UOR Certificates of Authenticity.
 *
 * ── WHAT THIS MODULE DOES ──────────────────────────────────────────
 *
 * Every piece of content in the UOR framework has a unique identity
 * derived from what it IS, not where it LIVES. This module provides
 * the tools to:
 *
 *   1. ENCODE  — Generate a certificate for any JSON-LD object
 *   2. DECODE  — Extract and interpret certificate fields
 *   3. VERIFY  — Independently confirm that content is untampered
 *
 * ── WHY THIS MATTERS ───────────────────────────────────────────────
 *
 * Traditional verification requires trusting a third party:
 *   - Certificate authorities for HTTPS
 *   - Platform signatures for app stores
 *   - Database records for document authenticity
 *
 * UOR certificates are SELF-VERIFYING:
 *   - The fingerprint is derived from the content itself
 *   - Anyone can re-derive it independently
 *   - No external authority is needed
 *   - Tampering is mathematically detectable
 *
 * ── HOW IT WORKS ───────────────────────────────────────────────────
 *
 * The verification pipeline:
 *
 *   Content → Canonicalize (URDNA2015) → SHA-256 → Identity
 *
 *   1. The content is serialized into a canonical form (N-Quads)
 *      using the W3C URDNA2015 algorithm. This ensures identical
 *      content always produces identical bytes, regardless of
 *      JSON key order or whitespace.
 *
 *   2. The canonical bytes are hashed with SHA-256, producing
 *      a 256-bit fingerprint.
 *
 *   3. From this single hash, four identity forms are derived:
 *      - Derivation ID  (hex representation)
 *      - CID            (IPFS-compatible content identifier)
 *      - UOR Address    (Braille bijection for visual encoding)
 *      - IPv6 Address   (routable network endpoint)
 *
 *   4. A human-readable TRIWORD is derived from the hash:
 *      three words mapping to Observer · Observable · Context
 *      (e.g., "Meadow · Steep · Keep")
 *
 * ── VERIFICATION CONTRACT ──────────────────────────────────────────
 *
 * To verify a certificate:
 *   1. Take the stored canonical payload (N-Quads string)
 *   2. Re-hash it with SHA-256
 *   3. Encode as CIDv1
 *   4. Compare against the stored CID
 *
 * If they match → content is authentic and untampered.
 * If they differ → content has been modified.
 *
 * This can be done by ANYONE, ANYWHERE, with no special access.
 *
 * ── UOR FRAMEWORK COMPLIANCE ───────────────────────────────────────
 *
 * ✓ Content-addressed — identity derived from content
 * ✓ Self-verifying — no external authority needed
 * ✓ Deterministic — same content always yields same certificate
 * ✓ URDNA2015 — W3C standard canonicalization
 * ✓ Triality-aligned — triword maps to Observer/Observable/Context
 * ✓ Lossless — canonical payload preserved for re-verification
 *
 * @module certificate
 * @version 1.0.0
 */

// ── Public API ──────────────────────────────────────────────────────────────

export { generateCertificate, generateCertificates } from "./generate";
export type { UorCertificate, CompactBoundary, CoherenceWitness } from "./types";
export { verifyCertificate, verifyCertificateFull, type VerificationResult, type FullVerificationResult } from "./verify";
export { decodeCertificate, type DecodedCertificate } from "./decode";
export { certificateToTriword, triwordBreakdown } from "./triword";
export { enforceBoundary, type BoundaryManifest, type BoundaryResult } from "./boundary";
export { deriveCoherenceWitness, verifyCoherenceWitness } from "./coherence";
export { sha256hex, sourceObjectHash, toCompactBoundary } from "./utils";
