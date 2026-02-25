import { describe, it, expect } from "vitest";
import { projectProfile } from "../contextProjection";

describe("Context Projection Engine", () => {
  it("projects an empty triple set to default profile", () => {
    const profile = projectProfile([]);
    expect(profile.interests).toEqual({});
    expect(profile.activeTasks).toEqual([]);
    expect(profile.recentDomains).toEqual([]);
    expect(profile.phaseAffinity).toEqual({ learn: 0.33, work: 0.33, play: 0.33 });
  });

  it("projects interest triples with weight parsing", () => {
    const triples = [
      { subject: "cid:user1", predicate: "uor:interestedIn", object: "mathematics:0.80" },
      { subject: "cid:user1", predicate: "uor:interestedIn", object: "physics:0.60" },
    ];
    const profile = projectProfile(triples);
    expect(profile.interests["mathematics"]).toBeCloseTo(0.8);
    expect(profile.interests["physics"]).toBeCloseTo(0.6);
  });

  it("projects active tasks and domains", () => {
    const triples = [
      { subject: "cid:user1", predicate: "uor:activeTask", object: "build-context-engine" },
      { subject: "cid:user1", predicate: "uor:activeTask", object: "design-ui" },
      { subject: "cid:user1", predicate: "uor:visitedDomain", object: "hologram-os" },
    ];
    const profile = projectProfile(triples);
    expect(profile.activeTasks).toContain("build-context-engine");
    expect(profile.activeTasks).toContain("design-ui");
    expect(profile.recentDomains).toContain("hologram-os");
  });

  it("projects phase affinity overrides", () => {
    const triples = [
      { subject: "cid:user1", predicate: "uor:phaseAffinity", object: "work:0.70" },
      { subject: "cid:user1", predicate: "uor:phaseAffinity", object: "learn:0.20" },
    ];
    const profile = projectProfile(triples);
    expect(profile.phaseAffinity.work).toBeCloseTo(0.7);
    expect(profile.phaseAffinity.learn).toBeCloseTo(0.2);
    expect(profile.phaseAffinity.play).toBeCloseTo(0.33); // unchanged
  });

  it("deduplicates tasks and caps at 20", () => {
    const triples = Array.from({ length: 25 }, (_, i) => ({
      subject: "cid:user1",
      predicate: "uor:activeTask",
      object: `task-${i}`,
    }));
    // Add a duplicate
    triples.push({ subject: "cid:user1", predicate: "uor:activeTask", object: "task-0" });
    const profile = projectProfile(triples);
    expect(profile.activeTasks.length).toBe(20);
  });

  it("handles malformed weight gracefully", () => {
    const triples = [
      { subject: "cid:user1", predicate: "uor:interestedIn", object: "art:" },
      { subject: "cid:user1", predicate: "uor:interestedIn", object: "music" },
    ];
    const profile = projectProfile(triples);
    expect(profile.interests["art"]).toBe(0.5); // NaN falls back to 0.5
    expect(profile.interests["music"]).toBe(0.5); // no colon = undefined weight → 0.5
  });
});
