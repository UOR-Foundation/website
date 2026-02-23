/**
 * UOR SDK — App CLI Types
 *
 * Structured result types for the `uor-app` CLI command engine.
 * Every command returns a CliResult with exit code, human-readable
 * stdout, and machine-parseable JSON.
 *
 * @see uns/cli/commands.ts — UNS CLI (lower-level network commands)
 */

// ── CLI Result ──────────────────────────────────────────────────────────────

/**
 * Structured result from any CLI command.
 * Mirrors the existing UNS CliResult pattern.
 */
export interface AppCliResult {
  exitCode: number;
  stdout: string;
  json: Record<string, unknown>;
}

// ── Deploy Options ──────────────────────────────────────────────────────────

export interface DeployOptions {
  /** Source: URL, github:owner/repo, or local path. */
  source: string;
  /** Optional human-readable app name. */
  name?: string;
  /** Developer canonical ID. */
  developer?: string;
}

// ── Update Options ──────────────────────────────────────────────────────────

export interface UpdateOptions {
  canonicalId: string;
  newSource: string;
}

// ── Monetize Options ────────────────────────────────────────────────────────

export interface MonetizeOptions {
  canonicalId: string;
  price: number;
  interval: "monthly" | "annual";
  gate: string;
}

// ── Rollback Options ────────────────────────────────────────────────────────

export interface RollbackOptions {
  canonicalId: string;
  toCanonicalId: string;
}

// ── App Version Record ──────────────────────────────────────────────────────

/**
 * Stored in KV under `app:{canonicalId}`. Tracks the full
 * deployment state of a content-addressed app.
 */
export interface AppRecord {
  canonicalId: string;
  name: string;
  source: string;
  developer: string;
  ipv6: string;
  cid: string;
  glyph: string;
  zone: string;
  deployedAt: string;
  previousVersionId?: string;
}

// ── Developer Identity ──────────────────────────────────────────────────────

export interface DeveloperIdentity {
  canonicalId: string;
  createdAt: string;
}
