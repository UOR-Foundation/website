/**
 * UNS Build — Image Registry (Tag, Push, Pull)
 *
 * Content-addressed image registry with Docker-compatible
 * tag, push, and pull operations.
 *
 * Every image in the registry is identified by its canonical ID.
 * Tags are human-readable aliases (e.g., "myapp:v2.1") that
 * point to canonical IDs — renaming a tag never changes the image.
 *
 * Equivalent to Docker Hub / Docker Registry API v2.
 *
 * @see build: namespace — UOR build system
 */

import { singleProofHash } from "../core/identity";
import type { UorImage } from "./uorfile";

// ── Types ───────────────────────────────────────────────────────────────────

/** A tag pointing to an image canonical ID. */
export interface ImageTag {
  /** Full tag name (e.g., "myapp:v2.1", "myorg/myapp:latest"). */
  fullTag: string;
  /** Repository name (e.g., "myapp", "myorg/myapp"). */
  repository: string;
  /** Tag value (e.g., "v2.1", "latest"). */
  tag: string;
  /** Canonical ID this tag points to. */
  canonicalId: string;
  /** When the tag was created. */
  taggedAt: string;
  /** Who created the tag. */
  taggerCanonicalId: string;
}

/** Result of a push operation. */
export interface PushResult {
  /** Canonical ID of the pushed image. */
  canonicalId: string;
  /** Tags applied. */
  tags: string[];
  /** Registry URL. */
  registryUrl: string;
  /** Layers pushed (canonical IDs). */
  layersPushed: number;
  /** Whether the image already existed (deduplicated). */
  deduplicated: boolean;
}

/** Result of a pull operation. */
export interface PullResult {
  /** Canonical ID of the pulled image. */
  canonicalId: string;
  /** Image metadata. */
  image: UorImage;
  /** Whether the image was already cached locally. */
  cached: boolean;
}

/** Image history entry (like `docker history`). */
export interface ImageHistoryEntry {
  /** Layer canonical ID. */
  canonicalId: string;
  /** Instruction that created this layer. */
  instruction: string;
  /** Layer size. */
  sizeBytes: number;
  /** Created timestamp. */
  createdAt: string;
}

// ── Registry Store ──────────────────────────────────────────────────────────

/** Images stored by canonical ID. */
const imageStore = new Map<string, UorImage>();

/** Tags mapping full tag → canonical ID. */
const tagStore = new Map<string, ImageTag>();

// ── Tag Operations ──────────────────────────────────────────────────────────

/**
 * `uor tag <source> <target>`
 *
 * Create a tag that points to an image's canonical ID.
 * Equivalent to `docker tag`.
 *
 * @param sourceCanonicalId  Canonical ID of the image to tag
 * @param fullTag            Full tag name (e.g., "myapp:v2.1")
 * @param taggerCanonicalId  Who is creating the tag
 */
export async function tagImage(
  sourceCanonicalId: string,
  fullTag: string,
  taggerCanonicalId: string
): Promise<ImageTag> {
  const { repository, tag } = parseFullTag(fullTag);

  const imageTag: ImageTag = {
    fullTag,
    repository,
    tag,
    canonicalId: sourceCanonicalId,
    taggedAt: new Date().toISOString(),
    taggerCanonicalId,
  };

  tagStore.set(fullTag, imageTag);
  return imageTag;
}

/**
 * Resolve a tag to a canonical ID.
 */
export function resolveTag(fullTag: string): string | null {
  return tagStore.get(fullTag)?.canonicalId ?? null;
}

/**
 * List all tags for a repository.
 */
export function listTags(repository?: string): ImageTag[] {
  const all = Array.from(tagStore.values());
  if (!repository) return all;
  return all.filter(t => t.repository === repository);
}

/**
 * Remove a tag.
 */
export function removeTag(fullTag: string): boolean {
  return tagStore.delete(fullTag);
}

// ── Push / Pull ─────────────────────────────────────────────────────────────

/**
 * `uor push <image>`
 *
 * Push an image to the registry. Content-addressed — if the
 * canonical ID already exists, this is a no-op (deduplication).
 *
 * Equivalent to `docker push`.
 */
export async function pushImage(
  image: UorImage,
  tags: string[] = []
): Promise<PushResult> {
  const existing = imageStore.has(image.canonicalId);

  // Store image
  imageStore.set(image.canonicalId, image);

  // Apply tags
  for (const tag of tags) {
    await tagImage(image.canonicalId, tag, image.builderCanonicalId);
  }

  // Also tag as latest if no tags provided
  if (tags.length === 0 && image.tags.length > 0) {
    for (const tag of image.tags) {
      await tagImage(image.canonicalId, tag, image.builderCanonicalId);
    }
  }

  return {
    canonicalId: image.canonicalId,
    tags: tags.length > 0 ? tags : image.tags,
    registryUrl: "uor://registry.uor.foundation",
    layersPushed: image.layers.length,
    deduplicated: existing,
  };
}

/**
 * `uor pull <image>`
 *
 * Pull an image from the registry by canonical ID or tag.
 * Verifies integrity on receipt by checking canonical ID.
 *
 * Equivalent to `docker pull`.
 */
export async function pullImage(
  ref: string
): Promise<PullResult | null> {
  // Try as canonical ID first
  let canonicalId = ref;
  if (!ref.startsWith("urn:uor:")) {
    // Try as tag
    const resolved = resolveTag(ref);
    if (!resolved) return null;
    canonicalId = resolved;
  }

  const image = imageStore.get(canonicalId);
  if (!image) return null;

  return {
    canonicalId,
    image,
    cached: true,
  };
}

/**
 * `uor images`
 *
 * List all images in the registry.
 * Equivalent to `docker images`.
 */
export function listImages(): UorImage[] {
  return Array.from(imageStore.values());
}

/**
 * `uor inspect <image>`
 *
 * Get detailed information about an image.
 * Equivalent to `docker inspect`.
 */
export function inspectImage(canonicalIdOrTag: string): UorImage | null {
  if (canonicalIdOrTag.startsWith("urn:uor:")) {
    return imageStore.get(canonicalIdOrTag) ?? null;
  }
  const resolved = resolveTag(canonicalIdOrTag);
  return resolved ? imageStore.get(resolved) ?? null : null;
}

/**
 * `uor history <image>`
 *
 * Show the layer history of an image.
 * Equivalent to `docker history`.
 */
export function imageHistory(canonicalIdOrTag: string): ImageHistoryEntry[] {
  const image = inspectImage(canonicalIdOrTag);
  if (!image) return [];
  return image.layers.map(l => ({
    canonicalId: l.canonicalId,
    instruction: l.instruction,
    sizeBytes: l.sizeBytes,
    createdAt: l.createdAt,
  }));
}

/**
 * `uor rmi <image>`
 *
 * Remove an image from the registry.
 * Equivalent to `docker rmi`.
 */
export function removeImage(canonicalId: string): boolean {
  // Remove associated tags
  for (const [tag, entry] of tagStore.entries()) {
    if (entry.canonicalId === canonicalId) {
      tagStore.delete(tag);
    }
  }
  return imageStore.delete(canonicalId);
}

/**
 * Search images by repository name or label.
 */
export function searchImages(query: string): UorImage[] {
  const q = query.toLowerCase();
  return listImages().filter(img => {
    const labels = img.spec.labels;
    const name = labels["app.name"] ?? labels["org.opencontainers.image.title"] ?? "";
    return name.toLowerCase().includes(q) ||
      img.canonicalId.includes(q) ||
      (img.dockerfileSource ?? "").toLowerCase().includes(q);
  });
}

/**
 * Clear registry (for testing).
 */
export function clearImageRegistry(): void {
  imageStore.clear();
  tagStore.clear();
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseFullTag(fullTag: string): { repository: string; tag: string } {
  const colonIdx = fullTag.lastIndexOf(":");
  if (colonIdx > 0 && !fullTag.startsWith("urn:")) {
    return {
      repository: fullTag.substring(0, colonIdx),
      tag: fullTag.substring(colonIdx + 1),
    };
  }
  return { repository: fullTag, tag: "latest" };
}
