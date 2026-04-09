/**
 * Cross-Device Clipboard Sync
 * ═════════════════════════════════════════════════════════════════
 *
 * When you copy text on one device, it becomes available on all
 * devices in your sovereign space. Uses Tauri clipboard-manager
 * locally and the change-DAG for cross-device propagation.
 *
 * @layer sovereign-spaces/clipboard
 */

import { isLocal, invoke } from "@/lib/runtime";

// ── Types ───────────────────────────────────────────────────────────────

export interface ClipboardEntry {
  content: string;
  mimeType: string;
  deviceId: string;
  timestamp: string;
  cid: string;
}

// ── Clipboard history ───────────────────────────────────────────────────

const MAX_HISTORY = 50;
const _history: ClipboardEntry[] = [];
let _lastContent = "";
let _pollInterval: ReturnType<typeof setInterval> | null = null;

// ── Read / Write ────────────────────────────────────────────────────────

/**
 * Read the current clipboard contents.
 */
export async function readClipboard(): Promise<string> {
  if (isLocal()) {
    try {
      const mod = await import("@tauri-apps/plugin-clipboard-manager");
      const text = await mod.readText();
      return text ?? "";
    } catch {
      // fallback
    }
  }
  // Browser fallback
  try {
    return await navigator.clipboard.readText();
  } catch {
    return "";
  }
}

/**
 * Write content to the clipboard.
 */
export async function writeClipboard(content: string): Promise<void> {
  if (isLocal()) {
    try {
      const mod = await import("@tauri-apps/plugin-clipboard-manager");
      await mod.writeText(content);
      _lastContent = content;
      return;
    } catch {
      // fallback
    }
  }
  // Browser fallback
  try {
    await navigator.clipboard.writeText(content);
    _lastContent = content;
  } catch {
    console.warn("[ClipboardSync] writeText failed");
  }
}

/**
 * Get clipboard history (local session only).
 */
export function getClipboardHistory(): ClipboardEntry[] {
  return [..._history];
}

// ── Polling watcher (Tauri-side) ────────────────────────────────────────

type ClipboardListener = (entry: ClipboardEntry) => void;
const _listeners: ClipboardListener[] = [];

export function onClipboardChange(fn: ClipboardListener): () => void {
  _listeners.push(fn);
  return () => {
    const idx = _listeners.indexOf(fn);
    if (idx >= 0) _listeners.splice(idx, 1);
  };
}

/**
 * Start watching clipboard for changes (polls every 1s in Tauri).
 */
export function startClipboardWatch(deviceId: string): void {
  if (_pollInterval) return;

  _pollInterval = setInterval(async () => {
    try {
      const content = await readClipboard();
      if (content && content !== _lastContent) {
        _lastContent = content;
        const entry: ClipboardEntry = {
          content,
          mimeType: "text/plain",
          deviceId,
          timestamp: new Date().toISOString(),
          cid: `clip:${Date.now().toString(36)}`,
        };
        _history.push(entry);
        if (_history.length > MAX_HISTORY) _history.shift();
        _listeners.forEach((fn) => fn(entry));
      }
    } catch {
      // ignore transient errors
    }
  }, 1000);
}

/**
 * Stop watching clipboard.
 */
export function stopClipboardWatch(): void {
  if (_pollInterval) {
    clearInterval(_pollInterval);
    _pollInterval = null;
  }
}

/**
 * Apply a remote clipboard entry (from another device).
 */
export async function applyRemoteClipboard(entry: ClipboardEntry): Promise<void> {
  _history.push(entry);
  if (_history.length > MAX_HISTORY) _history.shift();
  await writeClipboard(entry.content);
}
