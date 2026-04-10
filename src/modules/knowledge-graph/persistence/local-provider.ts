/**
 * Local Persistence Provider (No-op).
 * ════════════════════════════════════
 *
 * GrafeoDB + IndexedDB already handles local persistence.
 * This provider is a passthrough — pushes are no-ops,
 * pulls return null (nothing to pull from remote).
 *
 * Used when offline or for fully sovereign local-only mode.
 */

import { grafeoStore } from "../grafeo-store";
import type { PersistenceProvider, ChangeEntry, SovereignBundle } from "./types";

function getDeviceId(): string {
  let id = localStorage.getItem("uor:device-id");
  if (!id) {
    id = `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem("uor:device-id", id);
  }
  return id;
}

export const localProvider: PersistenceProvider = {
  name: "local",

  async pushSnapshot(): Promise<void> {
    // No-op: GrafeoDB auto-persists to IndexedDB
  },

  async pullSnapshot(): Promise<string | null> {
    return null; // No remote to pull from
  },

  async pushChanges(): Promise<void> {
    // No-op: changes are already in IndexedDB
  },

  async pullChanges(): Promise<ChangeEntry[]> {
    return []; // Nothing remote
  },

  async getVersion(): Promise<number> {
    return Date.now(); // Local is always "current"
  },

  async exportBundle(): Promise<SovereignBundle> {
    const jsonLd = await grafeoStore.exportAsJsonLd();
    const nquads = await grafeoStore.dumpNQuads();
    const quadCount = await grafeoStore.quadCount();

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(nquads));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sealHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    return {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      deviceId: getDeviceId(),
      sealHash,
      quadCount,
      graph: jsonLd,
      namespaces: ["default"],
      schema: {
        tables: [],
        rdfPrefixes: {
          uor: "https://uor.foundation/",
          schema: "https://uor.foundation/schema/",
          rdfs: "http://www.w3.org/2000/01/rdf-schema#",
        },
      },
    };
  },
};
