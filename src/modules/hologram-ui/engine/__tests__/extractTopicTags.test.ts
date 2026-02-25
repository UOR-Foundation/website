import { describe, it, expect } from "vitest";
import { extractTopicTags } from "../extractTopicTags";

describe("extractTopicTags", () => {
  it("extracts domain-mapped tags from technical text", () => {
    const tags = extractTopicTags("Tell me about quantum physics and graph theory algorithms");
    const tagNames = tags.map((t) => t.tag);
    expect(tagNames).toContain("quantum");
    expect(tagNames).toContain("physics");
    expect(tags.length).toBeLessThanOrEqual(5);
  });

  it("returns empty for stop-word-only input", () => {
    const tags = extractTopicTags("I would like to do this and that");
    expect(tags.length).toBe(0);
  });

  it("respects maxTags limit", () => {
    const tags = extractTopicTags(
      "quantum physics blockchain cryptography design music art neural networks",
      3,
    );
    expect(tags.length).toBeLessThanOrEqual(3);
  });

  it("assigns higher weight to repeated terms", () => {
    const tags = extractTopicTags("design design design music");
    const designTag = tags.find((t) => t.tag === "design");
    const musicTag = tags.find((t) => t.tag === "music");
    expect(designTag).toBeDefined();
    expect(musicTag).toBeDefined();
    expect(designTag!.weight).toBeGreaterThan(musicTag!.weight);
  });

  it("maps UOR-specific terms to domain tags", () => {
    const tags = extractTopicTags("The hologram projection uses canonical derivation morphism");
    const tagNames = tags.map((t) => t.tag);
    expect(tagNames).toContain("hologram");
    expect(tagNames).toContain("projections");
  });
});
