/**
 * UOR SDK — Runtime Image Builder
 *
 * Wraps an imported file tree (AppFile[]) into a content-addressed UorImage
 * with individual layers per file. Bridges the import-adapter (which resolves
 * sources) to the UNS build system (which produces canonical images).
 *
 * Pipeline:
 *   1. Accept AppFile[] from import-adapter
 *   2. Generate a synthetic Uorfile (build spec) from file metadata
 *   3. Delegate to uns/build/uorfile.buildImage() for canonical layering
 *   4. Return UorImage with all layers content-addressed
 *
 * This is the "docker build" equivalent for vibe-coded apps.
 *
 * @see import-adapter — source resolution (URL, GitHub, ZIP, dir)
 * @see uns/build/uorfile — canonical image builder
 */

import { singleProofHash } from "@/lib/uor-canonical";
import { buildImage, parseUorfile } from "@/modules/uns/build/uorfile";
import type { UorImage, UorImageLayer } from "@/modules/uns/build/uorfile";
import type { AppFile } from "../import-adapter";

// ── Types ───────────────────────────────────────────────────────────────────

/** Options for building an image from app files. */
export interface ImageBuildOptions {
  /** App name (used in labels). */
  name: string;
  /** App version. */
  version: string;
  /** Detected tech stack. */
  tech: string[];
  /** Entry point file path. */
  entrypoint: string;
  /** Builder's canonical ID. */
  builderCanonicalId: string;
  /** Environment variables to bake into image. */
  env?: Record<string, string>;
  /** UOR shield level. */
  shieldLevel?: "standard" | "strict" | "paranoid";
}

/** Result of the image build process. */
export interface ImageBuildResult {
  /** The built UorImage. */
  image: UorImage;
  /** Synthetic Uorfile source that was generated. */
  uorfileSource: string;
  /** Per-file layer mapping. */
  fileLayers: Array<{ path: string; layerCanonicalId: string }>;
}

// ── Synthetic Uorfile Generator ─────────────────────────────────────────────

/**
 * Generate a Uorfile from app metadata.
 *
 * Produces a Docker-compatible build spec:
 *   FROM scratch
 *   LABEL app.name=<name>
 *   ENV NODE_ENV=production
 *   COPY <file> /app/<file>     (for each file)
 *   EXPOSE 3000
 *   ENTRYPOINT ["serve", "/app"]
 */
function generateUorfile(files: AppFile[], opts: ImageBuildOptions): string {
  const lines: string[] = [
    "# Auto-generated Uorfile for vibe-coded app",
    `# ${opts.name} v${opts.version}`,
    "",
    "FROM scratch",
    "",
    `LABEL app.name="${opts.name}"`,
    `LABEL app.version="${opts.version}"`,
    `LABEL app.tech="${opts.tech.join(",")}"`,
    "",
    `WORKDIR /app`,
    "",
  ];

  // Environment
  const env = { NODE_ENV: "production", ...opts.env };
  for (const [key, val] of Object.entries(env)) {
    lines.push(`ENV ${key}="${val}"`);
  }
  lines.push("");

  // Copy files
  for (const file of files) {
    lines.push(`COPY ${file.path} /app/${file.path}`);
  }
  lines.push("");

  // Shield level
  if (opts.shieldLevel && opts.shieldLevel !== "standard") {
    lines.push(`SHIELD ${opts.shieldLevel}`);
  }

  // Expose + entrypoint
  lines.push("EXPOSE 3000");
  lines.push(`ENTRYPOINT ["serve", "/app/${opts.entrypoint}"]`);

  return lines.join("\n");
}

// ── Image Builder ───────────────────────────────────────────────────────────

/**
 * Build a content-addressed UorImage from imported app files.
 *
 * This is the core "docker build" for vibe-coded applications:
 *   1. Generates a synthetic Uorfile from the file tree + metadata
 *   2. Parses it into a UorfileBuildSpec
 *   3. Creates a source file map for layer content-addressing
 *   4. Delegates to buildImage() for canonical identity computation
 *   5. Adds per-file layer entries for fine-grained deduplication
 */
export async function buildAppImage(
  files: AppFile[],
  opts: ImageBuildOptions,
): Promise<ImageBuildResult> {
  // 1. Generate synthetic Uorfile
  const uorfileSource = generateUorfile(files, opts);

  // 2. Parse into build spec
  const spec = parseUorfile(uorfileSource);

  // 3. Create source file map for the builder
  const sourceFiles = new Map<string, Uint8Array>();
  for (const file of files) {
    sourceFiles.set(file.path, file.bytes);
  }

  // 4. Build the image via the canonical builder
  const image = await buildImage(spec, opts.builderCanonicalId, sourceFiles);

  // 5. Tag with app name + version
  image.tags = [
    `${opts.name}:${opts.version}`,
    `${opts.name}:latest`,
  ];

  // 6. Compute per-file layer canonical IDs for fine-grained tracking
  const fileLayers: Array<{ path: string; layerCanonicalId: string }> = [];
  for (const file of files) {
    const fileProof = await singleProofHash({
      "@type": "build:FileLayer",
      "build:path": file.path,
      "build:byteLength": file.bytes.length,
    });
    fileLayers.push({
      path: file.path,
      layerCanonicalId: fileProof.derivationId,
    });
  }

  return {
    image,
    uorfileSource,
    fileLayers,
  };
}

// ── Re-exports ──────────────────────────────────────────────────────────────

export type { UorImage, UorImageLayer };
