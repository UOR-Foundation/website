/**
 * Supabase Persistence Provider.
 * ═══════════════════════════════
 *
 * THE ONLY FILE in the knowledge-graph module that imports Supabase.
 * Implements the PersistenceProvider interface against uor_* tables.
 * Swap this file to change backends — everything else is unchanged.
 */

import { supabase } from "@/integrations/supabase/client";
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

export const supabaseProvider: PersistenceProvider = {
  name: "supabase",

  async pushSnapshot(nquads: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Parse N-Quads into triple rows
    const lines = nquads.split("\n").filter(l => l.trim() && !l.trim().startsWith("#"));
    const triples: Array<{ subject: string; predicate: string; object: string; graph_iri: string }> = [];

    for (const line of lines) {
      const match = line.match(/^<([^>]+)>\s+<([^>]+)>\s+(?:<([^>]+)>|"([^"]*)")\s+(?:<([^>]+)>)?\s*\.$/);
      if (match) {
        triples.push({
          subject: match[1],
          predicate: match[2],
          object: match[3] || match[4] || "",
          graph_iri: match[5] || "urn:uor:default",
        });
      }
    }

    // Batch insert
    const BATCH = 100;
    for (let i = 0; i < triples.length; i += BATCH) {
      const batch = triples.slice(i, i + BATCH);
      await supabase.from("uor_triples").insert(batch);
    }
  },

  async pullSnapshot(): Promise<string | null> {
    const { data, error } = await supabase
      .from("uor_triples")
      .select("subject, predicate, object, graph_iri")
      .limit(1000);

    if (error || !data || data.length === 0) return null;

    return data
      .map(t => {
        const obj = t.object.startsWith("http") ? `<${t.object}>` : `"${t.object}"`;
        return `<${t.subject}> <${t.predicate}> ${obj} <${t.graph_iri}> .`;
      })
      .join("\n");
  },

  async pushChanges(changes: ChangeEntry[]): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    for (const change of changes) {
      await supabase.from("uor_transactions").upsert({
        transaction_cid: change.changeCid,
        user_id: session.user.id,
        namespace: change.namespace,
        mutation_count: 1,
        mutations: [{ payload: change.payload, timestamp: change.timestamp }],
      }, { onConflict: "transaction_cid" });
    }
  },

  async pullChanges(sinceVersion: number): Promise<ChangeEntry[]> {
    const since = new Date(sinceVersion).toISOString();
    const { data, error } = await supabase
      .from("uor_transactions")
      .select("*")
      .gte("committed_at", since)
      .order("committed_at", { ascending: true })
      .limit(500);

    if (error || !data) return [];

    return data.map(row => ({
      changeCid: row.transaction_cid,
      namespace: row.namespace,
      payload: JSON.stringify(row.mutations),
      timestamp: row.committed_at,
      deviceId: getDeviceId(),
      userId: row.user_id,
    }));
  },

  async getVersion(): Promise<number> {
    const { data, error } = await supabase
      .from("uor_transactions")
      .select("committed_at")
      .order("committed_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return 0;
    return new Date(data[0].committed_at).getTime();
  },

  async exportBundle(): Promise<SovereignBundle> {
    const jsonLd = await grafeoStore.exportAsJsonLd();
    const nquads = await grafeoStore.dumpNQuads();
    const quadCount = await grafeoStore.quadCount();

    // Compute a simple seal from the N-Quads content
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
      namespaces: ["default", "messenger", "identity", "agent", "atlas", "vault"],
      schema: {
        tables: ["uor_triples", "uor_datums", "uor_derivations", "uor_certificates", "uor_receipts", "uor_transactions"],
        rdfPrefixes: {
          uor: "https://uor.foundation/",
          schema: "https://uor.foundation/schema/",
          rdfs: "http://www.w3.org/2000/01/rdf-schema#",
        },
      },
    };
  },
};
