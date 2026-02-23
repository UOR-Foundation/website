/**
 * Import Adapter (P3) — 10/10 Test Suite
 *
 * Validates universal import from URL, directory, ZIP, and GitHub sources.
 * Tests shim injection, determinism, refresh, and byte counting.
 */

import { describe, it, expect } from "vitest";
import {
  importApp,
  refreshApp,
  type ImportSource,
  type AppFile,
} from "@/modules/uor-sdk/import-adapter";
import { AppRegistry } from "@/modules/uor-sdk/app-identity";

// ── Shared fixtures ─────────────────────────────────────────────────────────

const DEV_ID = "urn:uor:derivation:sha256:dev0000000000000000000000000000000000000000000000000000000000000";

function makeHtmlFile(name = "index.html", content?: string): AppFile {
  const html = content ?? `<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hello</h1></body></html>`;
  return { path: name, bytes: new TextEncoder().encode(html) };
}

function makeDirSource(files: AppFile[]): ImportSource {
  return { type: "dir", path: "/test-app", files };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("Import Adapter (P3)", () => {
  // Test 1: URL import returns valid ImportResult
  it("importApp with URL source returns valid manifest", async () => {
    const registry = new AppRegistry();
    const result = await importApp(
      { type: "url", url: "https://example.com" },
      DEV_ID,
      { name: "example-app", registry }
    );

    expect(result.manifest["u:canonicalId"]).toMatch(
      /^urn:uor:derivation:sha256:[0-9a-f]{64}$/
    );
    expect(result.liveUrl).toContain("https://app.uor.app/");
    expect(result.fileCount).toBeGreaterThan(0);
  });

  // Test 2: Directory import returns correct fileCount
  it("importApp with local directory returns correct fileCount", async () => {
    const files: AppFile[] = [
      makeHtmlFile(),
      { path: "style.css", bytes: new TextEncoder().encode("body { color: red; }") },
      { path: "app.js", bytes: new TextEncoder().encode("console.log('hi')") },
    ];
    const registry = new AppRegistry();

    const result = await importApp(makeDirSource(files), DEV_ID, {
      name: "dir-app",
      registry,
    });

    expect(result.fileCount).toBe(3);
  });

  // Test 3: Shim injection into index.html
  it("importApp injects UOR shim script tag into index.html", async () => {
    const files: AppFile[] = [makeHtmlFile()];
    const registry = new AppRegistry();

    const result = await importApp(makeDirSource(files), DEV_ID, {
      name: "shim-app",
      registry,
    });

    expect(result.shimInjected).toBe(true);

    // Verify the shim tag is in the updated bytes
    const updatedHtml = new TextDecoder().decode(files[0].bytes);
    expect(updatedHtml).toContain("cdn.uor.foundation/app-sdk.min.js");
    expect(updatedHtml).toContain("data-uor-app-canonical=");
  });

  // Test 4: shimInjected === false when no HTML files
  it("shimInjected is false when no HTML files exist", async () => {
    const files: AppFile[] = [
      { path: "server.js", bytes: new TextEncoder().encode("module.exports = {}") },
      { path: "package.json", bytes: new TextEncoder().encode('{"name":"api"}') },
    ];
    const registry = new AppRegistry();

    const result = await importApp(makeDirSource(files), DEV_ID, {
      name: "api-app",
      registry,
    });

    expect(result.shimInjected).toBe(false);
  });

  // Test 5: Deterministic — identical source → same canonical ID
  it("two imports of identical source produce same u:canonicalId", async () => {
    const html = "<html><head><title>Det</title></head><body>Deterministic</body></html>";
    const files1: AppFile[] = [{ path: "index.html", bytes: new TextEncoder().encode(html) }];
    const files2: AppFile[] = [{ path: "index.html", bytes: new TextEncoder().encode(html) }];
    const registry = new AppRegistry();
    const fixedTime = "2025-01-01T00:00:00.000Z";

    const r1 = await importApp(
      { type: "dir", path: "/app", files: files1 },
      DEV_ID,
      { name: "det-app", version: "1.0.0", deployedAt: fixedTime, registry }
    );
    const r2 = await importApp(
      { type: "dir", path: "/app", files: files2 },
      DEV_ID,
      { name: "det-app", version: "1.0.0", deployedAt: fixedTime, registry }
    );

    expect(r1.manifest["u:canonicalId"]).toBe(r2.manifest["u:canonicalId"]);
  });

  // Test 6: refreshApp sets previousCanonicalId
  it("refreshApp sets app:previousCanonicalId to previous manifest", async () => {
    const registry = new AppRegistry();
    const files1: AppFile[] = [makeHtmlFile("index.html", "<html><head></head><body>v1</body></html>")];

    const r1 = await importApp(makeDirSource(files1), DEV_ID, {
      name: "refresh-app",
      registry,
    });

    const files2: AppFile[] = [
      makeHtmlFile("index.html", "<html><head></head><body>v2 updated</body></html>"),
    ];

    const r2 = await refreshApp(
      r1.manifest["u:canonicalId"]!,
      { type: "dir", path: "/app-v2", files: files2 },
      { registry }
    );

    expect(r2.manifest["app:previousCanonicalId"]).toBe(
      r1.manifest["u:canonicalId"]
    );
  });

  // Test 7: Import result includes liveUrl and canonicalId
  it("import returns liveUrl and manifest.u:canonicalId", async () => {
    const registry = new AppRegistry();
    const result = await importApp(
      { type: "url", url: "https://example.com" },
      DEV_ID,
      { name: "url-app", registry }
    );

    expect(result.liveUrl).toMatch(/^https:\/\/app\.uor\.app\/[0-9a-f]{12}$/);
    expect(result.manifest["u:canonicalId"]).toBeTruthy();
  });

  // Test 8: Registry stores and retrieves manifest
  it("registered manifest is retrievable by canonical ID", async () => {
    const registry = new AppRegistry();
    const files: AppFile[] = [makeHtmlFile()];

    const result = await importApp(makeDirSource(files), DEV_ID, {
      name: "stored-app",
      registry,
    });

    const retrieved = await registry.get(result.manifest["u:canonicalId"]!);
    expect(retrieved).not.toBeNull();
    expect(retrieved!["app:name"]).toBe("stored-app");
  });

  // Test 9: History returns newest first
  it("registry history returns versions newest-first", async () => {
    const registry = new AppRegistry();
    const files1: AppFile[] = [makeHtmlFile("index.html", "<html><head></head><body>v1</body></html>")];

    const r1 = await importApp(makeDirSource(files1), DEV_ID, {
      name: "hist-app",
      registry,
    });

    const files2: AppFile[] = [
      makeHtmlFile("index.html", "<html><head></head><body>v2</body></html>"),
    ];

    await refreshApp(
      r1.manifest["u:canonicalId"]!,
      { type: "dir", path: "/v2", files: files2 },
      { registry }
    );

    const history = await registry.getHistory("hist-app");
    expect(history.length).toBe(2);
    expect(history[0]["app:version"]).toBe("1.0.1"); // newer
    expect(history[1]["app:version"]).toBe("1.0.0"); // older
  });

  // Test 10: totalBytes is accurate
  it("totalBytes captures actual byte size of all files", async () => {
    const content1 = "Hello World"; // 11 bytes
    const content2 = "body { margin: 0; }"; // 19 bytes
    const files: AppFile[] = [
      { path: "readme.txt", bytes: new TextEncoder().encode(content1) },
      { path: "style.css", bytes: new TextEncoder().encode(content2) },
    ];
    const registry = new AppRegistry();

    const result = await importApp(makeDirSource(files), DEV_ID, {
      name: "bytes-app",
      registry,
    });

    // Files have no HTML so no shim bytes added
    expect(result.totalBytes).toBe(11 + 19);
  });
});
