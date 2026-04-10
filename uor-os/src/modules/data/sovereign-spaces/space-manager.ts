/**
 * Sovereign Spaces — Space Manager
 * ═════════════════════════════════════════════════════════════════
 *
 * CRUD operations for spaces and membership.
 * All operations are local-first: spaces work offline,
 * sync to cloud when authenticated and online.
 */

import { supabase } from "@/integrations/supabase/client";
import { sha256hex } from "@/lib/crypto";
import type {
  SovereignSpace, SpaceMember, SpaceType, SpaceRole,
} from "./types";

// ── Local cache ────────────────────────────────────────────────────────────

let spacesCache: SovereignSpace[] = [];
let activeSpaceId: string | null = null;
let listeners: Array<() => void> = [];

function emit() { listeners.forEach(fn => fn()); }

// ── Helpers ────────────────────────────────────────────────────────────────

async function spaceGraphIri(name: string, ownerId: string, type: SpaceType): Promise<string> {
  if (type === "personal") return `urn:uor:space:personal:${ownerId}`;
  const hash = await sha256hex(JSON.stringify({ name, ownerId, type, t: Date.now() }));
  return `urn:uor:space:${hash.slice(0, 16)}`;
}

async function spaceCid(name: string, ownerId: string, graphIri: string): Promise<string> {
  return sha256hex(JSON.stringify({ "@type": "uor:Space", name, ownerId, graphIri }));
}

// ── Public API ─────────────────────────────────────────────────────────────

export const spaceManager = {

  subscribe(fn: () => void) {
    listeners.push(fn);
    return () => { listeners = listeners.filter(l => l !== fn); };
  },

  getSpaces(): SovereignSpace[] { return spacesCache; },

  getActiveSpace(): SovereignSpace | null {
    return spacesCache.find(s => s.id === activeSpaceId) ?? spacesCache[0] ?? null;
  },

  getActiveGraphIri(): string {
    return this.getActiveSpace()?.graphIri ?? "urn:uor:local";
  },

  setActiveSpace(id: string) {
    activeSpaceId = id;
    localStorage.setItem("uor:active-space", id);
    emit();
  },

  /**
   * Load spaces for the current user.
   * Creates a personal space if none exists.
   */
  async load(): Promise<SovereignSpace[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Offline / unauthenticated: use local personal space
      spacesCache = [{
        id: "local-personal",
        cid: "local",
        name: "Personal",
        ownerId: "local",
        spaceType: "personal",
        graphIri: "urn:uor:local",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }];
      activeSpaceId = spacesCache[0].id;
      emit();
      return spacesCache;
    }

    const userId = session.user.id;

    // Fetch spaces where user is a member
    const { data: memberships } = await supabase
      .from("space_members")
      .select("space_id")
      .eq("user_id", userId);

    const spaceIds = memberships?.map(m => m.space_id) ?? [];

    let spaces: SovereignSpace[] = [];
    if (spaceIds.length > 0) {
      const { data } = await supabase
        .from("sovereign_spaces")
        .select("*")
        .in("id", spaceIds);
      spaces = (data ?? []).map(mapRow);
    }

    // Also fetch owned spaces (in case membership wasn't created yet)
    const { data: owned } = await supabase
      .from("sovereign_spaces")
      .select("*")
      .eq("owner_id", userId);

    const ownedMapped = (owned ?? []).map(mapRow);
    const allIds = new Set(spaces.map(s => s.id));
    for (const s of ownedMapped) {
      if (!allIds.has(s.id)) spaces.push(s);
    }

    // If no personal space, create one
    if (!spaces.some(s => s.spaceType === "personal" && s.ownerId === userId)) {
      const personal = await this.create("Personal", "personal");
      spaces.unshift(personal);
    }

    spacesCache = spaces;
    // Restore active or default to personal
    const stored = localStorage.getItem("uor:active-space");
    activeSpaceId = stored && spaces.some(s => s.id === stored)
      ? stored
      : spaces.find(s => s.spaceType === "personal")?.id ?? spaces[0]?.id ?? null;
    emit();
    return spacesCache;
  },

  /**
   * Create a new space. Owner is automatically added as member.
   */
  async create(name: string, type: SpaceType): Promise<SovereignSpace> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Authentication required to create spaces");

    const userId = session.user.id;
    const graphIri = await spaceGraphIri(name, userId, type);
    const cid = await spaceCid(name, userId, graphIri);

    const { data, error } = await supabase
      .from("sovereign_spaces")
      .insert({
        cid,
        name,
        owner_id: userId,
        space_type: type,
        graph_iri: graphIri,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create space: ${error.message}`);

    // Add owner as member
    await supabase.from("space_members").insert({
      space_id: data.id,
      user_id: userId,
      role: "owner",
    });

    const space = mapRow(data);
    spacesCache.push(space);
    emit();
    return space;
  },

  /**
   * Invite a user to a space.
   */
  async invite(spaceId: string, targetUserId: string, role: SpaceRole = "reader"): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Authentication required");

    const { error } = await supabase.from("space_members").insert({
      space_id: spaceId,
      user_id: targetUserId,
      role,
      invited_by: session.user.id,
    });

    if (error) throw new Error(`Failed to invite: ${error.message}`);
  },

  /**
   * Leave a space (cannot leave personal space).
   */
  async leave(spaceId: string): Promise<void> {
    const space = spacesCache.find(s => s.id === spaceId);
    if (space?.spaceType === "personal") throw new Error("Cannot leave personal space");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Authentication required");

    await supabase
      .from("space_members")
      .delete()
      .eq("space_id", spaceId)
      .eq("user_id", session.user.id);

    spacesCache = spacesCache.filter(s => s.id !== spaceId);
    if (activeSpaceId === spaceId) {
      activeSpaceId = spacesCache[0]?.id ?? null;
    }
    emit();
  },

  /**
   * Get members of a space.
   */
  async getMembers(spaceId: string): Promise<SpaceMember[]> {
    const { data } = await supabase
      .from("space_members")
      .select("*")
      .eq("space_id", spaceId);

    return (data ?? []).map(r => ({
      id: r.id,
      spaceId: r.space_id,
      userId: r.user_id,
      role: r.role as SpaceRole,
      invitedBy: r.invited_by ?? undefined,
      joinedAt: r.joined_at,
    }));
  },

  /**
   * Get the current user's role in a space.
   */
  async getMyRole(spaceId: string): Promise<SpaceRole | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data } = await supabase
      .from("space_members")
      .select("role")
      .eq("space_id", spaceId)
      .eq("user_id", session.user.id)
      .maybeSingle();

    return (data?.role as SpaceRole) ?? null;
  },
};

// ── Row mapper ─────────────────────────────────────────────────────────────

function mapRow(row: any): SovereignSpace {
  return {
    id: row.id,
    cid: row.cid,
    name: row.name,
    ownerId: row.owner_id,
    spaceType: row.space_type,
    graphIri: row.graph_iri,
    encryptedKey: row.encrypted_key ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
