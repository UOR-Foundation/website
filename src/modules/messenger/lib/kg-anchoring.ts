/**
 * Knowledge Graph Anchoring
 * ═════════════════════════
 *
 * Anchors decrypted messages and files into the user's personal
 * knowledge graph, enabling cross-reference and Oracle queries like:
 * "What did Alice send me about quantum computing?"
 */

import { supabase } from "@/integrations/supabase/client";
import type { DecryptedMessage } from "./types";

interface KGTriple {
  subject: string;
  predicate: string;
  object: string;
  sourceId: string;
  sourceType: string;
  confidence: number;
}

/**
 * Anchor a decrypted message into the messenger context graph.
 */
export async function anchorMessage(
  message: DecryptedMessage,
  userId: string,
  sessionHash: string,
): Promise<void> {
  if (message.plaintext === "🔒 Encrypted") return;

  const msgIri = `urn:ump:msg:${message.messageHash}`;
  const sessionIri = `urn:ump:session:${sessionHash}`;

  const triples: KGTriple[] = [
    {
      subject: msgIri,
      predicate: "uor:sentBy",
      object: `urn:uor:user:${message.senderId}`,
      sourceId: message.id,
      sourceType: "message",
      confidence: 1.0,
    },
    {
      subject: msgIri,
      predicate: "uor:inSession",
      object: sessionIri,
      sourceId: message.id,
      sourceType: "message",
      confidence: 1.0,
    },
    {
      subject: msgIri,
      predicate: "uor:createdAt",
      object: message.createdAt,
      sourceId: message.id,
      sourceType: "message",
      confidence: 1.0,
    },
  ];

  // Extract simple entities from plaintext for keyword indexing
  if (message.plaintext.length > 10) {
    triples.push({
      subject: msgIri,
      predicate: "uor:hasContent",
      object: message.plaintext.slice(0, 500), // Truncate for storage
      sourceId: message.id,
      sourceType: "message",
      confidence: 0.8,
    });
  }

  // File attachment anchoring
  if (message.fileManifest) {
    triples.push({
      subject: msgIri,
      predicate: "uor:hasAttachment",
      object: message.fileManifest.fileCid,
      sourceId: message.id,
      sourceType: "file",
      confidence: 1.0,
    });
    triples.push({
      subject: message.fileManifest.fileCid,
      predicate: "uor:filename",
      object: message.fileManifest.filename,
      sourceId: message.id,
      sourceType: "file",
      confidence: 1.0,
    });
  }

  // Batch insert into messenger_context_graph
  const rows = triples.map((t) => ({
    user_id: userId,
    triple_subject: t.subject,
    triple_predicate: t.predicate,
    triple_object: t.object,
    source_id: t.sourceId,
    source_type: t.sourceType,
    confidence: t.confidence,
  }));

  await supabase.from("messenger_context_graph").insert(rows);
}

/**
 * Anchor a bridged message (from external platform) into the KG.
 * Adds source platform and bridge provenance triples.
 */
export async function anchorBridgedMessage(
  message: DecryptedMessage,
  userId: string,
  sessionHash: string,
  sourcePlatform: string,
): Promise<void> {
  // First anchor as a regular message
  await anchorMessage(message, userId, sessionHash);

  const msgIri = `urn:ump:msg:${message.messageHash}`;

  const bridgeTriples = [
    {
      user_id: userId,
      triple_subject: msgIri,
      triple_predicate: "uor:sourcePlatform",
      triple_object: sourcePlatform,
      source_id: message.id,
      source_type: "bridged_message",
      confidence: 1.0,
    },
    {
      user_id: userId,
      triple_subject: msgIri,
      triple_predicate: "uor:bridgedFrom",
      triple_object: `urn:matrix:event:${message.id}`,
      source_id: message.id,
      source_type: "bridged_message",
      confidence: 1.0,
    },
  ];

  await supabase.from("messenger_context_graph").insert(bridgeTriples);
}

/**
 * Anchor a contact's cross-platform identity into the KG.
 */
export async function anchorContactIdentity(
  userId: string,
  contactCanonicalHash: string,
  platform: string,
  platformUserId: string,
): Promise<void> {
  const contactIri = `urn:uor:contact:${contactCanonicalHash}`;

  await supabase.from("messenger_context_graph").insert({
    user_id: userId,
    triple_subject: contactIri,
    triple_predicate: "uor:hasIdentity",
    triple_object: `urn:uor:${platform}:${platformUserId}`,
    source_type: "identity",
    confidence: 0.9,
  });
}

/**
 * Search the knowledge graph for messages matching a query.
 */
export async function searchKG(
  userId: string,
  query: string,
): Promise<Array<{ subject: string; predicate: string; object: string }>> {
  const { data } = await supabase
    .from("messenger_context_graph")
    .select("triple_subject, triple_predicate, triple_object")
    .eq("user_id", userId)
    .ilike("triple_object", `%${query}%`)
    .limit(50);

  return (data ?? []).map((r) => ({
    subject: r.triple_subject,
    predicate: r.triple_predicate,
    object: r.triple_object,
  }));
}
