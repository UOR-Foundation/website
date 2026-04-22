/**
 * Single source of truth that maps every blog post `coverKey` to its
 * imported image asset. Importing this module also runs a validation that
 * fails fast (in development) if a `blogPosts` entry references a key that
 * has no mapping, or if a mapped image is missing — guaranteeing the
 * "Read next" related-strip thumbnails never render blank.
 */
import { blogPosts } from "@/data/blog-posts";
import blogKnowledgeGraph from "@/assets/blog-knowledge-graph.png";
import blogGoldenSeed from "@/assets/blog-golden-seed-vector.png";
import blogFrameworkLaunch from "@/assets/blog-uor-framework-launch.png";
import projectIdentity from "@/assets/project-uor-identity.jpg";

/** Add new covers here when introducing a new blog post. */
export const blogCoverMap: Record<string, string> = {
  knowledgeGraph: blogKnowledgeGraph,
  goldenSeed: blogGoldenSeed,
  frameworkLaunch: blogFrameworkLaunch,
  universalDataFingerprint: projectIdentity,
};

/**
 * Validate that every blog post has a non-empty `coverKey` and that every
 * `coverKey` resolves to a truthy image asset. Throws in development so the
 * problem is caught at boot; logs a console error in production so it shows
 * up in monitoring without crashing the page.
 */
function validateBlogCovers(): void {
  const errors: string[] = [];
  const validKeys = new Set(Object.keys(blogCoverMap));

  for (const post of blogPosts) {
    if (!post.coverKey) {
      errors.push(`Blog post "${post.title}" (${post.href}) is missing coverKey`);
      continue;
    }
    if (!validKeys.has(post.coverKey)) {
      errors.push(
        `Blog post "${post.title}" (${post.href}) references unknown coverKey "${post.coverKey}". ` +
          `Add it to blogCoverMap in src/data/blog-covers.ts.`
      );
      continue;
    }
    if (!blogCoverMap[post.coverKey]) {
      errors.push(
        `coverKey "${post.coverKey}" in blogCoverMap resolves to a falsy asset. ` +
          `Check the import in src/data/blog-covers.ts.`
      );
    }
  }

  if (errors.length === 0) return;

  const message = `[blog-covers] Validation failed:\n  - ${errors.join("\n  - ")}`;
  if (import.meta.env?.DEV) {
    throw new Error(message);
  }
  console.error(message);
}

validateBlogCovers();

/**
 * Resolve a coverKey to its asset URL. Returns `undefined` (and warns) if the
 * key is unknown — callers should fall back gracefully, but in practice the
 * boot-time validation above guarantees this never happens for keys that
 * appear in `blogPosts`.
 */
export function getBlogCover(coverKey: string | undefined): string | undefined {
  if (!coverKey) return undefined;
  const asset = blogCoverMap[coverKey];
  if (!asset) {
    console.warn(`[blog-covers] No asset registered for coverKey "${coverKey}"`);
    return undefined;
  }
  return asset;
}