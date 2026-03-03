/**
 * Kernel Crystallization Tests
 * 
 * Verifies that q-mmu, q-sched, and q-fs operate correctly
 * using ONLY genesis/ axioms — zero external dependencies.
 */
import { describe, it, expect } from "vitest";
import { QMmu } from "../mm/q-mmu";
import { QSched } from "../kernel/q-sched";
import { QFs } from "../fs/q-fs";
import { encodeUtf8 } from "../../genesis/axiom-ring";

describe("Q-MMU (crystallized)", () => {
  it("stores content and returns a CID string", () => {
    const mmu = new QMmu();
    const content = encodeUtf8("hello hologram");
    const cid = mmu.store(content, 0);
    expect(typeof cid).toBe("string");
    expect(cid.startsWith("b")).toBe(true); // base32lower CID
  });

  it("deduplicates identical content", () => {
    const mmu = new QMmu();
    const content = encodeUtf8("same content");
    const cid1 = mmu.store(content, 0);
    const cid2 = mmu.store(content, 1);
    expect(cid1).toBe(cid2);
    expect(mmu.stats().dedupRatio).toBeGreaterThan(0);
  });

  it("loads stored content by CID", () => {
    const mmu = new QMmu();
    const content = encodeUtf8("test data");
    const cid = mmu.store(content, 0);
    const loaded = mmu.load(cid);
    expect(loaded).not.toBeNull();
    expect(loaded!.length).toBe(content.length);
  });

  it("returns null for unknown CID", () => {
    const mmu = new QMmu();
    expect(mmu.load("nonexistent")).toBeNull();
  });

  it("pin prevents eviction, unpin allows it", () => {
    const mmu = new QMmu();
    const cid = mmu.store(encodeUtf8("pinned"), 0);
    expect(mmu.pin(cid)).toBe(true);
    expect(mmu.lookup(cid)?.pinned).toBe(true);
    expect(mmu.unpin(cid)).toBe(true);
    expect(mmu.lookup(cid)?.pinned).toBe(false);
  });

  it("free moves to cold storage", () => {
    const mmu = new QMmu();
    const cid = mmu.store(encodeUtf8("to free"), 0);
    expect(mmu.free(cid)).toBe(true);
    expect(mmu.lookup(cid)).toBeNull(); // not in hot
    expect(mmu.exists(cid)).toBe(true); // still in cold
    // Load triggers page fault and promotes back
    const reloaded = mmu.load(cid);
    expect(reloaded).not.toBeNull();
  });
});

describe("Q-Sched (crystallized)", () => {
  it("registers genesis process at PID 0", () => {
    const sched = new QSched();
    const proc = sched.registerGenesis("genesis-cid");
    expect(proc.pid).toBe(0);
    expect(proc.hScore).toBe(1.0);
    expect(proc.zone).toBe("convergent");
    expect(proc.state).toBe("running");
  });

  it("forks a child process synchronously", () => {
    const sched = new QSched();
    sched.registerGenesis("genesis-cid");
    const child = sched.fork(0, "worker", 0.7);
    expect(child.pid).toBe(1);
    expect(child.parentPid).toBe(0);
    expect(child.hScore).toBe(0.7);
    expect(child.sessionCid).toBeTruthy();
  });

  it("schedules highest H-score process first", () => {
    const sched = new QSched();
    sched.registerGenesis("genesis-cid");
    sched.fork(0, "low", 0.3);
    sched.fork(0, "high", 0.9);
    
    // Genesis (H=1.0) should still be running
    const next = sched.schedule();
    expect(next).not.toBeNull();
    expect(next!.hScore).toBeGreaterThanOrEqual(0.9);
  });

  it("freezes and thaws a process synchronously", () => {
    const sched = new QSched();
    sched.registerGenesis("genesis-cid");
    const child = sched.fork(0, "freezable", 0.6);

    const frozenCid = sched.freeze(child.pid);
    expect(frozenCid).not.toBeNull();
    expect(typeof frozenCid).toBe("string");
    expect(child.state).toBe("frozen");

    expect(sched.thaw(child.pid)).toBe(true);
    expect(child.state).toBe("ready");
  });

  it("reports correct stats", () => {
    const sched = new QSched();
    sched.registerGenesis("genesis-cid");
    sched.fork(0, "a", 0.9);
    sched.fork(0, "b", 0.4);
    const stats = sched.stats();
    expect(stats.totalProcesses).toBe(3);
    expect(stats.zoneDistribution.convergent).toBeGreaterThanOrEqual(1);
  });
});

describe("Q-FS (crystallized)", () => {
  it("creates root filesystem synchronously", () => {
    const mmu = new QMmu();
    const fs = new QFs(mmu);
    const rootCid = fs.mkfs(0);
    expect(typeof rootCid).toBe("string");
    expect(fs.getRootCid()).toBe(rootCid);
  });

  it("creates and reads a file", () => {
    const mmu = new QMmu();
    const fs = new QFs(mmu);
    fs.mkfs(0);

    const content = encodeUtf8("hello world");
    const inode = fs.createFile("/", "hello.txt", content, 0);
    expect(inode.name).toBe("hello.txt");
    expect(inode.type).toBe("file");

    const read = fs.readFile("/hello.txt", 0);
    expect(read).not.toBeNull();
    expect(read!.length).toBe(content.length);
  });

  it("creates directories and lists contents", () => {
    const mmu = new QMmu();
    const fs = new QFs(mmu);
    fs.mkfs(0);

    fs.mkdir("/", "docs", 0);
    fs.createFile("/docs", "readme.md", encodeUtf8("# Hello"), 0);

    const listing = fs.ls("/");
    expect(listing.length).toBe(1);
    expect(listing[0].name).toBe("docs");

    const docsListing = fs.ls("/docs");
    expect(docsListing.length).toBe(1);
    expect(docsListing[0].name).toBe("readme.md");
  });

  it("removes files", () => {
    const mmu = new QMmu();
    const fs = new QFs(mmu);
    fs.mkfs(0);

    fs.createFile("/", "temp.txt", encodeUtf8("temp"), 0);
    expect(fs.stat("/temp.txt")).not.toBeNull();
    expect(fs.rm("/temp.txt", 0)).toBe(true);
    expect(fs.stat("/temp.txt")).toBeNull();
  });

  it("fsck passes on a healthy filesystem", () => {
    const mmu = new QMmu();
    const fs = new QFs(mmu);
    fs.mkfs(0);
    fs.createFile("/", "test.txt", encodeUtf8("data"), 0);

    const result = fs.fsck();
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it("journal records all operations", () => {
    const mmu = new QMmu();
    const fs = new QFs(mmu);
    fs.mkfs(0);
    fs.mkdir("/", "src", 0);
    fs.createFile("/src", "main.ts", encodeUtf8("code"), 0);

    const journal = fs.getJournal();
    expect(journal.length).toBe(3); // mount + mkdir + create
    expect(journal[0].operation).toBe("mount");
    expect(journal[1].operation).toBe("mkdir");
    expect(journal[2].operation).toBe("create");
    // Hash chain: entries after first should have prevEntryCid
    expect(journal[1].prevEntryCid).not.toBeNull();
  });
});
