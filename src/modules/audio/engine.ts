/**
 * Audio Engine — HLS-First Streaming with Content-Addressed Caching
 * ═══════════════════════════════════════════════════════════════════
 *
 * Wraps HLS.js for adaptive bitrate streaming with automatic
 * fallback to native HTML5 Audio for direct MP3/AAC streams.
 *
 * Every segment that passes through the engine is content-addressed
 * and cached in the AudioSegmentCache for offline/PWA replay.
 *
 * @module audio/engine
 * @namespace audio/
 */

import Hls from "hls.js";
import { globalSegmentCache } from "./segment-cache";
import type { AudioEngineState } from "./types";

export interface AudioEngineConfig {
  /** Max HLS buffer length in seconds (default: 30) */
  maxBufferLength?: number;
  /** Enable content-addressed segment caching (default: true) */
  enableCaching?: boolean;
}

type StateListener = (state: AudioEngineState) => void;

export class AudioEngine {
  private audio: HTMLAudioElement;
  private hls: Hls | null = null;
  private state: AudioEngineState = "idle";
  private listeners: Set<StateListener> = new Set();
  private currentUrl: string | null = null;
  private config: Required<AudioEngineConfig>;

  constructor(config: AudioEngineConfig = {}) {
    this.config = {
      maxBufferLength: config.maxBufferLength ?? 30,
      enableCaching: config.enableCaching ?? true,
    };

    this.audio = new Audio();
    this.audio.preload = "none";

    // Wire up state events
    this.audio.addEventListener("playing", () => this.setState("playing"));
    this.audio.addEventListener("waiting", () => this.setState("buffering"));
    this.audio.addEventListener("pause", () => {
      if (this.state !== "idle") this.setState("paused");
    });
    this.audio.addEventListener("error", () => this.setState("error"));
  }

  /** Subscribe to state changes. Returns unsubscribe function. */
  onStateChange(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Get current engine state. */
  getState(): AudioEngineState {
    return this.state;
  }

  /** Get the underlying HTMLAudioElement for volume control etc. */
  getAudioElement(): HTMLAudioElement {
    return this.audio;
  }

  /**
   * Load and play a URL. Automatically detects HLS (.m3u8) vs direct stream.
   */
  async play(url: string): Promise<void> {
    // Tear down previous stream completely
    this.destroyHls();
    this.audio.pause();
    this.audio.removeAttribute("src");

    this.currentUrl = url;
    this.setState("loading");

    const isHls = url.includes(".m3u8") || url.includes("m3u8");

    if (isHls && Hls.isSupported()) {
      await this.playHls(url);
    } else if (isHls && this.audio.canPlayType("application/vnd.apple.mpegurl")) {
      this.playNative(url);
    } else {
      this.playNative(url);
    }
  }

  /** Pause playback. */
  pause(): void {
    this.audio.pause();
    this.setState("paused");
  }

  /** Resume playback. */
  async resume(): Promise<void> {
    if (this.currentUrl) {
      this.setState("buffering");
      try {
        await this.audio.play();
      } catch {
        this.setState("error");
      }
    }
  }

  /** Stop and reset. */
  stop(): void {
    this.destroyHls();
    this.audio.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    this.currentUrl = null;
    this.setState("idle");
  }

  /** Set volume [0, 1]. */
  setVolume(v: number): void {
    this.audio.volume = Math.max(0, Math.min(1, v));
  }

  /** Get volume. */
  getVolume(): number {
    return this.audio.volume;
  }

  /** Get cache statistics. */
  getCacheStats() {
    return globalSegmentCache.stats();
  }

  /** Clean up all resources. */
  destroy(): void {
    this.stop();
    this.listeners.clear();
  }

  // ── Private ─────────────────────────────────────────────────────────

  private async playHls(url: string): Promise<void> {
    const hls = new Hls({
      maxBufferLength: this.config.maxBufferLength,
      maxMaxBufferLength: this.config.maxBufferLength * 2,
      startLevel: -1, // Auto quality selection
      enableWorker: true,
    });

    this.hls = hls;

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        console.warn("[AudioEngine] Fatal HLS error:", data.type, data.details);
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad(); // Retry
        } else {
          this.setState("error");
        }
      }
    });

    // Content-address segments as they load
    if (this.config.enableCaching) {
      hls.on(Hls.Events.FRAG_LOADED, (_event, data) => {
        const fragData = data.frag.data;
        if (fragData) {
          const cid = `hls:${data.frag.sn}:${data.frag.level}`;
          // Fire-and-forget cache write
          globalSegmentCache.put(cid, fragData as unknown as ArrayBuffer).catch(() => {});
        }
      });
    }

    hls.loadSource(url);
    hls.attachMedia(this.audio);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      this.audio.play().catch(() => this.setState("error"));
    });
  }

  private playNative(url: string): void {
    this.audio.src = url;
    this.audio.load();
    this.audio.play().catch((err) => {
      console.warn("[AudioEngine] Native playback failed:", err);
      this.setState("error");
    });
  }

  private destroyHls(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }

  private setState(state: AudioEngineState): void {
    if (this.state === state) return;
    this.state = state;
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch {}
    }
  }
}

/** Singleton audio engine for the Hologram OS. */
let _engine: AudioEngine | null = null;
export function getAudioEngine(config?: AudioEngineConfig): AudioEngine {
  if (!_engine) {
    _engine = new AudioEngine(config);
  }
  return _engine;
}
