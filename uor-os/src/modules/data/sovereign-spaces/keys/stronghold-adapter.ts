/**
 * Stronghold-Backed Key Vault
 * ═════════════════════════════════════════════════════════════════
 *
 * Dual-dispatch key management:
 *   - Tauri: Stronghold encrypted vault (memory-hard, tamper-proof)
 *   - Browser: Web Crypto SubtleCrypto (existing behavior)
 *
 * @layer sovereign-spaces/keys
 */

import { isLocal, invoke } from "@/lib/runtime";

// ── Interface ───────────────────────────────────────────────────────────

export interface KeyVault {
  /** Store raw key material under a named slot */
  storeKey(name: string, keyBytes: Uint8Array): Promise<void>;
  /** Retrieve raw key material from a named slot */
  retrieveKey(name: string): Promise<Uint8Array | null>;
  /** Delete a named key */
  deleteKey(name: string): Promise<void>;
  /** Check if a key exists */
  hasKey(name: string): Promise<boolean>;
}

// ── Stronghold (Tauri) ──────────────────────────────────────────────────

class StrongholdVault implements KeyVault {
  async storeKey(name: string, keyBytes: Uint8Array): Promise<void> {
    const b64 = uint8ToBase64(keyBytes);
    await invoke("stronghold_store_key", { name, keyBase64: b64 });
  }

  async retrieveKey(name: string): Promise<Uint8Array | null> {
    const result = await invoke<{ keyBase64: string | null }>(
      "stronghold_retrieve_key",
      { name },
    );
    if (!result?.keyBase64) return null;
    return base64ToUint8(result.keyBase64);
  }

  async deleteKey(name: string): Promise<void> {
    await invoke("stronghold_delete_key", { name });
  }

  async hasKey(name: string): Promise<boolean> {
    const result = await invoke<{ exists: boolean }>(
      "stronghold_has_key",
      { name },
    );
    return result?.exists ?? false;
  }
}

// ── Web Crypto Fallback ─────────────────────────────────────────────────

class WebCryptoVault implements KeyVault {
  private prefix = "uor:vault:";

  async storeKey(name: string, keyBytes: Uint8Array): Promise<void> {
    const b64 = uint8ToBase64(keyBytes);
    localStorage.setItem(this.prefix + name, b64);
  }

  async retrieveKey(name: string): Promise<Uint8Array | null> {
    const b64 = localStorage.getItem(this.prefix + name);
    if (!b64) return null;
    return base64ToUint8(b64);
  }

  async deleteKey(name: string): Promise<void> {
    localStorage.removeItem(this.prefix + name);
  }

  async hasKey(name: string): Promise<boolean> {
    return localStorage.getItem(this.prefix + name) !== null;
  }
}

// ── Factory ─────────────────────────────────────────────────────────────

let _vault: KeyVault | null = null;

export function getKeyVault(): KeyVault {
  if (_vault) return _vault;
  _vault = isLocal() ? new StrongholdVault() : new WebCryptoVault();
  return _vault;
}

// ── Encoding helpers ────────────────────────────────────────────────────

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
