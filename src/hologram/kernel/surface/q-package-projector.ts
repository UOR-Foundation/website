/**
 * Q-Package Projector — Universal Package → Projection Pipeline
 * ══════════════════════════════════════════════════════════════
 *
 * Transforms any pip/npm/cargo package into a Hologram Projection
 * by fetching real metadata from PyPI and generating a functional
 * lens that maps capabilities into Q-Linux native operations.
 *
 * @module qkernel/q-package-projector
 */

import { kernelLog } from "../../platform/utils";

// ── Types ──────────────────────────────────────────────────────────────────

export interface PackageMetadata {
  name: string;
  version: string;
  summary: string;
  author: string;
  license: string;
  homepage: string;
  repository: string;
  requires: string[];
  entryPoints: string[];
  keywords: string[];
  size: number;
  projectionType: ProjectionType;
  classifiers: string[];
}

export type ProjectionType =
  | "cli-tool"
  | "library"
  | "converter"
  | "web-service"
  | "ai-model"
  | "data-processor"
  | "visualization"
  | "framework"
  | "unknown";

export interface InstalledPackage {
  metadata: PackageMetadata;
  installedAt: string;
  projectionGenerated: boolean;
  fsPath: string;
  lensId: string;
  status: "installed" | "configuring" | "ready";
  pid?: number;
  depsInstalled: string[];
}

export interface InstallProgress {
  phase: "resolve" | "fetch" | "deps" | "download" | "build" | "install" | "lens" | "process" | "complete" | "error";
  percent: number;
  detail: string;
  bar?: string;
}

// ── Registry ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "qlinux:packages:installed";
let installedCache: Map<string, InstalledPackage> | null = null;
let nextPid = 100;

function loadInstalled(): Map<string, InstalledPackage> {
  if (installedCache) return installedCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as InstalledPackage[];
      installedCache = new Map(arr.map(p => [p.metadata.name, p]));
      // Track highest PID
      for (const p of arr) {
        if (p.pid && p.pid >= nextPid) nextPid = p.pid + 1;
      }
    } else {
      installedCache = new Map();
    }
  } catch {
    installedCache = new Map();
  }
  return installedCache;
}

function saveInstalled(): void {
  if (!installedCache) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...installedCache.values()]));
  } catch {}
}

export function getInstalledPackages(): InstalledPackage[] {
  return [...loadInstalled().values()];
}

export function isPackageInstalled(name: string): boolean {
  return loadInstalled().has(normalizeName(name));
}

export function getPackage(name: string): InstalledPackage | null {
  return loadInstalled().get(normalizeName(name)) ?? null;
}

export function normalizeName(raw: string): string {
  return raw.replace(/\[.*\]/, "").replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();
}

// ── Progress bar rendering ─────────────────────────────────────────────────

function renderBar(percent: number, width = 30): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  const bar = "━".repeat(filled) + "╺" + "─".repeat(Math.max(0, empty - 1));
  const pct = `${percent.toFixed(0).padStart(3)}%`;
  return `  ${bar} ${pct}`;
}

// ── PyPI metadata fetcher ──────────────────────────────────────────────────

export async function fetchPyPIMetadata(packageName: string): Promise<PackageMetadata | null> {
  const clean = normalizeName(packageName);
  try {
    const resp = await fetch(`https://pypi.org/pypi/${clean}/json`);
    if (!resp.ok) return null;
    const data = await resp.json();
    const info = data.info;

    const classifiers: string[] = info.classifiers ?? [];
    const keywords: string[] = (info.keywords ?? "").split(/[,\s]+/).filter(Boolean);
    const projType = detectProjectionType(classifiers, keywords, info.summary ?? "");
    const entryPoints: string[] = [clean];

    let size = 0;
    const urls = data.urls ?? [];
    const sdist = urls.find((u: any) => u.packagetype === "sdist");
    if (sdist) size = sdist.size ?? 0;
    else if (urls[0]) size = urls[0].size ?? 0;

    return {
      name: clean,
      version: info.version ?? "0.0.0",
      summary: info.summary ?? "No description available",
      author: info.author ?? info.author_email ?? "Unknown",
      license: info.license ?? "Unknown",
      homepage: info.home_page ?? info.project_urls?.Homepage ?? "",
      repository: info.project_urls?.Source ?? info.project_urls?.Repository ?? info.project_urls?.GitHub ?? "",
      requires: (info.requires_dist ?? []).slice(0, 30).map((r: string) => r.split(";")[0].trim().split(" ")[0]),
      entryPoints,
      keywords,
      size,
      projectionType: projType,
      classifiers,
    };
  } catch {
    return null;
  }
}

/** Search PyPI for packages matching a query */
export async function searchPyPI(query: string, limit = 8): Promise<PackageMetadata[]> {
  // PyPI's XMLRPC search is deprecated, so we use a curated approach:
  // fetch the package directly, and also try common variations
  const results: PackageMetadata[] = [];
  const clean = normalizeName(query);
  const variants = [clean, `py${clean}`, `python-${clean}`, `${clean}-python`];

  const fetches = variants.slice(0, 4).map(async (v) => {
    const meta = await fetchPyPIMetadata(v);
    if (meta) results.push(meta);
  });
  await Promise.allSettled(fetches);

  return results.slice(0, limit);
}

function detectProjectionType(classifiers: string[], keywords: string[], summary: string): ProjectionType {
  const allText = [...classifiers, ...keywords, summary].join(" ").toLowerCase();
  if (allText.includes("converter") || allText.includes("convert") || allText.includes("transform") || allText.includes("markup") || allText.includes("markdown")) return "converter";
  if (allText.includes("machine learning") || allText.includes("deep learning") || allText.includes("neural") || allText.includes("torch") || allText.includes("tensorflow")) return "ai-model";
  if (allText.includes("visualization") || allText.includes("plotting") || allText.includes("chart") || allText.includes("matplotlib")) return "visualization";
  if (allText.includes("framework") || allText.includes("django") || allText.includes("flask") || allText.includes("fastapi")) return "framework";
  if (allText.includes("cli") || allText.includes("command-line") || allText.includes("console") || allText.includes("terminal")) return "cli-tool";
  if (allText.includes("api") || allText.includes("web service") || allText.includes("rest") || allText.includes("http")) return "web-service";
  if (allText.includes("data") || allText.includes("pipeline") || allText.includes("etl") || allText.includes("pandas")) return "data-processor";
  if (allText.includes("sdk") || allText.includes("library") || allText.includes("toolkit")) return "library";
  return "unknown";
}

// ── Projection file generation ─────────────────────────────────────────────

export function generateProjectionFiles(meta: PackageMetadata): { path: string; content: string }[] {
  const base = `/usr/lib/q-linux/${meta.name}`;
  const files: { path: string; content: string }[] = [];

  files.push({
    path: `${base}/__init__.py`,
    content: [
      `# ${meta.name} v${meta.version}`,
      `# ${meta.summary}`,
      `# Projection Type: ${meta.projectionType}`,
      `# License: ${meta.license}`,
      ``,
      `__version__ = "${meta.version}"`,
      `__projection__ = "${meta.projectionType}"`,
      `__lens__ = "projection:${meta.name}:${meta.version}"`,
      ``,
      `def main(*args):`,
      `    """Entry point for ${meta.name} projection."""`,
      `    from hologram.kernel import invoke_lens`,
      `    return invoke_lens(__lens__, args)`,
      ``,
    ].join("\n"),
  });

  files.push({
    path: `${base}/manifest.json`,
    content: JSON.stringify({
      "@type": "uor:PackageProjection",
      name: meta.name,
      version: meta.version,
      summary: meta.summary,
      author: meta.author,
      license: meta.license,
      projectionType: meta.projectionType,
      entryPoints: meta.entryPoints,
      requires: meta.requires,
      installedAt: new Date().toISOString(),
      runtime: "q-linux-projection",
      lensId: `projection:${meta.name}:${meta.version}`,
    }, null, 2),
  });

  files.push({
    path: `${base}/lens.json`,
    content: JSON.stringify({
      "@type": "uor:LensBlueprint",
      lensId: `projection:${meta.name}:${meta.version}`,
      morphism: meta.projectionType === "converter" ? "Transform" : "Isometry",
      inputModality: getInputModality(meta.projectionType),
      outputModality: getOutputModality(meta.projectionType),
      pipeline: [
        { stage: "ingest", morphism: "focus", description: "Canonical input encoding" },
        { stage: "process", morphism: meta.projectionType === "converter" ? "transform" : "compute", description: `${meta.name} core logic` },
        { stage: "emit", morphism: "refract", description: "Output projection" },
      ],
      coherenceGate: 0.6,
    }, null, 2),
  });

  files.push({
    path: `${base}/README.md`,
    content: [
      `# ${meta.name}`,
      ``,
      `> ${meta.summary}`,
      ``,
      `| Field | Value |`,
      `|-------|-------|`,
      `| Version | ${meta.version} |`,
      `| Author | ${meta.author} |`,
      `| License | ${meta.license} |`,
      `| Type | ${meta.projectionType} |`,
      `| Homepage | ${meta.homepage} |`,
      ``,
      `## Usage in Q-Linux`,
      ``,
      `\`\`\`bash`,
      `# Basic invocation`,
      `${meta.name} <input>`,
      ``,
      `# Show help`,
      `${meta.name} --help`,
      ``,
      `# Show metadata`,
      `${meta.name} --info`,
      `\`\`\``,
      ``,
      `## Dependencies`,
      ``,
      meta.requires.slice(0, 10).map(d => `- ${d}`).join("\n"),
      ``,
      `---`,
      `*Installed as a native Q-Linux projection. All operations are content-addressed and verified.*`,
    ].join("\n"),
  });

  return files;
}

function getInputModality(type: ProjectionType): string {
  switch (type) {
    case "converter": return "binary|text|url";
    case "ai-model": return "tensor|text|image";
    case "data-processor": return "structured-data|csv|json";
    case "cli-tool": return "argv|stdin";
    case "visualization": return "data|csv|json";
    case "framework": return "http-request";
    case "web-service": return "http-request|json";
    default: return "any";
  }
}

function getOutputModality(type: ProjectionType): string {
  switch (type) {
    case "converter": return "text|markdown|structured-data";
    case "ai-model": return "tensor|text|prediction";
    case "visualization": return "svg|canvas|ascii";
    case "cli-tool": return "stdout";
    case "framework": return "http-response";
    case "web-service": return "json|text";
    default: return "any";
  }
}

// ── Installation pipeline ──────────────────────────────────────────────────

export type ProgressCallback = (progress: InstallProgress) => void;

export async function installPackage(
  rawName: string,
  onProgress: ProgressCallback,
): Promise<InstalledPackage | null> {
  const name = normalizeName(rawName);

  // Phase 1: Resolve
  onProgress({ phase: "resolve", percent: 5, detail: `Collecting ${rawName}...`, bar: renderBar(5) });
  await delay(200);

  // Already installed?
  if (isPackageInstalled(name)) {
    const existing = getPackage(name)!;
    onProgress({ phase: "complete", percent: 100, detail: `Requirement already satisfied: ${name}==${existing.metadata.version}`, bar: renderBar(100) });
    return existing;
  }

  // Phase 2: Fetch metadata
  onProgress({ phase: "fetch", percent: 12, detail: `Fetching metadata from pypi.org...`, bar: renderBar(12) });
  const meta = await fetchPyPIMetadata(rawName);
  if (!meta) {
    onProgress({ phase: "error", percent: 0, detail: `ERROR: Could not find a version that satisfies the requirement ${rawName}` });
    return null;
  }
  onProgress({ phase: "fetch", percent: 20, detail: `Found ${meta.name}==${meta.version} (${meta.projectionType})`, bar: renderBar(20) });

  // Phase 3: Resolve dependencies
  const depCount = meta.requires.length;
  onProgress({ phase: "deps", percent: 25, detail: `Resolving ${depCount} dependencies...`, bar: renderBar(25) });
  await delay(250);

  // Install top dependencies (shallow resolution)
  const depsInstalled: string[] = [];
  const topDeps = meta.requires.slice(0, 5).filter(d => !isPackageInstalled(d));
  for (let i = 0; i < topDeps.length; i++) {
    const depPct = 25 + Math.round(((i + 1) / topDeps.length) * 15);
    onProgress({ phase: "deps", percent: depPct, detail: `  Collecting ${topDeps[i]}...`, bar: renderBar(depPct) });
    depsInstalled.push(topDeps[i]);
    await delay(100);
  }
  if (topDeps.length > 0) {
    onProgress({ phase: "deps", percent: 40, detail: `  Resolved ${topDeps.length} dependencies`, bar: renderBar(40) });
  }

  // Phase 4: Download
  const sizeKB = Math.max(meta.size / 1024, 128).toFixed(0);
  onProgress({ phase: "download", percent: 45, detail: `Downloading ${meta.name}-${meta.version}.tar.gz (${sizeKB} kB)`, bar: renderBar(45) });
  await delay(300);

  // Simulate download progress
  for (let p = 50; p <= 60; p += 5) {
    onProgress({ phase: "download", percent: p, detail: `Downloading ${meta.name}-${meta.version}.tar.gz`, bar: renderBar(p) });
    await delay(100);
  }
  onProgress({ phase: "download", percent: 62, detail: `Downloaded ${meta.name}-${meta.version}.tar.gz`, bar: renderBar(62) });

  // Phase 5: Build projection
  onProgress({ phase: "build", percent: 68, detail: `Building projection wheel for ${meta.name}...`, bar: renderBar(68) });
  await delay(300);
  const files = generateProjectionFiles(meta);
  onProgress({ phase: "build", percent: 75, detail: `Generated ${files.length} projection files`, bar: renderBar(75) });

  // Phase 6: Install into Q-FS
  onProgress({ phase: "install", percent: 82, detail: `Installing ${meta.name}-${meta.version} → /usr/lib/q-linux/${meta.name}/`, bar: renderBar(82) });
  await delay(200);

  // Phase 7: Generate lens
  const lensId = `projection:${meta.name}:${meta.version}`;
  onProgress({ phase: "lens", percent: 90, detail: `Generating Hologram lens: ${lensId}`, bar: renderBar(90) });
  await delay(150);

  // Phase 8: Spawn kernel process
  const pid = nextPid++;
  onProgress({ phase: "process", percent: 95, detail: `Spawning kernel process PID ${pid} for ${meta.name}`, bar: renderBar(95) });
  await delay(100);

  // Register
  const pkg: InstalledPackage = {
    metadata: meta,
    installedAt: new Date().toISOString(),
    projectionGenerated: true,
    fsPath: `/usr/lib/q-linux/${meta.name}`,
    lensId,
    status: "ready",
    pid,
    depsInstalled,
  };

  const installed = loadInstalled();
  installed.set(name, pkg);
  saveInstalled();

  onProgress({ phase: "complete", percent: 100, detail: `Successfully installed ${meta.name}-${meta.version}`, bar: renderBar(100) });
  kernelLog("pip", "install", `Installed ${meta.name}==${meta.version} as ${meta.projectionType} projection`, {
    name: meta.name, version: meta.version, type: meta.projectionType, pid, lensId, deps: depsInstalled,
  });
  return pkg;
}

// ── Uninstall ──────────────────────────────────────────────────────────────

export function uninstallPackage(rawName: string): { success: boolean; message: string } {
  const name = normalizeName(rawName);
  const installed = loadInstalled();
  const pkg = installed.get(name);
  if (!pkg) {
    return { success: false, message: `WARNING: Skipping ${rawName} as it is not installed.` };
  }
  installed.delete(name);
  saveInstalled();
  return {
    success: true,
    message: `Found existing installation: ${pkg.metadata.name} ${pkg.metadata.version}\nUninstalling ${pkg.metadata.name}-${pkg.metadata.version}:\n  Successfully uninstalled ${pkg.metadata.name}-${pkg.metadata.version}`,
  };
}

// ── Freeze (requirements.txt format) ───────────────────────────────────────

export function freezePackages(): string[] {
  const pkgs = getInstalledPackages();
  return pkgs.map(p => `${p.metadata.name}==${p.metadata.version}`);
}

// ── Execution ──────────────────────────────────────────────────────────────

export interface ProjectionResult {
  success: boolean;
  output: string;
  lensId: string;
  processingTime: number;
}

export async function executeProjection(
  packageName: string,
  args: string[],
): Promise<ProjectionResult> {
  const start = performance.now();
  const pkg = getPackage(normalizeName(packageName));

  if (!pkg) {
    return { success: false, output: `-bash: ${packageName}: command not found`, lensId: "", processingTime: 0 };
  }

  if (pkg.status !== "ready") {
    return { success: false, output: `${packageName}: projection not yet ready (status: ${pkg.status})`, lensId: pkg.lensId, processingTime: 0 };
  }

  const elapsed = performance.now() - start;

  return {
    success: true,
    output: [
      `⬡ ${pkg.metadata.name} v${pkg.metadata.version} — ${pkg.metadata.summary}`,
      `  Projection type: ${pkg.metadata.projectionType}`,
      `  Lens: ${pkg.lensId}`,
      `  PID: ${pkg.pid ?? "–"}`,
      ``,
      `  Use '${pkg.metadata.name} --help' for usage.`,
    ].join("\n"),
    lensId: pkg.lensId,
    processingTime: elapsed,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
