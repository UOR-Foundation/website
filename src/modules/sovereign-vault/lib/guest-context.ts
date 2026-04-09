/**
 * Guest Context Store — Ephemeral in-memory context for unauthenticated users.
 * Items are lost on page refresh (by design).
 */

import { extractText, extractFromUrl } from "./extract";

export interface GuestContextItem {
  id: string;
  filename: string;
  text: string;
  mimeType: string;
  addedAt: string;
  createdAt: number;
  size: number;
  source: "file" | "paste" | "url" | "workspace" | "folder";
}

let items: GuestContextItem[] = [];
let listeners: Array<() => void> = [];

function emit() {
  listeners.forEach((fn) => fn());
}

function makeId(): string {
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function byteLength(str: string): number {
  try { return new TextEncoder().encode(str).byteLength; } catch { return str.length; }
}

export const guestContext = {
  subscribe(fn: () => void) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  },

  getAll(): GuestContextItem[] {
    return [...items];
  },

  async addFile(file: File): Promise<GuestContextItem> {
    const { text } = await extractText(file);
    const now = Date.now();
    const item: GuestContextItem = {
      id: makeId(),
      filename: file.name,
      text,
      mimeType: file.type || "text/plain",
      addedAt: new Date(now).toISOString(),
      createdAt: now,
      size: file.size || byteLength(text),
      source: "file",
    };
    items = [...items, item];
    emit();
    return item;
  },

  addPaste(content: string, label?: string): GuestContextItem {
    const now = Date.now();
    const item: GuestContextItem = {
      id: makeId(),
      filename: label || `Pasted text (${new Date(now).toLocaleTimeString()})`,
      text: content,
      mimeType: "text/plain",
      addedAt: new Date(now).toISOString(),
      createdAt: now,
      size: byteLength(content),
      source: "paste",
    };
    items = [...items, item];
    emit();
    return item;
  },

  async addUrl(url: string): Promise<GuestContextItem> {
    const { text, metadata } = await extractFromUrl(url);
    const now = Date.now();
    const item: GuestContextItem = {
      id: makeId(),
      filename: metadata.title || url,
      text,
      mimeType: "text/html",
      addedAt: new Date(now).toISOString(),
      createdAt: now,
      size: byteLength(text),
      source: "url",
    };
    items = [...items, item];
    emit();
    return item;
  },

  remove(id: string) {
    items = items.filter((i) => i.id !== id);
    emit();
  },

  addWorkspace(name: string): GuestContextItem {
    const now = Date.now();
    const text = JSON.stringify({ "@type": "vault:Workspace", name, createdAt: new Date(now).toISOString() });
    const item: GuestContextItem = {
      id: makeId(),
      filename: name || "Untitled Workspace",
      text,
      mimeType: "application/json",
      addedAt: new Date(now).toISOString(),
      createdAt: now,
      size: byteLength(text),
      source: "workspace",
    };
    items = [...items, item];
    emit();
    return item;
  },

  addFolder(name: string): GuestContextItem {
    const now = Date.now();
    const text = JSON.stringify({ "@type": "vault:Folder", name, createdAt: new Date(now).toISOString() });
    const item: GuestContextItem = {
      id: makeId(),
      filename: name || "Untitled Folder",
      text,
      mimeType: "application/json",
      addedAt: new Date(now).toISOString(),
      createdAt: now,
      size: byteLength(text),
      source: "folder",
    };
    items = [...items, item];
    emit();
    return item;
  },

  clear() {
    items = [];
    emit();
  },
};
