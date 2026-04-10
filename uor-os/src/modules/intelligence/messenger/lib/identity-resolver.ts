/**
 * Identity Resolver — Cross-platform contact deduplication engine.
 * ═══════════════════════════════════════════════════════════════════
 *
 * Automatically and manually merges contacts across platforms:
 * - Auto-merge by phone number (WhatsApp + Signal share phone)
 * - Auto-merge by email (Email + LinkedIn often share email)
 * - Fuzzy name matching for suggested merges
 * - Each merged contact gets a single urn:uor:contact:{hash}
 */

import { supabase } from "@/integrations/supabase/client";
import { generateCanonicalId } from "./matrix/identity-mapper";
import type { BridgePlatform } from "./types";

// ── Types ───────────────────────────────────────────────────────────────────

export interface Contact {
  id: string;
  canonicalHash: string;
  displayName: string;
  mergedIdentities: SocialIdentity[];
}

export interface SocialIdentity {
  id: string;
  platform: BridgePlatform | "matrix" | "native";
  platformUserId: string;
  platformHandle?: string;
  displayName?: string;
  avatarUrl?: string;
  verified: boolean;
}

export interface MergeSuggestion {
  contactA: Contact;
  contactB: Contact;
  reason: string;
  confidence: number;
  matchField: "phone" | "email" | "name";
}

// ── Contact CRUD ────────────────────────────────────────────────────────────

/**
 * Create a new contact with an initial identity.
 */
export async function createContact(
  userId: string,
  displayName: string,
  identity: Omit<SocialIdentity, "id" | "verified">,
): Promise<string | null> {
  const canonicalHash = generateCanonicalId(identity.platform, identity.platformUserId);

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      user_id: userId,
      canonical_hash: canonicalHash,
      display_name: displayName,
      merged_identities: [],
    } as any)
    .select("id")
    .single();

  if (error || !data) return null;

  const contactId = (data as any).id;

  // Create the social identity
  await supabase.from("social_identities").insert({
    user_id: userId,
    contact_id: contactId,
    platform: identity.platform,
    platform_user_id: identity.platformUserId,
    platform_handle: identity.platformHandle ?? null,
    display_name: identity.displayName ?? null,
    avatar_url: identity.avatarUrl ?? null,
    verified: false,
  } as any);

  return contactId;
}

/**
 * Get all contacts for a user.
 */
export async function getContacts(userId: string): Promise<Contact[]> {
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, canonical_hash, display_name")
    .eq("user_id", userId)
    .order("display_name");

  if (!contacts) return [];

  const contactIds = contacts.map((c: any) => c.id);
  const { data: identities } = await supabase
    .from("social_identities")
    .select("id, contact_id, platform, platform_user_id, platform_handle, display_name, avatar_url, verified")
    .in("contact_id", contactIds);

  const identityMap = new Map<string, SocialIdentity[]>();
  for (const id of (identities ?? []) as any[]) {
    const list = identityMap.get(id.contact_id) ?? [];
    list.push({
      id: id.id,
      platform: id.platform,
      platformUserId: id.platform_user_id,
      platformHandle: id.platform_handle,
      displayName: id.display_name,
      avatarUrl: id.avatar_url,
      verified: id.verified,
    });
    identityMap.set(id.contact_id, list);
  }

  return contacts.map((c: any) => ({
    id: c.id,
    canonicalHash: c.canonical_hash,
    displayName: c.display_name,
    mergedIdentities: identityMap.get(c.id) ?? [],
  }));
}

// ── Merge Operations ────────────────────────────────────────────────────────

/**
 * Merge two contacts into one. Moves all identities from contactB into contactA.
 * Deletes contactB after merge.
 */
export async function mergeContacts(
  userId: string,
  keepContactId: string,
  mergeContactId: string,
): Promise<boolean> {
  // Move all identities from mergeContact to keepContact
  const { error: updateError } = await supabase
    .from("social_identities")
    .update({ contact_id: keepContactId } as any)
    .eq("contact_id", mergeContactId)
    .eq("user_id", userId);

  if (updateError) return false;

  // Delete the merged contact
  const { error: deleteError } = await supabase
    .from("contacts")
    .delete()
    .eq("id", mergeContactId)
    .eq("user_id", userId);

  return !deleteError;
}

/**
 * Split an identity from a contact into a new separate contact.
 */
export async function splitIdentity(
  userId: string,
  identityId: string,
  newDisplayName: string,
): Promise<string | null> {
  // Get the identity details
  const { data: identity } = await supabase
    .from("social_identities")
    .select("*")
    .eq("id", identityId)
    .eq("user_id", userId)
    .single();

  if (!identity) return null;

  const id = identity as any;
  const canonicalHash = generateCanonicalId(id.platform, id.platform_user_id);

  // Create new contact
  const { data: newContact } = await supabase
    .from("contacts")
    .insert({
      user_id: userId,
      canonical_hash: canonicalHash,
      display_name: newDisplayName,
      merged_identities: [],
    } as any)
    .select("id")
    .single();

  if (!newContact) return null;

  const newContactId = (newContact as any).id;

  // Move the identity to the new contact
  await supabase
    .from("social_identities")
    .update({ contact_id: newContactId } as any)
    .eq("id", identityId);

  return newContactId;
}

// ── Auto-merge Detection ────────────────────────────────────────────────────

/**
 * Find merge suggestions based on shared phone numbers, emails, or similar names.
 */
export async function findMergeSuggestions(userId: string): Promise<MergeSuggestion[]> {
  const contacts = await getContacts(userId);
  const suggestions: MergeSuggestion[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < contacts.length; i++) {
    for (let j = i + 1; j < contacts.length; j++) {
      const a = contacts[i];
      const b = contacts[j];
      const pairKey = `${a.id}:${b.id}`;
      if (seen.has(pairKey)) continue;

      // Check phone number match (WhatsApp + Signal)
      const aPhones = a.mergedIdentities
        .filter((id) => id.platform === "whatsapp" || id.platform === "signal" || id.platform === "sms")
        .map((id) => normalizePhone(id.platformUserId));
      const bPhones = b.mergedIdentities
        .filter((id) => id.platform === "whatsapp" || id.platform === "signal" || id.platform === "sms")
        .map((id) => normalizePhone(id.platformUserId));

      const phoneMatch = aPhones.some((p) => bPhones.includes(p));
      if (phoneMatch) {
        suggestions.push({ contactA: a, contactB: b, reason: "Same phone number", confidence: 0.95, matchField: "phone" });
        seen.add(pairKey);
        continue;
      }

      // Check email match (Email + LinkedIn)
      const aEmails = a.mergedIdentities
        .filter((id) => id.platform === "email" || id.platform === "linkedin")
        .map((id) => id.platformUserId.toLowerCase());
      const bEmails = b.mergedIdentities
        .filter((id) => id.platform === "email" || id.platform === "linkedin")
        .map((id) => id.platformUserId.toLowerCase());

      const emailMatch = aEmails.some((e) => bEmails.includes(e));
      if (emailMatch) {
        suggestions.push({ contactA: a, contactB: b, reason: "Same email address", confidence: 0.9, matchField: "email" });
        seen.add(pairKey);
        continue;
      }

      // Fuzzy name match
      const nameSimilarity = computeNameSimilarity(a.displayName, b.displayName);
      if (nameSimilarity > 0.85) {
        suggestions.push({
          contactA: a,
          contactB: b,
          reason: "Similar display names",
          confidence: nameSimilarity * 0.7,
          matchField: "name",
        });
        seen.add(pairKey);
      }
    }
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

// ── Utilities ───────────────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9+]/g, "");
}

/**
 * Simple Jaccard-based name similarity.
 */
function computeNameSimilarity(a: string, b: string): number {
  const normalize = (s: string) =>
    s.toLowerCase().trim().split(/\s+/).sort().join(" ");

  const na = normalize(a);
  const nb = normalize(b);

  if (na === nb) return 1.0;

  const wordsA = new Set(na.split(" "));
  const wordsB = new Set(nb.split(" "));

  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);

  return union.size > 0 ? intersection.size / union.size : 0;
}
