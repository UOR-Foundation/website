import { describe, it, expect, beforeEach } from "vitest";
import { AppCli } from "@/modules/uor-sdk/cli";
import { UnsKv } from "@/modules/uns/store/kv";

// ═══════════════════════════════════════════════════════════════════════════
// P12 Tests — 10/10
// ═══════════════════════════════════════════════════════════════════════════

describe("App CLI — P12", () => {
  let kv: UnsKv;
  let cli: AppCli;

  beforeEach(() => {
    kv = new UnsKv();
    cli = new AppCli(kv);
  });

  // Test 1
  it("1. deploy exits 0 and prints canonical ID in stdout", async () => {
    const result = await cli.deploy({ source: "https://my-gallery.lovable.app" });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("urn:uor:derivation:sha256:");
    expect(result.json.canonicalId).toMatch(/^urn:uor:derivation:sha256:[a-f0-9]{64}$/);
  });

  // Test 2
  it("2. deploy stdout contains Live URL", async () => {
    const result = await cli.deploy({ source: "https://my-gallery.lovable.app" });
    expect(result.stdout).toContain("Live URL: https://app.uor.app/");
  });

  // Test 3
  it("3. deploy stdout contains IPFS CID", async () => {
    const result = await cli.deploy({ source: "https://my-gallery.lovable.app" });
    expect(result.stdout).toMatch(/IPFS CID: b[a-z0-9]+/);
    expect(result.json.cid).toBeTruthy();
  });

  // Test 4
  it("4. status prints zone and hScore fields", async () => {
    const deployResult = await cli.deploy({ source: "https://test.app" });
    const id = deployResult.json.canonicalId as string;
    const status = await cli.status(id);
    expect(status.exitCode).toBe(0);
    expect(status.stdout).toContain("Zone:");
    expect(status.json.zone).toBe("COHERENCE");
    expect(status.json.hScore).toBe(1.0);
  });

  // Test 5
  it("5. verify --file prints VERIFIED for matching content", async () => {
    const content = new TextEncoder().encode("test-file-content");
    // First get the canonical ID of this content
    const { singleProofHash } = await import("@/lib/uor-canonical");
    let binary = "";
    for (const b of content) binary += String.fromCharCode(b);
    const proof = await singleProofHash({ raw: btoa(binary) });

    const result = await cli.verify(proof.derivationId, content);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("✓ VERIFIED");
  });

  // Test 6
  it("6. verify --file prints MISMATCH for wrong content", async () => {
    const result = await cli.verify(
      "urn:uor:derivation:sha256:0000000000000000000000000000000000000000000000000000000000000000",
      new TextEncoder().encode("wrong content"),
    );
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("✗ MISMATCH");
  });

  // Test 7
  it("7. history returns version array as table", async () => {
    const r1 = await cli.deploy({ source: "https://v1.app" });
    const id = r1.json.canonicalId as string;
    const history = await cli.history(id);
    expect(history.exitCode).toBe(0);
    const versions = history.json.versions as unknown[];
    expect(Array.isArray(versions)).toBe(true);
    expect(versions.length).toBeGreaterThanOrEqual(1);
  });

  // Test 8
  it("8. monetize prints Payment gate created", async () => {
    const deploy = await cli.deploy({ source: "https://paid.app" });
    const id = deploy.json.canonicalId as string;
    const result = await cli.monetize({
      canonicalId: id,
      price: 15,
      interval: "monthly",
      gate: "premium",
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Payment gate");
    expect(result.stdout).toContain("$15");
  });

  // Test 9
  it("9. init creates developer identity", async () => {
    const result = await cli.init();
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("~/.uor/identity.json");
    expect(result.json.canonicalId).toMatch(/^urn:uor:derivation:sha256:/);

    // Verify whoami works after init
    const whoami = await cli.whoami();
    expect(whoami.exitCode).toBe(0);
  });

  // Test 10
  it("10. --help shows all commands with descriptions", () => {
    const result = cli.help();
    expect(result.exitCode).toBe(0);
    const commands = ["deploy", "update", "monetize", "status", "history", "verify", "rollback", "init", "whoami"];
    for (const cmd of commands) {
      expect(result.stdout).toContain(cmd);
    }
  });
});
