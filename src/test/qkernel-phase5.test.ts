/**
 * Q-Driver — Phase 5 Tests
 * ════════════════════════
 *
 * Block device abstraction: backends, I/O, mount/unmount, caching.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { QMmu } from "@/modules/qkernel/q-mmu";
import { QFs } from "@/modules/qkernel/q-fs";
import {
  QDriver,
  BlockDevice,
  MemoryBackend,
  type IoResult,
  type DriverStats,
} from "@/modules/qkernel/q-driver";

describe("Q-Driver — Phase 5: Block Device Abstraction", () => {
  let mmu: QMmu;
  let fs: QFs;
  let driver: QDriver;

  beforeEach(async () => {
    mmu = new QMmu();
    fs = new QFs(mmu);
    await fs.mkfs(0);
    driver = new QDriver(mmu, fs);
  });

  // ── Backend Tests ─────────────────────────────────────────────

  describe("MemoryBackend", () => {
    it("read/write/delete cycle", async () => {
      const backend = new MemoryBackend();
      const data = new TextEncoder().encode("hello q-driver");
      await backend.write("test-cid", data);
      expect(await backend.exists("test-cid")).toBe(true);

      const read = await backend.read("test-cid");
      expect(read).not.toBeNull();
      expect(new TextDecoder().decode(read!)).toBe("hello q-driver");

      await backend.delete("test-cid");
      expect(await backend.exists("test-cid")).toBe(false);
    });

    it("list returns all keys", async () => {
      const backend = new MemoryBackend();
      await backend.write("a", new Uint8Array([1]));
      await backend.write("b", new Uint8Array([2]));
      const keys = await backend.list();
      expect(keys.sort()).toEqual(["a", "b"]);
    });
  });

  // ── BlockDevice Tests ─────────────────────────────────────────

  describe("BlockDevice", () => {
    it("initializes and goes online", async () => {
      const dev = new BlockDevice("ram0", new MemoryBackend());
      expect(dev.state).toBe("uninitialized");
      await dev.init();
      expect(dev.state).toBe("online");
    });

    it("read-only device rejects writes", async () => {
      const dev = new BlockDevice("rom0", new MemoryBackend(), { readOnly: true });
      await dev.init();
      expect(dev.state).toBe("readonly");

      const result = await dev.writeSector(new Uint8Array([1, 2, 3]), mmu, 0);
      expect(result.ok).toBe(false);
      expect(result.error).toContain("readonly");
    });

    it("capacity limit enforced", async () => {
      const dev = new BlockDevice("small0", new MemoryBackend(), { capacity: 10 });
      await dev.init();

      const r1 = await dev.writeSector(new Uint8Array(8), mmu, 0);
      expect(r1.ok).toBe(true);

      const r2 = await dev.writeSector(new Uint8Array(8), mmu, 0);
      expect(r2.ok).toBe(false);
      expect(r2.error).toContain("full");
    });

    it("write returns CID via MMU", async () => {
      const dev = new BlockDevice("ram0", new MemoryBackend());
      await dev.init();

      const data = new TextEncoder().encode("content-addressed block");
      const result = await dev.writeSector(data, mmu, 0);
      expect(result.ok).toBe(true);
      expect(result.cid).toBeTruthy();
      expect(result.bytesTransferred).toBe(data.byteLength);

      // Verify data is in backend
      const read = await dev.readSector(result.cid!);
      expect(read).not.toBeNull();
    });

    it("eject prevents further I/O", async () => {
      const dev = new BlockDevice("ram0", new MemoryBackend());
      await dev.init();
      dev.eject();
      expect(dev.state).toBe("ejected");
      expect(await dev.readSector("any")).toBeNull();
    });
  });

  // ── QDriver Tests ─────────────────────────────────────────────

  describe("QDriver — Device Manager", () => {
    it("attach and detach devices", async () => {
      const dev = new BlockDevice("ram0", new MemoryBackend());
      const ok = await driver.attach(dev);
      expect(ok).toBe(true);
      expect(driver.allDevices()).toHaveLength(1);
      expect(driver.allDevices()[0].state).toBe("online");

      driver.detach(dev.id);
      expect(driver.allDevices()).toHaveLength(0);
    });

    it("mount device to filesystem path", async () => {
      const dev = new BlockDevice("ram0", new MemoryBackend());
      await driver.attach(dev);

      const mounted = await driver.mount(dev.id, "/mnt/ram", 0);
      expect(mounted).toBe(true);
      expect(dev.mountPath).toBe("/mnt/ram");

      const byPath = driver.getDeviceByPath("/mnt/ram");
      expect(byPath).toBeDefined();
      expect(byPath!.id).toBe(dev.id);
    });

    it("cannot mount already-mounted device", async () => {
      const dev = new BlockDevice("ram0", new MemoryBackend());
      await driver.attach(dev);
      await driver.mount(dev.id, "/mnt/a", 0);
      const again = await driver.mount(dev.id, "/mnt/b", 0);
      expect(again).toBe(false);
    });

    it("unmount clears mount path", async () => {
      const dev = new BlockDevice("ram0", new MemoryBackend());
      await driver.attach(dev);
      await driver.mount(dev.id, "/mnt/ram", 0);
      driver.unmount(dev.id);
      expect(dev.mountPath).toBeNull();
    });

    it("read/write through driver with MMU caching", async () => {
      const dev = new BlockDevice("ram0", new MemoryBackend());
      await driver.attach(dev);

      const data = new TextEncoder().encode("driver-level write");
      const result = await driver.write(dev.id, data, 0);
      expect(result.ok).toBe(true);

      // Read back — should hit MMU cache
      const read = await driver.read(dev.id, result.cid!);
      expect(read).not.toBeNull();
      expect(new TextDecoder().decode(read!)).toBe("driver-level write");
    });

    it("event log tracks lifecycle", async () => {
      const dev = new BlockDevice("ram0", new MemoryBackend());
      await driver.attach(dev);
      await driver.mount(dev.id, "/mnt/ram", 0);
      driver.unmount(dev.id);
      driver.detach(dev.id);

      const events = driver.getEventLog();
      expect(events.map(e => e.type)).toEqual(["attach", "mount", "unmount", "detach"]);
    });

    it("event listener receives events", async () => {
      const received: string[] = [];
      driver.onEvent(e => received.push(e.type));

      const dev = new BlockDevice("ram0", new MemoryBackend());
      await driver.attach(dev);
      driver.detach(dev.id);

      expect(received).toEqual(["attach", "detach"]);
    });

    it("stats tracks backends and I/O", async () => {
      const dev1 = new BlockDevice("ram0", new MemoryBackend());
      const dev2 = new BlockDevice("ram1", new MemoryBackend());
      await driver.attach(dev1);
      await driver.attach(dev2);
      await driver.mount(dev1.id, "/mnt/a", 0);

      const data = new TextEncoder().encode("stats test");
      await driver.write(dev1.id, data, 0);

      const st = driver.stats();
      expect(st.totalDevices).toBe(2);
      expect(st.onlineDevices).toBe(2);
      expect(st.mountedDevices).toBe(1);
      expect(st.totalWrites).toBe(1);
      expect(st.backends.memory).toBe(2);
    });

    it("multiple backends coexist", async () => {
      const ram = new BlockDevice("ram0", new MemoryBackend());
      const ram2 = new BlockDevice("ram1", new MemoryBackend());
      await driver.attach(ram);
      await driver.attach(ram2);

      // Write to each
      const d1 = new TextEncoder().encode("device-1");
      const d2 = new TextEncoder().encode("device-2");
      const r1 = await driver.write(ram.id, d1, 0);
      const r2 = await driver.write(ram2.id, d2, 0);

      expect(r1.ok).toBe(true);
      expect(r2.ok).toBe(true);
      expect(r1.cid).not.toBe(r2.cid); // different content = different CID
    });

    it("sync is a no-op but succeeds", async () => {
      const dev = new BlockDevice("ram0", new MemoryBackend());
      await driver.attach(dev);
      expect(await driver.sync(dev.id)).toBe(true);
      expect(await driver.sync("nonexistent")).toBe(false);
    });
  });
});
