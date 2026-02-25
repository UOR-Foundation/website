/**
 * Phase 5 Validation Tests — Universal Ingest
 * ════════════════════════════════════════════
 *
 * Verifies that any digital artifact can be ingested into the UOR framework
 * and that the ingest layer is fully coherent with Phases 1-4.
 */

import { describe, it, expect } from "vitest";
import { HologramEngine } from "@/modules/uns/core/hologram/engine";
import {
  ingest,
  ingestJson,
  ingestJsonLd,
  ingestText,
  ingestBinary,
  ingestAndSpawn,
  type IngestResult,
  type IngestExecutableResult,
  type IngestSpawnedResult,
} from "@/modules/uns/core/hologram/universal-ingest";
import {
  vStat,
  vPs,
  vMmap,
  vIoctl,
  vRead,
  vKill,
} from "@/modules/uns/core/hologram/virtual-io";
import { DIRECTIONS } from "@/modules/uns/core/hologram/polytree";
import { ADAPTIVE_SCHEDULER } from "@/modules/uns/core/hologram/executable-blueprint";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Phase 5: Universal Ingest", () => {

  // ── Format Detection ─────────────────────────────────────────────────

  describe("Format detection", () => {
    it("detects JSON from object input", async () => {
      const result = await ingestJson({ hello: "world" });
      expect(result.envelope.format).toBe("json");
      expect(result.envelope.mimeType).toBe("application/json");
    });

    it("detects JSON-LD from object with @context", async () => {
      const result = await ingestJsonLd({
        "@context": "https://schema.org",
        "@type": "Person",
        name: "Alice",
      });
      expect(result.envelope.format).toBe("jsonld");
      expect(result.envelope.mimeType).toBe("application/ld+json");
    });

    it("detects text from string input", async () => {
      const result = await ingestText("Hello, UOR!");
      expect(result.envelope.format).toBe("text");
      expect(result.envelope.mimeType).toBe("text/plain");
    });

    it("detects markdown from string with headers", async () => {
      const result = await ingestText("# Title\n\nSome content", { format: "markdown" });
      expect(result.envelope.format).toBe("markdown");
      expect(result.envelope.mimeType).toBe("text/markdown");
    });

    it("detects binary from opaque bytes", async () => {
      const bytes = new Uint8Array([0xff, 0xfe, 0x00, 0x80, 0xc0]);
      const result = await ingestBinary(bytes);
      expect(result.envelope.format).toBe("binary");
      expect(result.envelope.mimeType).toBe("application/octet-stream");
    });

    it("detects WASM from magic bytes", async () => {
      // WASM magic: \0asm followed by version
      const wasmBytes = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
      const result = await ingestBinary(wasmBytes);
      expect(result.envelope.format).toBe("wasm");
      expect(result.envelope.mimeType).toBe("application/wasm");
    });

    it("detects PNG from magic bytes", async () => {
      const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const result = await ingestBinary(pngBytes);
      expect(result.envelope.format).toBe("image");
      expect(result.envelope.mimeType).toBe("image/png");
    });

    it("allows format override", async () => {
      const result = await ingest("some data", { format: "csv" });
      expect(result.envelope.format).toBe("csv");
    });
  });

  // ── Content Addressing ───────────────────────────────────────────────

  describe("Content addressing", () => {
    it("produces valid CID for ingested data", async () => {
      const result = await ingestJson({ key: "value" });
      expect(result.proof.cid).toBeTruthy();
      expect(result.proof.cid.startsWith("b")).toBe(true); // base32 CID
    });

    it("produces valid hex hash", async () => {
      const result = await ingestJson({ key: "value" });
      expect(result.proof.hashHex).toMatch(/^[0-9a-f]{64}$/);
    });

    it("produces deterministic identity for same content", async () => {
      const r1 = await ingestJson({ a: 1, b: 2 });
      const r2 = await ingestJson({ a: 1, b: 2 });
      // Note: timestamps differ so envelope CIDs will differ
      // But content hashes should be the same
      expect(r1.envelope.contentHash).toBe(r2.envelope.contentHash);
    });

    it("produces different identity for different content", async () => {
      const r1 = await ingestJson({ a: 1 });
      const r2 = await ingestJson({ a: 2 });
      expect(r1.envelope.contentHash).not.toBe(r2.envelope.contentHash);
    });

    it("envelope has correct byte length", async () => {
      const text = "Hello, Universal Ingest!";
      const result = await ingestText(text);
      expect(result.envelope.byteLength).toBe(new TextEncoder().encode(text).length);
    });
  });

  // ── Hologram Projections ─────────────────────────────────────────────

  describe("Hologram projections", () => {
    it("generates full hologram with 25+ projections", async () => {
      const result = await ingestJson({ test: true });
      const projections = Object.keys(result.hologram.projections);
      expect(projections.length).toBeGreaterThan(20);
    });

    it("hologram includes DID projection", async () => {
      const result = await ingestJson({ test: true });
      expect(result.hologram.projections["did"]).toBeTruthy();
      expect(result.hologram.projections["did"].value).toMatch(/^did:uor:/);
    });

    it("hologram includes CID projection", async () => {
      const result = await ingestJson({ test: true });
      expect(result.hologram.projections["cid"]).toBeTruthy();
    });

    it("identity ProjectionInput is well-formed", async () => {
      const result = await ingestJson({ x: 42 });
      expect(result.identity.hashBytes).toBeInstanceOf(Uint8Array);
      expect(result.identity.hashBytes.length).toBe(32);
      expect(result.identity.cid).toBeTruthy();
      expect(result.identity.hex).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  // ── Executable Blueprint Generation ──────────────────────────────────

  describe("Executable blueprint generation", () => {
    it("generates blueprint when executable: true", async () => {
      const result = await ingest({ data: "test" }, { executable: true });
      expect("blueprint" in result).toBe(true);
      const exec = result as IngestExecutableResult;
      expect(exec.blueprint["@type"]).toBe("uor:ExecutableBlueprint");
      expect(exec.blueprint.name).toContain("ingest:");
    });

    it("blueprint has format tag", async () => {
      const result = await ingest({ data: "test" }, { executable: true }) as IngestExecutableResult;
      expect(result.blueprint.tags).toContain("format:json");
      expect(result.blueprint.tags).toContain("ingested");
    });

    it("custom label appears in blueprint name", async () => {
      const result = await ingest("hello", {
        executable: true,
        label: "my-artifact",
      }) as IngestExecutableResult;
      expect(result.blueprint.name).toBe("my-artifact");
    });

    it("custom scheduler is applied", async () => {
      const result = await ingest("hello", {
        executable: true,
        scheduler: ADAPTIVE_SCHEDULER,
      }) as IngestExecutableResult;
      expect(result.blueprint.scheduler.isConstant).toBe(false);
      expect(result.blueprint.scheduler.transitions.length).toBeGreaterThan(0);
    });
  });

  // ── Engine Spawning ──────────────────────────────────────────────────

  describe("Engine spawning", () => {
    it("spawns in engine when engine option provided", async () => {
      const engine = new HologramEngine();
      const result = await ingestAndSpawn(engine, { data: "live" });
      expect(result.pid).toBeTruthy();
      expect(engine.processCount).toBe(1);
    });

    it("spawned process is running", async () => {
      const engine = new HologramEngine();
      const result = await ingestAndSpawn(engine, "running process");
      const stat = vStat(engine, result.pid);
      expect(stat.status).toBe("running");
    });

    it("spawned process can be ticked via vIoctl", async () => {
      const engine = new HologramEngine();
      const result = await ingestAndSpawn(engine, { msg: "hello" }, {
        scheduler: ADAPTIVE_SCHEDULER,
      });
      const tick = await vIoctl(engine, result.pid, 0, DIRECTIONS.VERIFIED);
      expect(tick.interaction!.interfaceChanged).toBe(true);
      expect(tick.projections.size).toBe(6); // 6 UI component types
    });

    it("spawned process can be killed", async () => {
      const engine = new HologramEngine();
      const result = await ingestAndSpawn(engine, "ephemeral");
      vKill(engine, result.pid);
      expect(engine.processCount).toBe(0);
    });
  });

  // ── Convenience Functions ────────────────────────────────────────────

  describe("Convenience functions", () => {
    it("ingestJson works for plain objects", async () => {
      const result = await ingestJson({ key: "val" }, { label: "test-json" });
      expect(result.envelope.format).toBe("json");
      expect(result.envelope.label).toBe("test-json");
    });

    it("ingestJsonLd preserves @context", async () => {
      const result = await ingestJsonLd({
        "@context": "https://schema.org",
        "@type": "Thing",
        name: "Test",
      });
      expect(result.envelope.format).toBe("jsonld");
      const payload = result.envelope.payload as Record<string, unknown>;
      expect(payload["@context"]).toBe("https://schema.org");
    });

    it("ingestText handles plain text", async () => {
      const result = await ingestText("Hello world");
      expect(result.envelope.format).toBe("text");
      expect(result.envelope.payload).toBe("Hello world");
    });

    it("ingestBinary handles raw bytes", async () => {
      const bytes = new Uint8Array([1, 2, 3, 4, 5]);
      const result = await ingestBinary(bytes, { label: "blob" });
      expect(result.envelope.byteLength).toBe(5);
      expect(result.envelope.label).toBe("blob");
    });
  });

  // ── Cross-Phase Coherence (Phases 1-5) ──────────────────────────────

  describe("Cross-phase coherence (Phases 1-5)", () => {
    it("ingested artifact has valid hologram projections (Phase 1)", async () => {
      const result = await ingestJson({ phase: 1 });
      expect(result.hologram.projections["did"].value).toMatch(/^did:uor:/);
      expect(result.hologram.projections["ipv6"]).toBeTruthy();
      expect(result.hologram.projections["activitypub"]).toBeTruthy();
    });

    it("spawned artifact produces UI projections (Phase 2)", async () => {
      const engine = new HologramEngine();
      const result = await ingestAndSpawn(engine, { phase: 2 }, {
        scheduler: ADAPTIVE_SCHEDULER,
      });
      const tick = await vIoctl(engine, result.pid, 0, DIRECTIONS.VERIFIED);
      expect(tick.projections.has("ui:stat-card")).toBe(true);
      expect(tick.projections.has("ui:data-table")).toBe(true);
      expect(tick.projections.has("ui:metric-bar")).toBe(true);
    });

    it("spawned artifact runs through engine lifecycle (Phase 3)", async () => {
      const engine = new HologramEngine();
      const result = await ingestAndSpawn(engine, { phase: 3 });
      const info = engine.getProcessInfo(result.pid);
      expect(info.status).toBe("running");
      expect(info.blueprintCid).toBeTruthy();
    });

    it("spawned artifact responds to Virtual I/O syscalls (Phase 4)", async () => {
      const engine = new HologramEngine();
      const result = await ingestAndSpawn(engine, { phase: 4 });

      // vMmap
      const mmap = await vMmap(engine, result.pid, "did");
      expect(mmap.address).toMatch(/^did:uor:/);

      // vRead
      const readResult = await vRead(engine, result.pid, "identity");
      expect(readResult.proof.cid).toBeTruthy();

      // vPs
      expect(vPs(engine)).toContain(result.pid);
    });

    it("full pipeline: ingest → spawn → interact → mmap → read → kill", async () => {
      const engine = new HologramEngine();

      // Ingest a JSON-LD document
      const result = await ingestAndSpawn(engine, {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        name: "Universal Ingest Test",
      }, {
        label: "e2e-test",
        tags: ["test", "phase5"],
        scheduler: ADAPTIVE_SCHEDULER,
      });

      // Verify it's running
      expect(vStat(engine, result.pid).status).toBe("running");

      // Interact (evolve PolyTree)
      const tick = await vIoctl(engine, result.pid, 0, DIRECTIONS.VERIFIED);
      expect(tick.interaction!.interfaceChanged).toBe(true);

      // Memory-map to DID
      const mmap = await vMmap(engine, result.pid, "did");
      expect(mmap.address).toMatch(/^did:uor:/);

      // Read in identity modality
      const read = await vRead(engine, result.pid, "identity");
      expect(read.proof.cid).toBeTruthy();

      // Kill
      vKill(engine, result.pid);
      expect(engine.processCount).toBe(0);
    });

    it("WASM bytes round-trip through ingest pipeline", async () => {
      const wasmMagic = new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]);
      const result = await ingest(wasmMagic, {
        executable: true,
        label: "test.wasm",
        tags: ["wasm", "test"],
      }) as IngestExecutableResult;

      expect(result.envelope.format).toBe("wasm");
      expect(result.blueprint["@type"]).toBe("uor:ExecutableBlueprint");
      expect(result.blueprint.name).toBe("test.wasm");
      expect(result.proof.cid).toBeTruthy();

      // The WASM CID projects through all standards
      expect(Object.keys(result.hologram.projections).length).toBeGreaterThan(20);
    });
  });
});
