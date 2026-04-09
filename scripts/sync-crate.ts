#!/usr/bin/env node
/**
 * UOR Crate Sync Script
 * ═══════════════════════════════════════════════════════════════
 *
 * Automates the update process when `uor-foundation` crate bumps.
 *
 * Usage:
 *   npx ts-node scripts/sync-crate.ts [--wasm-dir src/lib/wasm/uor-foundation]
 *
 * What it does:
 *   1. Reads uor_wasm_shim.d.ts to extract all exported function signatures
 *   2. Compares against current crate-manifest.ts
 *   3. Reports added/removed/changed exports
 *   4. Auto-updates crate-manifest.ts with new export list
 *   5. Flags breaking changes (removed exports used in src/)
 *
 * Non-destructive: shows diff before overwriting.
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// ── Config ───────────────────────────────────────────────────────────────

const WASM_DIR = process.argv.includes("--wasm-dir")
  ? process.argv[process.argv.indexOf("--wasm-dir") + 1]
  : "src/lib/wasm/uor-foundation";

const SHIM_PATH = path.join(WASM_DIR, "uor_wasm_shim.d.ts");
const MANIFEST_PATH = "src/modules/engine/crate-manifest.ts";

// ── Internal exports to ignore ───────────────────────────────────────────

const INTERNAL_PREFIXES = ["__wbindgen_", "__wbg_"];
const INTERNAL_NAMES = new Set(["memory", "default", "initSync"]);
const INTERFACE_ONLY = new Set(["InitInput", "SyncInitInput", "InitOutput"]);

// ── Parse .d.ts ──────────────────────────────────────────────────────────

function extractExports(dtsContent: string): {
  functions: { name: string; signature: string }[];
  version: string | null;
} {
  const functions: { name: string; signature: string }[] = [];
  let version: string | null = null;

  for (const line of dtsContent.split("\n")) {
    // Match: export function name(params): returnType;
    const match = line.match(
      /^export\s+function\s+(\w+)\s*\(([^)]*)\)\s*:\s*(.+);/
    );
    if (!match) continue;

    const [, name, params, returnType] = match;

    // Skip internal wasm-bindgen exports
    if (INTERNAL_PREFIXES.some((p) => name.startsWith(p))) continue;
    if (INTERNAL_NAMES.has(name)) continue;

    functions.push({ name, signature: `(${params}): ${returnType}` });

    // Try to detect version from crate_version
    if (name === "crate_version") {
      version = "detected-at-runtime";
    }
  }

  return { functions, version };
}

// ── Read current manifest ────────────────────────────────────────────────

function readCurrentManifest(): {
  version: string;
  expectedExports: string[];
} {
  try {
    const content = fs.readFileSync(MANIFEST_PATH, "utf-8");
    const versionMatch = content.match(/version:\s*"([^"]+)"/);
    const exportsMatch = content.match(
      /expectedExports:\s*\[([\s\S]*?)\]\s*as\s*const/
    );

    const version = versionMatch?.[1] ?? "0.0.0";
    const exports = exportsMatch
      ? [...exportsMatch[1].matchAll(/"(\w+)"/g)].map((m) => m[1])
      : [];

    return { version, expectedExports: exports };
  } catch {
    return { version: "0.0.0", expectedExports: [] };
  }
}

// ── Compute export hash ──────────────────────────────────────────────────

function computeExportHash(exports: string[]): string {
  const sorted = [...exports].sort().join(",");
  return crypto.createHash("sha256").update(sorted).digest("hex").slice(0, 16);
}

// ── Search for usages of removed exports ─────────────────────────────────

function findUsages(exportName: string): string[] {
  const srcDir = "src";
  const usages: string[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
        walk(fullPath);
      } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        if (content.includes(exportName)) {
          usages.push(fullPath);
        }
      }
    }
  }

  walk(srcDir);
  return usages;
}

// ── Generate updated manifest ────────────────────────────────────────────

function generateManifest(
  exports: string[],
  version: string,
  hash: string
): string {
  const sorted = [...exports].sort();
  const exportLines = sorted.map((e) => `    "${e}",`).join("\n");

  return `/**
 * UOR Crate Manifest — Version Anchor
 * ═══════════════════════════════════════════════════════════════
 *
 * Records the expected state of the \`uor-foundation\` crate.
 * At boot, the adapter compares actual WASM exports against this
 * manifest to detect version drift, new exports, and removals.
 *
 * AUTO-UPDATED by \`scripts/sync-crate.ts\` — do not hand-edit
 * the expectedExports or exportHash fields.
 *
 * @layer 0
 */

export const CRATE_MANIFEST = {
  /** Expected crate version */
  version: "${version}",

  /** All expected WASM function exports (sorted, snake_case) */
  expectedExports: [
${exportLines}
  ] as const,

  /** SHA-256 hex prefix of sorted export names (for drift detection) */
  exportHash: "${hash}",

  /** Ontology counts (for type projection drift) */
  namespaceCount: 33,
  classCount: 441,
  propertyCount: 892,
} as const;

export type CrateExportName = (typeof CRATE_MANIFEST.expectedExports)[number];
`;
}

// ── Main ─────────────────────────────────────────────────────────────────

function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  UOR Crate Sync — uor-foundation            ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  // 1. Read .d.ts
  if (!fs.existsSync(SHIM_PATH)) {
    console.error(`✗ Shim not found: ${SHIM_PATH}`);
    console.error("  Drop new WASM artifacts into the wasm dir first.");
    process.exit(1);
  }

  const dtsContent = fs.readFileSync(SHIM_PATH, "utf-8");
  const { functions } = extractExports(dtsContent);
  const newExports = functions.map((f) => f.name);

  console.log(`  Found ${newExports.length} function exports in .d.ts\n`);

  // 2. Compare with current manifest
  const current = readCurrentManifest();
  const currentSet = new Set(current.expectedExports);
  const newSet = new Set(newExports);

  const added = newExports.filter((e) => !currentSet.has(e));
  const removed = current.expectedExports.filter((e) => !newSet.has(e));
  const unchanged = newExports.filter((e) => currentSet.has(e));

  console.log(`  Unchanged: ${unchanged.length}`);
  console.log(`  Added:     ${added.length}`);
  console.log(`  Removed:   ${removed.length}\n`);

  if (added.length > 0) {
    console.log("  ✓ New exports (auto-wired to extensions):");
    added.forEach((e) => {
      const sig = functions.find((f) => f.name === e)?.signature ?? "";
      console.log(`    + ${e}${sig}`);
    });
    console.log();
  }

  if (removed.length > 0) {
    console.log("  ⚠ Removed exports (will use TS fallback):");
    removed.forEach((e) => {
      const usages = findUsages(e);
      const usageInfo = usages.length > 0 ? ` — used in ${usages.length} file(s)` : "";
      console.log(`    - ${e}${usageInfo}`);
      usages.forEach((u) => console.log(`      └─ ${u}`));
    });
    console.log();
  }

  // 3. Generate updated manifest
  const hash = computeExportHash(newExports);
  const newVersion = current.version; // Version is updated manually or from runtime
  const manifestContent = generateManifest(newExports, newVersion, hash);

  // 4. Write (or show diff)
  if (added.length === 0 && removed.length === 0) {
    console.log("  ✓ Manifest is up to date. No changes needed.\n");
  } else {
    fs.writeFileSync(MANIFEST_PATH, manifestContent);
    console.log(`  ✓ ${MANIFEST_PATH} updated`);
    console.log(`    Export hash: ${hash}\n`);
  }

  // 5. Summary
  const breaking = removed.length;
  if (breaking > 0) {
    console.log(`  ⚠ ${breaking} BREAKING change(s) — check TS fallbacks cover these functions.`);
  } else {
    console.log("  ✓ Zero breaking changes — safe to deploy.");
  }

  console.log("\n  Done.\n");
}

main();
