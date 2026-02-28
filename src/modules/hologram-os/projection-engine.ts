/**
 * Kernel Projection Engine — The Heart of Hologram
 * ═════════════════════════════════════════════════
 *
 * The entire hologram experience is a PROJECTION from the Q-Linux kernel.
 * This module is the bridge: it subscribes to kernel state and emits
 * pure-data ProjectionFrames that any surface (browser, edge, headless)
 * can render.
 *
 * The kernel doesn't know about CSS, DOM, or React.
 * It emits algebraic descriptions. The surface adapter translates.
 *
 * Architecture:
 *   Q-Boot → Q-Sched → KernelProjector → ProjectionFrame[] → SurfaceAdapter → pixels
 *
 * Self-assembly:
 *   The kernel is a self-unpacking artifact. It arrives as a minimal seed,
 *   verifies its own integrity (POST), hydrates its topology, and projects
 *   the full experience. The projection surface is discovered at boot time.
 *
 * @module hologram-os/projection-engine
 */

import type { QKernelBoot, BootStage, GenesisProcess } from "@/modules/qkernel/q-boot";
import { boot, post, loadHardware, hydrateFirmware, createGenesisProcess } from "@/modules/qkernel/q-boot";
import { QSched, classifyZone, type QProcess, type CoherenceZone } from "@/modules/qkernel/q-sched";

// ═══════════════════════════════════════════════════════════════════════
// Projection Frame Types — Pure data descriptions of what to render
// ═══════════════════════════════════════════════════════════════════════

/** Typography projection — the kernel's view of how text should appear */
export interface TypographyProjection {
  /** Base scale factor (viewport-derived) */
  readonly scale: number;
  /** User preference multiplier (compact/default/large) */
  readonly userScale: number;
  /** Computed base font size in px */
  readonly basePx: number;
}

/** Palette projection — the kernel's view of color */
export interface PaletteProjection {
  readonly mode: string;
  /** HSL values for core tokens */
  readonly bg: string;
  readonly surface: string;
  readonly text: string;
  readonly gold: string;
}

/** A single panel's projection — what the kernel wants displayed */
export interface PanelProjection {
  readonly pid: number;
  readonly name: string;
  readonly widgetType: string;
  readonly state: "visible" | "hidden" | "minimized";
  readonly coherenceZone: CoherenceZone;
  readonly hScore: number;
  /** Position as viewport-percentage (0–1) */
  readonly position: { x: number; y: number; w: number; h: number };
  /** Priority: higher = rendered first, more detail */
  readonly renderPriority: number;
}

/** Process projection — kernel process table as renderable data */
export interface ProcessProjection {
  readonly pid: number;
  readonly name: string;
  readonly state: string;
  readonly hScore: number;
  readonly zone: CoherenceZone;
  readonly cpuMs: number;
  readonly childCount: number;
}

/** Observable projection — a kernel metric made visible */
export interface ObservableProjection {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly unit: string;
  readonly zone: CoherenceZone;
}

/** Attention projection — derived from kernel aperture register */
export interface AttentionProjection {
  readonly aperture: number;
  readonly preset: "focus" | "diffuse";
  readonly snr: number;
  readonly observerStratum: number;
  readonly distractionGate: number;
  readonly showNotifications: boolean;
  readonly showExpanded: boolean;
  readonly sidebarExpanded: boolean;
  readonly animateBackground: boolean;
  readonly aiResponseStyle: "concise" | "exploratory";
}

/** A single projection frame — one tick's worth of visual state */
export interface ProjectionFrame {
  readonly tick: number;
  readonly timestamp: number;
  readonly stage: BootStage;
  readonly kernelCid: string;
  readonly panels: readonly PanelProjection[];
  readonly processes: readonly ProcessProjection[];
  readonly observables: readonly ObservableProjection[];
  readonly typography: TypographyProjection;
  readonly palette: PaletteProjection;
  /** Attention/focus state — derived from kernel aperture register */
  readonly attention: AttentionProjection;
  /** System-wide coherence: are we serving the human well? */
  readonly systemCoherence: {
    readonly meanH: number;
    readonly zone: CoherenceZone;
    readonly processCount: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Boot Event Types — for the portal animation
// ═══════════════════════════════════════════════════════════════════════

export interface BootEvent {
  readonly stage: BootStage;
  readonly label: string;
  readonly detail: string;
  readonly progress: number; // 0–1
  readonly passed: boolean;
  readonly timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════
// Kernel Config Registers — UI controls map to these
// ═══════════════════════════════════════════════════════════════════════

/**
 * Panel IDs — the kernel's view of which projection surface is active.
 * "none" = desktop home. All others = a full-screen projection overlay.
 * Chat is independent (can coexist with any panel or desktop).
 */
export type PanelId = "none" | "chat" | "browser" | "compute" | "memory" | "messenger" | "terminal" | "jupyter";

/** Desktop frame IDs — the kernel's view of the active visual environment */
export type DesktopMode = "image" | "white" | "dark";

export interface KernelConfig {
  typography: {
    userScale: number; // 0.9 | 1.0 | 1.15
  };
  palette: {
    mode: DesktopMode;
  };
  /** Active projection panel (exclusive — only one at a time) */
  activePanel: PanelId;
  /** Whether the Lumen AI chat is open (independent of activePanel) */
  chatOpen: boolean;
  /**
   * Attention aperture — the kernel's observer focus register.
   * 0.0 = pure diffuse (wide receptive field)
   * 1.0 = pure focus (narrow, deep signal)
   * All distraction gating, vignette intensity, and UI chrome
   * visibility derive from this single scalar.
   */
  attention: {
    aperture: number;
  };
  /**
   * Per-desktop widget visibility — kernel tracks which widgets
   * are hidden on each desktop frame. Maps to process freeze/thaw.
   */
  desktopWidgets: Record<string, {
    hiddenWidgets: string[];
    allHidden: boolean;
  }>;
  desktop: {
    widgetStates: Record<string, {
      x: number; y: number; w: number; h: number;
      visible: boolean;
      dockedTo?: string;
    }>;
  };
  /**
   * Shortcut mastery — learning-analytics register.
   * Tracks per-shortcut usage counts. After MASTERY_THRESHOLD uses,
   * the kernel suppresses visual hints for that shortcut.
   */
  shortcutMastery: Record<string, number>;
  /**
   * Widget drag positions — kernel tracks where each draggable
   * element has been placed on the viewport. Keys are storage
   * identifiers (e.g. "hologram-pos:ambient").
   */
  dragPositions: Record<string, { x: number; y: number }>;
  /**
   * Triadic activity — daily time tracking for Learn/Work/Play phases.
   * The kernel measures sovereign creator balance.
   */
  triadicActivity: {
    date: string;
    learn: number;
    work: number;
    play: number;
  };
  /** Completed triadic cycle dates (all 3 phases ≥ 60s in a day) */
  triadicHistory: string[];
}

const DEFAULT_CONFIG: KernelConfig = {
  typography: { userScale: 1.0 },
  palette: { mode: "image" },
  activePanel: "none",
  chatOpen: false,
  attention: { aperture: 0.3 },
  desktopWidgets: {},
  desktop: { widgetStates: {} },
  shortcutMastery: {},
  dragPositions: {},
  triadicActivity: { date: "", learn: 0, work: 0, play: 0 },
  triadicHistory: [],
};

// ═══════════════════════════════════════════════════════════════════════
// Widget-to-PID Registry — every widget IS a kernel process
// ═══════════════════════════════════════════════════════════════════════

/** Known widget types that the kernel can project */
export type WidgetType =
  | "coherence"
  | "day-progress"
  | "voice-orb"
  | "data-bank"
  | "focus-journal"
  | "observer"
  | "ai-chat"
  | "browser"
  | "compute"
  | "memory"
  | "messenger"
  | "terminal"
  | "jupyter"
  | "ambient";

/** Registry entry: maps a widget to its kernel process */
export interface WidgetProcess {
  readonly widgetType: WidgetType;
  readonly pid: number;
  readonly name: string;
  readonly defaultHScore: number;
}

// ═══════════════════════════════════════════════════════════════════════
// KernelProjector — The core projection engine
// ═══════════════════════════════════════════════════════════════════════

export class KernelProjector {
  private kernel: QKernelBoot | null = null;
  private scheduler = new QSched();
  private config: KernelConfig = { ...DEFAULT_CONFIG };
  private tickCount = 0;
  private widgetRegistry = new Map<WidgetType, number>(); // widget → PID
  private bootEvents: BootEvent[] = [];
  private listeners = new Set<(frame: ProjectionFrame) => void>();
  private bootListeners = new Set<(event: BootEvent) => void>();

  // ── Projection Stream Ticker ──────────────────────────────────────────
  private streamRafId = 0;
  private streamRunning = false;
  private lastFrameTime = 0;
  private lastEmittedFrame: ProjectionFrame | null = null;
  private dirty = false; // true when a syscall mutated config since last tick
  private idleTickMs = 100;  // 10 Hz idle
  private activeTickMs = 16; // ~60 Hz active
  private activeUntil = 0;   // timestamp: stay active until this time
  private readonly ACTIVE_WINDOW_MS = 2000; // stay at 60Hz for 2s after last syscall

  /** Subscribe to projection frames */
  onFrame(cb: (frame: ProjectionFrame) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** Subscribe to boot events (for the portal animation) */
  onBoot(cb: (event: BootEvent) => void): () => void {
    this.bootListeners.add(cb);
    return () => this.bootListeners.delete(cb);
  }

  /** Emit a boot event */
  private emitBoot(event: BootEvent): void {
    this.bootEvents.push(event);
    for (const cb of this.bootListeners) cb(event);
  }

  /** Emit a projection frame to all listeners */
  private emitFrame(frame: ProjectionFrame): void {
    this.lastEmittedFrame = frame;
    for (const cb of this.listeners) cb(frame);
  }

  /**
   * Mark config as dirty and boost to active tick rate.
   * Called by every syscall that mutates KernelConfig.
   */
  private markDirty(): void {
    this.dirty = true;
    this.activeUntil = performance.now() + this.ACTIVE_WINDOW_MS;
  }

  /**
   * Start the projection stream ticker.
   * Runs a rAF loop that emits frames at the configured rate:
   *   - 60 Hz when a syscall recently fired (active window)
   *   - 10 Hz when idle (observables like process stats still update)
   *
   * The ticker only projects a new frame when dirty OR when the
   * idle interval has elapsed (for live observable updates).
   */
  startStream(): void {
    if (this.streamRunning) return;
    this.streamRunning = true;
    this.lastFrameTime = performance.now();
    this.streamTick();
  }

  /** Stop the projection stream */
  stopStream(): void {
    this.streamRunning = false;
    if (this.streamRafId) {
      cancelAnimationFrame(this.streamRafId);
      this.streamRafId = 0;
    }
  }

  private streamTick = (): void => {
    if (!this.streamRunning) return;

    const now = performance.now();
    const isActive = now < this.activeUntil;
    const interval = isActive ? this.activeTickMs : this.idleTickMs;
    const elapsed = now - this.lastFrameTime;

    if (this.dirty || elapsed >= interval) {
      this.dirty = false;
      this.lastFrameTime = now;
      this.emitFrame(this.projectFrame());
    }

    this.streamRafId = requestAnimationFrame(this.streamTick);
  };

  /** Configure stream tick rates (in ms) */
  setStreamRates(idleMs: number, activeMs: number): void {
    this.idleTickMs = Math.max(16, idleMs);
    this.activeTickMs = Math.max(16, activeMs);
  }

  /** Get the last emitted frame (for interpolation) */
  getLastFrame(): ProjectionFrame | null {
    return this.lastEmittedFrame;
  }

  /**
   * Boot the kernel — the portal entry sequence.
   *
   * This runs the real Q-Boot sequence step by step, emitting
   * BootEvents that the surface adapter can render as the
   * "entering the portal" animation.
   */
  async boot(): Promise<QKernelBoot> {
    const t0 = performance.now();

    // Phase 0: Seed arrival
    this.emitBoot({
      stage: "off",
      label: "Seed Arrival",
      detail: "Kernel seed received. Verifying integrity…",
      progress: 0,
      passed: true,
      timestamp: Date.now(),
    });

    // Phase 1: POST — ring integrity
    this.emitBoot({
      stage: "post",
      label: "Ring Integrity",
      detail: "Verifying Z/256Z critical identity…",
      progress: 0.1,
      passed: true,
      timestamp: Date.now(),
    });

    const postResult = post();
    for (const check of postResult.checks) {
      this.emitBoot({
        stage: "post",
        label: check.name,
        detail: check.detail,
        progress: 0.1 + 0.15 * (postResult.checks.indexOf(check) / postResult.checks.length),
        passed: check.passed,
        timestamp: Date.now(),
      });
    }

    if (!postResult.allPassed) {
      this.emitBoot({
        stage: "panic",
        label: "POST FAILED",
        detail: "Ring integrity compromised. Kernel refuses to boot.",
        progress: 1,
        passed: false,
        timestamp: Date.now(),
      });
      throw new Error("Kernel POST failed: ring integrity compromised");
    }

    // Phase 2: Hardware (Atlas topology)
    this.emitBoot({
      stage: "bootloader",
      label: "Atlas Topology",
      detail: "Loading 96 vertices, 7 Fano lines, 48 mirror pairs…",
      progress: 0.3,
      passed: true,
      timestamp: Date.now(),
    });

    const hardware = loadHardware();

    this.emitBoot({
      stage: "bootloader",
      label: "Hardware Verified",
      detail: `${hardware.vertexCount} vertices, ${hardware.fanoLines} Fano lines, ${hardware.mirrorPairs} τ-pairs`,
      progress: 0.45,
      passed: hardware.verified,
      timestamp: Date.now(),
    });

    // Phase 3: Firmware (Cayley-Dickson)
    this.emitBoot({
      stage: "initrd",
      label: "Cayley-Dickson Tower",
      detail: "Hydrating ℝ → ℂ → ℍ → 𝕆 → 𝕊 adjunction chain…",
      progress: 0.55,
      passed: true,
      timestamp: Date.now(),
    });

    const firmware = hydrateFirmware();

    this.emitBoot({
      stage: "initrd",
      label: "Firmware Hydrated",
      detail: `${firmware.levels} algebras, triangles: ${firmware.triangleIdentitiesHold}, lossless: ${firmware.roundTripLossless}`,
      progress: 0.7,
      passed: firmware.triangleIdentitiesHold,
      timestamp: Date.now(),
    });

    // Phase 4: Genesis process
    this.emitBoot({
      stage: "init",
      label: "Genesis Process",
      detail: "Spawning PID 0 — the root of all computation…",
      progress: 0.8,
      passed: true,
      timestamp: Date.now(),
    });

    const genesis = await createGenesisProcess();
    this.scheduler.registerGenesis(genesis.sessionCid);

    this.emitBoot({
      stage: "init",
      label: "PID 0 Running",
      detail: `Session: ${genesis.sessionCid.slice(0, 24)}… H-score: 1.0`,
      progress: 0.9,
      passed: true,
      timestamp: Date.now(),
    });

    // Assemble full kernel state
    const { sha256: hashFn, computeCid: cidFn } = await import("@/modules/uns/core/address");
    const kernelPayload = new TextEncoder().encode(
      JSON.stringify({ post: true, hw: hardware.vertexCount, fw: firmware.levels, gen: genesis.sessionCid })
    );
    const kernelHash = await hashFn(kernelPayload);
    const kernelCid = await cidFn(kernelHash);

    this.kernel = {
      stage: "running",
      post: postResult,
      hardware,
      firmware,
      genesis,
      bootTimeMs: performance.now() - t0,
      kernelCid,
    };

    // Final boot event
    this.emitBoot({
      stage: "running",
      label: "Kernel Running",
      detail: `Boot complete in ${this.kernel.bootTimeMs.toFixed(0)}ms. CID: ${kernelCid.slice(0, 24)}…`,
      progress: 1,
      passed: true,
      timestamp: Date.now(),
    });

    // Load config from localStorage
    this.loadConfig();

    // Spawn widget processes
    await this.spawnWidgetProcesses();

    // Emit initial frame and start the projection stream
    this.emitFrame(this.projectFrame());
    this.startStream();

    return this.kernel;
  }

  /** Spawn kernel processes for each registered widget */
  private async spawnWidgetProcesses(): Promise<void> {
    const widgets: Array<{ type: WidgetType; name: string; hScore: number }> = [
      { type: "coherence", name: "coherence-observer", hScore: 0.95 },
      { type: "day-progress", name: "day-progress-ring", hScore: 0.85 },
      { type: "voice-orb", name: "voice-interface", hScore: 0.9 },
      { type: "data-bank", name: "data-bank-indicator", hScore: 0.7 },
      { type: "focus-journal", name: "focus-journal", hScore: 0.8 },
      { type: "observer", name: "observer-companion", hScore: 0.75 },
      { type: "ai-chat", name: "lumen-ai", hScore: 0.95 },
      { type: "browser", name: "web-browser", hScore: 0.6 },
      { type: "compute", name: "compute-projection", hScore: 0.65 },
      { type: "memory", name: "memory-projection", hScore: 0.7 },
      { type: "messenger", name: "messenger", hScore: 0.8 },
      { type: "terminal", name: "q-shell", hScore: 0.85 },
      { type: "jupyter", name: "jupyter-notebook", hScore: 0.7 },
      { type: "ambient", name: "ambient-player", hScore: 0.5 },
    ];

    for (const w of widgets) {
      const proc = await this.scheduler.fork(0, w.name, w.hScore);
      this.widgetRegistry.set(w.type, proc.pid);
    }
  }

  // ── Config Registers ─────────────────────────────────────────────────

  /** Read a config register */
  getConfig(): Readonly<KernelConfig> {
    return this.config;
  }

  /** Write a config register → marks dirty for next stream tick */
  setConfig(patch: Partial<KernelConfig>): void {
    this.config = { ...this.config, ...patch };
    this.saveConfig();
    this.markDirty();
  }

  /** Update typography scale */
  setUserScale(scale: number): void {
    this.config.typography.userScale = scale;
    this.saveConfig();
    this.markDirty();
  }

  /** Update palette mode */
  setPaletteMode(mode: DesktopMode): void {
    this.config.palette.mode = mode;
    this.saveConfig();
    this.markDirty();
  }

  /** Update widget visibility (via process state) */
  setWidgetVisible(widgetType: WidgetType, visible: boolean): void {
    const pid = this.widgetRegistry.get(widgetType);
    if (pid === undefined) return;

    const proc = this.scheduler.getProcess(pid);
    if (!proc) return;

    if (visible && proc.state === "frozen") {
      this.scheduler.thaw(pid);
    } else if (!visible && proc.state !== "frozen") {
      this.scheduler.freeze(pid);
    }

    this.markDirty();
  }

  /** Get PID for a widget type */
  getWidgetPid(widgetType: WidgetType): number | undefined {
    return this.widgetRegistry.get(widgetType);
  }

  // ── Panel & Desktop Projection Controls ─────────────────────────────

  /** Open a projection panel (kernel syscall: panel switch) */
  openPanel(panel: PanelId): void {
    if (panel === "chat") {
      this.config.chatOpen = true;
    } else {
      this.config.activePanel = panel;
      this.config.chatOpen = false;
    }
    this.saveConfig();
    this.markDirty();
  }

  /** Close the active projection panel */
  closePanel(): void {
    this.config.activePanel = "none";
    this.saveConfig();
    this.markDirty();
  }

  /** Toggle Lumen AI chat independently */
  setChatOpen(open: boolean): void {
    this.config.chatOpen = open;
    this.saveConfig();
    this.markDirty();
  }

  /** Switch desktop frame (kernel syscall: palette mode) */
  switchDesktop(mode: DesktopMode): void {
    this.config.palette.mode = mode;
    this.saveConfig();
    this.markDirty();
  }

  /** Get active panel */
  getActivePanel(): PanelId {
    return this.config.activePanel;
  }

  /** Get chat open state */
  isChatOpen(): boolean {
    return this.config.chatOpen;
  }

  /** Get active desktop mode */
  getDesktopMode(): DesktopMode {
    return this.config.palette.mode as DesktopMode;
  }

  // ── Attention Aperture (kernel register) ────────────────────────────

  /** Get current attention aperture (0–1) */
  getAperture(): number {
    return this.config.attention.aperture;
  }

  /** Get full attention projection (derived from aperture register) */
  getAttention(): AttentionProjection {
    const aperture = this.config.attention.aperture;
    const diffusion = 1 - aperture;
    const EPSILON = 0.01;
    return {
      aperture,
      preset: aperture >= 0.5 ? "focus" : "diffuse",
      snr: aperture / (diffusion + EPSILON),
      observerStratum: diffusion,
      distractionGate: Math.min(0.95, aperture * 0.9),
      showNotifications: diffusion >= 0.4,
      showExpanded: diffusion >= 0.5,
      sidebarExpanded: diffusion >= 0.6,
      animateBackground: diffusion >= 0.3,
      aiResponseStyle: aperture >= 0.5 ? "concise" : "exploratory",
    };
  }

  /** Set attention aperture — kernel syscall for focus/diffuse mode */
  setAperture(value: number): void {
    this.config.attention.aperture = Math.max(0, Math.min(1, value));
    this.saveConfig();
    this.markDirty();
  }

  // ── Desktop Widget Visibility (kernel register) ─────────────────────

  /** Get per-desktop widget state */
  getDesktopWidgets(desktopId: string): { hiddenWidgets: string[]; allHidden: boolean } {
    return this.config.desktopWidgets[desktopId] ?? { hiddenWidgets: [], allHidden: false };
  }

  /** Hide a widget on a specific desktop */
  hideDesktopWidget(desktopId: string, widgetId: string): void {
    const state = this.config.desktopWidgets[desktopId] ?? { hiddenWidgets: [], allHidden: false };
    if (!state.hiddenWidgets.includes(widgetId)) {
      state.hiddenWidgets = [...state.hiddenWidgets, widgetId];
    }
    this.config.desktopWidgets[desktopId] = state;
    this.saveConfig();
    this.markDirty();
  }

  /** Toggle all widgets on a specific desktop */
  toggleAllDesktopWidgets(desktopId: string): void {
    const state = this.config.desktopWidgets[desktopId] ?? { hiddenWidgets: [], allHidden: false };
    state.allHidden = !state.allHidden;
    this.config.desktopWidgets[desktopId] = state;
    this.saveConfig();
    this.markDirty();
  }

  /** Set allHidden for a specific desktop */
  setDesktopAllHidden(desktopId: string, hidden: boolean): void {
    const state = this.config.desktopWidgets[desktopId] ?? { hiddenWidgets: [], allHidden: false };
    state.allHidden = hidden;
    this.config.desktopWidgets[desktopId] = state;
    this.saveConfig();
    this.markDirty();
  }

  /** Check if a widget is visible on a specific desktop */
  isDesktopWidgetVisible(desktopId: string, widgetId: string): boolean {
    const state = this.config.desktopWidgets[desktopId] ?? { hiddenWidgets: [], allHidden: false };
    return !state.allHidden && !state.hiddenWidgets.includes(widgetId);
  }

  // ── Shortcut Mastery — learning-analytics register ────────────────

  private static readonly MASTERY_THRESHOLD = 6;

  /** Record a shortcut use — kernel syscall */
  recordShortcut(key: string): void {
    const count = (this.config.shortcutMastery[key] || 0) + 1;
    this.config.shortcutMastery = { ...this.config.shortcutMastery, [key]: count };
    this.saveConfig();
    this.markDirty();
  }

  /** Get hint opacity for a shortcut (1 = learning, 0 = mastered) */
  shortcutHintOpacity(key: string): number {
    const count = this.config.shortcutMastery[key] || 0;
    if (count >= KernelProjector.MASTERY_THRESHOLD) return 0;
    if (count >= 4) return 0.15;
    if (count >= 2) return 0.5;
    return 1;
  }

  /** Whether a shortcut is fully mastered */
  isShortcutMastered(key: string): boolean {
    return (this.config.shortcutMastery[key] || 0) >= KernelProjector.MASTERY_THRESHOLD;
  }

  // ── Drag Position — widget placement register ─────────────────────

  /** Get saved drag position for a key */
  getDragPosition(key: string): { x: number; y: number } | null {
    return this.config.dragPositions[key] ?? null;
  }

  /** Save drag position — kernel syscall */
  setDragPosition(key: string, pos: { x: number; y: number }): void {
    this.config.dragPositions = { ...this.config.dragPositions, [key]: pos };
    this.saveConfig();
  }

  // ── Triadic Activity — sovereign creator balance register ─────────

  /** Get current triadic activity state */
  getTriadicActivity(): KernelConfig["triadicActivity"] {
    return this.config.triadicActivity;
  }

  /** Get triadic cycle history */
  getTriadicHistory(): string[] {
    return this.config.triadicHistory;
  }

  /** Accumulate time for a triadic phase */
  accumulateTriadicPhase(phase: "learn" | "work" | "play", seconds: number): void {
    const today = new Date().toISOString().slice(0, 10);
    if (this.config.triadicActivity.date !== today) {
      this.archiveTriadicDay();
      this.config.triadicActivity = { date: today, learn: 0, work: 0, play: 0 };
    }
    this.config.triadicActivity = {
      ...this.config.triadicActivity,
      [phase]: this.config.triadicActivity[phase] + seconds,
    };
    this.saveConfig();
    this.markDirty();
  }

  /** Reset triadic activity for a new day */
  resetTriadicDay(): void {
    this.archiveTriadicDay();
    this.config.triadicActivity = { date: new Date().toISOString().slice(0, 10), learn: 0, work: 0, play: 0 };
    this.saveConfig();
    this.markDirty();
  }

  private archiveTriadicDay(): void {
    const s = this.config.triadicActivity;
    if (s.date && s.learn >= 60 && s.work >= 60 && s.play >= 60) {
      if (!this.config.triadicHistory.includes(s.date)) {
        this.config.triadicHistory = [...this.config.triadicHistory, s.date];
      }
    }
  }


  projectFrame(): ProjectionFrame {
    this.tickCount++;

    const processes = this.scheduler.allProcesses();
    const stats = this.scheduler.stats();

    // Compute viewport scale (will be overridden by CSS, but kernel knows)
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
    const scale = Math.max(0.75, Math.min(1.25, 0.5 + 0.5 * (viewportWidth - 1024) / 896));

    const panelProjections: PanelProjection[] = [];
    for (const [widgetType, pid] of this.widgetRegistry) {
      const proc = this.scheduler.getProcess(pid);
      if (!proc) continue;

      const widgetState = this.config.desktop.widgetStates[widgetType];

      panelProjections.push({
        pid,
        name: proc.name,
        widgetType,
        state: proc.state === "frozen" ? "hidden" : proc.state === "running" || proc.state === "ready" ? "visible" : "minimized",
        coherenceZone: proc.zone,
        hScore: proc.hScore,
        position: widgetState
          ? { x: widgetState.x, y: widgetState.y, w: widgetState.w, h: widgetState.h }
          : { x: 0, y: 0, w: 0.3, h: 0.3 },
        renderPriority: proc.hScore * 100,
      });
    }

    // Sort panels by render priority (high-coherence first)
    panelProjections.sort((a, b) => b.renderPriority - a.renderPriority);

    const processProjections: ProcessProjection[] = processes.map(p => ({
      pid: p.pid,
      name: p.name,
      state: p.state,
      hScore: p.hScore,
      zone: p.zone,
      cpuMs: p.totalCpuMs,
      childCount: p.children.length,
    }));

    const observables: ObservableProjection[] = [
      {
        id: "obs:system-coherence",
        label: "System Coherence",
        value: stats.meanHScore,
        unit: "H",
        zone: classifyZone(stats.meanHScore),
      },
      {
        id: "obs:process-count",
        label: "Active Processes",
        value: stats.totalProcesses - stats.haltedCount,
        unit: "proc",
        zone: "convergent",
      },
      {
        id: "obs:context-switches",
        label: "Context Switches",
        value: stats.contextSwitches,
        unit: "switches",
        zone: "convergent",
      },
    ];

    // Derive attention metrics from the aperture register
    const aperture = this.config.attention.aperture;
    const diffusion = 1 - aperture;
    const EPSILON = 0.01;

    return {
      tick: this.tickCount,
      timestamp: Date.now(),
      stage: this.kernel?.stage ?? "off",
      kernelCid: this.kernel?.kernelCid ?? "",
      panels: panelProjections,
      processes: processProjections,
      observables,
      typography: {
        scale,
        userScale: this.config.typography.userScale,
        basePx: 16 * scale * this.config.typography.userScale,
      },
      palette: {
        mode: this.config.palette.mode,
        bg: "hsl(25, 8%, 6%)",
        surface: "hsla(25, 10%, 12%, 0.65)",
        text: "hsl(38, 15%, 88%)",
        gold: "hsl(38, 40%, 62%)",
      },
      attention: {
        aperture,
        preset: aperture >= 0.5 ? "focus" : "diffuse",
        snr: aperture / (diffusion + EPSILON),
        observerStratum: diffusion,
        distractionGate: Math.min(0.95, aperture * 0.9),
        showNotifications: diffusion >= 0.4,
        showExpanded: diffusion >= 0.5,
        sidebarExpanded: diffusion >= 0.6,
        animateBackground: diffusion >= 0.3,
        aiResponseStyle: aperture >= 0.5 ? "concise" : "exploratory",
      },
      systemCoherence: {
        meanH: stats.meanHScore,
        zone: classifyZone(stats.meanHScore),
        processCount: stats.totalProcesses,
      },
    };
  }

  /** Get boot events (for replaying the portal animation) */
  getBootEvents(): readonly BootEvent[] {
    return this.bootEvents;
  }

  /** Get the scheduler (for advanced process management) */
  getScheduler(): QSched {
    return this.scheduler;
  }

  /** Get the kernel boot state */
  getKernel(): QKernelBoot | null {
    return this.kernel;
  }

  /** Is the kernel booted and running? */
  isRunning(): boolean {
    return this.kernel?.stage === "running";
  }

  // ── Persistence ──────────────────────────────────────────────────────

  private saveConfig(): void {
    try {
      localStorage.setItem("kernel:config", JSON.stringify(this.config));
    } catch { /* localStorage may be unavailable */ }
  }

  private loadConfig(): void {
    try {
      const stored = localStorage.getItem("kernel:config");
      if (stored) {
        const parsed = JSON.parse(stored);
        // Deep merge with defaults to handle new config registers
        this.config = {
          ...DEFAULT_CONFIG,
          ...parsed,
          typography: { ...DEFAULT_CONFIG.typography, ...parsed.typography },
          palette: { ...DEFAULT_CONFIG.palette, ...parsed.palette },
          attention: { ...DEFAULT_CONFIG.attention, ...parsed.attention },
          desktopWidgets: { ...DEFAULT_CONFIG.desktopWidgets, ...parsed.desktopWidgets },
          desktop: { ...DEFAULT_CONFIG.desktop, ...parsed.desktop },
          shortcutMastery: { ...DEFAULT_CONFIG.shortcutMastery, ...parsed.shortcutMastery },
          dragPositions: { ...DEFAULT_CONFIG.dragPositions, ...parsed.dragPositions },
          triadicActivity: { ...DEFAULT_CONFIG.triadicActivity, ...parsed.triadicActivity },
          triadicHistory: parsed.triadicHistory ?? DEFAULT_CONFIG.triadicHistory,
        };
      }

      // ── Migrate legacy localStorage keys into kernel config ──────────
      // Desktop mode
      const legacyBg = localStorage.getItem("hologram-bg-mode");
      if (legacyBg && (legacyBg === "image" || legacyBg === "white" || legacyBg === "dark")) {
        this.config.palette.mode = legacyBg;
      }
      // Attention aperture
      const legacyAttention = localStorage.getItem("hologram:attention-mode");
      if (legacyAttention !== null) {
        const val = parseFloat(legacyAttention);
        if (!isNaN(val) && val >= 0 && val <= 1) {
          this.config.attention.aperture = val;
        }
      }
      // Text size
      const legacyText = localStorage.getItem("hologram-text-size");
      if (legacyText) {
        const scaleMap: Record<string, number> = { compact: 0.9, default: 1.0, large: 1.15 };
        if (scaleMap[legacyText]) {
          this.config.typography.userScale = scaleMap[legacyText];
        }
      }
      // Desktop widget state
      const legacyWidgets = localStorage.getItem("hologram-desktop-widgets");
      if (legacyWidgets) {
        try {
          const parsed = JSON.parse(legacyWidgets);
          this.config.desktopWidgets = { ...this.config.desktopWidgets, ...parsed };
        } catch {}
      }
      // Shortcut mastery
      const legacyMastery = localStorage.getItem("hologram:shortcut-mastery");
      if (legacyMastery) {
        try {
          const parsed = JSON.parse(legacyMastery);
          this.config.shortcutMastery = { ...this.config.shortcutMastery, ...parsed };
        } catch {}
      }
      // Triadic activity
      const legacyTriadic = localStorage.getItem("hologram:triadic-activity");
      if (legacyTriadic) {
        try {
          const parsed = JSON.parse(legacyTriadic);
          if (parsed.date) this.config.triadicActivity = { ...this.config.triadicActivity, ...parsed };
        } catch {}
      }
      // Triadic history
      const legacyHistory = localStorage.getItem("hologram:triadic-history");
      if (legacyHistory) {
        try {
          const parsed = JSON.parse(legacyHistory);
          if (Array.isArray(parsed)) this.config.triadicHistory = [...new Set([...this.config.triadicHistory, ...parsed])];
        } catch {}
      }
      // Drag positions — migrate any hologram-pos:* keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("hologram-pos:") && !this.config.dragPositions[key]) {
          try {
            const parsed = JSON.parse(localStorage.getItem(key)!);
            if (typeof parsed.x === "number" && typeof parsed.y === "number") {
              this.config.dragPositions[key] = { x: parsed.x, y: parsed.y };
            }
          } catch {}
        }
      }

      this.config.chatOpen = false;
    } catch { /* use defaults */ }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Singleton — one kernel per runtime
// ═══════════════════════════════════════════════════════════════════════

let _instance: KernelProjector | null = null;

/** Get the singleton kernel projector */
export function getKernelProjector(): KernelProjector {
  if (!_instance) {
    _instance = new KernelProjector();
  }
  return _instance;
}
