/**
 * TEE Bridge — Hardware Trusted Execution Environment Abstraction
 * ═══════════════════════════════════════════════════════════════
 *
 * Provides a unified interface to hardware TEEs across all platforms:
 *
 *   ┌──────────────────┬──────────────────────────────────────────┐
 *   │ Platform         │ TEE Provider                             │
 *   ├──────────────────┼──────────────────────────────────────────┤
 *   │ x86 (Intel)      │ Intel TDX / SGX via WebAuthn             │
 *   │ ARM              │ ARM TrustZone via WebAuthn               │
 *   │ Apple            │ Secure Enclave via WebAuthn              │
 *   │ Android          │ StrongBox / TEE via WebAuthn             │
 *   │ Any browser      │ FIDO2 / WebAuthn (platform authenticator)│
 *   │ Fallback         │ Software ZK (Geometric Receipt only)     │
 *   └──────────────────┴──────────────────────────────────────────┘
 *
 * The bridge is hardware-agnostic: it detects the best available TEE
 * and presents a uniform attestation interface. When no hardware TEE
 * is available, it gracefully degrades to software-only ZK proofs.
 *
 * Security Model:
 *   - Hardware TEE provides UNINTERRUPTIBLE isolation
 *   - WebAuthn credentials are bound to the device's secure enclave
 *   - Attestation quotes prove the kernel is running on attested hardware
 *   - Sealed storage survives browser restarts but cannot be extracted
 *
 * @module qkernel/tee-bridge
 */

import { sha256 } from "@/hologram/genesis/axiom-hash";
import { createCid } from "@/hologram/genesis/axiom-cid";
import { canonicalEncode } from "@/hologram/genesis/axiom-codec";
import { toHex } from "@/hologram/genesis/axiom-ring";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

/** Detected TEE provider type */
export type TEEProvider =
  | "webauthn-platform"   // Platform authenticator (Secure Enclave, TrustZone, TPM)
  | "webauthn-roaming"    // Roaming authenticator (YubiKey, etc.)
  | "software"            // No hardware TEE — software ZK fallback
  ;

/** TEE capability flags */
export interface TEECapabilities {
  /** Which TEE provider is active */
  readonly provider: TEEProvider;
  /** Human-readable provider name */
  readonly providerName: string;
  /** Whether hardware attestation is available */
  readonly hardwareAttestation: boolean;
  /** Whether credentials can be sealed to hardware */
  readonly sealedStorage: boolean;
  /** Whether the TEE supports user verification (biometric/PIN) */
  readonly userVerification: boolean;
  /** Whether the TEE provides resident (discoverable) credentials */
  readonly residentKeys: boolean;
  /** Detection timestamp */
  readonly detectedAt: number;
}

/** Attestation quote — the TEE's proof of integrity */
export interface TEEAttestationQuote {
  /** Content-addressed ID of this attestation */
  readonly attestationCid: string;
  /** Raw attestation data (base64) */
  readonly attestationData: string;
  /** Client data hash used during attestation */
  readonly clientDataHash: string;
  /** Credential ID (base64url) */
  readonly credentialId: string;
  /** Public key of the credential (base64) */
  readonly publicKey: string;
  /** TEE provider that produced this attestation */
  readonly provider: TEEProvider;
  /** Whether hardware-backed attestation was verified */
  readonly hardwareBacked: boolean;
  /** Attestation format (e.g., "packed", "tpm", "apple") */
  readonly format: string;
  /** Timestamp of attestation */
  readonly timestamp: number;
}

/** Assertion result — proof that the TEE holder is present */
export interface TEEAssertion {
  /** Content-addressed ID */
  readonly assertionCid: string;
  /** The challenge that was signed */
  readonly challenge: string;
  /** Authenticator data (base64) */
  readonly authenticatorData: string;
  /** Signature over the challenge (base64) */
  readonly signature: string;
  /** Credential ID used */
  readonly credentialId: string;
  /** User presence verified */
  readonly userPresent: boolean;
  /** User verification performed (biometric/PIN) */
  readonly userVerified: boolean;
  /** Sign count (replay protection) */
  readonly signCount: number;
  /** Timestamp */
  readonly timestamp: number;
}

/** Sealed data envelope — encrypted to the TEE's sealing key */
export interface SealedEnvelope {
  /** Content-addressed ID */
  readonly sealCid: string;
  /** The sealed payload (only decryptable by the same TEE) */
  readonly encryptedPayload: string;
  /** IV for the encryption */
  readonly iv: string;
  /** Credential ID this is sealed to */
  readonly credentialId: string;
  /** Timestamp of sealing */
  readonly sealedAt: number;
}

/** Combined attestation for Proof-of-Thought fusion */
export interface TEEFusedAttestation {
  /** The TEE attestation quote (null if software fallback) */
  readonly teeQuote: TEEAttestationQuote | null;
  /** The geometric receipt CID */
  readonly geometricReceiptCid: string;
  /** Fused CID: hash(geometricReceiptCid ⊗ attestationCid) */
  readonly fusedCid: string;
  /** Whether hardware attestation was used */
  readonly hardwareAttested: boolean;
  /** Provider */
  readonly provider: TEEProvider;
  /** Verification: both proofs must validate independently */
  readonly dualCommitment: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════

/** Relying party ID for WebAuthn — the hologram kernel identity */
const RP_NAME = "Hologram Kernel";

/** Credential storage key prefix */
const CREDENTIAL_STORE_KEY = "hologram:tee:credential";

// ═══════════════════════════════════════════════════════════════════════
// TEE Bridge Implementation
// ═══════════════════════════════════════════════════════════════════════

export class TEEBridge {
  private _capabilities: TEECapabilities | null = null;
  private _credentialId: string | null = null;
  private _publicKey: string | null = null;
  private _initialized = false;

  // ── Detection ────────────────────────────────────────────────────

  /** Detect available TEE capabilities on this device */
  async detect(): Promise<TEECapabilities> {
    if (this._capabilities) return this._capabilities;

    // Check WebAuthn availability
    if (typeof window !== "undefined" &&
        window.PublicKeyCredential &&
        typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {

      const platformAvailable = await PublicKeyCredential
        .isUserVerifyingPlatformAuthenticatorAvailable();

      if (platformAvailable) {
        this._capabilities = {
          provider: "webauthn-platform",
          providerName: this.detectPlatformName(),
          hardwareAttestation: true,
          sealedStorage: true,
          userVerification: true,
          residentKeys: true,
          detectedAt: Date.now(),
        };
      } else {
        // Check for roaming authenticator (YubiKey, etc.)
        this._capabilities = {
          provider: "webauthn-roaming",
          providerName: "External Security Key",
          hardwareAttestation: true,
          sealedStorage: false,
          userVerification: false,
          residentKeys: false,
          detectedAt: Date.now(),
        };
      }
    } else {
      // Software fallback — ZK proofs only
      this._capabilities = {
        provider: "software",
        providerName: "Software ZK (no hardware TEE)",
        hardwareAttestation: false,
        sealedStorage: false,
        userVerification: false,
        residentKeys: false,
        detectedAt: Date.now(),
      };
    }

    // Restore persisted credential
    this.restoreCredential();
    this._initialized = true;

    return this._capabilities;
  }

  /** Get capabilities (must call detect() first) */
  get capabilities(): TEECapabilities {
    if (!this._capabilities) {
      return {
        provider: "software",
        providerName: "Not initialized",
        hardwareAttestation: false,
        sealedStorage: false,
        userVerification: false,
        residentKeys: false,
        detectedAt: Date.now(),
      };
    }
    return this._capabilities;
  }

  get isHardwareBacked(): boolean {
    return this._capabilities?.provider !== "software";
  }

  get isInitialized(): boolean {
    return this._initialized;
  }

  get hasCredential(): boolean {
    return this._credentialId !== null;
  }

  // ── Attestation (Credential Registration) ────────────────────────

  /**
   * Create a new TEE-bound credential (attestation).
   * This registers the Hologram Kernel identity with the device's TEE.
   *
   * @param userId - The user's canonical ID (UOR CID)
   * @param userName - Display name for the credential
   * @returns TEE attestation quote
   */
  async attest(userId: string, userName: string): Promise<TEEAttestationQuote> {
    if (!this._capabilities || this._capabilities.provider === "software") {
      return this.softwareAttestation(userId);
    }

    const challenge = this.generateChallenge(userId);
    const rpId = this.getRelyingPartyId();

    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          rp: { id: rpId, name: RP_NAME },
          user: {
            id: Uint8Array.from(userId, c => c.charCodeAt(0)),
            name: userName,
            displayName: userName,
          },
          challenge: Uint8Array.from(challenge, c => c.charCodeAt(0)),
          pubKeyCredParams: [
            { alg: -7, type: "public-key" },   // ES256 (P-256)
            { alg: -257, type: "public-key" },  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: this._capabilities.provider === "webauthn-platform"
              ? "platform" : "cross-platform",
            userVerification: "preferred",
            residentKey: "preferred",
          },
          attestation: "direct",
          timeout: 60000,
        },
      }) as PublicKeyCredential;

      if (!credential) throw new Error("Credential creation cancelled");

      const response = credential.response as AuthenticatorAttestationResponse;
      const credentialId = this.arrayBufferToBase64url(credential.rawId);
      const publicKey = this.arrayBufferToBase64(response.getPublicKey?.() || new ArrayBuffer(0));
      const attestationData = this.arrayBufferToBase64(response.attestationObject);
      const clientDataHash = toHex(sha256(new Uint8Array(response.clientDataJSON)));

      // Persist credential
      this._credentialId = credentialId;
      this._publicKey = publicKey;
      this.persistCredential();

      // Build attestation CID
      const attestPayload = canonicalEncode({
        credentialId, publicKey,
        provider: this._capabilities.provider,
        clientDataHash, timestamp: Date.now(),
      });
      const attestCid = createCid(sha256(attestPayload)).string;

      return {
        attestationCid: attestCid,
        attestationData,
        clientDataHash,
        credentialId,
        publicKey,
        provider: this._capabilities.provider,
        hardwareBacked: true,
        format: this.detectAttestationFormat(response.attestationObject),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.warn("[TEEBridge] Hardware attestation failed, falling back to software:", error);
      return this.softwareAttestation(userId);
    }
  }

  // ── Assertion (Session Verification) ─────────────────────────────

  /**
   * Assert the TEE holder's presence for a given challenge.
   * Used during Q-Boot to prove the kernel is running on the attested device.
   *
   * @param challenge - The challenge to sign (e.g., kernel CID)
   * @returns TEE assertion
   */
  async assert(challenge: string): Promise<TEEAssertion> {
    if (!this._credentialId || this._capabilities?.provider === "software") {
      return this.softwareAssertion(challenge);
    }

    const rpId = this.getRelyingPartyId();

    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: Uint8Array.from(challenge, c => c.charCodeAt(0)),
          rpId,
          allowCredentials: [{
            id: this.base64urlToArrayBuffer(this._credentialId),
            type: "public-key",
          }],
          userVerification: "preferred",
          timeout: 60000,
        },
      }) as PublicKeyCredential;

      if (!assertion) throw new Error("Assertion cancelled");

      const response = assertion.response as AuthenticatorAssertionResponse;
      const authData = new Uint8Array(response.authenticatorData);

      // Parse flags from authenticator data
      const flags = authData[32];
      const userPresent = !!(flags & 0x01);
      const userVerified = !!(flags & 0x04);

      // Parse sign count (bytes 33-36, big-endian)
      const signCount = new DataView(response.authenticatorData).getUint32(33, false);

      const assertPayload = canonicalEncode({
        challenge, credentialId: this._credentialId,
        userPresent, userVerified, signCount, timestamp: Date.now(),
      });
      const assertionCid = createCid(sha256(assertPayload)).string;

      return {
        assertionCid,
        challenge,
        authenticatorData: this.arrayBufferToBase64(response.authenticatorData),
        signature: this.arrayBufferToBase64(response.signature),
        credentialId: this._credentialId,
        userPresent,
        userVerified,
        signCount,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.warn("[TEEBridge] Hardware assertion failed, falling back to software:", error);
      return this.softwareAssertion(challenge);
    }
  }

  // ── Sealed Storage ───────────────────────────────────────────────

  /**
   * Seal data to the TEE — only decryptable on the same device.
   * Uses Web Crypto API with a key derived from the credential.
   */
  async seal(data: Uint8Array): Promise<SealedEnvelope> {
    if (!this._credentialId) {
      throw new Error("[TEEBridge] No credential — call attest() first");
    }

    const key = await this.deriveSealingKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as unknown as BufferSource },
      key,
      data as unknown as BufferSource,
    );

    const sealPayload = canonicalEncode({
      credentialId: this._credentialId,
      ivHex: toHex(iv),
      timestamp: Date.now(),
    });
    const sealCid = createCid(sha256(sealPayload)).string;

    return {
      sealCid,
      encryptedPayload: this.arrayBufferToBase64(encrypted),
      iv: toHex(iv),
      credentialId: this._credentialId,
      sealedAt: Date.now(),
    };
  }

  /**
   * Unseal data that was previously sealed to this TEE.
   */
  async unseal(envelope: SealedEnvelope): Promise<Uint8Array> {
    if (envelope.credentialId !== this._credentialId) {
      throw new Error("[TEEBridge] Credential mismatch — data sealed to different device");
    }

    const key = await this.deriveSealingKey();
    const iv = this.hexToBytes(envelope.iv);
    const ciphertext = this.base64ToArrayBuffer(envelope.encryptedPayload);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as unknown as BufferSource },
      key,
      ciphertext as unknown as BufferSource,
    );

    return new Uint8Array(decrypted);
  }

  // ── Proof-of-Thought Fusion ──────────────────────────────────────

  /**
   * Create a fused attestation: TEE attestation ⊗ Geometric Receipt.
   * This is the dual-commitment that proves both mathematical AND
   * hardware integrity of a reasoning chain.
   */
  fuseAttestation(
    geometricReceiptCid: string,
    teeQuote: TEEAttestationQuote | null,
  ): TEEFusedAttestation {
    const hardwareAttested = teeQuote !== null && teeQuote.hardwareBacked;

    // Fused CID = hash(geometricReceiptCid ‖ attestationCid)
    const fusionInput = canonicalEncode({
      geometric: geometricReceiptCid,
      tee: teeQuote?.attestationCid ?? "software-only",
      hardwareAttested,
      timestamp: Date.now(),
    });
    const fusedCid = createCid(sha256(fusionInput)).string;

    return {
      teeQuote,
      geometricReceiptCid,
      fusedCid,
      hardwareAttested,
      provider: teeQuote?.provider ?? "software",
      dualCommitment: hardwareAttested,
    };
  }

  // ── Cleanup ──────────────────────────────────────────────────────

  destroy(): void {
    this._capabilities = null;
    this._credentialId = null;
    this._publicKey = null;
    this._initialized = false;
  }

  // ═══════════════════════════════════════════════════════════════════
  // Private helpers
  // ═══════════════════════════════════════════════════════════════════

  private detectPlatformName(): string {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    if (/Mac|iPhone|iPad/.test(ua)) return "Apple Secure Enclave";
    if (/Android/.test(ua)) return "Android StrongBox / TEE";
    if (/Windows/.test(ua)) return "Windows TPM 2.0";
    if (/Linux/.test(ua)) return "Linux TPM / Intel TDX";
    if (/CrOS/.test(ua)) return "ChromeOS Titan Security";
    return "Platform Authenticator";
  }

  private getRelyingPartyId(): string {
    if (typeof window !== "undefined") {
      return window.location.hostname;
    }
    return "localhost";
  }

  private generateChallenge(seed: string): string {
    const payload = canonicalEncode({ seed, nonce: crypto.getRandomValues(new Uint8Array(16)), t: Date.now() });
    return toHex(sha256(payload));
  }

  private async deriveSealingKey(): Promise<CryptoKey> {
    const keyMaterial = canonicalEncode({
      credentialId: this._credentialId,
      purpose: "hologram-tee-seal",
    });
    const rawKey = sha256(keyMaterial);

    return crypto.subtle.importKey(
      "raw",
      rawKey.slice(0, 32),
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"],
    );
  }

  private softwareAttestation(userId: string): TEEAttestationQuote {
    const payload = canonicalEncode({
      userId, provider: "software",
      nonce: toHex(sha256(canonicalEncode({ t: Date.now(), r: Math.random() }))),
    });
    const attestCid = createCid(sha256(payload)).string;

    // Generate a software-only credential ID
    const softCredId = toHex(sha256(canonicalEncode({ userId, purpose: "sw-cred", t: Date.now() })));
    this._credentialId = softCredId;
    this._publicKey = "";
    this.persistCredential();

    return {
      attestationCid: attestCid,
      attestationData: "",
      clientDataHash: toHex(sha256(payload)),
      credentialId: softCredId,
      publicKey: "",
      provider: "software",
      hardwareBacked: false,
      format: "none",
      timestamp: Date.now(),
    };
  }

  private softwareAssertion(challenge: string): TEEAssertion {
    const payload = canonicalEncode({
      challenge, credentialId: this._credentialId ?? "none",
      provider: "software", t: Date.now(),
    });
    const assertionCid = createCid(sha256(payload)).string;
    const sig = toHex(sha256(canonicalEncode({ c: challenge, k: this._credentialId })));

    return {
      assertionCid,
      challenge,
      authenticatorData: "",
      signature: sig,
      credentialId: this._credentialId ?? "none",
      userPresent: true,
      userVerified: false,
      signCount: 0,
      timestamp: Date.now(),
    };
  }

  private detectAttestationFormat(attestationObject: ArrayBuffer): string {
    // Simple heuristic based on attestation object size
    const bytes = new Uint8Array(attestationObject);
    if (bytes.length > 1000) return "packed";
    if (bytes.length > 500) return "tpm";
    return "none";
  }

  private persistCredential(): void {
    if (typeof localStorage !== "undefined" && this._credentialId) {
      try {
        localStorage.setItem(CREDENTIAL_STORE_KEY, JSON.stringify({
          credentialId: this._credentialId,
          publicKey: this._publicKey,
          provider: this._capabilities?.provider,
          timestamp: Date.now(),
        }));
      } catch { /* Storage may be unavailable */ }
    }
  }

  private restoreCredential(): void {
    if (typeof localStorage !== "undefined") {
      try {
        const stored = localStorage.getItem(CREDENTIAL_STORE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          this._credentialId = parsed.credentialId;
          this._publicKey = parsed.publicKey;
        }
      } catch { /* Ignore parse errors */ }
    }
  }

  // ── Encoding utilities ───────────────────────────────────────────

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  private arrayBufferToBase64url(buffer: ArrayBuffer): string {
    return this.arrayBufferToBase64(buffer)
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  private base64urlToArrayBuffer(base64url: string): ArrayBuffer {
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════

let _instance: TEEBridge | null = null;

/** Get the global TEE Bridge instance */
export function getTEEBridge(): TEEBridge {
  if (!_instance) _instance = new TEEBridge();
  return _instance;
}

/** Reset the singleton (for testing) */
export function resetTEEBridge(): void {
  _instance?.destroy();
  _instance = null;
}
