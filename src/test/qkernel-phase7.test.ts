/**
 * Q-Security — Phase 7 Tests
 * ══════════════════════════
 *
 * Capability-based access control, isolation rings, ECC-signed syscall auth.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { QEcc } from "@/hologram/kernel/compute/q-ecc";
import {
  QSecurity,
  RING_NAMES,
  type IsolationRing,
  type CapabilityToken,
  type SecurityOp,
} from "@/hologram/kernel/security/q-security";

describe("Q-Security — Phase 7: Capability-Based Access Control", () => {
  let ecc: QEcc;
  let sec: QSecurity;

  beforeEach(() => {
    ecc = new QEcc();
    sec = new QSecurity(ecc);
  });

  // ── Process Registration & Rings ──────────────────────────────

  describe("Process registration & isolation rings", () => {
    it("registers process at ring 0 with full capabilities", async () => {
      const cap = await sec.registerProcess(0, 0);
      expect(cap.ring).toBe(0);
      expect(cap.operations).toContain("grant");
      expect(cap.operations).toContain("kill");
      expect(sec.getProcessRing(0)).toBe(0);
    });

    it("registers process at ring 3 with restricted capabilities", async () => {
      const cap = await sec.registerProcess(10, 3);
      expect(cap.ring).toBe(3);
      expect(cap.operations).toContain("read");
      expect(cap.operations).toContain("execute");
      expect(cap.operations).not.toContain("write");
      expect(cap.operations).not.toContain("kill");
    });

    it("ring names are correct", () => {
      expect(RING_NAMES[0]).toBe("kernel");
      expect(RING_NAMES[3]).toBe("user");
    });

    it("all four rings have distinct default ops", async () => {
      for (const ring of [0, 1, 2, 3] as IsolationRing[]) {
        const cap = await sec.registerProcess(ring * 10, ring);
        expect(cap.operations.length).toBeGreaterThan(0);
      }
      // Ring 0 should have more ops than ring 3
      const caps0 = sec.getCapabilities(0);
      const caps3 = sec.getCapabilities(30);
      expect(caps0[0].operations.length).toBeGreaterThan(caps3[0].operations.length);
    });
  });

  // ── Permission Checking ───────────────────────────────────────

  describe("Permission checking", () => {
    it("ring 0 can do everything", async () => {
      await sec.registerProcess(0, 0);
      expect(sec.checkPermission(0, "kill", "/any")).toBe(true);
      expect(sec.checkPermission(0, "grant", "*")).toBe(true);
    });

    it("ring 3 cannot write", async () => {
      await sec.registerProcess(10, 3);
      expect(sec.checkPermission(10, "write", "/data")).toBe(false);
    });

    it("ring 3 can read", async () => {
      await sec.registerProcess(10, 3);
      expect(sec.checkPermission(10, "read", "/data")).toBe(true);
    });

    it("unregistered process is denied", () => {
      expect(sec.checkPermission(999, "read", "/")).toBe(false);
    });
  });

  // ── Capability Grant & Revoke ─────────────────────────────────

  describe("Capability grant & revoke", () => {
    it("ring 0 grants capability to ring 3", async () => {
      await sec.registerProcess(0, 0);
      await sec.registerProcess(10, 3);

      const cap = await sec.grant(0, 10, ["write"], "/data/*");
      expect(cap).not.toBeNull();
      expect(cap!.operations).toContain("write");
      expect(cap!.resourcePattern).toBe("/data/*");

      // Now PID 10 can write to /data/foo
      expect(sec.checkPermission(10, "write", "/data/foo")).toBe(true);
    });

    it("ring 3 cannot grant", async () => {
      await sec.registerProcess(0, 0);
      await sec.registerProcess(10, 3);

      const cap = await sec.grant(10, 0, ["kill"], "*");
      expect(cap).toBeNull();
    });

    it("revoke cascades to derived tokens", async () => {
      await sec.registerProcess(0, 0);
      await sec.registerProcess(10, 2);
      await sec.registerProcess(20, 3);

      // 0 grants to 10
      const cap1 = await sec.grant(0, 10, ["write", "grant"], "/mnt/*");
      expect(cap1).not.toBeNull();

      // 10 grants to 20 (derived from cap1)
      const cap2 = await sec.grant(10, 20, ["write"], "/mnt/data/*");
      expect(cap2).not.toBeNull();
      expect(sec.checkPermission(20, "write", "/mnt/data/x")).toBe(true);

      // Revoke cap1 → should cascade to cap2
      const revoked = await sec.revoke(0, cap1!.capCid);
      expect(revoked).toBe(true);

      // PID 20's derived cap should be revoked
      expect(sec.checkPermission(20, "write", "/mnt/data/x")).toBe(false);
    });
  });

  // ── ECC-Signed Syscall Authorization ──────────────────────────

  describe("ECC-signed syscall authorization", () => {
    it("authorized syscall passes ECC verification", async () => {
      await sec.registerProcess(0, 0);
      const result = sec.authorizeSyscall(0, "read", "/kernel/state");
      expect(result.authorized).toBe(true);
      expect(result.eccVerified).toBe(true);
    });

    it("denied syscall fails fast before ECC", async () => {
      await sec.registerProcess(10, 3);
      const result = sec.authorizeSyscall(10, "kill", "/proc/0");
      expect(result.authorized).toBe(false);
      expect(result.reason).toContain("denied");
    });
  });

  // ── Ring Elevation ────────────────────────────────────────────

  describe("Ring elevation", () => {
    it("elevates ring 3 → ring 1", async () => {
      await sec.registerProcess(10, 3);
      const req = await sec.requestElevation(10, 1, "driver access needed");
      expect(req.approved).toBe(true);
      expect(req.fromRing).toBe(3);
      expect(req.toRing).toBe(1);
      expect(sec.getProcessRing(10)).toBe(1);
    });

    it("cannot elevate to same or higher ring number", async () => {
      await sec.registerProcess(10, 2);
      const req = await sec.requestElevation(10, 3, "nonsensical");
      expect(req.approved).toBe(false);
      expect(sec.getProcessRing(10)).toBe(2); // unchanged
    });

    it("demote moves process to lower privilege", async () => {
      await sec.registerProcess(10, 1);
      const ok = sec.demote(10, 3);
      expect(ok).toBe(true);
      expect(sec.getProcessRing(10)).toBe(3);
    });

    it("cannot demote to higher privilege", async () => {
      await sec.registerProcess(10, 2);
      const ok = sec.demote(10, 1);
      expect(ok).toBe(false);
    });
  });

  // ── Derivation Chain Verification ─────────────────────────────

  describe("Derivation chain verification", () => {
    it("verifies a valid chain", async () => {
      await sec.registerProcess(0, 0);
      await sec.registerProcess(10, 2);

      const granted = await sec.grant(0, 10, ["write"], "/data/*");
      expect(granted).not.toBeNull();

      const result = sec.verifyDerivationChain(granted!.capCid);
      expect(result.valid).toBe(true);
      expect(result.depth).toBeGreaterThanOrEqual(1);
      expect(result.brokenAt).toBeNull();
    });

    it("detects broken chain after revoke", async () => {
      await sec.registerProcess(0, 0);
      await sec.registerProcess(10, 2);

      const cap = await sec.grant(0, 10, ["write"], "/");
      await sec.revoke(0, cap!.capCid);

      const result = sec.verifyDerivationChain(cap!.capCid);
      expect(result.valid).toBe(false);
      expect(result.brokenAt).toBe(cap!.capCid);
    });
  });

  // ── Audit Log ─────────────────────────────────────────────────

  describe("Audit log & stats", () => {
    it("logs grant and deny events", async () => {
      await sec.registerProcess(0, 0);
      await sec.registerProcess(10, 3);

      await sec.grant(0, 10, ["write"], "/x");
      await sec.grant(10, 0, ["kill"], "*"); // denied

      const log = sec.getAuditLog();
      expect(log.length).toBeGreaterThanOrEqual(2);
      expect(log.some(e => e.type === "grant" && e.allowed)).toBe(true);
      expect(log.some(e => e.type === "deny" && !e.allowed)).toBe(true);
    });

    it("stats tracks everything", async () => {
      await sec.registerProcess(0, 0);
      await sec.registerProcess(10, 3);
      sec.checkPermission(10, "read", "/");
      sec.checkPermission(10, "kill", "/");

      const st = sec.stats();
      expect(st.totalCapabilities).toBeGreaterThanOrEqual(2);
      expect(st.totalChecks).toBeGreaterThanOrEqual(2);
      expect(st.deniedChecks).toBeGreaterThanOrEqual(1);
      expect(st.ringDistribution[0]).toBe(1);
      expect(st.ringDistribution[3]).toBe(1);
    });
  });
});
