import { describe, it, expect } from "vitest";
import { HologramComputeCache } from "./hologram-matmul";

describe("Discovery 2 — Per-Layer Centroid Caching", () => {
  const dim = 4;
  const outDim = 2;

  // Weights: 2×4 matrix, identity-ish
  const weights = new Uint8Array([1, 0, 0, 0, 0, 1, 0, 0]);

  // 8 training samples (8×4)
  const samples = new Uint8Array([
    10, 20, 30, 40,
    11, 21, 31, 41,
    10, 19, 29, 39,
    100, 200, 150, 50,
    101, 199, 151, 49,
    99, 201, 149, 51,
    50, 50, 50, 50,
    51, 51, 51, 51,
  ]);

  it("learnCentroids creates centroids and updates stats", () => {
    const cache = new HologramComputeCache();
    cache.learnCentroids("layer_0", samples, weights, dim, outDim, 3, 4);

    const stats = cache.centroidCacheStats;
    expect(stats.layers).toBe(1);
    expect(stats.totalCentroids).toBe(3);
    expect(cache.centroidLayerIds).toContain("layer_0");
  });

  it("retrieveCentroid returns cached output for nearby activation", () => {
    const cache = new HologramComputeCache();
    cache.learnCentroids("layer_0", samples, weights, dim, outDim, 3, 4);

    // Query with something close to a training sample
    const query = new Uint8Array([10, 20, 30, 40]);
    const result = cache.retrieveCentroid("layer_0", query, 10);
    expect(result).not.toBeNull();
    expect(result!.output.length).toBe(outDim);
    expect(result!.distance).toBeLessThan(10);
  });

  it("retrieveCentroid returns null for distant activation", () => {
    const cache = new HologramComputeCache();
    cache.learnCentroids("layer_0", samples, weights, dim, outDim, 3, 4);

    // Very different from any training sample
    const query = new Uint8Array([255, 255, 255, 255]);
    const result = cache.retrieveCentroid("layer_0", query, 2);
    expect(result).toBeNull();
  });

  it("tracks hit/miss statistics", () => {
    const cache = new HologramComputeCache();
    cache.learnCentroids("layer_0", samples, weights, dim, outDim, 3, 4);

    cache.retrieveCentroid("layer_0", new Uint8Array([10, 20, 30, 40]), 10);
    cache.retrieveCentroid("layer_0", new Uint8Array([255, 255, 255, 255]), 2);

    const stats = cache.centroidCacheStats;
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  it("getCentroids returns entries with precomputed outputs", () => {
    const cache = new HologramComputeCache();
    cache.learnCentroids("layer_0", samples, weights, dim, outDim, 3, 4);

    const entries = cache.getCentroids("layer_0");
    expect(entries).not.toBeNull();
    expect(entries!.length).toBe(3);
    for (const e of entries!) {
      expect(e.centroid.length).toBe(dim);
      expect(e.output.length).toBe(outDim);
    }
  });
});
