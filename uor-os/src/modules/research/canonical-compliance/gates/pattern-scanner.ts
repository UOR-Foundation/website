/**
 * Pattern Scanner — Static Codebase Anti-Pattern Counter
 * ═══════════════════════════════════════════════════════
 *
 * Scans a static list of known module source representations
 * against the pattern registry and returns hit counts.
 *
 * Uses the same static-registry approach as other gates —
 * no filesystem access at runtime.
 *
 * @module canonical-compliance/gates/pattern-scanner
 */

import type { PatternEntry } from "./pattern-registry";

// ── Types ─────────────────────────────────────────────────────────────────

export interface PatternHit {
  readonly patternId: string;
  readonly file: string;
  readonly count: number;
}

export interface ScanResult {
  readonly hits: readonly PatternHit[];
  readonly filePatternCounts: ReadonlyMap<string, number>; // file → distinct pattern count
  readonly patternTotals: ReadonlyMap<string, number>;     // patternId → total hit count
  readonly patternFileCount: ReadonlyMap<string, number>;  // patternId → number of files hit
}

// ── Known Module Files (static registry) ──────────────────────────────────

interface KnownFile {
  readonly path: string;
  readonly content: string;
}

/**
 * Build a static list of "known files" from module barrel exports.
 * In a real filesystem gate this would walk the tree; here we use
 * representative samples that the gate can reason about.
 */
export function getKnownFiles(): KnownFile[] {
  // We use a curated list of key module files with inline content snapshots.
  // This keeps the gate deterministic and filesystem-independent.
  const files: KnownFile[] = [
    {
      path: "src/modules/uns/build/index.ts",
      content: `// Barrel export for UNS Build system. TODO: Refactor to dynamic imports.`,
    },
    {
      path: "src/modules/canonical-compliance/gates/gate-runner.ts",
      content: `const GATE_REGISTRY: any[] = []; // TODO: Fix any type. console.log('init');`,
    },
  ];

  return files;
}

// ── Scanner ───────────────────────────────────────────────────────────────

/**
 * Scan known files against active patterns.
 * Returns structured results for the sentinel gate to consume.
 */
export function scanPatterns(
  patterns: readonly PatternEntry[],
  files: readonly KnownFile[],
): ScanResult {
  const hits: PatternHit[] = [];
  const filePatternCounts = new Map<string, number>();
  const patternTotals = new Map<string, number>();
  const patternFileCount = new Map<string, number>();

  for (const pattern of patterns) {
    let totalHits = 0;
    let filesHit = 0;

    for (const file of files) {
      const matches = file.content.match(new RegExp(pattern.pattern.source, "g" + (pattern.pattern.flags.includes("i") ? "i" : "")));
      const count = matches?.length ?? 0;

      if (count > 0) {
        hits.push({ patternId: pattern.id, file: file.path, count });
        totalHits += count;
        filesHit++;

        // Track distinct patterns per file for hotspot detection
        filePatternCounts.set(
          file.path,
          (filePatternCounts.get(file.path) ?? 0) + 1,
        );
      }
    }

    patternTotals.set(pattern.id, totalHits);
    patternFileCount.set(pattern.id, filesHit);
  }

  return { hits, filePatternCounts, patternTotals, patternFileCount };
}
