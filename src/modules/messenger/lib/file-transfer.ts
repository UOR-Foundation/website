/**
 * Encrypted File Transfer — Keybase KBFS-inspired
 * ════════════════════════════════════════════════
 *
 * Content-addressed, chunked, encrypted file sharing.
 * Files are split into 256KB chunks, each encrypted with
 * the session AES-256-GCM key, uploaded to encrypted-files bucket,
 * and referenced by content-addressed CIDs.
 */

import { supabase } from "@/integrations/supabase/client";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type { FileManifest, FileChunk } from "./types";

const CHUNK_SIZE = 256 * 1024; // 256KB

/** Hash bytes to hex CID. */
function cidFromBytes(data: Uint8Array): string {
  return `urn:uor:file:${bytesToHex(sha256(data))}`;
}

/** Split a file into chunks. */
function splitFile(data: Uint8Array): Uint8Array[] {
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    chunks.push(data.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
}

/** Encrypt a chunk with AES-256-GCM using the Web Crypto API. */
async function encryptChunk(chunk: Uint8Array, keyBytes: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", keyBytes.slice(0, 32), "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, chunk);
  // Prepend IV to ciphertext
  const result = new Uint8Array(12 + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), 12);
  return result;
}

/** Decrypt a chunk. */
async function decryptChunk(data: Uint8Array, keyBytes: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", keyBytes.slice(0, 32), "AES-GCM", false, ["decrypt"]);
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new Uint8Array(decrypted);
}

export interface UploadProgress {
  chunksUploaded: number;
  totalChunks: number;
  bytesUploaded: number;
  totalBytes: number;
}

/**
 * Upload an encrypted file.
 * Returns a FileManifest to embed in the message.
 */
export async function uploadEncryptedFile(
  file: File,
  userId: string,
  sessionKey: Uint8Array,
  onProgress?: (p: UploadProgress) => void,
): Promise<FileManifest> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const fileCid = cidFromBytes(buffer);
  const rawChunks = splitFile(buffer);
  const chunkCids: string[] = [];
  const storagePaths: string[] = [];
  let bytesUploaded = 0;

  for (let i = 0; i < rawChunks.length; i++) {
    const chunk = rawChunks[i];
    const encrypted = await encryptChunk(chunk, sessionKey);
    const chunkCid = cidFromBytes(chunk);
    chunkCids.push(chunkCid);

    const path = `${userId}/${fileCid.slice(-16)}/${i}`;
    storagePaths.push(path);

    const { error } = await supabase.storage
      .from("encrypted-files")
      .upload(path, encrypted, { contentType: "application/octet-stream", upsert: true });

    if (error) throw new Error(`Chunk ${i} upload failed: ${error.message}`);

    bytesUploaded += chunk.length;
    onProgress?.({
      chunksUploaded: i + 1,
      totalChunks: rawChunks.length,
      bytesUploaded,
      totalBytes: buffer.length,
    });
  }

  return {
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: buffer.length,
    chunkCount: rawChunks.length,
    chunkCids,
    fileCid,
    storagePaths,
  };
}

/**
 * Download and decrypt a file from its manifest.
 */
export async function downloadEncryptedFile(
  manifest: FileManifest,
  sessionKey: Uint8Array,
  onProgress?: (p: UploadProgress) => void,
): Promise<Blob> {
  const decryptedChunks: Uint8Array[] = [];
  let bytesDownloaded = 0;

  for (let i = 0; i < manifest.storagePaths.length; i++) {
    const { data, error } = await supabase.storage
      .from("encrypted-files")
      .download(manifest.storagePaths[i]);

    if (error || !data) throw new Error(`Chunk ${i} download failed`);

    const encrypted = new Uint8Array(await data.arrayBuffer());
    const decrypted = await decryptChunk(encrypted, sessionKey);
    decryptedChunks.push(decrypted);

    bytesDownloaded += decrypted.length;
    onProgress?.({
      chunksUploaded: i + 1,
      totalChunks: manifest.chunkCount,
      bytesUploaded: bytesDownloaded,
      totalBytes: manifest.sizeBytes,
    });
  }

  // Reassemble and verify CID
  const assembled = new Uint8Array(manifest.sizeBytes);
  let offset = 0;
  for (const chunk of decryptedChunks) {
    assembled.set(chunk, offset);
    offset += chunk.length;
  }

  const verifyCid = cidFromBytes(assembled);
  if (verifyCid !== manifest.fileCid) {
    throw new Error("File integrity check failed — CID mismatch");
  }

  return new Blob([assembled], { type: manifest.mimeType });
}

/** Format bytes for display. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
