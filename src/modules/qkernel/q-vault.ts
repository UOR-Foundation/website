/**
 * Q-Vault — Ring 0 Encrypted Sovereign Storage
 * ═════════════════════════════════════════════
 *
 * The vault is the sovereign data bank — every piece of user data
 * is encrypted client-side with AES-256-GCM, stored as Merkle DAG
 * inodes in Q-FS, and gated by Ring 0 capability tokens.
 *
 *   ┌──────────────────┬──────────────────────────────────────────┐
 *   │ Classical        │ Q-Vault                                   │
 *   ├──────────────────┼──────────────────────────────────────────┤
 *   │ /etc/shadow      │ Ring 0 encrypted inode (key never leaves)│
 *   │ LUKS partition   │ AES-256-GCM per slot (HKDF-derived keys) │
 *   │ Keyring          │ Capability token chain (CID-addressed)    │
 *   │ dm-crypt         │ Encrypt-on-write, decrypt-on-read         │
 *   │ fscrypt          │ Per-inode encryption with unique IV        │
 *   │ mount -o encrypt │ Vault mount at /sovereign/vault            │
 *   └──────────────────┴──────────────────────────────────────────┘
 *
 * The server NEVER sees plaintext. Keys are derived from the sovereign
 * identity hash via HKDF (SHA-256), ensuring that only the identity
 * holder can decrypt their data.
 *
 * @module qkernel/q-vault
 */

import { sha256, computeCid, bytesToHex } from "@/modules/uns/core/address";
import type { QFs } from "./q-fs";
import type { QSecurity, CapabilityToken } from "./q-security";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

/** A vault slot — one encrypted data compartment */
export interface VaultSlot {
  readonly slotKey: string;         // logical name (e.g. "contacts", "notes")
  readonly cid: string;             // content address of encrypted blob
  readonly iv: string;              // hex-encoded initialization vector
  readonly byteLength: number;      // encrypted payload size
  readonly version: number;         // monotonic version counter
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** Vault metadata — the directory of all slots */
export interface VaultManifest {
  readonly ownerCanonicalId: string;
  readonly slotCount: number;
  readonly totalBytes: number;
  readonly mountPath: string;
  readonly createdAt: number;
  readonly lastAccessedAt: number;
}

/** Result of a vault read operation */
export interface VaultReadResult {
  readonly success: boolean;
  readonly slotKey: string;
  readonly plaintext: Uint8Array | null;
  readonly version: number;
  readonly reason?: string;
}

/** Result of a vault write operation */
export interface VaultWriteResult {
  readonly success: boolean;
  readonly slotKey: string;
  readonly cid: string;
  readonly version: number;
  readonly byteLength: number;
  readonly reason?: string;
}

/** Vault export bundle — portable encrypted archive */
export interface VaultExportBundle {
  readonly format: "uor-vault-export-v1";
  readonly ownerCanonicalId: string;
  readonly exportedAt: string;
  readonly slots: VaultExportSlot[];
  readonly slotCount: number;
  readonly totalBytes: number;
}

/** A single slot in an export bundle */
export interface VaultExportSlot {
  readonly slotKey: string;
  readonly ciphertext: string;    // base64-encoded encrypted blob
  readonly iv: string;            // hex-encoded IV
  readonly version: number;
}

/** Vault statistics */
export interface VaultStats {
  readonly initialized: boolean;
  readonly slotCount: number;
  readonly totalBytes: number;
  readonly mountPath: string;
  readonly reads: number;
  readonly writes: number;
  readonly denials: number;
}

// ═══════════════════════════════════════════════════════════════════════
// Q-Vault Implementation
// ═══════════════════════════════════════════════════════════════════════

export class QVault {
  private fs: QFs;
  private security: QSecurity;
  private slots = new Map<string, VaultSlot>();
  private encryptionKey: CryptoKey | null = null;
  private ownerCanonicalId: string | null = null;
  private createdAt: number = 0;
  private lastAccessedAt: number = 0;
  private readCount = 0;
  private writeCount = 0;
  private denialCount = 0;

  private static readonly MOUNT_PATH = "/sovereign/vault";
  private static readonly ALGO = "AES-GCM";
  private static readonly KEY_LENGTH = 256;

  constructor(fs: QFs, security: QSecurity) {
    this.fs = fs;
    this.security = security;
  }

  // ═══════════════════════════════════════════════════════════════════
  // Initialization
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Initialize the vault — derive encryption key from sovereign identity hash.
   *
   * Uses HKDF (SHA-256) to derive a unique AES-256-GCM key from the
   * identity hash bytes. The server never sees this key.
   *
   * Must be called AFTER QSovereignty.genesis() — requires the identity hash.
   */
  async initialize(
    identityHashBytes: Uint8Array,
    canonicalId: string,
    callerPid: number
  ): Promise<void> {
    // Ring 0 check — only the sovereign process can initialize
    if (!this.security.checkPermission(callerPid, "mount", QVault.MOUNT_PATH)) {
      this.denialCount++;
      throw new Error("VAULT DENIED: Only Ring 0 can initialize the vault");
    }

    // Derive encryption key via HKDF
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      identityHashBytes.buffer as ArrayBuffer,
      "HKDF",
      false,
      ["deriveKey"]
    );

    this.encryptionKey = await crypto.subtle.deriveKey(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: new TextEncoder().encode("uor-sovereign-vault-v1"),
        info: new TextEncoder().encode(canonicalId),
      },
      keyMaterial,
      { name: QVault.ALGO, length: QVault.KEY_LENGTH },
      false, // non-extractable — key NEVER leaves WebCrypto
      ["encrypt", "decrypt"]
    );

    this.ownerCanonicalId = canonicalId;
    this.createdAt = Date.now();

    // Mount vault directory in Q-FS
    await this.fs.mkdir("/sovereign", "vault", 0);
  }

  // ═══════════════════════════════════════════════════════════════════
  // Read (focus morphism)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Read a vault slot — decrypt and return plaintext.
   *
   * This is the `focus` syscall morphism applied to sovereign data:
   * encrypted bytes → AES-256-GCM decrypt → plaintext bytes.
   *
   * Only PID 0 (Ring 0) can read vault slots.
   */
  async read(slotKey: string, callerPid: number): Promise<VaultReadResult> {
    if (!this.encryptionKey) {
      return { success: false, slotKey, plaintext: null, version: 0, reason: "Vault not initialized" };
    }

    if (!this.security.checkPermission(callerPid, "read", `${QVault.MOUNT_PATH}/${slotKey}`)) {
      this.denialCount++;
      return { success: false, slotKey, plaintext: null, version: 0, reason: "Ring 0 access required" };
    }

    const slot = this.slots.get(slotKey);
    if (!slot) {
      return { success: false, slotKey, plaintext: null, version: 0, reason: "Slot not found" };
    }

    // Read encrypted bytes from Q-FS
    const ciphertext = this.fs.readFile(`${QVault.MOUNT_PATH}/${slotKey}`, callerPid);
    if (!ciphertext) {
      return { success: false, slotKey, plaintext: null, version: slot.version, reason: "FS read failed" };
    }

    // Decrypt
    const iv = hexToBytes(slot.iv);
    try {
      const plainBuffer = await crypto.subtle.decrypt(
        { name: QVault.ALGO, iv: iv.buffer as ArrayBuffer },
        this.encryptionKey,
        ciphertext.buffer as ArrayBuffer
      );
      this.readCount++;
      this.lastAccessedAt = Date.now();

      return {
        success: true,
        slotKey,
        plaintext: new Uint8Array(plainBuffer),
        version: slot.version,
      };
    } catch {
      return { success: false, slotKey, plaintext: null, version: slot.version, reason: "Decryption failed" };
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // Write (refract morphism)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Write a vault slot — encrypt plaintext and store.
   *
   * This is the `refract` syscall morphism applied to sovereign data:
   * plaintext bytes → AES-256-GCM encrypt → encrypted inode in Q-FS.
   *
   * Each write generates a fresh IV (96-bit random) — no IV reuse ever.
   * Only PID 0 (Ring 0) can write vault slots.
   */
  async write(
    slotKey: string,
    plaintext: Uint8Array,
    callerPid: number
  ): Promise<VaultWriteResult> {
    if (!this.encryptionKey) {
      return { success: false, slotKey, cid: "", version: 0, byteLength: 0, reason: "Vault not initialized" };
    }

    if (!this.security.checkPermission(callerPid, "write", `${QVault.MOUNT_PATH}/${slotKey}`)) {
      this.denialCount++;
      return { success: false, slotKey, cid: "", version: 0, byteLength: 0, reason: "Ring 0 access required" };
    }

    // Fresh IV for every write — 96 bits of crypto randomness
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);

    // Encrypt
    const cipherBuffer = await crypto.subtle.encrypt(
      { name: QVault.ALGO, iv: iv.buffer as ArrayBuffer },
      this.encryptionKey,
      plaintext.buffer as ArrayBuffer
    );
    const ciphertext = new Uint8Array(cipherBuffer);

    // Content-address the encrypted blob
    const hashBytes = await sha256(ciphertext);
    const cid = await computeCid(hashBytes);

    // Determine version
    const existingSlot = this.slots.get(slotKey);
    const version = existingSlot ? existingSlot.version + 1 : 1;

    // Store in Q-FS
    if (existingSlot) {
      await this.fs.writeFile(`${QVault.MOUNT_PATH}/${slotKey}`, ciphertext, callerPid);
    } else {
      await this.fs.createFile(QVault.MOUNT_PATH, slotKey, ciphertext, callerPid);
    }

    // Update slot registry
    const slot: VaultSlot = {
      slotKey,
      cid,
      iv: bytesToHex(iv),
      byteLength: ciphertext.byteLength,
      version,
      createdAt: existingSlot?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    };
    this.slots.set(slotKey, slot);

    this.writeCount++;
    this.lastAccessedAt = Date.now();

    return {
      success: true,
      slotKey,
      cid,
      version,
      byteLength: ciphertext.byteLength,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // Delete
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Delete a vault slot — remove from Q-FS and registry.
   */
  async delete(slotKey: string, callerPid: number): Promise<boolean> {
    if (!this.security.checkPermission(callerPid, "delete", `${QVault.MOUNT_PATH}/${slotKey}`)) {
      this.denialCount++;
      return false;
    }

    const deleted = await this.fs.rm(`${QVault.MOUNT_PATH}/${slotKey}`, callerPid);
    if (deleted) {
      this.slots.delete(slotKey);
    }
    return deleted;
  }

  // ═══════════════════════════════════════════════════════════════════
  // Export — Portable Encrypted Archive
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Export the entire vault as a portable encrypted bundle.
   *
   * The export contains ciphertext + IVs — NOT plaintext.
   * The recipient needs the sovereign identity hash to derive
   * the decryption key. This enables secure cross-device migration.
   */
  async exportBundle(callerPid: number): Promise<VaultExportBundle | null> {
    if (!this.security.checkPermission(callerPid, "read", QVault.MOUNT_PATH)) {
      this.denialCount++;
      return null;
    }

    const exportSlots: VaultExportSlot[] = [];
    let totalBytes = 0;

    for (const [key, slot] of this.slots) {
      const ciphertext = this.fs.readFile(`${QVault.MOUNT_PATH}/${key}`, callerPid);
      if (!ciphertext) continue;

      exportSlots.push({
        slotKey: key,
        ciphertext: uint8ToBase64(ciphertext),
        iv: slot.iv,
        version: slot.version,
      });
      totalBytes += slot.byteLength;
    }

    return {
      format: "uor-vault-export-v1",
      ownerCanonicalId: this.ownerCanonicalId ?? "",
      exportedAt: new Date().toISOString(),
      slots: exportSlots,
      slotCount: exportSlots.length,
      totalBytes,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // Introspection
  // ═══════════════════════════════════════════════════════════════════

  /** List all slot keys */
  listSlots(): string[] {
    return Array.from(this.slots.keys());
  }

  /** Get slot metadata (without decrypting) */
  getSlotMeta(slotKey: string): VaultSlot | undefined {
    return this.slots.get(slotKey);
  }

  /** Get vault statistics */
  stats(): VaultStats {
    let totalBytes = 0;
    for (const slot of this.slots.values()) totalBytes += slot.byteLength;

    return {
      initialized: this.encryptionKey !== null,
      slotCount: this.slots.size,
      totalBytes,
      mountPath: QVault.MOUNT_PATH,
      reads: this.readCount,
      writes: this.writeCount,
      denials: this.denialCount,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
