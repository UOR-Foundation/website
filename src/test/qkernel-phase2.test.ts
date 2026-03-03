/**
 * Q-Syscall + Q-FS Test Suite
 * ═══════════════════════════
 *
 * Verifies Phase 2 of the Q-Linux kernel:
 *   Syscall trap table (typed morphisms) + Merkle DAG filesystem
 */

import { describe, it, expect, beforeEach } from "vitest";
import { QMmu } from "@/hologram/kernel/q-mmu";
import { QSyscall, STANDARD_MODALITIES } from "@/hologram/kernel/q-syscall";
import type { LensBlueprint } from "@/hologram/kernel/q-syscall";
import { QFs } from "@/hologram/kernel/q-fs";

// ═══════════════════════════════════════════════════════════════════════
// Phase 2a: Q-Syscall
// ═══════════════════════════════════════════════════════════════════════

describe("Q-Syscall: Trap Table", () => {
  let mmu: QMmu;
  let syscall: QSyscall;

  beforeEach(() => {
    mmu = new QMmu();
    syscall = new QSyscall(mmu);
  });

  it("has 7 trap table entries", () => {
    expect(syscall.getTrapTable()).toHaveLength(7);
  });

  it("each entry has a morphism type", () => {
    for (const entry of syscall.getTrapTable()) {
      expect(entry.morphism).toBeTruthy();
      expect(entry.name).toBeTruthy();
    }
  });
});

describe("Q-Syscall: focus (read)", () => {
  let mmu: QMmu;
  let syscall: QSyscall;

  beforeEach(() => {
    mmu = new QMmu();
    syscall = new QSyscall(mmu);
  });

  it("dehydrates object to CID", async () => {
    const result = await syscall.focus({ hello: "world" }, 0);
    expect(result.success).toBe(true);
    expect(result.morphism).toBe("morphism:Isometry");
    expect(result.result.cid.length).toBeGreaterThan(10);
  });

  it("same content produces same CID (dedup)", async () => {
    const r1 = await syscall.focus({ a: 1 }, 0);
    const r2 = await syscall.focus({ a: 1 }, 1);
    expect(r1.result.cid).toBe(r2.result.cid);
  });

  it("different content produces different CID", async () => {
    const r1 = await syscall.focus({ a: 1 }, 0);
    const r2 = await syscall.focus({ a: 2 }, 0);
    expect(r1.result.cid).not.toBe(r2.result.cid);
  });
});

describe("Q-Syscall: refract (write)", () => {
  let mmu: QMmu;
  let syscall: QSyscall;

  beforeEach(() => {
    mmu = new QMmu();
    syscall = new QSyscall(mmu);
  });

  it("rehydrates to identity modality", async () => {
    const focused = await syscall.focus({ name: "test" }, 0);
    const refracted = await syscall.refract(focused.result.cid, "identity", 0);
    expect(refracted.success).toBe(true);
    expect(refracted.morphism).toBe("morphism:Transform");
    expect(refracted.result.content).toContain("test");
  });

  it("rehydrates to N-Quads modality", async () => {
    const focused = await syscall.focus({ name: "quantum" }, 0);
    const refracted = await syscall.refract(focused.result.cid, "nquads", 0);
    expect(refracted.success).toBe(true);
    expect(refracted.result.content).toContain("urn:uor:");
    expect(refracted.result.content).toContain("quantum");
  });

  it("fails gracefully for missing CID", async () => {
    const result = await syscall.refract("nonexistent-cid", "identity", 0);
    expect(result.success).toBe(false);
  });
});

describe("Q-Syscall: resolve (open)", () => {
  let mmu: QMmu;
  let syscall: QSyscall;

  beforeEach(() => {
    mmu = new QMmu();
    syscall = new QSyscall(mmu);
  });

  it("finds stored CID", async () => {
    const focused = await syscall.focus("data", 0);
    const resolved = syscall.resolve(focused.result.cid, 0);
    expect(resolved.success).toBe(true);
    expect(resolved.result.found).toBe(true);
    expect(resolved.result.tier).toBe("hot");
  });

  it("reports missing CID", () => {
    const resolved = syscall.resolve("nonexistent", 0);
    expect(resolved.success).toBe(false);
    expect(resolved.result.found).toBe(false);
  });
});

describe("Q-Syscall: compileLens (exec)", () => {
  let mmu: QMmu;
  let syscall: QSyscall;
  const blueprint: LensBlueprint = {
    name: "test-lens",
    version: "1.0",
    modalities: ["identity", "nquads"],
    pipeline: [
      { name: "focus", morphism: "morphism:Isometry" },
      { name: "transform", morphism: "morphism:Transform" },
    ],
  };

  beforeEach(() => {
    mmu = new QMmu();
    syscall = new QSyscall(mmu);
  });

  it("compiles a lens from blueprint", async () => {
    const result = await syscall.compileLens(blueprint, 0);
    expect(result.success).toBe(true);
    expect(result.result.compiled).toBe(true);
    expect(result.result.lensId.length).toBe(16);
  });

  it("compiled lens is retrievable by ID", async () => {
    const result = await syscall.compileLens(blueprint, 0);
    const lens = syscall.getLens(result.result.lensId);
    expect(lens).toBeDefined();
    expect(lens!.modalities).toEqual(["identity", "nquads"]);
  });
});

describe("Q-Syscall: project (ioctl)", () => {
  let mmu: QMmu;
  let syscall: QSyscall;

  beforeEach(() => {
    mmu = new QMmu();
    syscall = new QSyscall(mmu);
  });

  it("projects to IPv6", async () => {
    const focused = await syscall.focus({ id: "test" }, 0);
    const projected = await syscall.project(focused.result.cid, "ipv6", 0);
    expect(projected.success).toBe(true);
    expect(projected.result.projection).toMatch(/^fd00:0075:6f72:/);
  });

  it("projects to DID", async () => {
    const focused = await syscall.focus({ id: "agent-1" }, 0);
    const projected = await syscall.project(focused.result.cid, "did", 0);
    expect(projected.success).toBe(true);
    expect(projected.result.projection).toMatch(/^did:uor:/);
  });

  it("projects to URN", async () => {
    const focused = await syscall.focus({ id: "datum" }, 0);
    const projected = await syscall.project(focused.result.cid, "urn", 0);
    expect(projected.success).toBe(true);
    expect(projected.result.projection).toMatch(/^urn:uor:derivation:sha256:/);
  });
});

describe("Q-Syscall: forkBlueprint (clone)", () => {
  let mmu: QMmu;
  let syscall: QSyscall;
  const blueprint: LensBlueprint = {
    name: "parent-lens",
    version: "1.0",
    modalities: ["identity"],
    pipeline: [{ name: "pass", morphism: "morphism:Isometry" }],
  };

  beforeEach(() => {
    mmu = new QMmu();
    syscall = new QSyscall(mmu);
  });

  it("forks blueprint with new name and CID", async () => {
    const result = await syscall.forkBlueprint(blueprint, "child-lens", 0);
    expect(result.success).toBe(true);
    expect(result.result.forkedBlueprint.name).toBe("child-lens");
    expect(result.result.forkedBlueprint.version).toBe("1.0-fork");
    expect(result.result.original).not.toBe(result.result.forked);
  });
});

describe("Q-Syscall: statistics", () => {
  it("tracks call counts by type and morphism", async () => {
    const mmu = new QMmu();
    const syscall = new QSyscall(mmu);

    await syscall.focus("a", 0);
    await syscall.focus("b", 0);
    syscall.resolve("x", 0);

    const stats = syscall.stats();
    expect(stats.totalCalls).toBe(3);
    expect(stats.callsByType["focus"]).toBe(2);
    expect(stats.callsByType["resolve"]).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Phase 2b: Q-FS
// ═══════════════════════════════════════════════════════════════════════

describe("Q-FS: Initialization", () => {
  it("creates root filesystem", async () => {
    const mmu = new QMmu();
    const fs = new QFs(mmu);
    const rootCid = await fs.mkfs(0);
    expect(rootCid.length).toBeGreaterThan(10);
    expect(fs.getRootCid()).toBe(rootCid);
  });
});

describe("Q-FS: File Operations", () => {
  let mmu: QMmu;
  let fs: QFs;

  beforeEach(async () => {
    mmu = new QMmu();
    fs = new QFs(mmu);
    await fs.mkfs(0);
  });

  it("creates and reads a file", async () => {
    const content = new TextEncoder().encode("hello quantum fs");
    await fs.createFile("/", "hello.txt", content, 0);

    const read = fs.readFile("/hello.txt", 0);
    expect(read).not.toBeNull();
    expect(new TextDecoder().decode(read!)).toBe("hello quantum fs");
  });

  it("stat returns file metadata", async () => {
    const content = new TextEncoder().encode("metadata test");
    await fs.createFile("/", "meta.txt", content, 0);

    const inode = fs.stat("/meta.txt");
    expect(inode).not.toBeNull();
    expect(inode!.type).toBe("file");
    expect(inode!.name).toBe("meta.txt");
    expect(inode!.size).toBe(content.byteLength);
  });

  it("overwrites file content (new CID)", async () => {
    const v1 = new TextEncoder().encode("version 1");
    await fs.createFile("/", "doc.txt", v1, 0);

    const v2 = new TextEncoder().encode("version 2");
    const updated = await fs.writeFile("/doc.txt", v2, 0);
    expect(updated).not.toBeNull();

    const read = fs.readFile("/doc.txt", 0);
    expect(new TextDecoder().decode(read!)).toBe("version 2");
  });

  it("deletes a file", async () => {
    const content = new TextEncoder().encode("deletable");
    await fs.createFile("/", "temp.txt", content, 0);
    expect(fs.stat("/temp.txt")).not.toBeNull();

    const deleted = await fs.rm("/temp.txt", 0);
    expect(deleted).toBe(true);
    expect(fs.stat("/temp.txt")).toBeNull();
  });
});

describe("Q-FS: Directory Operations", () => {
  let mmu: QMmu;
  let fs: QFs;

  beforeEach(async () => {
    mmu = new QMmu();
    fs = new QFs(mmu);
    await fs.mkfs(0);
  });

  it("creates a subdirectory", async () => {
    await fs.mkdir("/", "etc", 0);
    const inode = fs.stat("/etc");
    expect(inode).not.toBeNull();
    expect(inode!.type).toBe("directory");
  });

  it("creates nested structure", async () => {
    await fs.mkdir("/", "home", 0);
    await fs.mkdir("/home", "user", 0);
    await fs.createFile("/home/user", "readme.md", new TextEncoder().encode("# Hello"), 0);

    const readme = fs.readFile("/home/user/readme.md", 0);
    expect(new TextDecoder().decode(readme!)).toBe("# Hello");
  });

  it("ls lists directory contents", async () => {
    await fs.createFile("/", "a.txt", new TextEncoder().encode("a"), 0);
    await fs.createFile("/", "b.txt", new TextEncoder().encode("b"), 0);
    await fs.mkdir("/", "subdir", 0);

    const entries = fs.ls("/");
    expect(entries.length).toBe(3);
    expect(entries.map(e => e.name).sort()).toEqual(["a.txt", "b.txt", "subdir"]);
  });

  it("refuses to delete non-empty directory", async () => {
    await fs.mkdir("/", "notempty", 0);
    await fs.createFile("/notempty", "file.txt", new TextEncoder().encode("x"), 0);
    const deleted = await fs.rm("/notempty", 0);
    expect(deleted).toBe(false);
  });
});

describe("Q-FS: Journal (Hash-Linked)", () => {
  it("records all operations", async () => {
    const mmu = new QMmu();
    const fs = new QFs(mmu);
    await fs.mkfs(0);
    await fs.mkdir("/", "logs", 0);
    await fs.createFile("/logs", "app.log", new TextEncoder().encode("log"), 0);

    const journal = fs.getJournal();
    expect(journal.length).toBe(3); // mount + mkdir + create
    expect(journal[0].operation).toBe("mount");
    expect(journal[1].operation).toBe("mkdir");
    expect(journal[2].operation).toBe("create");
  });

  it("journal entries are hash-linked", async () => {
    const mmu = new QMmu();
    const fs = new QFs(mmu);
    await fs.mkfs(0);
    await fs.mkdir("/", "a", 0);
    await fs.mkdir("/", "b", 0);

    const journal = fs.getJournal();
    expect(journal[0].prevEntryCid).toBeNull(); // first entry
    expect(journal[1].prevEntryCid).not.toBeNull(); // linked to first
    expect(journal[2].prevEntryCid).not.toBeNull(); // linked to second
  });
});

describe("Q-FS: Statistics", () => {
  it("tracks inode counts", async () => {
    const mmu = new QMmu();
    const fs = new QFs(mmu);
    await fs.mkfs(0);
    await fs.mkdir("/", "bin", 0);
    await fs.createFile("/", "kernel", new TextEncoder().encode("vmlinuz"), 0);
    await fs.createFile("/bin", "sh", new TextEncoder().encode("shell"), 0);

    const stats = fs.stats();
    expect(stats.totalInodes).toBe(4); // root + bin + kernel + sh
    expect(stats.totalFiles).toBe(2);
    expect(stats.totalDirectories).toBe(2);
    expect(stats.journalLength).toBe(4); // mount + mkdir + 2 creates
  });
});
