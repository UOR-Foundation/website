/**
 * Q-Sovereignty — Single Entry Point for Sovereign Identity
 * ═════════════════════════════════════════════════════════
 *
 * THE one function to create identity: QSovereignty.genesis()
 *
 * Now derived from genesis/ axioms — zero external crypto deps.
 *
 * @module qkernel/q-sovereignty
 */

import { toHex, encodeUtf8 } from "../genesis/axiom-ring";
import { sha256 } from "../genesis/axiom-hash";
import { createCid } from "../genesis/axiom-cid";
import { canonicalEncode } from "../genesis/axiom-codec";
import type { CanonicalIdentity as UorCanonicalIdentity } from "../platform/identity-types";
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
import { signalBus } from "@/hologram/genesis/axiom-signal";

// ═══════════════════════════════════════════════════════════════════════
// Types (unchanged)
// ═══════════════════════════════════════════════════════════════════════

export interface AuthUser {
  readonly id: string;
  readonly email?: string;
  readonly displayName?: string;
}

export interface SovereignIdentity {
  readonly identity: UorCanonicalIdentity;
  readonly threeWordName: ThreeWordName;
  readonly ceremonyCid: string;
  readonly signedCeremony: SignedCeremony;
  readonly pid: 0;
  readonly capabilityToken: CapabilityToken;
  readonly authBinding: {
    readonly userId: string;
    readonly boundAt: string;
    readonly bindingHash: string;
  };
  readonly collapseIntact: boolean;
  readonly sessionEntryCid: string;
  readonly hashBytes: Uint8Array;
}

export interface GenesisResult {
  readonly sovereign: SovereignIdentity;
  readonly ceremony: CeremonyResult;
  readonly isNewIdentity: boolean;
}

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
  private sessionChain: string[] = [];

  constructor(fs: QFs, security: QSecurity, ecc: QEcc) {
    this.fs = fs;
    this.security = security;
    this.ecc = ecc;
  }

  /**
   * genesis — Create or resume a sovereign identity.
   * Founding ceremony stays async (uses WebCrypto for Dilithium-3 simulation).
   * All hashing is now sync via genesis axioms.
   */
  async genesis(authUser: AuthUser): Promise<GenesisResult> {
    // ── Step 1: ECC Integrity Gate ──
    const testWord = new Array(96).fill(0);
    testWord[0] = 1;
    const encoded = this.ecc.encode(testWord);
    const syndrome = this.ecc.measureSyndrome(encoded);
    if (syndrome.errorDetected) {
      throw new Error("SOVEREIGNTY GENESIS REFUSED: Kernel ECC integrity failure detected.");
    }

    // ── Step 2: Execute Founding Ceremony (async — WebCrypto) ──
    const ceremony = await executeFoundingCeremony([
      { key: "auth-provider", value: "lovable-cloud", visibility: "private" },
      { key: "auth-user-id", value: authUser.id, visibility: "private" },
      ...(authUser.email
        ? [{ key: "email-seed", value: authUser.email, visibility: "private" as const }]
        : []),
    ]);

    // ── Step 3: Verify Observer-Collapse (now sync) ──
    const collapseCheck = verifyCollapseIntegrity(
      ceremony.signedCeremony as unknown as FoundingCeremony
    );
    if (!collapseCheck.intact) {
      throw new Error("SOVEREIGNTY GENESIS REFUSED: Observer-collapse detected.");
    }

    // ── Step 4: Three-word name ──
    const threeWordName = ceremony.threeWordName;

    // ── Step 5: Bind auth user (now sync) ──
    const bindingPayload = canonicalEncode({
      userId: authUser.id,
      canonicalId: ceremony.identity["u:canonicalId"],
      boundAt: new Date().toISOString(),
    });
    const bindingHashBytes = sha256(bindingPayload);
    const bindingHash = toHex(bindingHashBytes);

    // ── Step 6: Register as PID 0, Ring 0 ──
    const capabilityToken = this.security.registerProcess(0, 0);

    // ── Step 7: Mount identity in Q-FS ──
    this.mountIdentityInode(ceremony);

    // ── Step 8: Session chain entry (now sync) ──
    const sessionEntryCid = this.appendSessionEntry(
      ceremony.identity["u:canonicalId"], "genesis"
    );

    // ── Step 9: Assemble sovereign identity ──
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

    // ── Step 10: Emit to genesis signal bus ──
    signalBus.emit(
      "sovereignty", "genesis",
      new Uint8Array(ceremony.hashBytes.slice(0, 32)),
      new Uint8Array(bindingHashBytes),
    );

    return { sovereign, ceremony, isNewIdentity: true };
  }

  getSovereign(): SovereignIdentity | null { return this.sovereign; }
  getThreeWordName(): ThreeWordName | null { return this.sovereign?.threeWordName ?? null; }

  verifyIntegrity(): CollapseVerification | null {
    if (!this.sovereign) return null;
    return verifyCollapseIntegrity(this.sovereign.signedCeremony as unknown as FoundingCeremony);
  }

  stats(): SovereigntyStats {
    return {
      initialized: this.sovereign !== null,
      pid: 0, ring: 0,
      identityMounted: this.sovereign !== null,
      sessionChainLength: this.sessionChain.length,
      collapseIntact: this.sovereign?.collapseIntact ?? false,
      threeWordName: this.sovereign?.threeWordName.display ?? null,
      canonicalId: this.sovereign?.identity["u:canonicalId"] ?? null,
    };
  }

  // ── Internal ────────────────────────────────────────────────────

  private mountIdentityInode(ceremony: CeremonyResult): void {
    const identityPayload = encodeUtf8(JSON.stringify({
      canonicalId: ceremony.identity["u:canonicalId"],
      cid: ceremony.identity["u:cid"],
      ipv6: ceremony.identity["u:ipv6"],
      glyph: ceremony.identity["u:glyph"],
      threeWord: ceremony.threeWordName.display,
      ceremonyCid: ceremony.ceremonyCid,
    }));
    this.fs.mkdir("/", "sovereign", 0);
    this.fs.createFile("/sovereign", "identity", identityPayload, 0);
  }

  private appendSessionEntry(canonicalId: string, action: string): string {
    const parentCid = this.sessionChain.length > 0
      ? this.sessionChain[this.sessionChain.length - 1]
      : null;

    const entryBytes = canonicalEncode({
      canonicalId, action, parentCid,
      sequence: this.sessionChain.length,
      timestamp: new Date().toISOString(),
    });
    const hashBytes = sha256(entryBytes);
    const entryCid = createCid(hashBytes).string;

    this.sessionChain.push(entryCid);
    return entryCid;
  }
}
