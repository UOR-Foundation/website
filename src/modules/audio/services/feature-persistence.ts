/**
 * Feature Persistence Service — Cross-Session Audio Analysis Storage
 * ═══════════════════════════════════════════════════════════════════
 *
 * Bridges the HarmonicLens / CurvatureLens real-time analysis pipeline
 * to the audio_tracks / audio_features tables.
 *
 * Every persisted feature carries:
 *   - A derivation_id linking to the lens proof chain
 *   - A lens_id identifying the producing lens version
 *   - A confidence score reflecting epistemic grade
 *
 * Write path:  Lens frames → aggregate → derive → persist
 * Read path:   track_cid → load cached features → skip re-analysis
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
  /** Derivation ID for this aggregation. */
  derivationId: string;
  /** Dominant epistemic grade across frames. */
  epistemicGrade: "A" | "C";
}

// ── Derivation utility ────────────────────────────────────────────────────

function deriveAggregationId(
  trackCid: string,
  frameCount: number,
  meanRms: number,
): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < trackCid.length; i++) {
    hash = (hash ^ trackCid.charCodeAt(i)) * 0x01000193;
  }
  hash = (hash ^ frameCount) * 0x01000193;
  hash = (hash ^ Math.round(meanRms * 10000)) * 0x01000193;
  const hex = (hash >>> 0).toString(16).padStart(8, "0");
  return `urn:uor:derivation:aggregation:${hex}`;
}

// ── Feature Aggregator ─────────────────────────────────────────────────────

/**
 * Accumulates HarmonicLensFrames and computes aggregate features
 * with derivation chains. Each aggregation carries a deterministic
 * derivation ID computed from the content-addressed inputs.
 */
export class FeatureAggregator {
  private frames: HarmonicLensFrame[] = [];
  private cascadeDir: number = 0;
  private cascadeLen: number = 0;
  private maxCascade: number = 0;
  private gradeACounts: number = 0;

  push(frame: HarmonicLensFrame): void {
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
    if (frame.epistemicGrade === "A") this.gradeACounts++;
    this.frames.push(frame);
  }

  get frameCount(): number {
    return this.frames.length;
  }

  aggregate(trackCid: string = ""): AggregatedFeatures {
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
    const meanRms = sumRms / n;
    const epistemicGrade = this.gradeACounts > n / 2 ? "A" as const : "C" as const;
    const derivationId = deriveAggregationId(trackCid, n, meanRms);

    return {
      meanStratum: sumStratum / n,
      meanRms,
      meanCurvature: sumCurvature / n,
      peakCurvature,
      centroidMean: sumCentroid / n,
      frameCount: n,
      cascadeLength: Math.max(this.maxCascade, this.cascadeLen),
      avgHistogram,
      derivationId,
      epistemicGrade,
    };
  }

  reset(): void {
    this.frames = [];
    this.cascadeDir = 0;
    this.cascadeLen = 0;
    this.maxCascade = 0;
    this.gradeACounts = 0;
  }
}

// ── Persistence Functions ──────────────────────────────────────────────────

/** Generate a deterministic CID from source URI (SHA-256 content-addressed). */
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
 * Every feature row carries a derivation_id linking to the proof chain.
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
        derivation_id: features.derivationId,
      }],
      { onConflict: "track_cid" },
    );

  if (trackErr) {
    console.warn("[FeaturePersistence] Track upsert failed:", trackErr.message);
    return false;
  }

  // Build feature rows with derivation chains
  const confidence = features.epistemicGrade === "A" ? 1.0 : 0.6;
  const featureRows = [
    { feature_id: "stratum:mean", label: "Mean Stratum", value: features.meanStratum, unit: "σ", confidence, lens_id: "lens:harmonic:v2", derivation_id: `${features.derivationId}:stratum` },
    { feature_id: "rms:mean", label: "Mean RMS Energy", value: features.meanRms, unit: "amplitude", confidence, lens_id: "lens:harmonic:v2", derivation_id: `${features.derivationId}:rms` },
    { feature_id: "curvature:mean", label: "Mean Curvature", value: features.meanCurvature, unit: "κ", confidence, lens_id: "lens:curvature:v2", derivation_id: `${features.derivationId}:curvature:mean` },
    { feature_id: "curvature:peak", label: "Peak Curvature", value: features.peakCurvature, unit: "κ", confidence, lens_id: "lens:curvature:v2", derivation_id: `${features.derivationId}:curvature:peak` },
    { feature_id: "centroid:mean", label: "Spectral Centroid", value: features.centroidMean, unit: "bin", confidence, lens_id: "lens:harmonic:v2", derivation_id: `${features.derivationId}:centroid` },
    { feature_id: "cascade:max", label: "Max Cascade Length", value: features.cascadeLength, unit: "frames", confidence, lens_id: "lens:cascade:v1", derivation_id: `${features.derivationId}:cascade` },
    { feature_id: "frame:count", label: "Total Frames Analyzed", value: features.frameCount, unit: "frames", confidence: 1.0, lens_id: "lens:harmonic:v2", derivation_id: `${features.derivationId}:count` },
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
        derivation_id: f.derivation_id,
      })),
    );

  if (featErr) {
    console.warn("[FeaturePersistence] Feature insert failed:", featErr.message);
    return false;
  }

  return true;
}

/**
 * Persist raw AudioFeatureData from lens extractFeatures() directly.
 * Used for fine-grained per-frame feature persistence.
 */
export async function persistRawFeatures(
  trackCid: string,
  features: AudioFeatureData[],
): Promise<boolean> {
  if (features.length === 0) return true;

  const { error } = await supabase
    .from("audio_features")
    .insert(
      features.map((f) => ({
        track_cid: trackCid,
        feature_id: f.featureId,
        label: f.label,
        value: f.value,
        confidence: f.confidence,
        unit: f.unit,
        frame_range: f.frameRange,
        lens_id: f.lensId,
        derivation_id: f.derivationId,
      })),
    );

  if (error) {
    console.warn("[FeaturePersistence] Raw feature insert failed:", error.message);
    return false;
  }
  return true;
}
