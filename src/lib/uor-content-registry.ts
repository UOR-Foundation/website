/**
 * UOR Content Certificate Registry.
 * Generates verification certificates for all key data objects on the site,
 * making every significant content structure content-addressed and verifiable.
 */

import { generateCertificate, type UorCertificate } from "./uor-certificate";

// Data imports
import { navItems } from "@/data/nav-items";
import { pillars } from "@/data/pillars";
import { highlights } from "@/data/highlights";
import { featuredProjects } from "@/data/featured-projects";
import { frameworkLayers } from "@/data/framework-layers";
import { researchCategories } from "@/data/research-categories";
import { blogPosts } from "@/data/blog-posts";
import { projects, maturityInfo } from "@/data/projects";
import { governancePrinciples } from "@/data/governance";
import { routeTable } from "@/data/route-table";

// ── Types ───────────────────────────────────────────────────────────────────

export interface ContentCertificateEntry {
  subjectId: string;
  label: string;
  certificate: UorCertificate;
  verified: boolean;
}

// ── Registry singleton ──────────────────────────────────────────────────────

const contentCertificates = new Map<string, ContentCertificateEntry>();
let initialized = false;
const initListeners: Array<() => void> = [];

export function onContentRegistryInitialized(cb: () => void): () => void {
  if (initialized) {
    cb();
    return () => {};
  }
  initListeners.push(cb);
  return () => {
    const idx = initListeners.indexOf(cb);
    if (idx >= 0) initListeners.splice(idx, 1);
  };
}

// ── Certifiable content definitions ─────────────────────────────────────────

const CERTIFIABLE_CONTENT: Array<{
  subjectId: string;
  label: string;
  data: unknown;
}> = [
  { subjectId: "content:route-table", label: "Route Table", data: routeTable },
  { subjectId: "content:nav-items", label: "Navigation Items", data: navItems },
  { subjectId: "content:pillars", label: "Three Pillars", data: pillars },
  { subjectId: "content:highlights", label: "Community Highlights", data: highlights },
  { subjectId: "content:featured-projects", label: "Featured Projects", data: featuredProjects },
  { subjectId: "content:framework-layers", label: "Framework Layers", data: frameworkLayers },
  { subjectId: "content:research-categories", label: "Research Categories", data: researchCategories },
  { subjectId: "content:blog-posts", label: "Blog Posts", data: blogPosts },
  { subjectId: "content:projects", label: "Project Catalog", data: projects },
  { subjectId: "content:maturity-model", label: "Maturity Model", data: maturityInfo },
  { subjectId: "content:governance-principles", label: "Governance Principles", data: governancePrinciples },
];

// ── Initialization ──────────────────────────────────────────────────────────

export async function initializeContentRegistry(): Promise<void> {
  if (initialized) return;

  const results = await Promise.all(
    CERTIFIABLE_CONTENT.map(async ({ subjectId, label, data }) => {
      const envelope: Record<string, unknown> = {
        "@context": "https://uor.foundation/contexts/uor-v1.jsonld",
        "@type": "uor:ContentObject",
        "uor:subjectId": subjectId,
        "uor:data": data,
      };
      const certificate = await generateCertificate(subjectId, envelope);
      return { subjectId, label, certificate };
    })
  );

  for (const { subjectId, label, certificate } of results) {
    contentCertificates.set(subjectId, {
      subjectId,
      label,
      certificate,
      verified: true,
    });
  }

  initialized = true;
  initListeners.forEach((cb) => cb());
  initListeners.length = 0;

  console.log(
    `[UOR Content Registry] Certified ${contentCertificates.size} content objects.`
  );
}

// ── Public API ──────────────────────────────────────────────────────────────

export function getAllContentCertificates(): Map<string, ContentCertificateEntry> {
  return contentCertificates;
}

export function getContentCertificate(id: string): ContentCertificateEntry | undefined {
  return contentCertificates.get(id);
}

export function isContentRegistryInitialized(): boolean {
  return initialized;
}
