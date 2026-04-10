/**
 * Universal Graph Anchor — Knowledge Graph-First Interaction Layer
 * ═══════════════════════════════════════════════════════════════════
 *
 * Every user-facing interaction in the system MUST be anchored into the
 * Sovereign Knowledge Graph. This module provides the canonical, zero-
 * boilerplate utility for doing so.
 *
 * Usage:
 *   import { anchor, useGraphAnchor } from "@/modules/knowledge-graph";
 *
 *   // Fire-and-forget anchoring
 *   anchor("messenger", "message:sent", { label: "Message to Alice", ... });
 *
 *   // React hook (auto-anchors on mount + provides anchoring fn)
 *   const { anchor } = useGraphAnchor("media");
 *   anchor("track:played", { label: track.title });
 *
 * @module knowledge-graph/anchor
 */

import { grafeoStore } from "./grafeo-store";
import type { KGNode } from "./types";
import { useCallback, useEffect, useRef } from "react";

// ── Constants ────────────────────────────────────────────────────────────────

const UOR_NS = "https://uor.foundation/";
const ANCHOR_GRAPH = (mod: string) => `${UOR_NS}graph/${mod}`;
const ANCHOR_TYPE = `${UOR_NS}schema/AnchoredInteraction`;

// ── Simple content hash (synchronous, no WASM dependency) ────────────────────

function simpleHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function deriveAnchorIri(module: string, event: string, timestamp: number): string {
  const hash = simpleHash(`${module}:${event}:${timestamp}`);
  return `${UOR_NS}anchor/${module}/${hash}`;
}

// ── Anchor Options ───────────────────────────────────────────────────────────

export interface AnchorOptions {
  /** Human-readable label for the graph node */
  readonly label: string;
  /** Additional properties to store on the node */
  readonly properties?: Record<string, unknown>;
  /** Link this anchor to an existing node by UOR address */
  readonly linkedTo?: string;
  /** Edge predicate for the link (default: uor:schema/anchoredBy) */
  readonly linkPredicate?: string;
  /** Node type override (default: event name) */
  readonly nodeType?: string;
}

// ── Anchor Registry (tracks which modules have anchored) ─────────────────────

const anchoredModules = new Set<string>();

/** Get all modules that have called anchor() at least once */
export function getAnchoredModules(): ReadonlySet<string> {
  return anchoredModules;
}

// ── Core Anchor Function ─────────────────────────────────────────────────────

/**
 * Anchor an interaction into the Sovereign Knowledge Graph.
 *
 * Fire-and-forget — returns a Promise but callers can ignore it.
 * No module should ever block on graph writes.
 *
 * @param module  Module namespace (e.g., "messenger", "media", "projects")
 * @param event   Event type (e.g., "message:sent", "track:played")
 * @param options Label, properties, and optional links
 */
export async function anchor(
  module: string,
  event: string,
  options: AnchorOptions,
): Promise<string> {
  const now = Date.now();
  const iri = deriveAnchorIri(module, event, now);
  const graphIri = ANCHOR_GRAPH(module);

  // Track that this module has anchored
  anchoredModules.add(module);

  const node: KGNode = {
    uorAddress: iri,
    label: options.label,
    nodeType: options.nodeType ?? event,
    rdfType: ANCHOR_TYPE,
    properties: {
      ...options.properties,
      _module: module,
      _event: event,
      _anchoredAt: new Date(now).toISOString(),
    },
    createdAt: now,
    updatedAt: now,
    syncState: "local",
  };

  try {
    await grafeoStore.putNode(node);

    // If linked to another node, create an edge
    if (options.linkedTo) {
      await grafeoStore.putEdge(
        options.linkedTo,
        options.linkPredicate ?? `${UOR_NS}schema/anchoredBy`,
        iri,
        graphIri,
      );
    }

    // Module provenance edge — link anchor to its source module
    const moduleIri = `${UOR_NS}module/${module}`;
    await grafeoStore.putEdge(iri, `${UOR_NS}schema/sourceModule`, moduleIri, graphIri);
  } catch (err) {
    // Never block the caller — log and continue
    console.warn(`[KG:anchor] Failed to anchor ${module}/${event}:`, err);
  }

  return iri;
}

// ── React Hook ───────────────────────────────────────────────────────────────

export interface GraphAnchorHandle {
  /** Anchor an event for this module */
  anchor: (event: string, options: AnchorOptions) => Promise<string>;
  /** The module's named graph IRI */
  graphIri: string;
}

/**
 * React hook that provides graph anchoring for a specific module.
 * Anchors a "module:mounted" event on first render.
 *
 * @param module Module namespace (e.g., "media", "messenger")
 */
export function useGraphAnchor(module: string): GraphAnchorHandle {
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      anchor(module, "module:mounted", {
        label: `${module} module activated`,
        properties: { mountTime: Date.now() },
      }).catch(() => {});
    }
  }, [module]);

  const anchorFn = useCallback(
    (event: string, options: AnchorOptions) => anchor(module, event, options),
    [module],
  );

  return {
    anchor: anchorFn,
    graphIri: ANCHOR_GRAPH(module),
  };
}
