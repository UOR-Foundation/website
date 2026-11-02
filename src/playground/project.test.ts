import { describe, expect, it } from "vitest";
import { createProject, decodeProject, encodeProject, validFilename, validateProject } from "./project";

describe("Playground projects", () => {
  it("preserves edited projects in share links", () => {
    const project = { ...createProject(), "helpers.ts": "export const answer = 42;\n" };
    expect(decodeProject(encodeProject(project))).toEqual(project);
  });
  it("rejects invalid shared code", () => {
    expect(decodeProject("invalid-data")).toBeNull();
    expect(validateProject({ "index.ts": "ok", "package.json": "{}", "../escape": "unsafe" })).toBeNull();
  });
  it("rejects paths outside the project", () => {
    expect(validFilename("../secret.ts")).toBe(false);
    expect(validFilename("src/../../secret.ts")).toBe(false);
    expect(validFilename("/secret.ts")).toBe(false);
    expect(validFilename("node_modules/index.js")).toBe(false);
    expect(validFilename("src/helpers.ts")).toBe(true);
  });
  it("uses the published package API", () => {
    const project = createProject("canonical");
    expect(JSON.parse(project["package.json"]).dependencies["prism-code"]).toBe("0.1.0");
    expect(project["index.ts"]).toContain("canonicalize");
  });
});