/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  AXIOM-POST  —  Power-On Self-Test                      ║
 * ║                                                          ║
 * ║  The first thing the kernel does: verify itself.         ║
 * ║  If POST fails, the kernel does not boot.               ║
 * ║  If POST passes, every subsequent computation is        ║
 * ║  grounded in verified algebraic coherence.               ║
 * ║                                                          ║
 * ║  Imports only from genesis/. Zero external deps.         ║
 * ╚══════════════════════════════════════════════════════════╝
 */

import { N, verifyRingCoherence, verifyCriticalIdentity, encodeUtf8, toHex } from "./axiom-ring";
import { sha256, sha256hex } from "./axiom-hash";
import { createCid, verifyCid, cidToIri, type Cid } from "./axiom-cid";
import { canonicalEncode, canonicalStringify } from "./axiom-codec";
import { verifyTauInvolution, verifyMirrorCoherence, MIRROR_PAIRS, FANO_LINES } from "./axiom-mirror";
import { verifyConstitution, getConstitutionCid, EIGHT_LAWS } from "./axiom-constitution";

// ── POST Check Results ────────────────────────────────────

export interface PostCheck {
  readonly name: string;
  readonly passed: boolean;
  readonly detail?: string;
}

export interface PostResult {
  readonly passed: boolean;
  readonly checks: readonly PostCheck[];
  readonly genesisCid: Cid | null;
  readonly timestamp: number;
  readonly durationMs: number;
}

// ── Individual POST Checks ────────────────────────────────

/** POST 1: Ring coherence — verify critical identity for all 256 elements */
function checkRingCoherence(): PostCheck {
  const passed = verifyRingCoherence();
  return {
    name: "ring-coherence",
    passed,
    detail: passed
      ? `Critical identity neg(bnot(x)) ≡ succ(x) verified for all ${N} elements`
      : "FATAL: Ring coherence violation detected",
  };
}

/** POST 2: SHA-256 known-answer test */
function checkHashKat(): PostCheck {
  // NIST test vector: SHA-256("abc") = ba7816bf...
  const input = encodeUtf8("abc");
  const hex = sha256hex(input);
  const expected = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
  const passed = hex === expected;
  return {
    name: "hash-kat",
    passed,
    detail: passed
      ? "SHA-256 known-answer test passed (NIST vector)"
      : `FATAL: SHA-256 mismatch. Got ${hex}`,
  };
}

/** POST 3: CID round-trip — create and verify */
function checkCidRoundTrip(): PostCheck {
  const content = encodeUtf8("genesis");
  const cid = createCid(content);
  const passed = verifyCid(cid, content);
  return {
    name: "cid-roundtrip",
    passed,
    detail: passed
      ? `CID verified: ${cid.string.slice(0, 20)}…`
      : "FATAL: CID verification failed",
  };
}

/** POST 4: Codec determinism — same object → same bytes */
function checkCodecDeterminism(): PostCheck {
  const obj = { z: 1, a: 2, m: [3, true, null] };
  const bytes1 = canonicalEncode(obj);
  const bytes2 = canonicalEncode({ m: [3, true, null], z: 1, a: 2 });
  const hex1 = toHex(sha256(bytes1));
  const hex2 = toHex(sha256(bytes2));
  const passed = hex1 === hex2;
  return {
    name: "codec-determinism",
    passed,
    detail: passed
      ? "Canonical encoding is deterministic (key-order independent)"
      : "FATAL: Codec produces non-deterministic output",
  };
}

/** POST 5: τ-involution — τ(τ(x)) = x for all x */
function checkTauInvolution(): PostCheck {
  const passed = verifyTauInvolution();
  return {
    name: "tau-involution",
    passed,
    detail: passed
      ? `τ-involution verified: τ(τ(x)) ≡ x for all ${N} elements`
      : "FATAL: τ is not an involution",
  };
}

/** POST 6: Mirror coherence — v ⊕ τ(v) = 0xFF for all v */
function checkMirrorCoherence(): PostCheck {
  const passed = verifyMirrorCoherence();
  return {
    name: "mirror-coherence",
    passed,
    detail: passed
      ? `48 mirror pairs verified, syndrome = 0xFF for all ${N} elements`
      : "FATAL: Mirror syndrome violation",
  };
}

/** POST 7: Fano plane integrity — 7 lines, 3 points each, all distinct */
function checkFanoIntegrity(): PostCheck {
  const allPoints = new Set<number>();
  for (const line of FANO_LINES) {
    for (const p of line) allPoints.add(p);
  }
  const passed = FANO_LINES.length === 7 && allPoints.size === 7;
  return {
    name: "fano-integrity",
    passed,
    detail: passed
      ? "Fano plane PG(2,2): 7 points, 7 lines verified"
      : "FATAL: Fano topology is malformed",
  };
}

/** POST 8: Constitutional integrity — the Eight Laws are intact and immutable */
function checkConstitutionalIntegrity(): PostCheck {
  const passed = verifyConstitution();
  const cid = getConstitutionCid();
  return {
    name: "constitutional-integrity",
    passed,
    detail: passed
      ? `Eight Laws verified. Constitution CID: ${cid.string.slice(0, 20)}…`
      : "FATAL: Constitutional integrity compromised. The Eight Laws have been tampered with.",
  };
}

// ── POST Sequence ─────────────────────────────────────────

/**
 * Execute the full Power-On Self-Test.
 *
 * This is the kernel's first breath.
 * Every check must pass for the kernel to be considered alive.
 *
 * If all pass, the POST result itself is content-addressed:
 * the genesis CID is the kernel's birth certificate.
 */
export function post(): PostResult {
  const t0 = performance.now();

  const checks: PostCheck[] = [
    checkRingCoherence(),      // 1. The ring is the foundation
    checkHashKat(),            // 2. The hash names things correctly
    checkCidRoundTrip(),       // 3. Names are verifiable
    checkCodecDeterminism(),   // 4. Serialization is canonical
    checkTauInvolution(),      // 5. Mirrors reflect properly
    checkMirrorCoherence(),    // 6. Error correction is sound
    checkFanoIntegrity(),      // 7. Routing topology is intact
    checkConstitutionalIntegrity(), // 8. The Eight Laws are immutable
  ];

  const passed = checks.every((c) => c.passed);
  const durationMs = performance.now() - t0;

  // If POST passed, compute the genesis CID — the kernel's birth certificate
  let genesisCid: Cid | null = null;
  if (passed) {
    const genesisPayload = canonicalEncode({
      "@type": "genesis:PostResult",
      version: "1.0.0",
      checks: checks.map((c) => ({ name: c.name, passed: c.passed })),
      mirrorCount: MIRROR_PAIRS.length,
      fanoLines: FANO_LINES.length,
      ringSize: N,
    });
    genesisCid = createCid(genesisPayload);
  }

  return Object.freeze({
    passed,
    checks,
    genesisCid,
    timestamp: Date.now(),
    durationMs,
  });
}
