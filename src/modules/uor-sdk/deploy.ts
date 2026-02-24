/**
 * UOR SDK — Deploy Orchestrator
 *
 * Single entry point that chains Build→Ship→Run into one atomic
 * deployment pipeline. Accepts any ImportSource and returns a
 * running WasmAppInstance.
 *
 * This is the "npx uor-app deploy" equivalent:
 *   1. BUILD  — importApp() resolves source → AppFile[], creates AppManifest
 *   2. IMAGE  — buildAppImage() wraps files into content-addressed UorImage
 *   3. SHIP   — shipApp() pushes to registry + creates DeploymentSnapshot
 *   4. RUN    — runApp() loads into WASM sandbox with RuntimeWitness
 *
 * Every step produces auditable, content-addressed artifacts.
 * The pipeline is idempotent: same source = same canonical ID = no-op push.
 *
 * @see import-adapter — source resolution
 * @see runtime/image-builder — canonical image creation
 * @see runtime/registry-ship — registry push + snapshot
 * @see runtime/wasm-loader — WASM sandbox execution
 */

import { importApp } from "./import-adapter";
import type { ImportSource, ImportResult } from "./import-adapter";
import { buildAppImage } from "./runtime/image-builder";
import type { ImageBuildResult } from "./runtime/image-builder";
import { shipApp } from "./runtime/registry-ship";
import type { ShipResult } from "./runtime/registry-ship";
import { ingestAppAssets } from "./runtime/asset-ingestor";
import type { IngestResult } from "./runtime/asset-ingestor";
import { runApp } from "./runtime/wasm-loader";
import type { WasmAppInstance } from "./runtime/wasm-loader";

// ── Types ───────────────────────────────────────────────────────────────────

/** Pipeline stage for progress reporting. */
export type DeployStage =
  | "import"    // Resolving source → files
  | "build"     // Building content-addressed image
  | "ship"      // Pushing to registry + snapshot
  | "ingest"    // Storing assets in content-addressed storage
  | "run"       // Starting WASM sandbox
  | "complete"  // Done
  | "error";    // Failed

/** Progress callback for UI feedback. */
export type DeployProgressCallback = (
  stage: DeployStage,
  detail: string,
) => void;

/** Full deployment options. */
export interface DeployOptions {
  /** The source to deploy from. */
  source: ImportSource;
  /** Developer's canonical ID. */
  developerCanonicalId: string;
  /** App name override. */
  name?: string;
  /** Version override. */
  version?: string;
  /** CSS selector or HTMLElement to mount the running app. */
  mountTarget?: string | HTMLElement;
  /** Previous snapshot ID for version chain. */
  previousSnapshotId?: string;
  /** Shield level. */
  shieldLevel?: "standard" | "strict" | "paranoid";
  /** Progress callback. */
  onProgress?: DeployProgressCallback;
}

/** Complete deployment result — all artifacts from every stage. */
export interface DeployResult {
  /** Stage 1: Import result (files + manifest). */
  import: ImportResult;
  /** Stage 2: Image build result. */
  build: ImageBuildResult;
  /** Stage 3: Ship result (push + snapshot). */
  ship: ShipResult;
  /** Stage 3.5: Ingestion result (asset storage). */
  ingest?: IngestResult;
  /** Stage 4: Running instance. */
  instance: WasmAppInstance;
  /** Total pipeline duration in ms. */
  durationMs: number;
}

// ── Deploy Pipeline ─────────────────────────────────────────────────────────

/**
 * Deploy an application through the full Build→Ship→Run pipeline.
 *
 * This is the primary entry point for the UOR App Platform.
 * One function call takes any source and produces a running app.
 */
export async function deployApp(opts: DeployOptions): Promise<DeployResult> {
  const startTime = performance.now();
  const progress = opts.onProgress ?? (() => {});

  // ── Stage 1: IMPORT ──────────────────────────────────────────
  progress("import", "Resolving source and computing canonical identity...");

  const importResult = await importApp(
    opts.source,
    opts.developerCanonicalId,
    {
      name: opts.name,
      version: opts.version ?? "1.0.0",
    },
  );

  const appName = importResult.manifest["app:name"];
  const version = importResult.manifest["app:version"];

  // ── Stage 2: BUILD ───────────────────────────────────────────
  progress("build", `Building image for ${appName}:${version}...`);

  // Re-resolve files for the image builder (import-adapter already parsed them)
  // We reconstruct from the manifest since import-adapter consumed the files
  const buildResult = await buildAppImage(
    // Use a minimal file set derived from the import
    [
      {
        path: importResult.manifest["app:entrypoint"],
        bytes: new TextEncoder().encode(
          `<!-- ${appName} v${version} — entry: ${importResult.manifest["app:entrypoint"]} -->`
        ),
      },
    ],
    {
      name: appName,
      version,
      tech: importResult.manifest["app:tech"],
      entrypoint: importResult.manifest["app:entrypoint"],
      builderCanonicalId: opts.developerCanonicalId,
      shieldLevel: opts.shieldLevel,
    },
  );

  // ── Stage 3: SHIP ────────────────────────────────────────────
  progress("ship", "Pushing to registry and creating deployment snapshot...");

  const shipResult = await shipApp({
    image: buildResult.image,
    manifest: importResult.manifest,
    developerCanonicalId: opts.developerCanonicalId,
    appName,
    version,
    previousSnapshotId: opts.previousSnapshotId,
  });

  // ── Stage 3.5: INGEST ─────────────────────────────────────────
  progress("ingest", "Ingesting assets into content-addressed storage...");

  const sourceUrl = importResult.manifest["app:sourceUrl"] as string;
  const ingestResult = await ingestAppAssets({
    sourceUrl,
    appName,
    version,
    imageCanonicalId: buildResult.image.canonicalId,
    snapshotId: shipResult.snapshot["u:canonicalId"],
    ingestedBy: opts.developerCanonicalId,
  });

  // ── Stage 4: RUN ─────────────────────────────────────────────
  progress("run", "Starting WASM runtime...");

  const instance = await runApp({
    imageRef: buildResult.image.canonicalId,
    // Use our self-hosted serve URL instead of original source
    sourceUrl: ingestResult.serveUrl,
    mountTarget: opts.mountTarget,
    tracing: true,
  });

  // ── Complete ─────────────────────────────────────────────────
  const durationMs = Math.round(performance.now() - startTime);
  progress("complete", `Deployed ${appName}:${version} in ${durationMs}ms`);

  return {
    import: importResult,
    build: buildResult,
    ship: shipResult,
    ingest: ingestResult,
    instance,
    durationMs,
  };
}
