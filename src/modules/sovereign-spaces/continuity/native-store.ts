/**
 * Session Continuity — Native Store Adapter
 * ═════════════════════════════════════════════════════════════════
 *
 * Dual-dispatch persistence layer:
 *   - Tauri: uses @tauri-apps/plugin-store for encrypted, crash-safe KV
 *   - Browser: falls back to localStorage with the same API
 *
 * @layer sovereign-spaces/continuity
 */

import { isLocal, invoke } from "@/lib/runtime";

// ── Interface ───────────────────────────────────────────────────────────

export interface SovereignStore {
  get<T = unknown>(key: string): Promise<T | null>;
  set<T = unknown>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
  flush(): Promise<void>;
}

// ── Tauri Store ─────────────────────────────────────────────────────────

class TauriStore implements SovereignStore {
  private storeHandle: any = null;
  private storePath: string;

  constructor(path: string = "sovereign-state.json") {
    this.storePath = path;
  }

  private async getStore(): Promise<any> {
    if (this.storeHandle) return this.storeHandle;
    try {
      // @ts-ignore — Tauri plugin only available in desktop builds
      const mod = await import("@tauri-apps/plugin-store");
      const Store = (mod as any).Store ?? (mod as any).default;
      this.storeHandle = await Store.load(this.storePath);
      return this.storeHandle;
    } catch {
      console.warn("[SovereignStore] Tauri store plugin unavailable, using IPC fallback");
      return null;
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const store = await this.getStore();
    if (store) {
      const val = await store.get(key);
      return (val as T) ?? null;
    }
    // IPC fallback
    const result = await invoke<{ value: string | null }>("sovereign_store_get", { key });
    if (result?.value) return JSON.parse(result.value) as T;
    return null;
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    const store = await this.getStore();
    if (store) {
      await store.set(key, value);
      await store.save();
      return;
    }
    await invoke("sovereign_store_set", { key, value: JSON.stringify(value) });
  }

  async delete(key: string): Promise<void> {
    const store = await this.getStore();
    if (store) {
      await store.delete(key);
      await store.save();
      return;
    }
    await invoke("sovereign_store_delete", { key });
  }

  async keys(): Promise<string[]> {
    const store = await this.getStore();
    if (store) return store.keys();
    const result = await invoke<{ keys: string[] }>("sovereign_store_keys");
    return result?.keys ?? [];
  }

  async flush(): Promise<void> {
    const store = await this.getStore();
    if (store) await store.save();
  }
}

// ── Browser Fallback ────────────────────────────────────────────────────

class BrowserStore implements SovereignStore {
  private prefix: string;

  constructor(prefix: string = "uor:store:") {
    this.prefix = prefix;
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch {
      console.warn("[SovereignStore] localStorage write failed for key:", key);
    }
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(this.prefix + key);
  }

  async keys(): Promise<string[]> {
    const result: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(this.prefix)) {
        result.push(k.slice(this.prefix.length));
      }
    }
    return result;
  }

  async flush(): Promise<void> {
    // localStorage is synchronous; nothing to flush
  }
}

// ── Factory ─────────────────────────────────────────────────────────────

let _instance: SovereignStore | null = null;

export function getSovereignStore(): SovereignStore {
  if (_instance) return _instance;
  _instance = isLocal() ? new TauriStore() : new BrowserStore();
  return _instance;
}
