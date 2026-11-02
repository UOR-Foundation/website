import { describe, it, expect } from "vitest";
import { BLOG_POSTS, blogLlmsTxt, postMarkdown } from "@/blog/agent";
import { COVERS } from "@/blog/covers";

describe("Blog", () => {
  it("ports all posts with unique slugs", () => {
    expect(BLOG_POSTS).toHaveLength(10);
    expect(new Set(BLOG_POSTS.map((p) => p.slug)).size).toBe(10);
  });
  it("gives every post a cover and an agent readable markdown entry", () => {
    for (const p of BLOG_POSTS) {
      expect(COVERS[p.slug]).toBeTruthy();
      expect(postMarkdown(p)).toContain(`# ${p.title}`);
      expect(blogLlmsTxt()).toContain(`/blog/${p.slug}.md`);
    }
  });
  it("never references the old website", () => {
    expect(JSON.stringify(BLOG_POSTS)).not.toMatch(/uor\.foundation/);
  });
  it("keeps titles, summaries and categories free of dashes", () => {
    const visible = JSON.stringify(BLOG_POSTS.map((p) => [p.title, p.summary, p.category])).replace(/uor-foundation/g, "");
    expect(visible).not.toMatch(/[-–—]/);
  });
});
