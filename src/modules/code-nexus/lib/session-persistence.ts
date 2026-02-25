/**
 * Code Nexus — Session Persistence (Dehydration / Rehydration)
 * ════════════════════════════════════════════════════════════
 *
 * Saves and restores Code Nexus graph sessions via hologram_sessions.
 * Each session is content-addressed with a UOR CID for deterministic identity.
 */

import { supabase } from "@/integrations/supabase/client";
import { singleProofHash } from "@/lib/uor-canonical";
import type { CodeGraphStore, GraphNode, GraphEdge } from "./graph-store";

// ── Types ───────────────────────────────────────────────────────────────────

export interface SessionRecord {
  id: string;
  label: string;
  sessionCid: string;
  nodeCount: number;
  edgeCount: number;
  createdAt: string;
}

// ── Dehydrate (Save) ────────────────────────────────────────────────────────

/**
 * Persist the current graph store to hologram_sessions.
 * Returns the session CID.
 */
export async function dehydrateSession(
  store: CodeGraphStore,
  repoName: string,
  userId: string
): Promise<string> {
  const snapshot = store.toSnapshot();

  // Compute deterministic session CID from graph content
  const proof = await singleProofHash({
    "@context": { "code-nexus": "https://uor.foundation/lens/code-nexus/" },
    "@type": "code-nexus:GraphSession",
    "code-nexus:repo": repoName,
    "code-nexus:nodeCount": snapshot.nodes.length,
    "code-nexus:edgeCount": snapshot.edges.length,
    "code-nexus:nodeIds": snapshot.nodes.map((n) => n.id).sort(),
  });

  const blueprint = {
    type: "code-nexus-graph",
    repoName,
    nodes: snapshot.nodes,
    edges: snapshot.edges,
  };

  const envelope = {
    version: "1.0.0",
    lens: "Code Nexus",
    morphism: "Isometry",
    stats: store.stats(),
  };

  // Upsert — if same session_cid exists, update it
  const { error } = await supabase.from("hologram_sessions").upsert(
    {
      user_id: userId,
      session_cid: proof.cid,
      session_hex: proof.hashHex,
      label: `Code Nexus: ${repoName}`,
      blueprint: blueprint as any,
      envelope: envelope as any,
      status: "active",
      tick_count: snapshot.nodes.length + snapshot.edges.length,
    },
    { onConflict: "session_cid" }
  );

  if (error) throw new Error(`Failed to save session: ${error.message}`);
  return proof.cid;
}

// ── Rehydrate (Load) ────────────────────────────────────────────────────────

/**
 * List all Code Nexus sessions for the current user.
 */
export async function listSessions(userId: string): Promise<SessionRecord[]> {
  const { data, error } = await supabase
    .from("hologram_sessions")
    .select("id, label, session_cid, tick_count, created_at, blueprint")
    .eq("user_id", userId)
    .eq("status", "active")
    .like("label", "Code Nexus:%")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(`Failed to list sessions: ${error.message}`);

  return (data ?? []).map((row) => {
    const bp = row.blueprint as any;
    return {
      id: row.id,
      label: row.label,
      sessionCid: row.session_cid,
      nodeCount: bp?.nodes?.length ?? 0,
      edgeCount: bp?.edges?.length ?? 0,
      createdAt: row.created_at,
    };
  });
}

/**
 * Load a specific session and restore the graph store.
 */
export async function rehydrateSession(
  store: CodeGraphStore,
  sessionCid: string
): Promise<{ repoName: string }> {
  const { data, error } = await supabase
    .from("hologram_sessions")
    .select("blueprint")
    .eq("session_cid", sessionCid)
    .single();

  if (error || !data) throw new Error(`Session not found: ${sessionCid}`);

  const bp = data.blueprint as any;
  if (bp?.type !== "code-nexus-graph") {
    throw new Error("Invalid session blueprint type");
  }

  store.fromSnapshot({
    nodes: bp.nodes as GraphNode[],
    edges: bp.edges as GraphEdge[],
  });

  return { repoName: bp.repoName ?? "Unknown" };
}
