/**
 * Crate Version Check — Fetch latest version from crates.io
 * ═══════════════════════════════════════════════════════════════
 *
 * Dev-only utility that checks crates.io for newer versions of
 * `uor-foundation`. Used by EngineStatusIndicator and sync script.
 *
 * @module engine/crate-version-check
 */

import { CRATE_MANIFEST } from "./crate-manifest";

export interface CrateVersionInfo {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  checkedAt: string;
  error?: string;
}

const CRATE_NAME = "uor-foundation";
const API_URL = `https://crates.io/api/v1/crates/${CRATE_NAME}`;

// Cache result for 5 minutes
let cachedResult: CrateVersionInfo | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Check the latest version of uor-foundation on crates.io.
 * Only runs in dev mode. Caches result for 5 minutes.
 */
export async function checkLatestCrateVersion(): Promise<CrateVersionInfo> {
  const now = Date.now();

  if (cachedResult && now - cachedAt < CACHE_TTL_MS) {
    return cachedResult;
  }

  const currentVersion = CRATE_MANIFEST.version;

  try {
    const response = await fetch(API_URL, {
      headers: { "User-Agent": "uor-system-health-check" },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const latestVersion = data?.crate?.max_version ?? null;

    const result: CrateVersionInfo = {
      currentVersion,
      latestVersion,
      updateAvailable: latestVersion !== null && latestVersion !== currentVersion,
      checkedAt: new Date().toISOString(),
    };

    cachedResult = result;
    cachedAt = now;
    return result;
  } catch (err) {
    const result: CrateVersionInfo = {
      currentVersion,
      latestVersion: null,
      updateAvailable: false,
      checkedAt: new Date().toISOString(),
      error: String(err),
    };

    cachedResult = result;
    cachedAt = now;
    return result;
  }
}
