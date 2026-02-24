/**
 * UOR SDK — Asset Ingestor
 *
 * Fetches app source HTML/assets, hashes them for content-addressing,
 * stores them via the serve-app edge function, and tracks the mapping.
 *
 * This bridges the gap between "import" (metadata) and "run" (serving):
 * after ingestion, the serve-app edge function can serve the app
 * entirely from our infrastructure — zero external dependence.
 *
 * Pipeline:
 *   1. Fetch raw HTML from source URL
 *   2. Compute canonical ID via singleProofHash
 *   3. Upload to storage via Supabase client
 *   4. Register in app_asset_registry
 *   5. Return serve URL pointing to our edge function
 *
 * @see runtime/registry-ship — ships image metadata
 * @see serve-app edge function — serves stored assets
 */

import { singleProofHash } from "@/lib/uor-canonical";

// ── Types ───────────────────────────────────────────────────────────────────

/** Input for ingesting app assets. */
export interface IngestInput {
  /** Source URL to fetch the app from. */
  sourceUrl: string;
  /** App name. */
  appName: string;
  /** App version. */
  version: string;
  /** Canonical ID from the image build. */
  imageCanonicalId: string;
  /** Snapshot ID (optional). */
  snapshotId?: string;
  /** Who is ingesting. */
  ingestedBy?: string;
}

/** Result of the ingestion process. */
export interface IngestResult {
  /** Canonical ID of the ingested asset. */
  canonicalId: string;
  /** Storage path in the bucket. */
  storagePath: string;
  /** Serve URL via our edge function. */
  serveUrl: string;
  /** Size of the ingested content in bytes. */
  sizeBytes: number;
  /** Whether the asset was already ingested (deduplicated). */
  deduplicated: boolean;
}

// ── Constants ───────────────────────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SERVE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/serve-app`;

// ── Ingestor ────────────────────────────────────────────────────────────────

/**
 * Ingest app assets via the serve-app edge function (service role).
 * The edge function handles fetching, storing, and registering.
 */
export async function ingestAppAssets(
  input: IngestInput,
): Promise<IngestResult> {
  const response = await fetch(SERVE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      sourceUrl: input.sourceUrl,
      appName: input.appName,
      version: input.version,
      imageCanonicalId: input.imageCanonicalId,
      snapshotId: input.snapshotId,
      ingestedBy: input.ingestedBy,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `Ingestion failed: HTTP ${response.status}`);
  }

  return await response.json();
}

/**
 * Resolve the serve URL for an already-ingested app.
 */
export function getServeUrl(canonicalId: string): string {
  return `${SERVE_FUNCTION_URL}?id=${canonicalId}`;
}

/**
 * Resolve the serve URL by app name (latest version).
 */
export function getServeUrlByName(appName: string, version?: string): string {
  const params = new URLSearchParams({ app: appName });
  if (version) params.set("v", version);
  return `${SERVE_FUNCTION_URL}?${params}`;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a fallback HTML page for apps whose source can't be fetched
 * at ingestion time (e.g., localhost, private repos).
 */
function buildFallbackHtml(
  appName: string,
  version: string,
  sourceUrl: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${appName} v${version}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0a0a0a; color: #e0e0e0;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh;
    }
    .container { text-align: center; max-width: 480px; padding: 2rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .version { color: #888; font-size: 0.875rem; margin-bottom: 1.5rem; }
    .canonical { font-family: monospace; font-size: 0.75rem; color: #666;
      word-break: break-all; background: #111; padding: 0.75rem;
      border-radius: 0.5rem; margin-bottom: 1.5rem; }
    .status { color: #4ade80; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${appName}</h1>
    <p class="version">v${version}</p>
    <div class="canonical">Source: ${sourceUrl}</div>
    <p class="status">⚡ Deployed on UOR Infrastructure</p>
  </div>
</body>
</html>`;
}
