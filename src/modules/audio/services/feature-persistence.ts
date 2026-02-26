/**
 * Feature Persistence Service — Cross-Session Audio Analysis Storage
 * ═══════════════════════════════════════════════════════════════════
 *
 * Bridges the HarmonicLens real-time analysis pipeline to the
 * audio_tracks / audio_features / audio_segments tables.
 *
 * Write path:  HarmonicLens frame → aggregate → persist
 * Read path:   track_cid → load cached features → skip re-analysis
 *
 * All persistence is keyed by content-addressed track CID.
 *
 * @module audio/services/feature-persistence
 * @namespace audio/
 */

import { supabase } from "@/integrations/supabase/client";
import type { HarmonicLensFrame } from "../lenses/harmonic-lens";
import type { AudioFeatureData } from "../types";

// ── Types ──────────────────────────────────────────────────────────────────

export interface PersistedTrack {
  trackCid: string;
  title: string;
  artist: string;
  sourceUri: string;
  format: Record<string, unknown>;
  genres: string[];
}

export interface AggregatedFeatures {
  meanStratum: number;
  meanRms: number;
  meanCurvature: number;
  peakCurvature: number;
  centroidMean: number;
  frameCount: number;
  cascadeLength: number;
  /** Stratum histogram averaged across all frames */
  avgHistogram: number[];
}

// ── Feature Aggregator ─────────────────────────────────────────────────────

/**
 * Accumulates HarmonicLensFrames and computes aggregate features.
 * Call `push()` per frame, then `aggregate()` to extract features.
 */
export class FeatureAggregator {
  private frames: HarmonicLensFrame[] = [];
  private cascadeDir: number = 0; // 1 = rising, -1 = falling, 0 = start
  private cascadeLen: number = 0;
  private maxCascade: number = 0;

  push(frame: HarmonicLensFrame): void {
    // Track cascade (consecutive same-direction energy changes)
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
  }

  get frameCount(): number {
    return this.frames.length;
  }

  aggregate(): AggregatedFeatures {
    const n = this.frames.length || 1;
    let sumStratum = 0, sumRms = 0, sumCurvature = 0, peakCurvature = 0, sumCentroid = 0;
    const histAccum = new Array(17).fill(0);

    for (const f of this.frames) {
      sumStratum += f.meanStratum;
      sumRms += f.rmsEnergy;
      sumCurvature += f.curvature;
      if (f.curvature > peakCurvature) peakCurvature = f.curvature;
      sumCentroid += f.centroidBin;
      for (let i = 0; i < 17; i++) {
        histAccum[i] += (f.stratumHistogram[i] || 0);
      }
    }

    const histTotal = Math.max(histAccum.reduce((a, b) => a + b, 0), 1);
    const avgHistogram = histAccum.map((v) => v / histTotal);

    return {
      meanStratum: sumStratum / n,
      meanRms: sumRms / n,
      meanCurvature: sumCurvature / n,
      peakCurvature,
      centroidMean: sumCentroid / n,
      frameCount: n,
      cascadeLength: Math.max(this.maxCascade, this.cascadeLen),
      avgHistogram,
    };
  }

  reset(): void {
    this.frames = [];
    this.cascadeDir = 0;
    this.cascadeLen = 0;
    this.maxCascade = 0;
  }
}

// ── Persistence Functions ──────────────────────────────────────────────────

/** Generate a deterministic CID from source URI (content-addressed). */
export async function generateTrackCid(sourceUri: string): Promise<string> {
  const data = new TextEncoder().encode(sourceUri);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  const hex = Array.from(hashArray, (b) => b.toString(16).padStart(2, "0")).join("");
  return `audio:${hex.slice(0, 32)}`;
}

/** Check if features exist for a track. */
export async function hasPersistedFeatures(trackCid: string): Promise<boolean> {
  const { count } = await supabase
    .from("audio_features")
    .select("id", { count: "exact", head: true })
    .eq("track_cid", trackCid);
  return (count ?? 0) > 0;
}

/** Load persisted features for a track. */
export async function loadFeatures(trackCid: string): Promise<AudioFeatureData[]> {
  const { data } = await supabase
    .from("audio_features")
    .select("*")
    .eq("track_cid", trackCid)
    .order("created_at", { ascending: true });

  if (!data) return [];

  return data.map((row) => ({
    featureId: row.feature_id,
    label: row.label,
    value: Number(row.value),
    confidence: Number(row.confidence),
    unit: row.unit,
    frameRange: (row.frame_range as [number, number]) ?? [0, 0],
    lensId: row.lens_id,
    derivationId: row.derivation_id ?? "",
  }));
}

/**
 * Persist a track and its aggregated features.
 * Upserts the track (by CID), then inserts feature rows.
 */
export async function persistAnalysis(
  track: PersistedTrack,
  features: AggregatedFeatures,
): Promise<boolean> {
  // Upsert track
  const { error: trackErr } = await supabase
    .from("audio_tracks")
    .upsert(
      [{
        track_cid: track.trackCid,
        title: track.title,
        artist: track.artist,
        source_uri: track.sourceUri,
        format: track.format as any,
        genres: track.genres,
      }],
      { onConflict: "track_cid" },
    );

  if (trackErr) {
    console.warn("[FeaturePersistence] Track upsert failed:", trackErr.message);
    return false;
  }

  // Build feature rows
  const featureRows = [
    { feature_id: "stratum:mean", label: "Mean Stratum", value: features.meanStratum, unit: "σ", confidence: 1, lens_id: "lens:harmonic" },
    { feature_id: "rms:mean", label: "Mean RMS Energy", value: features.meanRms, unit: "amplitude", confidence: 1, lens_id: "lens:harmonic" },
    { feature_id: "curvature:mean", label: "Mean Curvature", value: features.meanCurvature, unit: "κ", confidence: 1, lens_id: "lens:curvature" },
    { feature_id: "curvature:peak", label: "Peak Curvature", value: features.peakCurvature, unit: "κ", confidence: 1, lens_id: "lens:curvature" },
    { feature_id: "centroid:mean", label: "Spectral Centroid", value: features.centroidMean, unit: "bin", confidence: 1, lens_id: "lens:harmonic" },
    { feature_id: "cascade:max", label: "Max Cascade Length", value: features.cascadeLength, unit: "frames", confidence: 1, lens_id: "lens:cascade" },
    { feature_id: "frame:count", label: "Total Frames Analyzed", value: features.frameCount, unit: "frames", confidence: 1, lens_id: "lens:harmonic" },
  ];

  // Delete old features for this track, then insert fresh
  await supabase
    .from("audio_features")
    .delete()
    .eq("track_cid", track.trackCid);

  const { error: featErr } = await supabase
    .from("audio_features")
    .insert(
      featureRows.map((f) => ({
        track_cid: track.trackCid,
        feature_id: f.feature_id,
        label: f.label,
        value: f.value,
        confidence: f.confidence,
        unit: f.unit,
        frame_range: [0, features.frameCount],
        lens_id: f.lens_id,
      })),
    );

  if (featErr) {
    console.warn("[FeaturePersistence] Feature insert failed:", featErr.message);
    return false;
  }

  return true;
}
