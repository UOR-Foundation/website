import { describe, it, expect } from "vitest";
import * as f from "@/site/content";
import * as d from "@/docs/content";
import * as a from "@/about/content";
import * as fw from "@/framework/content";

describe("Home page copy", () => {
  it("contains no dash characters in visible text", () => {
    const visible = JSON.stringify([f, d.RELEASE_STATUS, d.CHANGELOG, d.DOCS_HOME])
      .replace(/"(https?:\/\/|\/)[^"]*"/g, '""')
      // user's own wording / package name
      .replace(/"slug":"[^"]*"/g, "").replace(/self-verifying/g, "")
      .replace(/Byte-precise/g, "")
      .replace(/prism-code/g, "")
      .replace(/open-source/g, "")
      .replace(/content–addressed/g, "");
    expect(visible).not.toMatch(/[-–—]/);
  });

  it("labels the Prism SDK release as v0.4 with a Beta tag", () => {
    expect(f.RIBBON.text).toMatch(/Prism SDK v0\.4/);
    expect(f.RIBBON.text).not.toMatch(/Beta/);
    expect(f.RIBBON.tag).toBe("Beta");
  });

  it("never references the old website", () => {
    expect(JSON.stringify([f, a])).not.toMatch(/uor\.foundation/);
  });

  it("Framework page text contains no dashes or old site links", () => {
    const visible = JSON.stringify(fw);
    expect(visible).not.toMatch(/[-–—]/);
    expect(visible).not.toMatch(/uor\.foundation/);
  });

  it("About page text contains no dashes", () => {
    const visible = JSON.stringify(a).replace(/"https?:\/\/[^"]*"/g, '""');
    expect(visible).not.toMatch(/[-–—]/);
  });
});
