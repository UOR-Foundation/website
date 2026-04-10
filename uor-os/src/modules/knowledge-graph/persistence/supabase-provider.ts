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

export const supabaseProvider: PersistenceProvider = {
  name: "supabase",

  async getAuthContext(): Promise<AuthContext | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      return { userId: session.user.id, isAuthenticated: true };
    } catch {
      return null;
    }
  },

  async pushSnapshot(nquads: string): Promise<void> {
    const auth = await this.getAuthContext();
    if (!auth?.isAuthenticated) return;

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

    const BATCH = 100;
    for (let i = 0; i < triples.length; i += BATCH) {
      const batch = triples.slice(i, i + BATCH);
      await supabase.from("uor_triples").insert(batch);
    }
  },

  async pullSnapshot(): Promise<string | null> {
    // Paginated pull — no silent truncation
    const PAGE_SIZE = 1000;
    let offset = 0;
    const allRows: Array<{ subject: string; predicate: string; object: string; graph_iri: string }> = [];

    while (true) {
      const { data, error } = await supabase
        .from("uor_triples")
        .select("subject, predicate, object, graph_iri")
        .range(offset, offset + PAGE_SIZE - 1);

      if (error || !data || data.length === 0) break;

      allRows.push(...data);

      // If we got fewer than PAGE_SIZE, we've reached the end
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    if (allRows.length === 0) return null;

    console.log(`[Provider] Pulled ${allRows.length} triples (${Math.ceil(allRows.length / PAGE_SIZE)} pages)`);

    return allRows
      .map(t => {
        const obj = t.object.startsWith("http") ? `<${t.object}>` : `"${t.object}"`;
        return `<${t.subject}> <${t.predicate}> ${obj} <${t.graph_iri}> .`;
      })
      .join("\n");
  },

  async pushChanges(changes: ChangeEntry[]): Promise<void> {
    const auth = await this.getAuthContext();
    if (!auth?.isAuthenticated) return;

    for (const change of changes) {
      await (supabase.from("uor_transactions" as any) as any).upsert({
        transaction_cid: change.changeCid,
        user_id: auth.userId,
        namespace: change.namespace,
        mutation_count: 1,
        mutations: [{ payload: change.payload, timestamp: change.timestamp }],
      }, { onConflict: "transaction_cid" });
    }
  },

  async pullChanges(sinceVersion: number): Promise<ChangeEntry[]> {
    const since = new Date(sinceVersion).toISOString();
    const { data, error } = await (supabase.from("uor_transactions" as any) as any)
      .select("*")
      .gte("committed_at", since)
      .order("committed_at", { ascending: true })
      .limit(500);

    if (error || !data) return [];

    return (data as any[]).map((row: any) => ({
      changeCid: row.transaction_cid,
      namespace: row.namespace,
      payload: JSON.stringify(row.mutations),
      timestamp: row.committed_at,
      deviceId: getDeviceId(),
      userId: row.user_id,
    }));
  },

  async getVersion(): Promise<number> {
    const { data, error } = await (supabase.from("uor_transactions" as any) as any)
      .select("committed_at")
      .order("committed_at", { ascending: false })
      .limit(1);

    if (error || !data || (data as any[]).length === 0) return 0;
    return new Date((data as any[])[0].committed_at).getTime();
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
