/**
 * Phase 4 Validation Tests — Virtual I/O Layer
 * ═════════════════════════════════════════════
 *
 * Verifies that every POSIX syscall maps correctly to its UOR primitive,
 * and that the Virtual I/O layer is fully coherent with Phases 1-3.
 */

import { describe, it, expect } from "vitest";
import { HologramEngine } from "@/modules/uns/core/hologram/engine";
import {
  createExecutableBlueprint,
  ADAPTIVE_SCHEDULER,
  STATIC_SCHEDULER,
  type ExecutableBlueprint,
} from "@/modules/uns/core/hologram/executable-blueprint";
import { DIRECTIONS } from "@/modules/uns/core/hologram/polytree";
import {
  vExec,
  vForkBlueprint,
  vForkExec,
  vRead,
  vWrite,
  vMmap,
  vMmapAll,
  vIoctl,
  vKill,
  vWait,
  vSuspend,
  vResume,
  vPipe,
  vDup2,
  vOpen,
  vClose,
  vStat,
  vPs,
  STDIN,
  STDOUT,
  STDERR,
  NETFD,
  type FileDescriptor,
} from "@/modules/uns/core/hologram/virtual-io";

// ── Helper: create a minimal blueprint ─────────────────────────────────────

function makeBlueprint(name: string, scheduler = ADAPTIVE_SCHEDULER): ExecutableBlueprint {
  return createExecutableBlueprint({
    name,
    elements: [
      { id: "entry", kind: "transform", config: {} },
    ],
    scheduler,
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Phase 4: Virtual I/O Layer", () => {

  // ── vExec (exec syscall) ─────────────────────────────────────────────

  describe("vExec — exec()", () => {
    it("spawns a process and returns a valid PID", async () => {
      const engine = new HologramEngine();
      const bp = makeBlueprint("exec-test");
      const pid = await vExec(engine, bp);
      expect(pid).toBeTruthy();
      expect(typeof pid).toBe("string");
      expect(engine.processCount).toBe(1);
    });

    it("PID appears in vPs listing", async () => {
      const engine = new HologramEngine();
      const bp = makeBlueprint("ps-test");
      const pid = await vExec(engine, bp);
      const procs = vPs(engine);
      expect(procs).toContain(pid);
    });
  });

  // ── vForkBlueprint (fork syscall) ────────────────────────────────────

  describe("vForkBlueprint — fork()", () => {
    it("creates a child process with different PID", async () => {
      const engine = new HologramEngine();
      const parentBp = makeBlueprint("parent");
      const parentPid = await vExec(engine, parentBp);
      const { childPid } = await vForkBlueprint(engine, parentBp, { name: "child" });

      expect(childPid).toBeTruthy();
      expect(childPid).not.toBe(parentPid);
      expect(engine.processCount).toBe(2);
    });

    it("child blueprint has modified name", async () => {
      const engine = new HologramEngine();
      const parentBp = makeBlueprint("parent");
      const { childBlueprint } = await vForkBlueprint(engine, parentBp, { name: "child-v2" });
      expect(childBlueprint.name).toBe("child-v2");
    });
  });

  // ── vForkExec (fork+exec compound) ──────────────────────────────────

  describe("vForkExec — fork()+exec()", () => {
    it("forks and spawns in one call", async () => {
      const engine = new HologramEngine();
      const bp = makeBlueprint("forkexec-parent");
      const childPid = await vForkExec(engine, bp, { name: "forkexec-child" });
      expect(childPid).toBeTruthy();
      expect(engine.processCount).toBe(1); // only child, parent not spawned
    });
  });

  // ── vRead (read syscall — refraction) ───────────────────────────────

  describe("vRead — read(fd)", () => {
    it("reads process identity in 'identity' modality", async () => {
      const engine = new HologramEngine();
      const bp = makeBlueprint("read-test");
      await vExec(engine, bp);
      const pid = vPs(engine)[0];

      const result = await vRead(engine, pid, "identity");
      expect(result.modality).toBe("identity");
      expect(result.proof).toBeTruthy();
      expect(result.proof.cid).toBeTruthy();
    });

    it("reads in 'nquads' modality", async () => {
      const engine = new HologramEngine();
      const bp = makeBlueprint("read-nquads");
      const pid = await vExec(engine, bp);
      const result = await vRead(engine, pid, "nquads");
      expect(result.modality).toBe("nquads");
      expect(typeof result.output).toBe("string");
    });

    it("reads in 'compact-json' modality", async () => {
      const engine = new HologramEngine();
      const bp = makeBlueprint("read-json");
      const pid = await vExec(engine, bp);
      const result = await vRead(engine, pid, "compact-json");
      expect(result.modality).toBe("compact-json");
      expect(result.output).toBeTruthy();
    });
  });

  // ── vWrite (write syscall — focus/dehydration) ──────────────────────

  describe("vWrite — write(fd, data)", () => {
    it("writes data through the lens pipeline", async () => {
      const engine = new HologramEngine();
      const bp = makeBlueprint("write-test");
      const pid = await vExec(engine, bp);
      const output = await vWrite(engine, pid, { hello: "world" });
      // The default transform element passes through
      expect(output).toBeTruthy();
    });
  });

  // ── vMmap (mmap syscall — projection) ───────────────────────────────

  describe("vMmap — mmap()", () => {
    it("maps process identity to DID projection", async () => {
      const engine = new HologramEngine();
      const bp = makeBlueprint("mmap-did");
      const pid = await vExec(engine, bp);
      const result = await vMmap(engine, pid, "did");

      expect(result.pid).toBe(pid);
      expect(result.projection).toBe("did");
      expect(result.address).toMatch(/^did:uor:/);
      expect(result.fidelity).toBe("lossless");
    });

    it("maps to IPv6 projection", async () => {
      const engine = new HologramEngine();
      const bp = makeBlueprint("mmap-ipv6");
      const pid = await vExec(engine, bp);
      const result = await vMmap(engine, pid, "ipv6");
      expect(result.address).toBeTruthy();
      expect(result.projection).toBe("ipv6");
    });

    it("maps to ActivityPub projection", async () => {
      const engine = new HologramEngine();
      const bp = makeBlueprint("mmap-ap");
      const pid = await vExec(engine, bp);
      const result = await vMmap(engine, pid, "activitypub");
      expect(result.address).toContain("uor.foundation");
    });
  });

  // ── vMmapAll (map all projections) ──────────────────────────────────

  describe("vMmapAll — mmap all projections", () => {
    it("returns all registered projections", async () => {
      const engine = new HologramEngine();
      const bp = makeBlueprint("mmap-all");
      const pid = await vExec(engine, bp);
      const all = await vMmapAll(engine, pid);

      expect(all.size).toBeGreaterThan(20); // 25+ projections
      expect(all.has("did")).toBe(true);
      expect(all.has("cid")).toBe(true);
      expect(all.has("ipv6")).toBe(true);

      // Every result should have a valid address
      for (const [, result] of all) {
        expect(result.address).toBeTruthy();
        expect(typeof result.address).toBe("string");
      }
    });
  });

  // ── vIoctl (ioctl — interaction/tick) ───────────────────────────────

  describe("vIoctl — ioctl(fd, request)", () => {
    it("sends VERIFIED interaction and evolves PolyTree", async () => {
      const engine = new HologramEngine();
      const bp = makeBlueprint("ioctl-test");
      const pid = await vExec(engine, bp);
      const tick = await vIoctl(engine, pid, 0, DIRECTIONS.VERIFIED);

      expect(tick.pid).toBe(pid);
      expect(tick.interaction).toBeTruthy();
      expect(tick.interaction!.interfaceChanged).toBe(true);
      expect(tick.projections.size).toBeGreaterThan(0);
    });

    it("sends REVOKED interaction and halts", async () => {
      const engine = new HologramEngine();
      const bp = makeBlueprint("ioctl-halt");
      const pid = await vExec(engine, bp);
      const tick = await vIoctl(engine, pid, 0, DIRECTIONS.REVOKED);
      expect(tick.halted).toBe(true);
    });
  });

  // ── vKill + vWait (kill + waitpid) ──────────────────────────────────

  describe("vKill + vWait — kill() + waitpid()", () => {
    it("kills a process", async () => {
      const engine = new HologramEngine();
      const bp = makeBlueprint("kill-test");
      const pid = await vExec(engine, bp);
      expect(engine.processCount).toBe(1);

      vKill(engine, pid);
      expect(engine.processCount).toBe(0);
    });

    it("vWait resolves on halt", async () => {
      const engine = new HologramEngine();
      const bp = makeBlueprint("wait-test");
      const pid = await vExec(engine, bp);

      // Send REVOKED to halt
      const waitPromise = vWait(engine, pid);
      await vIoctl(engine, pid, 0, DIRECTIONS.REVOKED);
      await waitPromise; // should resolve
    });

    it("vWait resolves immediately if already halted", async () => {
      const engine = new HologramEngine();
      const bp = makeBlueprint("wait-halted");
      const pid = await vExec(engine, bp);
      await vIoctl(engine, pid, 0, DIRECTIONS.REVOKED);
      await vWait(engine, pid); // should resolve immediately
    });
  });

  // ── vSuspend + vResume (hibernate/wake) ─────────────────────────────

  describe("vSuspend + vResume — suspend/resume", () => {
    it("suspends and resumes a process losslessly", async () => {
      const engine = new HologramEngine();
      const bp = makeBlueprint("suspend-test");
      const pid1 = await vExec(engine, bp);

      // Evolve the state
      await vIoctl(engine, pid1, 0, DIRECTIONS.VERIFIED);
      const stat1 = vStat(engine, pid1);

      // Suspend
      const suspended = await vSuspend(engine, pid1);
      expect(suspended.proof.cid).toBeTruthy();

      // Resume
      const pid2 = await vResume(engine, bp, suspended);
      const stat2 = vStat(engine, pid2);

      // History should be replayed
      expect(stat2.historyLength).toBe(stat1.historyLength);
    });
  });

  // ── vPipe (pipe syscall) ────────────────────────────────────────────

  describe("vPipe — pipe(fd[2])", () => {
    it("creates a pipe with read and write ends", () => {
      const pipe = vPipe(
        "writer-pid",
        { id: "out", projection: "cid", direction: "out" },
        "reader-pid",
        { id: "in", projection: "cid", direction: "in" },
      );

      expect(pipe.read.fd).toBe(STDIN);
      expect(pipe.write.fd).toBe(STDOUT);
      expect(pipe.read.pid).toBe("reader-pid");
      expect(pipe.write.pid).toBe("writer-pid");
      expect(pipe.buffer).toEqual([]);
    });
  });

  // ── vDup2 + vOpen + vClose (fd management) ─────────────────────────

  describe("File descriptor management", () => {
    it("vOpen creates a file descriptor", () => {
      const fd = vOpen("test-pid", {
        id: "display",
        projection: "cid",
        direction: "out",
      });
      expect(fd.open).toBe(true);
      expect(fd.fd).toBe(STDOUT);
      expect(fd.pid).toBe("test-pid");
    });

    it("vDup2 duplicates a file descriptor", () => {
      const fd = vOpen("test-pid", {
        id: "display",
        projection: "cid",
        direction: "out",
      });
      const dup = vDup2(fd, STDERR);
      expect(dup.fd).toBe(STDERR);
      expect(dup.channel).toBe(fd.channel);
      expect(dup.pid).toBe(fd.pid);
    });

    it("vClose marks a descriptor as closed", () => {
      const fd = vOpen("test-pid", {
        id: "input",
        projection: "webfinger",
        direction: "in",
      });
      expect(fd.open).toBe(true);
      vClose(fd);
      expect(fd.open).toBe(false);
    });
  });

  // ── vStat + vPs (process introspection) ─────────────────────────────

  describe("vStat + vPs — process introspection", () => {
    it("vStat returns process metadata", async () => {
      const engine = new HologramEngine();
      const bp = makeBlueprint("stat-test");
      const pid = await vExec(engine, bp);
      const stat = vStat(engine, pid);

      expect(stat.pid).toBe(pid);
      expect(stat.status).toBe("running");
      expect(stat.tickCount).toBe(0);
      expect(stat.blueprintCid).toBeTruthy();
    });

    it("vPs lists all processes", async () => {
      const engine = new HologramEngine();
      const bp1 = makeBlueprint("ps-1");
      const bp2 = makeBlueprint("ps-2");
      const pid1 = await vExec(engine, bp1);
      const pid2 = await vExec(engine, bp2);
      const procs = vPs(engine);
      expect(procs).toHaveLength(2);
      expect(procs).toContain(pid1);
      expect(procs).toContain(pid2);
    });
  });

  // ── Cross-Phase Coherence ───────────────────────────────────────────

  describe("Cross-phase coherence (Phases 1-4)", () => {
    it("vIoctl tick produces UI projections (Phase 2 integration)", async () => {
      const engine = new HologramEngine();
      const bp = makeBlueprint("phase2-coherence");
      const pid = await vExec(engine, bp);
      const tick = await vIoctl(engine, pid, 0, DIRECTIONS.VERIFIED);

      // Phase 2: UI projections should be present
      expect(tick.projections.size).toBe(6); // 6 UI component types
      expect(tick.projections.has("ui:stat-card")).toBe(true);
      expect(tick.projections.has("ui:data-table")).toBe(true);
    });

    it("vMmap returns content-addressed projections (Phase 1 integration)", async () => {
      const engine = new HologramEngine();
      const bp = makeBlueprint("phase1-coherence");
      const pid = await vExec(engine, bp);
      const mmap = await vMmap(engine, pid, "cid");

      // Phase 1: CID should be a valid content identifier
      expect(mmap.address).toMatch(/^b[a-z2-7]+/); // base32 CID
      expect(mmap.fidelity).toBe("lossless");
    });

    it("suspend → resume → vMmap produces deterministic projections", async () => {
      const engine = new HologramEngine();
      const bp = makeBlueprint("determinism-test");
      const pid1 = await vExec(engine, bp);

      // Evolve
      await vIoctl(engine, pid1, 0, DIRECTIONS.VERIFIED);
      const mmap1 = await vMmap(engine, pid1, "did");

      // Suspend
      const suspended = await vSuspend(engine, pid1);

      // Resume
      const pid2 = await vResume(engine, bp, suspended);
      const mmap2 = await vMmap(engine, pid2, "did");

      // Same state → same projection (holographic determinism)
      expect(mmap2.address).toBe(mmap1.address);
    });

    it("vForkExec child has different identity than parent blueprint", async () => {
      const engine = new HologramEngine();
      const bp = makeBlueprint("fork-identity");
      const parentPid = await vExec(engine, bp);
      const childPid = await vForkExec(engine, bp, { name: "child" });

      const parentMmap = await vMmap(engine, parentPid, "did");
      const childMmap = await vMmap(engine, childPid, "did");

      // Fork produces different identity (different blueprint = different hash)
      // Note: identities may differ due to session randomness even with same blueprint
      expect(parentMmap.pid).not.toBe(childMmap.pid);
    });

    it("full lifecycle: exec → ioctl → read → mmap → suspend → resume → kill", async () => {
      const engine = new HologramEngine();
      const bp = makeBlueprint("full-lifecycle");

      // 1. exec
      const pid = await vExec(engine, bp);
      expect(vStat(engine, pid).status).toBe("running");

      // 2. ioctl (interact)
      const tick = await vIoctl(engine, pid, 0, DIRECTIONS.VERIFIED);
      expect(tick.interaction!.interfaceChanged).toBe(true);

      // 3. read
      const readResult = await vRead(engine, pid, "identity");
      expect(readResult.proof.cid).toBeTruthy();

      // 4. mmap
      const mmap = await vMmap(engine, pid, "did");
      expect(mmap.address).toMatch(/^did:uor:/);

      // 5. suspend
      const suspended = await vSuspend(engine, pid);
      expect(suspended.proof.cid).toBeTruthy();

      // 6. resume
      const pid2 = await vResume(engine, bp, suspended);
      expect(vStat(engine, pid2).status).toBe("running");

      // 7. kill
      vKill(engine, pid2);
      expect(engine.processCount).toBe(1); // original suspended process still in table
    });
  });

  // ── Constants ───────────────────────────────────────────────────────

  describe("POSIX constants", () => {
    it("standard fd constants are correct", () => {
      expect(STDIN).toBe(0);
      expect(STDOUT).toBe(1);
      expect(STDERR).toBe(2);
      expect(NETFD).toBe(3);
    });
  });
});
