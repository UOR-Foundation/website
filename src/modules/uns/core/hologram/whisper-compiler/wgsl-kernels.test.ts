import { describe, it, expect } from "vitest";
import {
  cpuMatmul,
  cpuLayerNorm,
  cpuGelu,
  cpuSoftmax,
  cpuScaledDotProductAttention,
  cpuFusedAttention,
} from "./wgsl-kernels";

// Helper: check arrays are close within tolerance
function expectClose(actual: Float32Array, expected: Float32Array, tol = 1e-5) {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < actual.length; i++) {
    expect(Math.abs(actual[i] - expected[i])).toBeLessThan(tol);
  }
}

describe("cpuMatmul", () => {
  it("multiplies identity × vector", () => {
    // 2×2 identity × 2×1 vector
    const I = new Float32Array([1, 0, 0, 1]);
    const v = new Float32Array([3, 7]);
    const result = cpuMatmul(I, v, 2, 1, 2);
    expectClose(result, new Float32Array([3, 7]));
  });

  it("multiplies 2×3 × 3×2 correctly", () => {
    const A = new Float32Array([1, 2, 3, 4, 5, 6]);
    const B = new Float32Array([7, 8, 9, 10, 11, 12]);
    const result = cpuMatmul(A, B, 2, 2, 3);
    // Row 0: 1*7+2*9+3*11 = 7+18+33 = 58, 1*8+2*10+3*12 = 8+20+36 = 64
    // Row 1: 4*7+5*9+6*11 = 28+45+66 = 139, 4*8+5*10+6*12 = 32+50+72 = 154
    expectClose(result, new Float32Array([58, 64, 139, 154]));
  });

  it("handles Whisper-scale dims (4×64 × 64×4)", () => {
    const M = 4, K = 64, N = 4;
    const A = new Float32Array(M * K).fill(1 / K);
    const B = new Float32Array(K * N);
    // Set B to identity-like pattern
    for (let i = 0; i < Math.min(K, N); i++) B[i * N + i] = 1;
    const result = cpuMatmul(A, B, M, N, K);
    // Each row of result: sum of columns of B / K
    expect(result.length).toBe(M * N);
    // Row 0: [1/K, 1/K, 1/K, 1/K] since each B col has one 1 in first 4 rows
    expect(Math.abs(result[0] - 1 / K)).toBeLessThan(1e-6);
  });
});

describe("cpuLayerNorm", () => {
  it("normalizes a single row", () => {
    const input = new Float32Array([1, 2, 3, 4]);
    const gamma = new Float32Array([1, 1, 1, 1]);
    const beta = new Float32Array([0, 0, 0, 0]);
    const result = cpuLayerNorm(input, gamma, beta, 1, 4, 1e-5);

    // mean = 2.5, var = 1.25, std = ~1.118
    const mean = 2.5;
    const std = Math.sqrt(1.25 + 1e-5);
    expectClose(result, new Float32Array([
      (1 - mean) / std,
      (2 - mean) / std,
      (3 - mean) / std,
      (4 - mean) / std,
    ]));
  });

  it("applies gamma and beta correctly", () => {
    const input = new Float32Array([0, 0, 0, 0]);
    const gamma = new Float32Array([2, 2, 2, 2]);
    const beta = new Float32Array([1, 1, 1, 1]);
    const result = cpuLayerNorm(input, gamma, beta, 1, 4, 1e-5);
    // All zeros → normalized = 0, output = gamma*0 + beta = 1
    expectClose(result, new Float32Array([1, 1, 1, 1]));
  });

  it("handles multiple rows independently", () => {
    const input = new Float32Array([1, 3, 10, 20]); // 2 rows of width 2
    const gamma = new Float32Array([1, 1]);
    const beta = new Float32Array([0, 0]);
    const result = cpuLayerNorm(input, gamma, beta, 2, 2, 1e-5);

    // Row 0: mean=2, var=1, row 1: mean=15, var=25
    const std0 = Math.sqrt(1 + 1e-5);
    const std1 = Math.sqrt(25 + 1e-5);
    expectClose(result, new Float32Array([
      (1 - 2) / std0, (3 - 2) / std0,
      (10 - 15) / std1, (20 - 15) / std1,
    ]));
  });
});

describe("cpuGelu", () => {
  it("GELU(0) ≈ 0", () => {
    const result = cpuGelu(new Float32Array([0]));
    expect(Math.abs(result[0])).toBeLessThan(1e-6);
  });

  it("GELU(x) ≈ x for large positive x", () => {
    const result = cpuGelu(new Float32Array([5]));
    expect(Math.abs(result[0] - 5)).toBeLessThan(0.01);
  });

  it("GELU(x) ≈ 0 for large negative x", () => {
    const result = cpuGelu(new Float32Array([-5]));
    expect(Math.abs(result[0])).toBeLessThan(0.01);
  });

  it("matches known values", () => {
    // GELU(1) ≈ 0.8412, GELU(-1) ≈ -0.1588
    const result = cpuGelu(new Float32Array([1, -1]));
    expect(Math.abs(result[0] - 0.8412)).toBeLessThan(0.001);
    expect(Math.abs(result[1] - (-0.1588))).toBeLessThan(0.001);
  });

  it("is monotonically increasing for x > -0.5", () => {
    const xs = new Float32Array(100);
    for (let i = 0; i < 100; i++) xs[i] = -0.5 + i * 0.1;
    const ys = cpuGelu(xs);
    for (let i = 1; i < 100; i++) {
      expect(ys[i]).toBeGreaterThanOrEqual(ys[i - 1] - 1e-6);
    }
  });
});

describe("cpuSoftmax", () => {
  it("outputs sum to 1", () => {
    const input = new Float32Array([1, 2, 3, 4]);
    const result = cpuSoftmax(input, 1, 4);
    const sum = result.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-6);
  });

  it("is numerically stable with large values", () => {
    const input = new Float32Array([1000, 1001, 1002]);
    const result = cpuSoftmax(input, 1, 3);
    const sum = result.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-6);
    // Largest input should get largest probability
    expect(result[2]).toBeGreaterThan(result[1]);
    expect(result[1]).toBeGreaterThan(result[0]);
  });

  it("handles multiple rows independently", () => {
    const input = new Float32Array([0, 0, 100, 0]); // 2 rows of width 2
    const result = cpuSoftmax(input, 2, 2);
    // Row 0: uniform → [0.5, 0.5]
    expect(Math.abs(result[0] - 0.5)).toBeLessThan(1e-6);
    expect(Math.abs(result[1] - 0.5)).toBeLessThan(1e-6);
    // Row 1: [100, 0] → nearly [1, 0]
    expect(result[2]).toBeGreaterThan(0.99);
    expect(result[3]).toBeLessThan(0.01);
  });

  it("uniform input → uniform output", () => {
    const input = new Float32Array([5, 5, 5, 5]);
    const result = cpuSoftmax(input, 1, 4);
    for (let i = 0; i < 4; i++) {
      expect(Math.abs(result[i] - 0.25)).toBeLessThan(1e-6);
    }
  });
});

describe("cpuScaledDotProductAttention", () => {
  it("identity attention: Q=K=I, V=data → output ≈ softmax-weighted V", () => {
    const seqLen = 2, dk = 2;
    // Q=K=identity-like: token 0 attends to itself
    const Q = new Float32Array([1, 0, 0, 1]);
    const K = new Float32Array([1, 0, 0, 1]);
    const V = new Float32Array([10, 20, 30, 40]);

    const result = cpuScaledDotProductAttention(Q, K, V, seqLen, dk);
    expect(result.length).toBe(seqLen * dk);

    // Token 0: Q[0]·K[0] = 1/sqrt(2), Q[0]·K[1] = 0/sqrt(2)
    // So token 0 attends more to token 0's V
    // Token 1: Q[1]·K[0] = 0, Q[1]·K[1] = 1/sqrt(2)
    // So token 1 attends more to token 1's V
    expect(result[0]).toBeGreaterThan(15); // weighted toward V[0]=10
    expect(result[2]).toBeLessThan(25); // weighted toward V[2]=30
  });

  it("uniform attention distributes values evenly", () => {
    const seqLen = 3, dk = 2;
    // All Q and K are the same → uniform attention
    const Q = new Float32Array([1, 1, 1, 1, 1, 1]);
    const K = new Float32Array([1, 1, 1, 1, 1, 1]);
    const V = new Float32Array([0, 0, 3, 3, 6, 6]);

    const result = cpuScaledDotProductAttention(Q, K, V, seqLen, dk);
    // Each output row should be mean of V rows = [3, 3]
    for (let i = 0; i < seqLen; i++) {
      expect(Math.abs(result[i * dk + 0] - 3)).toBeLessThan(1e-5);
      expect(Math.abs(result[i * dk + 1] - 3)).toBeLessThan(1e-5);
    }
  });

  it("output has correct shape", () => {
    const seqLen = 8, dk = 4;
    const Q = new Float32Array(seqLen * dk);
    const K = new Float32Array(seqLen * dk);
    const V = new Float32Array(seqLen * dk);
    for (let i = 0; i < Q.length; i++) {
      Q[i] = Math.sin(i); K[i] = Math.cos(i); V[i] = i * 0.1;
    }
    const result = cpuScaledDotProductAttention(Q, K, V, seqLen, dk);
    expect(result.length).toBe(seqLen * dk);
    // Each row's attention weights should sum to 1 (implicitly verified by softmax)
    expect(result.every(v => isFinite(v))).toBe(true);
  });
});

describe("cpuFusedAttention", () => {
  it("matches cpuScaledDotProductAttention without causal mask", () => {
    const seqLen = 4, dk = 3;
    const Q = new Float32Array(seqLen * dk);
    const K = new Float32Array(seqLen * dk);
    const V = new Float32Array(seqLen * dk);
    for (let i = 0; i < Q.length; i++) {
      Q[i] = Math.sin(i * 0.7); K[i] = Math.cos(i * 0.5); V[i] = i * 0.1;
    }
    const ref = cpuScaledDotProductAttention(Q, K, V, seqLen, dk);
    const fused = cpuFusedAttention(Q, K, V, seqLen, seqLen, dk, false, 0);
    expectClose(fused, ref, 1e-5);
  });

  it("applies causal mask correctly", () => {
    const seqLen = 3, dk = 2;
    const Q = new Float32Array([1, 0, 0, 1, 1, 1]);
    const K = new Float32Array([1, 0, 0, 1, 1, 1]);
    const V = new Float32Array([10, 20, 30, 40, 50, 60]);

    const result = cpuFusedAttention(Q, K, V, seqLen, seqLen, dk, true, 0);
    expect(result.length).toBe(seqLen * dk);
    // Row 0 can only attend to position 0
    expectClose(
      new Float32Array([result[0], result[1]]),
      new Float32Array([10, 20]),
      1e-5,
    );
  });

  it("supports asymmetric Q/KV lengths (cross-attention)", () => {
    const qLen = 2, kvLen = 4, dk = 2;
    const Q = new Float32Array([1, 1, 0, 1]);
    const K = new Float32Array([1, 0, 0, 1, 1, 1, -1, 0]);
    const V = new Float32Array([0, 0, 3, 3, 6, 6, 9, 9]);

    const result = cpuFusedAttention(Q, K, V, qLen, kvLen, dk, false, 0);
    expect(result.length).toBe(qLen * dk);
    expect(result.every(v => isFinite(v))).toBe(true);
  });
});
