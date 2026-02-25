/**
 * Code Nexus — Ingestion Pipeline
 * ════════════════════════════════
 *
 * Accepts a GitHub URL or ZIP File, extracts source files,
 * and parses them using the existing code-kg regex analyzer.
 * Returns structured CodeEntity[] and CodeRelation[] arrays.
 */

import { unzipSync, strFromU8 } from "fflate";
import { analyzeTypeScript } from "@/modules/code-kg/analyzer";
import type { CodeEntity, CodeRelation, AnalysisResult } from "@/modules/code-kg/analyzer";

// ── Types ───────────────────────────────────────────────────────────────────

export interface SourceFile {
  path: string;
  content: string;
  language: string;
}

export interface IngestionResult {
  repoName: string;
  files: SourceFile[];
  entities: CodeEntity[];
  relations: CodeRelation[];
  analyses: Map<string, AnalysisResult>;
  totalLines: number;
}

// ── Language detection ──────────────────────────────────────────────────────

const SUPPORTED_EXTENSIONS: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".mts": "typescript",
};

function detectLanguage(path: string): string | null {
  const ext = "." + path.split(".").pop()?.toLowerCase();
  return SUPPORTED_EXTENSIONS[ext] ?? null;
}

function shouldSkip(path: string): boolean {
  return (
    path.includes("node_modules/") ||
    path.includes(".git/") ||
    path.includes("dist/") ||
    path.includes("build/") ||
    path.includes(".next/") ||
    path.includes("__pycache__/") ||
    path.endsWith(".d.ts") ||
    path.endsWith(".min.js") ||
    path.endsWith(".map") ||
    path.endsWith(".lock") ||
    path.endsWith(".png") ||
    path.endsWith(".jpg") ||
    path.endsWith(".svg") ||
    path.endsWith(".ico") ||
    path.endsWith(".woff") ||
    path.endsWith(".woff2")
  );
}

// ── GitHub URL parsing ──────────────────────────────────────────────────────

export function parseGitHubUrl(url: string): { owner: string; repo: string; branch: string } | null {
  const match = url.match(
    /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/tree\/([^/]+))?(?:\/|$)/
  );
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2],
    branch: match[3] || "main",
  };
}

// ── ZIP extraction ──────────────────────────────────────────────────────────

export function extractFilesFromZip(zipData: Uint8Array): SourceFile[] {
  const decompressed = unzipSync(zipData);
  const files: SourceFile[] = [];

  for (const [rawPath, data] of Object.entries(decompressed)) {
    // GitHub ZIPs have a top-level directory — strip it
    const parts = rawPath.split("/");
    const path = parts.length > 1 ? parts.slice(1).join("/") : rawPath;

    if (!path || path.endsWith("/")) continue; // skip directories
    if (shouldSkip(path)) continue;

    const language = detectLanguage(path);
    if (!language) continue;

    try {
      const content = strFromU8(data);
      files.push({ path, content, language });
    } catch {
      // Binary file or encoding issue — skip
    }
  }

  return files;
}

// ── Analysis pipeline ───────────────────────────────────────────────────────

/**
 * Analyze all source files and aggregate entities/relations.
 * Entity names are scoped with file path to avoid collisions.
 */
export async function analyzeFiles(
  files: SourceFile[],
  repoName: string
): Promise<IngestionResult> {
  const allEntities: CodeEntity[] = [];
  const allRelations: CodeRelation[] = [];
  const analyses = new Map<string, AnalysisResult>();
  let totalLines = 0;

  for (const file of files) {
    const analysis = await analyzeTypeScript(file.content);
    analyses.set(file.path, analysis);

    // Prefix entity names with file path for uniqueness
    for (const entity of analysis.entities) {
      allEntities.push({
        ...entity,
        name: `${file.path}::${entity.name}`,
        content: `[${file.path}:${entity.line}] ${entity.content}`,
      });
    }

    // Prefix relation source/target with file path
    for (const rel of analysis.relations) {
      allRelations.push({
        ...rel,
        source: rel.source === "module" ? file.path : `${file.path}::${rel.source}`,
        target: rel.target === "module" ? file.path : `${file.path}::${rel.target}`,
      });
    }

    totalLines += file.content.split("\n").length;
  }

  return {
    repoName,
    files,
    entities: allEntities,
    relations: allRelations,
    analyses,
    totalLines,
  };
}

// ── Full pipeline ───────────────────────────────────────────────────────────

/**
 * Fetch a GitHub repo via the edge function proxy, unzip, parse, and return results.
 */
export async function ingestFromGitHub(
  url: string,
  onProgress?: (msg: string) => void
): Promise<IngestionResult> {
  const parsed = parseGitHubUrl(url);
  if (!parsed) throw new Error("Invalid GitHub URL");

  onProgress?.("Fetching repository archive…");

  // Call the fetch-repo edge function
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const funcUrl = `https://${projectId}.supabase.co/functions/v1/fetch-repo`;

  const response = await fetch(funcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": anonKey,
      "Authorization": `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      owner: parsed.owner,
      repo: parsed.repo,
      branch: parsed.branch,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to fetch repository: ${errText}`);
  }

  onProgress?.("Extracting files…");
  const zipBuffer = await response.arrayBuffer();
  const files = extractFilesFromZip(new Uint8Array(zipBuffer));

  if (files.length === 0) {
    throw new Error("No supported source files found in repository");
  }

  onProgress?.(`Parsing ${files.length} files…`);
  return analyzeFiles(files, `${parsed.owner}/${parsed.repo}`);
}

/**
 * Ingest from a local ZIP file.
 */
export async function ingestFromZip(
  file: File,
  onProgress?: (msg: string) => void
): Promise<IngestionResult> {
  onProgress?.("Reading ZIP file…");
  const buffer = await file.arrayBuffer();
  const files = extractFilesFromZip(new Uint8Array(buffer));

  if (files.length === 0) {
    throw new Error("No supported source files found in ZIP");
  }

  const repoName = file.name.replace(/\.zip$/i, "");
  onProgress?.(`Parsing ${files.length} files…`);
  return analyzeFiles(files, repoName);
}
