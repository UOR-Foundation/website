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
import { singleProofHash } from "@/lib/uor-canonical";
import type { PersistenceProvider, AuthContext, ChangeEntry, SovereignBundle } from "./types";

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

  async getAuthContext(): Promise<AuthContext | null> {
    return { userId: "local", isAuthenticated: false };
  },

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

    // Route seal through singleProofHash for UOR-rooted integrity
    const identity = await singleProofHash({
      "@type": "uor:SovereignSeal",
      "uor:payload": nquads,
    });
    const sealHash = identity["u:canonicalId"] ?? identity.derivationId;

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
