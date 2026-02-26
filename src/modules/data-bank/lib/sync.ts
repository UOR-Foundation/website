/**
 * Data Bank Box — Sync Engine (localStorage ↔ Cloud)
 * ════════════════════════════════════════════════════
 *
 * Two-tier sync with last-write-wins conflict resolution.
 * L1 (localStorage) is the hot cache; L2 (Cloud DB) is the
 * authoritative persistent store.
 *
 * All data is encrypted client-side before leaving the device.
 *
 * @module data-bank/lib/sync
 */

import { supabase } from "@/integrations/supabase/client";
import { sha256hex } from "@/lib/crypto";
import {
  deriveEncryptionKey,
  encrypt,
  decrypt,
  type EncryptedPayload,
} from "./encryption";

const LOCAL_PREFIX = "uor:databank:";
const META_KEY = "uor:databank:__meta";

// ── Types ───────────────────────────────────────────────────────────────────

export interface DataBankSlot {
  key: string;
  value: string;
  cid: string;
  version: number;
  updatedAt: string;
}

export interface DataBankSyncStatus {
  lastSyncAt: string | null;
  pendingWrites: number;
  slotCount: number;
}

// ── Local Storage (L1) ──────────────────────────────────────────────────────

function localKey(slot: string): string {
  return `${LOCAL_PREFIX}${slot}`;
}

function readLocal(slot: string): DataBankSlot | null {
  try {
    const raw = localStorage.getItem(localKey(slot));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocal(slot: DataBankSlot): void {
  localStorage.setItem(localKey(slot.key), JSON.stringify(slot));
}

function deleteLocal(slot: string): void {
  localStorage.removeItem(localKey(slot));
}

function listLocalSlots(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(LOCAL_PREFIX) && k !== META_KEY) {
      keys.push(k.slice(LOCAL_PREFIX.length));
    }
  }
  return keys;
}

function getMeta(): { pendingWrites: Set<string>; lastSyncAt: string | null } {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return { pendingWrites: new Set(), lastSyncAt: null };
    const parsed = JSON.parse(raw);
    return {
      pendingWrites: new Set(parsed.pendingWrites ?? []),
      lastSyncAt: parsed.lastSyncAt ?? null,
    };
  } catch {
    return { pendingWrites: new Set(), lastSyncAt: null };
  }
}

function setMeta(meta: {
  pendingWrites: Set<string>;
  lastSyncAt: string | null;
}): void {
  localStorage.setItem(
    META_KEY,
    JSON.stringify({
      pendingWrites: [...meta.pendingWrites],
      lastSyncAt: meta.lastSyncAt,
    })
  );
}

// ── Core Sync Operations ────────────────────────────────────────────────────

/**
 * Write a value to a named slot. Writes to L1 immediately,
 * then encrypts and pushes to L2 asynchronously.
 */
export async function writeSlot(
  userId: string,
  key: string,
  value: string
): Promise<DataBankSlot> {
  // Content-address the plaintext
  const cid = await sha256hex(value);
  const now = new Date().toISOString();

  const existing = readLocal(key);
  const version = (existing?.version ?? 0) + 1;

  const slot: DataBankSlot = { key, value, cid, version, updatedAt: now };

  // L1: Write immediately (instant, offline-capable)
  writeLocal(slot);

  // L2: Encrypt and push to cloud
  try {
    const encKey = await deriveEncryptionKey(userId);
    const encrypted = await encrypt(encKey, value);

    await supabase.from("user_data_bank").upsert(
      {
        user_id: userId,
        slot_key: key,
        cid,
        encrypted_blob: encrypted.ciphertext,
        iv: encrypted.iv,
        byte_length: encrypted.byteLength,
        version,
      },
      { onConflict: "user_id,slot_key" }
    );

    // Clear pending flag
    const meta = getMeta();
    meta.pendingWrites.delete(key);
    meta.lastSyncAt = now;
    setMeta(meta);
  } catch {
    // Mark as pending for retry
    const meta = getMeta();
    meta.pendingWrites.add(key);
    setMeta(meta);
  }

  return slot;
}

/**
 * Read a slot — L1 first, falls back to L2 if missing locally.
 */
export async function readSlot(
  userId: string,
  key: string
): Promise<DataBankSlot | null> {
  // L1: Try local first
  const local = readLocal(key);
  if (local) return local;

  // L2: Fetch from cloud and decrypt
  try {
    const { data } = await supabase
      .from("user_data_bank")
      .select("cid, encrypted_blob, iv, version, updated_at")
      .eq("user_id", userId)
      .eq("slot_key", key)
      .maybeSingle();

    if (!data) return null;

    const encKey = await deriveEncryptionKey(userId);
    const value = await decrypt(encKey, data.encrypted_blob, data.iv);

    const slot: DataBankSlot = {
      key,
      value,
      cid: data.cid,
      version: data.version,
      updatedAt: data.updated_at,
    };

    // Warm L1 cache
    writeLocal(slot);
    return slot;
  } catch {
    return null;
  }
}

/**
 * Delete a slot from both L1 and L2.
 */
export async function deleteSlot(userId: string, key: string): Promise<void> {
  deleteLocal(key);

  await supabase
    .from("user_data_bank")
    .delete()
    .eq("user_id", userId)
    .eq("slot_key", key);
}

/**
 * Full sync: pull all cloud slots, merge with local (last-write-wins).
 */
export async function fullSync(userId: string): Promise<DataBankSlot[]> {
  const { data: cloudSlots } = await supabase
    .from("user_data_bank")
    .select("slot_key, cid, encrypted_blob, iv, version, updated_at")
    .eq("user_id", userId);

  if (!cloudSlots) return [];

  const encKey = await deriveEncryptionKey(userId);
  const merged: DataBankSlot[] = [];

  // Cloud → Local (download what's newer or missing)
  for (const cs of cloudSlots) {
    const local = readLocal(cs.slot_key);
    const cloudNewer =
      !local ||
      new Date(cs.updated_at) > new Date(local.updatedAt);

    if (cloudNewer) {
      try {
        const value = await decrypt(encKey, cs.encrypted_blob, cs.iv);
        const slot: DataBankSlot = {
          key: cs.slot_key,
          value,
          cid: cs.cid,
          version: cs.version,
          updatedAt: cs.updated_at,
        };
        writeLocal(slot);
        merged.push(slot);
      } catch {
        // Decryption failed — skip
      }
    } else if (local) {
      merged.push(local);
    }
  }

  // Local → Cloud (push pending writes)
  const meta = getMeta();
  for (const pendingKey of meta.pendingWrites) {
    const local = readLocal(pendingKey);
    if (!local) continue;

    try {
      const encrypted = await encrypt(encKey, local.value);
      await supabase.from("user_data_bank").upsert(
        {
          user_id: userId,
          slot_key: local.key,
          cid: local.cid,
          encrypted_blob: encrypted.ciphertext,
          iv: encrypted.iv,
          byte_length: encrypted.byteLength,
          version: local.version,
        },
        { onConflict: "user_id,slot_key" }
      );
      meta.pendingWrites.delete(pendingKey);
    } catch {
      // Will retry next sync
    }
  }

  meta.lastSyncAt = new Date().toISOString();
  setMeta(meta);

  return merged;
}

/**
 * Get sync status for UI indicators.
 */
export function getSyncStatus(): DataBankSyncStatus {
  const meta = getMeta();
  return {
    lastSyncAt: meta.lastSyncAt,
    pendingWrites: meta.pendingWrites.size,
    slotCount: listLocalSlots().length,
  };
}
