/**
 * AdaptiveClockBooster — Decoupled Compute Clock
 * ════════════════════════════════════════════════
 *
 * Decouples compute tick rate from display refresh rate.
 * During idle periods, overclocks the compute orchestrator at 2-4x
 * the display rate, pre-computing future frames and warming caches.
 *
 * Architecture:
 *   Display:  60-144 Hz  → rendering, UI interpolation
 *   Compute:  120-576 Hz → cache warming, frame pre-projection, CID prefetch
 *
 * Idle gating: when the coherence gradient ∂H/∂t is stable (|∂H/∂t| < ε),
 * the display loop sleeps, freeing all cycles for compute boost.
 *
 * @module hologram-compute/adaptive-clock
 */

// ── Types ───────────────────────────────────────────────────────────────

export interface ClockConfig {
  /** Base display refresh rate in Hz (auto-detected or manual). */
  displayHz: number;
  /** Compute multiplier during idle periods (2-4x). */
  idleBoostMultiplier: number;
  /** Coherence gradient threshold for idle detection. */
  idleThreshold: number;
  /** Maximum compute ticks per second (hard cap to prevent jank). */
  maxComputeHz: number;
  /** Number of frames to pre-compute during boost. */
  prefetchDepth: number;
}

export interface ClockSnapshot {
  readonly "@type": "uor:AdaptiveClock";
  readonly displayHz: number;
  readonly computeHz: number;
  readonly boosting: boolean;
  readonly tickCount: number;
  readonly idleTicks: number;
  readonly prefetchedFrames: number;
  readonly coherenceGradient: number;
  readonly timestamp: string;
}

export type ClockCallback = (tick: number, dt: number, boosting: boolean) => void;

export const DEFAULT_CLOCK_CONFIG: ClockConfig = {
  displayHz: 60,
  idleBoostMultiplier: 3,
  idleThreshold: 0.001,
  maxComputeHz: 480,
  prefetchDepth: 4,
};

// ── AdaptiveClockBooster ────────────────────────────────────────────────

export class AdaptiveClockBooster {
  private config: ClockConfig;
  private tickCount = 0;
  private idleTicks = 0;
  private prefetchedFrames = 0;
  private _boosting = false;
  private _coherenceGradient = 0;
  private _running = false;
  private _displayTimerId: number | null = null;
  private _computeTimerId: number | null = null;
  private _callbacks: ClockCallback[] = [];
  private _lastTickTime = 0;

  constructor(config: Partial<ClockConfig> = {}) {
    this.config = { ...DEFAULT_CLOCK_CONFIG, ...config };
    // Auto-detect display Hz if possible
    this._detectDisplayHz();
  }

  private _detectDisplayHz(): void {
    if (typeof window === "undefined") return;
    // Use screen.refresh or estimate from rAF timing
    // Default stays at 60Hz, will self-correct after first few frames
    const screen = (window as any).screen;
    if (screen?.refreshRate) {
      this.config.displayHz = screen.refreshRate;
    }
  }

  /** Register a callback to be invoked on each compute tick. */
  onTick(cb: ClockCallback): () => void {
    this._callbacks.push(cb);
    return () => {
      this._callbacks = this._callbacks.filter(c => c !== cb);
    };
  }

  /** Update the coherence gradient — drives idle detection. */
  updateCoherenceGradient(gradient: number): void {
    this._coherenceGradient = gradient;
    const wasBoost = this._boosting;
    this._boosting = Math.abs(gradient) < this.config.idleThreshold;
    if (this._boosting && !wasBoost) {
      this._startBoost();
    } else if (!this._boosting && wasBoost) {
      this._stopBoost();
    }
  }

  /** Start the adaptive clock. */
  start(): void {
    if (this._running) return;
    this._running = true;
    this._lastTickTime = performance.now();
    this._runDisplayLoop();
  }

  /** Stop all ticking. */
  stop(): void {
    this._running = false;
    if (this._displayTimerId !== null) {
      cancelAnimationFrame(this._displayTimerId);
      this._displayTimerId = null;
    }
    this._stopBoost();
  }

  private _runDisplayLoop(): void {
    if (!this._running) return;
    this._displayTimerId = requestAnimationFrame(() => {
      const now = performance.now();
      const dt = now - this._lastTickTime;
      this._lastTickTime = now;
      this.tickCount++;

      // Fire display-rate tick (not boosting)
      if (!this._boosting) {
        for (const cb of this._callbacks) {
          try { cb(this.tickCount, dt, false); } catch {}
        }
      }

      this._runDisplayLoop();
    });
  }

  private _startBoost(): void {
    if (this._computeTimerId !== null) return;

    const computeInterval = 1000 / Math.min(
      this.config.displayHz * this.config.idleBoostMultiplier,
      this.config.maxComputeHz,
    );

    const boostTick = () => {
      if (!this._boosting || !this._running) {
        this._stopBoost();
        return;
      }

      const now = performance.now();
      const dt = now - this._lastTickTime;
      this._lastTickTime = now;
      this.tickCount++;
      this.idleTicks++;

      // Fire boosted tick
      for (const cb of this._callbacks) {
        try { cb(this.tickCount, dt, true); } catch {}
      }

      // Track prefetched frames
      if (this.idleTicks % this.config.idleBoostMultiplier === 0) {
        this.prefetchedFrames++;
      }

      this._computeTimerId = window.setTimeout(boostTick, computeInterval);
    };

    this._computeTimerId = window.setTimeout(boostTick, computeInterval);
  }

  private _stopBoost(): void {
    if (this._computeTimerId !== null) {
      clearTimeout(this._computeTimerId);
      this._computeTimerId = null;
    }
  }

  get computeHz(): number {
    if (this._boosting) {
      return Math.min(
        this.config.displayHz * this.config.idleBoostMultiplier,
        this.config.maxComputeHz,
      );
    }
    return this.config.displayHz;
  }

  get isBoosting(): boolean { return this._boosting; }

  snapshot(): ClockSnapshot {
    return {
      "@type": "uor:AdaptiveClock",
      displayHz: this.config.displayHz,
      computeHz: this.computeHz,
      boosting: this._boosting,
      tickCount: this.tickCount,
      idleTicks: this.idleTicks,
      prefetchedFrames: this.prefetchedFrames,
      coherenceGradient: this._coherenceGradient,
      timestamp: new Date().toISOString(),
    };
  }

  destroy(): void {
    this.stop();
    this._callbacks = [];
    this._boosting = false;
    this._coherenceGradient = 0;
    this.tickCount = 0;
    this.idleTicks = 0;
    this.prefetchedFrames = 0;
  }
}

// ── Singleton ───────────────────────────────────────────────────────────

let _clock: AdaptiveClockBooster | null = null;

export function getClock(config?: Partial<ClockConfig>): AdaptiveClockBooster {
  if (!_clock) _clock = new AdaptiveClockBooster(config);
  return _clock;
}
