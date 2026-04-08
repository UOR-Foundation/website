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
  source: "file" | "paste" | "url";
}

let items: GuestContextItem[] = [];
let listeners: Array<() => void> = [];

function emit() {
  listeners.forEach((fn) => fn());
}

function makeId(): string {
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
    const item: GuestContextItem = {
      id: makeId(),
      filename: file.name,
      text,
      mimeType: file.type || "text/plain",
      addedAt: new Date().toISOString(),
      source: "file",
    };
    items = [...items, item];
    emit();
    return item;
  },

  addPaste(content: string, label?: string): GuestContextItem {
    const item: GuestContextItem = {
      id: makeId(),
      filename: label || `Pasted text (${new Date().toLocaleTimeString()})`,
      text: content,
      mimeType: "text/plain",
      addedAt: new Date().toISOString(),
      source: "paste",
    };
    items = [...items, item];
    emit();
    return item;
  },

  async addUrl(url: string): Promise<GuestContextItem> {
    const { text, metadata } = await extractFromUrl(url);
    const item: GuestContextItem = {
      id: makeId(),
      filename: metadata.title || url,
      text,
      mimeType: "text/html",
      addedAt: new Date().toISOString(),
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

  clear() {
    items = [];
    emit();
  },
};
