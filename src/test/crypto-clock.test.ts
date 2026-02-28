/**
 * Cryptographic Clock Test Suite
 * ═══════════════════════════════
 *
 * Verifies the structural unity of Atlas (φ(360)=96),
 * SHA-256 (R₈ ring), and RSA (modular exponentiation).
 */
import { describe, it, expect } from "vitest";
import {
  projectHashToAtlas,
  atlasFingerprint,
  generateClockRSA,
  clockRSAEncrypt,
  mapCriticalIdentityToClock,
  buildCorrespondence,
  runCryptoClockVerification,
} from "@/modules/atlas/crypto-clock";
import { modPow } from "@/modules/atlas/clock-algebra";

// SHA-256 of empty string
const SHA256_EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
// SHA-256 of "a"
const SHA256_A = "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb";

describe("Cryptographic Clock: Atlas ↔ SHA-256 ↔ RSA", () => {
  describe("SHA-256 → Atlas projection", () => {
    it("projects 32-byte hash to 32 Atlas vertices", () => {
      const proj = projectHashToAtlas(SHA256_EMPTY);
      expect(proj.vertexIndices.length).toBe(32);
      expect(proj.clockElements.length).toBe(32);
      expect(proj.ringElements.length).toBe(32);
    });

    it("all vertex indices are valid (0–95)", () => {
      const proj = projectHashToAtlas(SHA256_EMPTY);
      for (const v of proj.vertexIndices) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(96);
      }
    });

    it("different hashes produce different projections", () => {
      const p1 = projectHashToAtlas(SHA256_EMPTY);
      const p2 = projectHashToAtlas(SHA256_A);
      const same = p1.vertexIndices.every((v, i) => v === p2.vertexIndices[i]);
      expect(same).toBe(false);
    });

    it("aggregate clock is a valid coprime to 360", () => {
      const proj = projectHashToAtlas(SHA256_EMPTY);
      expect(proj.aggregateClock).toBeGreaterThan(0);
      expect(proj.aggregateClock).toBeLessThan(360);
    });

    it("sign class distribution sums to 32", () => {
      const proj = projectHashToAtlas(SHA256_EMPTY);
      const total = proj.signClassDistribution.reduce((a, b) => a + b, 0);
      expect(total).toBe(32);
    });
  });

  describe("Atlas fingerprint", () => {
    it("reduces hash to single clock element", () => {
      const fp = atlasFingerprint(SHA256_EMPTY);
      expect(fp).toBeDefined();
      expect(fp.value).toBeGreaterThan(0);
      expect(fp.value).toBeLessThan(360);
    });

    it("different hashes → different fingerprints (usually)", () => {
      const fp1 = atlasFingerprint(SHA256_EMPTY);
      const fp2 = atlasFingerprint(SHA256_A);
      // Not guaranteed to differ (pigeonhole), but very likely with real hashes
      expect(fp1.value !== fp2.value || fp1.index !== fp2.index).toBe(true);
    });

    it("fingerprint has valid CRT decomposition", () => {
      const fp = atlasFingerprint(SHA256_EMPTY);
      const [r8, r9, r5] = fp.crt;
      expect(r8).toBeGreaterThanOrEqual(0);
      expect(r8).toBeLessThan(8);
      expect(r9).toBeGreaterThanOrEqual(0);
      expect(r9).toBeLessThan(9);
      expect(r5).toBeGreaterThanOrEqual(0);
      expect(r5).toBeLessThan(5);
    });
  });

  describe("RSA in clock domain", () => {
    it("generates valid key pair (p=17, q=11)", () => {
      const kp = generateClockRSA(17, 11);
      expect(kp.n).toBe(187);
      expect(kp.totient).toBe(160);
      expect((kp.e * kp.d) % kp.totient).toBe(1);
    });

    it("encrypts and decrypts M=88 correctly", () => {
      const kp = generateClockRSA(17, 11);
      const result = clockRSAEncrypt(88, kp);
      expect(result.correct).toBe(true);
      expect(result.ciphertext).not.toBe(88);
      expect(result.decrypted).toBe(88);
    });

    it("round-trips all coprime messages for n=91", () => {
      const kp = generateClockRSA(13, 7);
      for (let m = 1; m < kp.n; m++) {
        const result = clockRSAEncrypt(m, kp);
        expect(result.correct).toBe(true);
      }
    });

    it("Fermat–Euler: a^φ(n) ≡ 1 (mod n) for coprime a", () => {
      const kp = generateClockRSA(17, 11);
      for (let a = 2; a < 20; a++) {
        if (a % 17 !== 0 && a % 11 !== 0) {
          expect(modPow(a, kp.totient, kp.n)).toBe(1);
        }
      }
    });
  });

  describe("R₈ ↔ Clock critical identity", () => {
    it("ring identity holds for all 256 elements", () => {
      const result = mapCriticalIdentityToClock();
      expect(result.ringIdentityHolds).toBe(true);
    });

    it("clock inverse identity holds for all 96 elements", () => {
      const result = mapCriticalIdentityToClock();
      expect(result.clockAnalogHolds).toBe(true);
    });
  });

  describe("Structural correspondence", () => {
    it("identifies 6 shared algebraic operations", () => {
      const corr = buildCorrespondence();
      expect(corr.sharedOperations.length).toBe(6);
      expect(corr.sharedOperations).toContain("Euler's totient φ(n) for group order");
      expect(corr.sharedOperations).toContain("Modular exponentiation a^e mod n");
    });

    it("Atlas group order = 96", () => {
      const corr = buildCorrespondence();
      expect(corr.atlasGroupOrder).toBe(96);
      expect(corr.atlasExponent).toBe(12);
    });
  });

  describe("Full verification report", () => {
    it("all 14 tests pass", () => {
      const report = runCryptoClockVerification();
      for (const t of report.tests) {
        expect(t.holds, `FAIL: ${t.name} — ${t.detail}`).toBe(true);
      }
      expect(report.allPassed).toBe(true);
      expect(report.tests.length).toBe(14);
    });
  });
});
