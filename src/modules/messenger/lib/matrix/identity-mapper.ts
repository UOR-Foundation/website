/**
 * Identity Mapper — Maps Matrix IDs ↔ UOR Canonical Identities.
 * ═══════════════════════════════════════════════════════════════
 *
 * Resolves Matrix user IDs (including bridge ghost users) to UOR canonical
 * identities, and maps 3PIDs (email, phone) through the Matrix identity
 * service to find existing Matrix users.
 */

import { sha256 } from "@noble/hashes/sha2.js";
import { supabase } from "@/integrations/supabase/client";
import { parseBridgeUserId } from "./client";
import type { UorIdentityMapping } from "../bridges/bridge-protocol";
import type { BridgePlatform } from "../types";

// ── Types ───────────────────────────────────────────────────────────────────

export interface ResolvedIdentity {
  /** UOR canonical ID — deterministic hash of all known identities */
  canonicalId: string;
  /** Matrix user ID if known */
  matrixUserId?: string;
  /** Display name (best available) */
  displayName: string;
  /** Platform-specific identities */
  identities: PlatformIdentity[];
  /** Whether this identity has been verified via ceremony */
  verified: boolean;
}

export interface PlatformIdentity {
  platform: BridgePlatform | "matrix" | "native";
  platformUserId: string;
  platformHandle?: string;
  displayName?: string;
  avatarUrl?: string;
}

// ── Resolution ──────────────────────────────────────────────────────────────

/**
 * Resolve a Matrix user ID to a UOR identity.
 * Handles both native Matrix users and bridge ghost users.
 */
export function resolveMatrixId(matrixUserId: string): UorIdentityMapping {
  const bridgeInfo = parseBridgeUserId(matrixUserId);

  if (bridgeInfo) {
    // Bridge ghost user — map to platform identity
    const canonicalId = generateCanonicalId(bridgeInfo.platform, bridgeInfo.externalId);
    return {
      platform: bridgeInfo.platform as BridgePlatform,
      externalId: bridgeInfo.externalId,
      uorCanonicalId: canonicalId,
      displayName: bridgeInfo.externalId,
      verified: false,
    };
  }

  // Native Matrix user
  const canonicalId = generateCanonicalId("matrix", matrixUserId);
  return {
    platform: "whatsapp", // Placeholder — will be overridden
    externalId: matrixUserId,
    uorCanonicalId: canonicalId,
    displayName: matrixUserId.split(":")[0]?.replace("@", "") ?? matrixUserId,
    verified: false,
  };
}

/**
 * Resolve a 3PID (email or phone) to a UOR canonical identity.
 * Checks our social_identities table for existing mappings.
 */
export async function resolve3PID(
  userId: string,
  medium: "email" | "phone",
  address: string,
): Promise<ResolvedIdentity | null> {
  // Check our local identity store first
  const platform = medium === "email" ? "email" : "whatsapp"; // Phone → WhatsApp/Signal
  const { data: identities } = await supabase
    .from("social_identities")
    .select("*, contacts(*)")
    .eq("user_id", userId)
    .eq("platform", platform)
    .eq("platform_user_id", address)
    .limit(1);

  if (identities && identities.length > 0) {
    const identity = identities[0] as any;
    const contact = identity.contacts;

    return {
      canonicalId: contact?.canonical_hash ?? generateCanonicalId(platform, address),
      displayName: contact?.display_name ?? identity.display_name ?? address,
      identities: [
        {
          platform: identity.platform,
          platformUserId: identity.platform_user_id,
          platformHandle: identity.platform_handle,
          displayName: identity.display_name,
          avatarUrl: identity.avatar_url,
        },
      ],
      verified: identity.verified,
    };
  }

  return null;
}

/**
 * Look up all known identities for a contact across platforms.
 */
export async function getContactIdentities(
  userId: string,
  contactId: string,
): Promise<PlatformIdentity[]> {
  const { data } = await supabase
    .from("social_identities")
    .select("platform, platform_user_id, platform_handle, display_name, avatar_url")
    .eq("user_id", userId)
    .eq("contact_id", contactId);

  return (data ?? []).map((row: any) => ({
    platform: row.platform,
    platformUserId: row.platform_user_id,
    platformHandle: row.platform_handle,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
  }));
}

/**
 * Store or update a social identity mapping.
 */
export async function upsertSocialIdentity(
  userId: string,
  contactId: string,
  identity: PlatformIdentity,
): Promise<void> {
  await supabase.from("social_identities").upsert(
    {
      user_id: userId,
      contact_id: contactId,
      platform: identity.platform,
      platform_user_id: identity.platformUserId,
      platform_handle: identity.platformHandle ?? null,
      display_name: identity.displayName ?? null,
      avatar_url: identity.avatarUrl ?? null,
      last_synced_at: new Date().toISOString(),
    } as any,
    { onConflict: "user_id,platform,platform_user_id" },
  );
}

// ── KG Triple Generation ────────────────────────────────────────────────────

/**
 * Generate Knowledge Graph triples for a contact's identity graph.
 */
export function buildIdentityTriples(
  contactCanonicalHash: string,
  identities: PlatformIdentity[],
): Array<{
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
}> {
  const contactIri = `urn:uor:contact:${contactCanonicalHash}`;

  return identities.map((id) => ({
    subject: contactIri,
    predicate: "uor:hasIdentity",
    object: `urn:uor:${id.platform}:${id.platformUserId}`,
    confidence: id.platform === "native" ? 1.0 : 0.9,
  }));
}

// ── Utilities ───────────────────────────────────────────────────────────────

/**
 * Generate a deterministic UOR canonical ID from platform + external ID.
 */
export function generateCanonicalId(platform: string, externalId: string): string {
  const encoder = new TextEncoder();
  const input = `${platform}:${externalId}`;
  const hashBytes = sha256(encoder.encode(input));
  const hex = Array.from(hashBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `urn:uor:contact:${hex.slice(0, 32)}`;
}
