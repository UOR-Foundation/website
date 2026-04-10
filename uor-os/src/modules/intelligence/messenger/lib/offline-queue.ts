/**
 * Offline Message Queue
 * ═════════════════════
 *
 * IndexedDB-backed queue that stores sealed messages when offline
 * and auto-flushes when the connection resumes.
 * Deduplicates by messageHash (content-addressed = idempotent).
 */

import { supabase } from "@/integrations/supabase/client";

const DB_NAME = "ump-offline-queue";
const STORE_NAME = "pending-messages";
const DB_VERSION = 1;

interface QueuedMessage {
  id: string; // messageHash
  sessionId: string;
  senderId: string;
  ciphertext: string;
  messageHash: string;
  envelopeCid: string;
  parentHashes: string[];
  messageType: string;
  fileManifest?: any;
  replyToHash?: string;
  queuedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Enqueue a message for sending when back online. */
export async function enqueueMessage(msg: QueuedMessage): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).put(msg);
  await new Promise<void>((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

/** Get all pending messages. */
export async function getPendingMessages(): Promise<QueuedMessage[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Remove a message from the queue after successful send. */
async function dequeueMessage(messageHash: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete(messageHash);
  await new Promise<void>((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

/** Flush all pending messages to Supabase. */
export async function flushQueue(): Promise<number> {
  const pending = await getPendingMessages();
  let flushed = 0;

  for (const msg of pending) {
    try {
      const { error } = await supabase.from("encrypted_messages").insert({
        session_id: msg.sessionId,
        sender_id: msg.senderId,
        ciphertext: msg.ciphertext,
        message_hash: msg.messageHash,
        envelope_cid: msg.envelopeCid,
        parent_hashes: msg.parentHashes,
        message_type: msg.messageType,
        file_manifest: msg.fileManifest,
        reply_to_hash: msg.replyToHash,
      } as any);

      if (!error) {
        await dequeueMessage(msg.id);
        flushed++;
      }
    } catch {
      // Will retry on next flush
    }
  }

  return flushed;
}

// ── Auto-flush on reconnect ─────────────────────────────────────────────────

let listening = false;

export function startOfflineSync(): void {
  if (listening) return;
  listening = true;

  window.addEventListener("online", () => {
    flushQueue().then((n) => {
      if (n > 0) console.log(`[OfflineQueue] Flushed ${n} pending messages`);
    });
  });
}
