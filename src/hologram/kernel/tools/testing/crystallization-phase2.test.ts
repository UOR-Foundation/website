import { describe, it, expect } from "vitest";
import { QMmu } from "../mm/q-mmu";
import { QSched } from "../kernel/q-sched";
import { QFs } from "../fs/q-fs";
import { QSyscall } from "../kernel/q-syscall";
import { QNet } from "../net/q-net";
import { QIpc } from "../ipc/q-ipc";
import { QEcc } from "../crypto/q-ecc";
import { QSecurity } from "../security/q-security";
import { bootSync as boot } from "../init/q-boot";

describe("Crystallization Phase 2 — q-syscall, q-net, q-ipc, q-boot, q-driver, q-security", () => {
  const mmu = new QMmu();
  const fs = new QFs(mmu);

  it("q-boot: full boot sequence completes synchronously", () => {
    const kernel = boot();
    expect(kernel.stage).toBe("running");
    expect(kernel.post.allPassed).toBe(true);
    expect(kernel.hardware.verified).toBe(true);
    expect(kernel.firmware.triangleIdentitiesHold).toBe(true);
    expect(kernel.genesis.pid).toBe(0);
    expect(kernel.kernelCid).toMatch(/^b/);
  });

  it("q-syscall: focus + resolve are synchronous", () => {
    const syscall = new QSyscall(mmu);
    const result = syscall.focus({ hello: "world" }, 1);
    expect(result.success).toBe(true);
    expect(result.cid).toBeTruthy();

    const resolved = syscall.resolve(result.cid, 1);
    expect(resolved.result.found).toBe(true);
  });

  it("q-syscall: compileLens is synchronous", () => {
    const syscall = new QSyscall(mmu);
    const result = syscall.compileLens({
      name: "test", version: "1.0", modalities: ["identity"], pipeline: [],
    }, 1);
    expect(result.success).toBe(true);
    expect(result.result.compiled).toBe(true);
  });

  it("q-syscall: project produces protocol projections", () => {
    const syscall = new QSyscall(mmu);
    const stored = syscall.focus("test-data", 1);
    const projected = syscall.project(stored.cid, "did", 1);
    expect(projected.success).toBe(true);
    expect(projected.result.projection).toMatch(/^did:uor:/);
  });

  it("q-net: createSocket + send + receive are synchronous", () => {
    const net = new QNet();
    const sock = net.createSocket(1, 8080);
    expect(sock.ipv6).toMatch(/^fd00:/);

    const payload = new TextEncoder().encode("hello");
    const { delivered, envelope } = net.send("cidA", "cidB", payload, 0.9);
    expect(delivered).toBe(true);
    expect(envelope.envelopeId).toBeTruthy();

    const msgs = net.receive("cidB");
    expect(msgs).toHaveLength(1);
  });

  it("q-net: resolve is synchronous", () => {
    const net = new QNet();
    const ipv6 = net.resolve("some-cid");
    expect(ipv6).toMatch(/^fd00:0075:6f72:/);
  });

  it("q-ipc: createChannel + send + verifyChain are synchronous", () => {
    const ipc = new QIpc();
    const ch = ipc.createChannel("test", [1, 2]);
    expect(ch.channelCid).toBeTruthy();

    const r1 = ipc.send(ch.channelCid, 1, new TextEncoder().encode("msg1"), 0.8);
    expect(r1.sent).toBe(true);

    const r2 = ipc.send(ch.channelCid, 2, new TextEncoder().encode("msg2"), 0.9);
    expect(r2.sent).toBe(true);

    const chain = ipc.verifyChain(ch.channelCid);
    expect(chain.valid).toBe(true);
    expect(chain.length).toBe(2);
  });

  it("q-security: registerProcess + checkPermission are synchronous", () => {
    const ecc = new QEcc();
    const sec = new QSecurity(ecc);
    const cap = sec.registerProcess(1, 0);
    expect(cap.capCid).toBeTruthy();
    expect(sec.checkPermission(1, "read", "/any")).toBe(true);

    sec.registerProcess(99, 3);
    expect(sec.checkPermission(99, "write", "/foo")).toBe(false);
    expect(sec.checkPermission(99, "read", "/foo")).toBe(true);
  });

  it("q-security: authorizeSyscall with ECC verification", () => {
    const ecc = new QEcc();
    const sec = new QSecurity(ecc);
    sec.registerProcess(1, 0);
    const auth = sec.authorizeSyscall(1, "read", "/test");
    expect(auth.authorized).toBe(true);
    expect(auth.eccVerified).toBe(true);
  });

  it("q-security: elevation is synchronous", () => {
    const ecc = new QEcc();
    const sec = new QSecurity(ecc);
    sec.registerProcess(5, 3);
    const elev = sec.requestElevation(5, 1, "need driver access");
    expect(elev.approved).toBe(true);
    expect(sec.getProcessRing(5)).toBe(1);
  });
});
