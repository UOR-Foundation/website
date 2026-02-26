/**
 * Genre Fingerprint — 3D Observable Space Classifier
 * ═══════════════════════════════════════════════════════════════════
 *
 * Computes a station's position in UOR observable space using three
 * orthogonal axes:
 *   X = Cascade Length     (rhythmic momentum / groove)
 *   Y = Mean Curvature     (harmonic tension / complexity)
 *   Z = Hamming Distance   (bit-level textural change rate)
 *
 * Genre IS a region in this space — not a label, but a coordinate.
 *
 * @module audio/lenses/genre-fingerprint
 * @namespace audio/
 */

import type { HarmonicLensFrame } from "./harmonic-lens";

/** A point in 3D observable space. */
export interface GenreCoordinate {
  /** Cascade length (rhythmic momentum). Normalized [0, 1]. */
  cascade: number;
  /** Mean curvature (harmonic complexity). Normalized [0, 1]. */
  curvature: number;
  /** Mean Hamming distance (bit-level textural change). Normalized [0, 1]. */
  hamming: number;
}

/** Known genre regions in observable space. */
export interface GenreRegion {
  id: string;
  label: string;
  center: GenreCoordinate;
  /** Max distance from center to be classified as this genre. */
  radius: number;
  color: string;
}

/** Classification result. */
export interface GenreClassification {
  /** Current coordinate in observable space. */
  coordinate: GenreCoordinate;
  /** Closest matching genre region. */
  genre: GenreRegion;
  /** Distance to the genre center [0, 1+]. */
  distance: number;
  /** Confidence [0, 1] — 1 when at center, 0 when at radius edge. */
  confidence: number;
}

// ── Canonical Genre Regions ────────────────────────────────────────────────
// Derived from the UOR observable mapping, not from training data.

export const GENRE_REGIONS: GenreRegion[] = [
  {
    id: "ambient",
    label: "Ambient",
    center: { cascade: 0.7, curvature: 0.1, hamming: 0.15 },
    radius: 0.35,
    color: "220",
  },
  {
    id: "drone",
    label: "Drone",
    center: { cascade: 0.9, curvature: 0.05, hamming: 0.08 },
    radius: 0.25,
    color: "260",
  },
  {
    id: "downtempo",
    label: "Downtempo",
    center: { cascade: 0.5, curvature: 0.3, hamming: 0.4 },
    radius: 0.3,
    color: "140",
  },
  {
    id: "jazz",
    label: "Jazz",
    center: { cascade: 0.25, curvature: 0.6, hamming: 0.65 },
    radius: 0.3,
    color: "30",
  },
  {
    id: "space",
    label: "Space",
    center: { cascade: 0.8, curvature: 0.15, hamming: 0.25 },
    radius: 0.3,
    color: "200",
  },
  {
    id: "electronic",
    label: "Electronic",
    center: { cascade: 0.4, curvature: 0.45, hamming: 0.55 },
    radius: 0.3,
    color: "280",
  },
];

// ── Fingerprint Engine ─────────────────────────────────────────────────────

export class GenreFingerprint {
  private frames: HarmonicLensFrame[] = [];
  private cascadeDir: number = 0;
  private cascadeLen: number = 0;
  private maxCascade: number = 0;

  /** Push a frame for running classification. */
  push(frame: HarmonicLensFrame): void {
    // Cascade tracking
    if (this.frames.length > 0) {
      const prev = this.frames[this.frames.length - 1];
      const dir = frame.rmsEnergy > prev.rmsEnergy ? 1 : -1;
      if (dir === this.cascadeDir) {
        this.cascadeLen++;
      } else {
        this.maxCascade = Math.max(this.maxCascade, this.cascadeLen);
        this.cascadeDir = dir;
        this.cascadeLen = 1;
      }
    }

    this.frames.push(frame);

    // Keep a rolling window of ~900 frames (~30s at 30fps)
    if (this.frames.length > 900) {
      this.frames = this.frames.slice(-900);
    }
  }

  /** Compute the current genre coordinate. */
  getCoordinate(): GenreCoordinate {
    const n = this.frames.length || 1;

    // Cascade: normalize max cascade length. 100+ frames = 1.0
    const cascade = Math.min(1, Math.max(this.maxCascade, this.cascadeLen) / 100);

    // Curvature: mean curvature. 0.3+ = 1.0
    let curvatureSum = 0;
    for (const f of this.frames) curvatureSum += f.curvature;
    const curvature = Math.min(1, (curvatureSum / n) / 0.3);

    // Hamming: mean inter-frame Hamming distance on Z/256Z.
    // hammingFromPrev is popcount(currentByte XOR prevByte), range [0, 8].
    // Normalize: 4+ bits flipping per frame = 1.0 (high textural change).
    let hammingSum = 0;
    for (const f of this.frames) hammingSum += f.hammingFromPrev;
    const hamming = Math.min(1, (hammingSum / n) / 4);

    return { cascade, curvature, hamming };
  }

  /** Classify the current audio against known genre regions. */
  classify(): GenreClassification {
    const coord = this.getCoordinate();

    let closestRegion = GENRE_REGIONS[0];
    let closestDist = Infinity;

    for (const region of GENRE_REGIONS) {
      const d = Math.sqrt(
        (coord.cascade - region.center.cascade) ** 2 +
        (coord.curvature - region.center.curvature) ** 2 +
        (coord.hamming - region.center.hamming) ** 2
      );
      if (d < closestDist) {
        closestDist = d;
        closestRegion = region;
      }
    }

    const confidence = Math.max(0, 1 - closestDist / closestRegion.radius);

    return {
      coordinate: coord,
      genre: closestRegion,
      distance: closestDist,
      confidence: Math.min(1, confidence),
    };
  }

  reset(): void {
    this.frames = [];
    this.cascadeDir = 0;
    this.cascadeLen = 0;
    this.maxCascade = 0;
  }
}
