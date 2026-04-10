/**
 * Knowledge Graph Seed Layer
 * ═══════════════════════════════════════════════════════════════════
 *
 * Ingests all static data from src/data/* into the Knowledge Graph
 * on boot. This ensures the KG is the sole substrate from which the
 * OS is projected — every nav item, team member, event, and app
 * becomes a first-class graph citizen, queryable via SPARQL.
 *
 * Runs once after GrafeoDB init. Idempotent — skips if already seeded.
 *
 * @module knowledge-graph/seed
 */

import { grafeoStore } from "./grafeo-store";
import { anchor } from "./anchor";
import type { KGNode } from "./types";

// ── Static data imports ─────────────────────────────────────────────────────

import { navItems } from "@/data/nav-items";
import { teamMembers } from "@/data/team-members";
import { events } from "@/data/events";

// ── Schema.org type mappings ────────────────────────────────────────────────

interface SeedEntry {
  readonly type: string;
  readonly graph: string;
  readonly items: readonly Record<string, unknown>[];
  readonly labelKey: string;
}

const SEED_MANIFEST: readonly SeedEntry[] = [
  {
    type: "schema:SiteNavigationElement",
    graph: "urn:uor:seed:nav",
    items: navItems,
    labelKey: "label",
  },
  {
    type: "schema:Person",
    graph: "urn:uor:seed:team",
    items: teamMembers,
    labelKey: "name",
  },
  {
    type: "schema:Event",
    graph: "urn:uor:seed:events",
    items: events,
    labelKey: "title",
  },
];

// ── Lazy imports for larger data files (tree-shake friendly) ────────────────

async function getLazySeedEntries(): Promise<SeedEntry[]> {
  const entries: SeedEntry[] = [];

  try {
    const { featuredProjects } = await import("@/data/featured-projects");
    entries.push({
      type: "schema:SoftwareSourceCode",
      graph: "urn:uor:seed:projects",
      items: featuredProjects,
      labelKey: "name",
    });
  } catch { /* optional */ }

  try {
    const { frameworkLayers } = await import("@/data/framework-layers");
    entries.push({
      type: "uor:FrameworkLayer",
      graph: "urn:uor:seed:framework",
      items: frameworkLayers,
      labelKey: "title",
    });
  } catch { /* optional */ }

  try {
    const { categoryResearch } = await import("@/data/research-papers");
    const allPapers = Object.values(categoryResearch).flat();
    entries.push({
      type: "schema:ScholarlyArticle",
      graph: "urn:uor:seed:research",
      items: allPapers,
      labelKey: "title",
    });
  } catch { /* optional */ }

  try {
    const mod = await import("@/data/app-store");
    const apps = (mod as any).appStoreEntries ?? (mod as any).default ?? [];
    if (Array.isArray(apps) && apps.length > 0) {
      entries.push({
        type: "schema:SoftwareApplication",
        graph: "urn:uor:seed:apps",
        items: apps,
        labelKey: "name",
      });
    }
  } catch { /* optional */ }

  return entries;
}

// ── Seed state ──────────────────────────────────────────────────────────────

let _seeded = false;

/** Check if the graph has already been seeded this session */
export function isSeeded(): boolean {
  return _seeded;
}

// ── Simple content hash for deterministic IRI generation ────────────────────

function simpleHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

// ── Main seed function ──────────────────────────────────────────────────────

/**
 * Seed all static data into the Knowledge Graph.
 *
 * Idempotent: checks for a sentinel node before writing.
 * Safe to call multiple times — only the first call writes data.
 */
export async function seedStaticData(): Promise<{
  seeded: boolean;
  nodeCount: number;
  sourceCount: number;
}> {
  if (_seeded) return { seeded: false, nodeCount: 0, sourceCount: 0 };

  // Check for sentinel — if already seeded in IndexedDB, skip
  const sentinel = await grafeoStore.getNode("urn:uor:seed:sentinel");
  if (sentinel) {
    _seeded = true;
    return { seeded: false, nodeCount: 0, sourceCount: 0 };
  }

  const allEntries = [...SEED_MANIFEST, ...(await getLazySeedEntries())];
  let totalNodes = 0;

  for (const entry of allEntries) {
    for (const item of entry.items) {
      const label = String((item as any)[entry.labelKey] ?? "unnamed");
      const iri = `urn:uor:seed:${simpleHash(JSON.stringify(item))}`;

      const node: KGNode = {
        uorAddress: iri,
        label,
        nodeType: entry.type,
        rdfType: entry.type,
        properties: { ...item },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        syncState: "local",
      };

      await grafeoStore.putNode(node);
      totalNodes++;
    }
  }

  // Write sentinel node
  await grafeoStore.putNode({
    uorAddress: "urn:uor:seed:sentinel",
    label: "KG Seed Sentinel",
    nodeType: "uor:Sentinel",
    rdfType: "uor:Sentinel",
    properties: {
      seededAt: new Date().toISOString(),
      sourceCount: allEntries.length,
      nodeCount: totalNodes,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    syncState: "local",
  });

  _seeded = true;

  // Anchor the seed event
  anchor("knowledge-graph", "seed:completed", {
    label: `Seeded ${totalNodes} nodes from ${allEntries.length} sources`,
    properties: { nodeCount: totalNodes, sourceCount: allEntries.length },
  }).catch(() => {});

  console.log(`[KG:seed] Seeded ${totalNodes} nodes from ${allEntries.length} static data sources`);

  return { seeded: true, nodeCount: totalNodes, sourceCount: allEntries.length };
}
