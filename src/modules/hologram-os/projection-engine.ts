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
export type DesktopMode = "image" | "white" | "dark" | "light";

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
  desktop: {
    widgetStates: Record<string, {
      x: number; y: number; w: number; h: number;
      visible: boolean;
      dockedTo?: string;
    }>;
  };
}

const DEFAULT_CONFIG: KernelConfig = {
  typography: { userScale: 1.0 },
  palette: { mode: "image" },
  activePanel: "none",
  chatOpen: false,
  desktop: { widgetStates: {} },
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
    for (const cb of this.listeners) cb(frame);
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

    // Emit initial frame
    this.emitFrame(this.projectFrame());

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

  /** Write a config register and re-project */
  setConfig(patch: Partial<KernelConfig>): void {
    this.config = { ...this.config, ...patch };
    this.saveConfig();
    this.emitFrame(this.projectFrame());
  }

  /** Update typography scale */
  setUserScale(scale: number): void {
    this.config.typography.userScale = scale;
    this.saveConfig();
    this.emitFrame(this.projectFrame());
  }

  /** Update palette mode */
  setPaletteMode(mode: "dark" | "light" | "image"): void {
    this.config.palette.mode = mode;
    this.saveConfig();
    this.emitFrame(this.projectFrame());
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

    this.emitFrame(this.projectFrame());
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
      this.config.chatOpen = false; // exclusive with overlays
    }
    this.saveConfig();
    this.emitFrame(this.projectFrame());
  }

  /** Close the active projection panel */
  closePanel(): void {
    this.config.activePanel = "none";
    this.saveConfig();
    this.emitFrame(this.projectFrame());
  }

  /** Toggle Lumen AI chat independently */
  setChatOpen(open: boolean): void {
    this.config.chatOpen = open;
    this.saveConfig();
    this.emitFrame(this.projectFrame());
  }

  /** Switch desktop frame (kernel syscall: palette mode) */
  switchDesktop(mode: DesktopMode): void {
    this.config.palette.mode = mode;
    this.saveConfig();
    this.emitFrame(this.projectFrame());
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

  /** Project the current kernel state into a frame */
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
        this.config = { ...DEFAULT_CONFIG, ...parsed };
      }
      // Backward compat: migrate legacy desktop mode preference
      const legacyBg = localStorage.getItem("hologram-bg-mode");
      if (legacyBg && (legacyBg === "image" || legacyBg === "white" || legacyBg === "dark")) {
        this.config.palette.mode = legacyBg;
      }
      // Always reset transient state on boot (panels closed)
      this.config.activePanel = "none";
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
