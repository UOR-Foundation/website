/**
 * Q-Vault — Ring 0 Encrypted Sovereign Storage
 * ═════════════════════════════════════════════
 *
 * Now derived from genesis/ axioms for hashing/CID.
 * WebCrypto stays async for AES-256-GCM and HKDF (I/O security).
 *
 * @module qkernel/q-vault
 */

import { toHex, encodeUtf8, fromHex } from "@/hologram/genesis/axiom-ring";
import { sha256 } from "@/hologram/genesis/axiom-hash";
import { createCid } from "@/hologram/genesis/axiom-cid";
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

  /** Initialize — derive encryption key from sovereign identity hash (async: WebCrypto HKDF) */
  async initialize(identityHashBytes: Uint8Array, canonicalId: string, callerPid: number): Promise<void> {
    if (!this.security.checkPermission(callerPid, "mount", QVault.MOUNT_PATH)) {
      this.denialCount++;
      throw new Error("VAULT DENIED: Only Ring 0 can initialize the vault");
    }

    const keyMaterial = await crypto.subtle.importKey(
      "raw", identityHashBytes.buffer as ArrayBuffer, "HKDF", false, ["deriveKey"]
    );
    this.encryptionKey = await crypto.subtle.deriveKey(
      { name: "HKDF", hash: "SHA-256", salt: new TextEncoder().encode("uor-sovereign-vault-v1"), info: new TextEncoder().encode(canonicalId) },
      keyMaterial,
      { name: QVault.ALGO, length: QVault.KEY_LENGTH },
      false, ["encrypt", "decrypt"]
    );

    this.ownerCanonicalId = canonicalId;
    this.createdAt = Date.now();
    this.fs.mkdir("/sovereign", "vault", 0);
  }

  /** Read — decrypt (async: WebCrypto AES-GCM) */
  async read(slotKey: string, callerPid: number): Promise<VaultReadResult> {
    if (!this.encryptionKey) return { success: false, slotKey, plaintext: null, version: 0, reason: "Vault not initialized" };
    if (!this.security.checkPermission(callerPid, "read", `${QVault.MOUNT_PATH}/${slotKey}`)) {
      this.denialCount++;
      return { success: false, slotKey, plaintext: null, version: 0, reason: "Ring 0 access required" };
    }

    const slot = this.slots.get(slotKey);
    if (!slot) return { success: false, slotKey, plaintext: null, version: 0, reason: "Slot not found" };

    const ciphertext = this.fs.readFile(`${QVault.MOUNT_PATH}/${slotKey}`, callerPid);
    if (!ciphertext) return { success: false, slotKey, plaintext: null, version: slot.version, reason: "FS read failed" };

    const iv = fromHex(slot.iv);
    try {
      const plainBuffer = await crypto.subtle.decrypt(
        { name: QVault.ALGO, iv: iv.buffer as ArrayBuffer }, this.encryptionKey, ciphertext.buffer as ArrayBuffer
      );
      this.readCount++;
      this.lastAccessedAt = Date.now();
      return { success: true, slotKey, plaintext: new Uint8Array(plainBuffer), version: slot.version };
    } catch {
      return { success: false, slotKey, plaintext: null, version: slot.version, reason: "Decryption failed" };
    }
  }

  /** Write — encrypt (async: WebCrypto AES-GCM), hash is now sync */
  async write(slotKey: string, plaintext: Uint8Array, callerPid: number): Promise<VaultWriteResult> {
    if (!this.encryptionKey) return { success: false, slotKey, cid: "", version: 0, byteLength: 0, reason: "Vault not initialized" };
    if (!this.security.checkPermission(callerPid, "write", `${QVault.MOUNT_PATH}/${slotKey}`)) {
      this.denialCount++;
      return { success: false, slotKey, cid: "", version: 0, byteLength: 0, reason: "Ring 0 access required" };
    }

    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);

    const cipherBuffer = await crypto.subtle.encrypt(
      { name: QVault.ALGO, iv: iv.buffer as ArrayBuffer }, this.encryptionKey, plaintext.buffer as ArrayBuffer
    );
    const ciphertext = new Uint8Array(cipherBuffer);

    // Hash is now sync via genesis axioms
    const hashBytes = sha256(ciphertext);
    const cid = createCid(hashBytes).string;

    const existingSlot = this.slots.get(slotKey);
    const version = existingSlot ? existingSlot.version + 1 : 1;

    if (existingSlot) {
      this.fs.writeFile(`${QVault.MOUNT_PATH}/${slotKey}`, ciphertext, callerPid);
    } else {
      this.fs.createFile(QVault.MOUNT_PATH, slotKey, ciphertext, callerPid);
    }

    const slot: VaultSlot = {
      slotKey, cid, iv: toHex(iv),
      byteLength: ciphertext.byteLength, version,
      createdAt: existingSlot?.createdAt ?? Date.now(), updatedAt: Date.now(),
    };
    this.slots.set(slotKey, slot);
    this.writeCount++;
    this.lastAccessedAt = Date.now();

    return { success: true, slotKey, cid, version, byteLength: ciphertext.byteLength };
  }

  /** Delete a vault slot */
  delete(slotKey: string, callerPid: number): boolean {
    if (!this.security.checkPermission(callerPid, "delete", `${QVault.MOUNT_PATH}/${slotKey}`)) {
      this.denialCount++;
      return false;
    }
    const deleted = this.fs.rm(`${QVault.MOUNT_PATH}/${slotKey}`, callerPid);
    if (deleted) this.slots.delete(slotKey);
    return deleted;
  }

  /** Export bundle */
  exportBundle(callerPid: number): VaultExportBundle | null {
    if (!this.security.checkPermission(callerPid, "read", QVault.MOUNT_PATH)) {
      this.denialCount++;
      return null;
    }
    const exportSlots: VaultExportSlot[] = [];
    let totalBytes = 0;
    for (const [key, slot] of this.slots) {
      const ciphertext = this.fs.readFile(`${QVault.MOUNT_PATH}/${key}`, callerPid);
      if (!ciphertext) continue;
      exportSlots.push({ slotKey: key, ciphertext: uint8ToBase64(ciphertext), iv: slot.iv, version: slot.version });
      totalBytes += slot.byteLength;
    }
    return {
      format: "uor-vault-export-v1", ownerCanonicalId: this.ownerCanonicalId ?? "",
      exportedAt: new Date().toISOString(), slots: exportSlots, slotCount: exportSlots.length, totalBytes,
    };
  }

  listSlots(): string[] { return Array.from(this.slots.keys()); }
  getSlotMeta(slotKey: string): VaultSlot | undefined { return this.slots.get(slotKey); }

  stats(): VaultStats {
    let totalBytes = 0;
    for (const slot of this.slots.values()) totalBytes += slot.byteLength;
    return {
      initialized: this.encryptionKey !== null, slotCount: this.slots.size,
      totalBytes, mountPath: QVault.MOUNT_PATH,
      reads: this.readCount, writes: this.writeCount, denials: this.denialCount,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
