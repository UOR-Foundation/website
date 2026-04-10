/**
 * Sovereign Spaces — Change-DAG Engine
 * ═════════════════════════════════════════════════════════════════
 *
 * Anytype-inspired content-addressed DAG of changes.
 * Each mutation is wrapped in a ChangeEnvelope, content-addressed
 * via singleProofHash. Merging is deterministic: topological sort
 * by CID. Same change on two devices = same CID = automatic dedup.
 */

import { sha256hex } from "@/lib/crypto";
import { supabase } from "@/integrations/supabase/client";
import type { ChangeEnvelope, ChangePayload } from "../types";

// ── Local heads per space ──────────────────────────────────────────────────

const localHeads: Map<string, string> = new Map();

export function getLocalHead(spaceId: string): string | null {
  return localHeads.get(spaceId) ?? null;
}

// ── Change Creation ────────────────────────────────────────────────────────

/**
 * Create a content-addressed change envelope.
 * The CID is deterministic: same payload + parents → same CID.
 */
export async function createChange(
  spaceId: string,
  payload: ChangePayload,
  authorDeviceId: string,
  authorUserId: string,
): Promise<ChangeEnvelope> {
  const parentCids = localHeads.has(spaceId) ? [localHeads.get(spaceId)!] : [];

  // Content-address the envelope
  const changeCid = await sha256hex(JSON.stringify({
    "@type": "uor:Change",
    parentCids,
    payload,
    authorDeviceId,
    spaceId,
  }));

  const envelope: ChangeEnvelope = {
    changeCid,
    parentCids,
    payload,
    authorDeviceId,
    authorUserId,
    spaceId,
    createdAt: Date.now(),
  };

  // Update local head
  localHeads.set(spaceId, changeCid);

  return envelope;
}

// ── Cloud Push ─────────────────────────────────────────────────────────────

/**
 * Push a batch of change envelopes to the cloud.
 */
export async function pushChanges(changes: ChangeEnvelope[]): Promise<number> {
  if (changes.length === 0) return 0;

  const rows = changes.map(c => ({
    change_cid: c.changeCid,
    space_id: c.spaceId,
    parent_cids: c.parentCids,
    payload: c.payload as any,
    author_device_id: c.authorDeviceId,
    author_user_id: c.authorUserId,
    signature: c.signature ?? null,
  }));

  let pushed = 0;
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from("space_change_log").insert(batch);
    if (!error) pushed += batch.length;
    else console.warn("[ChangeDAG] Push error:", error.message);
  }

  return pushed;
}

// ── Cloud Pull ─────────────────────────────────────────────────────────────

/**
 * Pull changes from cloud that we don't have locally.
 * Uses head comparison: fetch changes newer than our known head.
 */
export async function pullChanges(
  spaceId: string,
  knownCids: Set<string>,
): Promise<ChangeEnvelope[]> {
  const { data, error } = await supabase
    .from("space_change_log")
    .select("*")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: true })
    .limit(500);

  if (error || !data) return [];

  const newChanges: ChangeEnvelope[] = [];
  for (const row of data) {
    if (knownCids.has(row.change_cid)) continue;

    newChanges.push({
      changeCid: row.change_cid,
      parentCids: row.parent_cids ?? [],
      payload: row.payload as unknown as ChangePayload,
      authorDeviceId: row.author_device_id,
      authorUserId: row.author_user_id,
      signature: row.signature ?? undefined,
      spaceId: row.space_id,
      createdAt: new Date(row.created_at).getTime(),
    });
  }

  return newChanges;
}

// ── Head Management ────────────────────────────────────────────────────────

/**
 * Announce our head CID for a space to the cloud.
 */
export async function announceHead(
  spaceId: string,
  deviceId: string,
  headCid: string,
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  await supabase.from("space_heads").upsert(
    {
      space_id: spaceId,
      device_id: deviceId,
      user_id: session.user.id,
      head_cid: headCid,
    },
    { onConflict: "space_id,device_id" },
  );
}

/**
 * Get all known heads for a space (from all devices).
 */
export async function getSpaceHeads(spaceId: string): Promise<Array<{
  deviceId: string;
  headCid: string;
  updatedAt: string;
}>> {
  const { data } = await supabase
    .from("space_heads")
    .select("device_id, head_cid, updated_at")
    .eq("space_id", spaceId);

  return (data ?? []).map(r => ({
    deviceId: r.device_id,
    headCid: r.head_cid,
    updatedAt: r.updated_at,
  }));
}

// ── DAG Merge ──────────────────────────────────────────────────────────────

/**
 * Merge two sets of changes using deterministic topological sort by CID.
 * Anytype-style: CID ordering guarantees every device converges to the
 * same state regardless of arrival order.
 */
export function mergeChanges(
  local: ChangeEnvelope[],
  remote: ChangeEnvelope[],
): ChangeEnvelope[] {
  const seen = new Set<string>();
  const merged: ChangeEnvelope[] = [];

  // Combine and deduplicate
  for (const c of [...local, ...remote]) {
    if (seen.has(c.changeCid)) continue;
    seen.add(c.changeCid);
    merged.push(c);
  }

  // Topological sort by CID (deterministic)
  // First, build dependency graph
  const deps = new Map<string, Set<string>>();
  for (const c of merged) {
    deps.set(c.changeCid, new Set(c.parentCids.filter(p => seen.has(p))));
  }

  const sorted: ChangeEnvelope[] = [];
  const visited = new Set<string>();

  function visit(cid: string) {
    if (visited.has(cid)) return;
    visited.add(cid);
    const parents = deps.get(cid);
    if (parents) {
      // Sort parents by CID for determinism
      const sortedParents = [...parents].sort();
      for (const p of sortedParents) visit(p);
    }
    const change = merged.find(c => c.changeCid === cid);
    if (change) sorted.push(change);
  }

  // Visit all nodes in CID order for determinism
  const allCids = [...seen].sort();
  for (const cid of allCids) visit(cid);

  return sorted;
}

/**
 * Compute the merged head CID from a set of changes.
 * The head is the CID with no children (DAG tip).
 */
export function computeHead(changes: ChangeEnvelope[]): string | null {
  if (changes.length === 0) return null;
  const hasChild = new Set<string>();
  for (const c of changes) {
    for (const p of c.parentCids) hasChild.add(p);
  }
  // Tips = changes that are not parents of any other change
  const tips = changes.filter(c => !hasChild.has(c.changeCid));
  // If multiple tips, merge CID is deterministic hash of sorted tips
  if (tips.length === 0) return changes[changes.length - 1].changeCid;
  if (tips.length === 1) return tips[0].changeCid;
  // Multiple tips: sort by CID, return last (deterministic)
  tips.sort((a, b) => a.changeCid.localeCompare(b.changeCid));
  return tips[tips.length - 1].changeCid;
}
