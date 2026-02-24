/**
 * Skill.md Integrity Module
 * ═════════════════════════
 *
 * Parses a skill.md file, derives its UOR identity from raw bytes
 * (true supply-chain integrity), and projects across frameworks.
 *
 * Design: raw bytes → SHA-256 → UOR identity. No parsing-induced
 * information loss. The parsed descriptor is metadata for discovery.
 *
 * @module uns/core/skill-integrity
 */

import { project } from "./hologram";
import type { ProjectionInput } from "./hologram";

// ── Types ─────────────────────────────────────────────────────────────────

export interface SkillDescriptor {
  name: string;
  description: string;
  endpoints?: string[];
  parameters?: Record<string, string>;
  authentication?: string;
  version?: string;
  [key: string]: unknown;
}

export interface SkillIntegrity {
  descriptor: SkillDescriptor;
  hex: string;
  cid: string;
  projections: {
    skill: string;
    bitcoin: string;
    did: string;
    activitypub: string;
  };
}

// ── Parser ────────────────────────────────────────────────────────────────

export function parseSkillMd(raw: string): SkillDescriptor {
  const lines = raw.trim().split("\n");
  const desc: SkillDescriptor = { name: "", description: "" };
  let inFrontmatter = false;
  const bodyLines: string[] = [];

  for (const line of lines) {
    if (line.trim() === "---") { inFrontmatter = !inFrontmatter; continue; }
    if (inFrontmatter) {
      const m = line.match(/^(\w[\w-]*):\s*(.+)/);
      if (m) (desc as Record<string, unknown>)[m[1]] = m[2].trim();
    } else {
      bodyLines.push(line);
    }
  }

  const heading = bodyLines.find(l => l.startsWith("# "));
  if (heading) desc.name = heading.slice(2).trim();

  const descLine = bodyLines.find(l => l.trim() && !l.startsWith("#"));
  if (descLine) desc.description = descLine.trim();

  desc.endpoints = bodyLines
    .filter(l => /^\s*-\s*(GET|POST|PUT|DELETE|PATCH)\s/.test(l))
    .map(l => l.replace(/^\s*-\s*/, "").trim());
  if (!desc.endpoints.length) delete desc.endpoints;

  return desc;
}

// ── Raw-byte integrity ────────────────────────────────────────────────────

async function sha256hex(text: string): Promise<{ hex: string; bytes: Uint8Array }> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(buf);
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  return { hex, bytes };
}

function hexToCid(hex: string): string {
  return `bafyrei${hex.slice(0, 52)}`;
}

/**
 * Full integrity pipeline: raw bytes → SHA-256 → projections.
 * Hashes the raw file, not a parsed representation — zero information loss.
 */
export async function verifySkillIntegrity(raw: string): Promise<SkillIntegrity> {
  const descriptor = parseSkillMd(raw);
  const { hex, bytes } = await sha256hex(raw);
  const cid = hexToCid(hex);
  const input: ProjectionInput = { hashBytes: bytes, cid, hex };

  return {
    descriptor,
    hex,
    cid,
    projections: {
      skill: project(input, "skill-md").value,
      bitcoin: project(input, "bitcoin").value,
      did: project(input, "did").value,
      activitypub: project(input, "activitypub").value,
    },
  };
}

/**
 * Verifies a skill.md against a known-good hash.
 */
export async function isSkillTrusted(raw: string, trustedHex: string): Promise<boolean> {
  const { hex } = await sha256hex(raw);
  return hex === trustedHex;
}
