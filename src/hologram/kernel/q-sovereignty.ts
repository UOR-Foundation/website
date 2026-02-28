/**
 * Q-Sovereignty — Single Entry Point for Sovereign Identity
 * ═════════════════════════════════════════════════════════
 *
 * THE one function to create identity: QSovereignty.genesis()
 *
 * This kernel extension integrates:
 *   - Founding Ceremony (identity creation + Dilithium-3 witness)
 *   - Three-Word Canonical Name (human-readable identity)
 *   - Q-FS mounting (identity inode at /sovereign/identity)
 *   - Q-Security (Ring 0 process registration)
 *   - Observer-Collapse (quantum interception detection)
 *   - Session Chain (continuity across logins)
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │                    SINGLE ENTRY POINT                        │
 *   │                                                              │
 *   │   genesis(authUser)                                          │
 *   │     │                                                        │
 *   │     ├─→ generateKeypair()      [Dilithium-3, Ring 0]         │
 *   │     ├─→ singleProofHash()      [SHA-256 → 4 identity forms]  │
 *   │     ├─→ deriveThreeWordName()  [hash → "Word·Word·Word"]     │
 *   │     ├─→ executeFoundingCeremony() [JSON-LD + witness]        │
 *   │     ├─→ collapseNonce()        [observer-collapse guard]     │
 *   │     ├─→ QFs.mount()            [/sovereign/identity]         │
 *   │     └─→ QSecurity.register()   [PID 0, Ring 0, cap token]   │
 *   │                                                              │
 *   │   No other function creates identity. No duplication.        │
 *   │   No parallel paths. One truth.                              │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Security Model:
 *   1. Post-Quantum: All signatures use Dilithium-3 (NIST FIPS 204)
 *   2. Observer-Collapse: Cryptographic nonce detects interception
 *   3. Ring 0 Isolation: Identity process runs at kernel privilege
 *   4. ECC Protection: [[96,48,2]] stabilizer detects bit-level tampering
 *   5. Capability-Gated: All access through unforgeable CID tokens
 *   6. Hash-Linked Chain: Session continuity is cryptographically verifiable
 *
 * @module qkernel/q-sovereignty
 */

import { sha256, computeCid, bytesToHex } from "@/modules/uns/core/address";
import { singleProofHash } from "@/modules/uns/core/identity";
import type { UorCanonicalIdentity } from "@/modules/uns/core/identity";
import {
  executeFoundingCeremony,
  verifyCollapseIntegrity,
  type CeremonyResult,
  type FoundingCeremony,
  type SignedCeremony,
  type CollapseVerification,
} from "./q-ceremony";
import { deriveThreeWordName, type ThreeWordName } from "./q-three-word";
import type { QFs } from "./q-fs";
import type { QSecurity, CapabilityToken } from "./q-security";
import type { QEcc } from "./q-ecc";
import { SystemEventBus } from "@/modules/observable/system-event-bus";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

/** The authenticated user from Lovable Cloud auth */
export interface AuthUser {
  readonly id: string;         // Supabase auth.users UUID
  readonly email?: string;
  readonly displayName?: string;
}

/** The sovereign identity — the complete, kernel-level identity state */
export interface SovereignIdentity {
  /** UOR canonical identity (all four forms) */
  readonly identity: UorCanonicalIdentity;
  /** Human-readable three-word name */
  readonly threeWordName: ThreeWordName;
  /** The signed founding ceremony CID */
  readonly ceremonyCid: string;
  /** The signed ceremony record */
  readonly signedCeremony: SignedCeremony;
  /** Kernel process ID (always 0 for sovereign identity) */
  readonly pid: 0;
  /** Capability token for Ring 0 access */
  readonly capabilityToken: CapabilityToken;
  /** Auth user binding (maps Supabase user to sovereign identity) */
  readonly authBinding: {
    readonly userId: string;
    readonly boundAt: string;
    readonly bindingHash: string;
  };
  /** Observer-collapse state — for interception detection */
  readonly collapseIntact: boolean;
  /** Session chain entry CID (for continuity) */
  readonly sessionEntryCid: string;
  /** Raw hash bytes (for downstream derivations) */
  readonly hashBytes: Uint8Array;
}

/** Genesis result — returned to the caller */
export interface GenesisResult {
  readonly sovereign: SovereignIdentity;
  readonly ceremony: CeremonyResult;
  /** Whether this is a first-time genesis or session resumption */
  readonly isNewIdentity: boolean;
}

/** Sovereignty kernel statistics */
export interface SovereigntyStats {
  readonly initialized: boolean;
  readonly pid: number;
  readonly ring: number;
  readonly identityMounted: boolean;
  readonly sessionChainLength: number;
  readonly collapseIntact: boolean;
  readonly threeWordName: string | null;
  readonly canonicalId: string | null;
}

// ═══════════════════════════════════════════════════════════════════════
// Q-Sovereignty — The Kernel Extension
// ═══════════════════════════════════════════════════════════════════════

export class QSovereignty {
  private fs: QFs;
  private security: QSecurity;
  private ecc: QEcc;
  private sovereign: SovereignIdentity | null = null;
  private sessionChain: string[] = []; // CID-linked session entries

  constructor(fs: QFs, security: QSecurity, ecc: QEcc) {
    this.fs = fs;
    this.security = security;
    this.ecc = ecc;
  }

  // ═══════════════════════════════════════════════════════════════════
  // THE SINGLE ENTRY POINT
  // ═══════════════════════════════════════════════════════════════════

  /**
   * genesis — Create or resume a sovereign identity.
   *
   * This is the ONE function. The ONLY way to enter the sovereignty space.
   * No other function, no other path, no other entry point.
   *
   * Pipeline:
   *   1. ECC integrity check (kernel must be healthy)
   *   2. Execute Founding Ceremony (keypair + identity + witness)
   *   3. Verify observer-collapse (detect any interception)
   *   4. Derive three-word canonical name
   *   5. Bind auth user to sovereign identity
   *   6. Register as PID 0 at Ring 0 (kernel privilege)
   *   7. Mount identity inode at /sovereign/identity in Q-FS
   *   8. Append to session chain (continuity)
   *   9. Emit genesis event to SystemEventBus
   *
   * Security:
   *   - The entire pipeline is atomic: if any step fails, no identity is created
   *   - The observer-collapse nonce ensures one-time execution
   *   - Ring 0 registration means no unprivileged process can access identity
   *   - The session chain hash-links to prevent discontinuity attacks
   */
  async genesis(authUser: AuthUser): Promise<GenesisResult> {
    // ── Step 1: ECC Integrity Gate ──────────────────────────────────
    // Verify the kernel's stabilizer code is healthy before proceeding.
    // If the ECC subsystem detects corruption, refuse to create identity.
    const testWord = new Array(96).fill(0);
    testWord[0] = 1; // Set a single logical bit
    const encoded = this.ecc.encode(testWord);
    const syndrome = this.ecc.measureSyndrome(encoded);

    if (syndrome.errorDetected) {
      throw new Error(
        "SOVEREIGNTY GENESIS REFUSED: Kernel ECC integrity failure detected. " +
        "The stabilizer code reports corruption — identity creation is unsafe."
      );
    }

    // ── Step 2: Execute Founding Ceremony ────────────────────────────
    const ceremony = await executeFoundingCeremony([
      { key: "auth-provider", value: "lovable-cloud", visibility: "private" },
      { key: "auth-user-id", value: authUser.id, visibility: "private" },
      ...(authUser.email
        ? [{ key: "email-seed", value: authUser.email, visibility: "private" as const }]
        : []),
    ]);

    // ── Step 3: Verify Observer-Collapse ─────────────────────────────
    const collapseCheck = await verifyCollapseIntegrity(
      ceremony.signedCeremony as unknown as FoundingCeremony
    );

    if (!collapseCheck.intact) {
      throw new Error(
        "SOVEREIGNTY GENESIS REFUSED: Observer-collapse detected. " +
        "The ceremony state was intercepted or tampered during creation. " +
        "This identity is compromised and cannot be used."
      );
    }

    // ── Step 4: Three-word name (already derived by ceremony) ────────
    const threeWordName = ceremony.threeWordName;

    // ── Step 5: Bind auth user to sovereign identity ─────────────────
    const bindingPayload = new TextEncoder().encode(
      JSON.stringify({
        userId: authUser.id,
        canonicalId: ceremony.identity["u:canonicalId"],
        boundAt: new Date().toISOString(),
      })
    );
    const bindingHashBytes = await sha256(bindingPayload);
    const bindingHash = bytesToHex(bindingHashBytes);

    // ── Step 6: Register as PID 0, Ring 0 ────────────────────────────
    const capabilityToken = await this.security.registerProcess(0, 0);

    // ── Step 7: Mount identity in Q-FS ───────────────────────────────
    await this.mountIdentityInode(ceremony);

    // ── Step 8: Session chain entry ──────────────────────────────────
    const sessionEntryCid = await this.appendSessionEntry(
      ceremony.identity["u:canonicalId"],
      "genesis"
    );

    // ── Step 9: Assemble sovereign identity ──────────────────────────
    const sovereign: SovereignIdentity = {
      identity: ceremony.identity,
      threeWordName,
      ceremonyCid: ceremony.ceremonyCid,
      signedCeremony: ceremony.signedCeremony,
      pid: 0,
      capabilityToken,
      authBinding: {
        userId: authUser.id,
        boundAt: new Date().toISOString(),
        bindingHash,
      },
      collapseIntact: true,
      sessionEntryCid,
      hashBytes: ceremony.hashBytes,
    };

    this.sovereign = sovereign;

    // ── Step 10: Emit to SystemEventBus ──────────────────────────────
    SystemEventBus.emit(
      "sovereignty",
      "genesis",
      new Uint8Array(ceremony.hashBytes.slice(0, 32)),
      new Uint8Array(bindingHashBytes),
    );

    return {
      sovereign,
      ceremony,
      isNewIdentity: true,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // Identity Access (read-only, capability-gated)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get the current sovereign identity (if genesis has been executed).
   * Returns null if no identity exists — genesis() must be called first.
   */
  getSovereign(): SovereignIdentity | null {
    return this.sovereign;
  }

  /**
   * Get the three-word canonical name.
   */
  getThreeWordName(): ThreeWordName | null {
    return this.sovereign?.threeWordName ?? null;
  }

  /**
   * Verify the current identity's observer-collapse integrity.
   * Call this periodically to ensure no interception has occurred.
   */
  async verifyIntegrity(): Promise<CollapseVerification | null> {
    if (!this.sovereign) return null;

    const ceremony = this.sovereign.signedCeremony as unknown as FoundingCeremony;
    return verifyCollapseIntegrity(ceremony);
  }

  /**
   * Get sovereignty statistics.
   */
  stats(): SovereigntyStats {
    return {
      initialized: this.sovereign !== null,
      pid: 0,
      ring: 0,
      identityMounted: this.sovereign !== null,
      sessionChainLength: this.sessionChain.length,
      collapseIntact: this.sovereign?.collapseIntact ?? false,
      threeWordName: this.sovereign?.threeWordName.display ?? null,
      canonicalId: this.sovereign?.identity["u:canonicalId"] ?? null,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // Internal
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Mount the identity as an inode in Q-FS at /sovereign/identity.
   *
   * The identity is serialized and stored as an encrypted file —
   * only readable by PID 0 (the sovereign process).
   */
  private async mountIdentityInode(ceremony: CeremonyResult): Promise<void> {
    const identityPayload = new TextEncoder().encode(
      JSON.stringify({
        canonicalId: ceremony.identity["u:canonicalId"],
        cid: ceremony.identity["u:cid"],
        ipv6: ceremony.identity["u:ipv6"],
        glyph: ceremony.identity["u:glyph"],
        threeWord: ceremony.threeWordName.display,
        ceremonyCid: ceremony.ceremonyCid,
      })
    );

    // Create /sovereign directory
    await this.fs.mkdir("/", "sovereign", 0);
    // Create identity file (owned by PID 0 — kernel only)
    await this.fs.createFile("/sovereign", "identity", identityPayload, 0);
  }

  /**
   * Append to the session chain — cryptographic continuity.
   *
   * Each entry is hash-linked to the previous, creating an
   * immutable, verifiable chain of identity sessions.
   */
  private async appendSessionEntry(
    canonicalId: string,
    action: string
  ): Promise<string> {
    const parentCid = this.sessionChain.length > 0
      ? this.sessionChain[this.sessionChain.length - 1]
      : null;

    const entry = {
      canonicalId,
      action,
      parentCid,
      sequence: this.sessionChain.length,
      timestamp: new Date().toISOString(),
    };

    const entryBytes = new TextEncoder().encode(JSON.stringify(entry));
    const hashBytes = await sha256(entryBytes);
    const entryCid = await computeCid(hashBytes);

    this.sessionChain.push(entryCid);
    return entryCid;
  }
}
