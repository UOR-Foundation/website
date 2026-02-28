/**
 * useKernel — React hook for the Q-Linux kernel projection
 * ═════════════════════════════════════════════════════════
 *
 * Provides React components access to the kernel's projection engine.
 * This is the React-side consumer of ProjectionFrames.
 *
 * ALL UI state flows through this hook. Components never manage their
 * own visibility or mode — they read from the kernel's projection.
 *
 * Usage:
 *   const k = useKernel();
 *   k.openPanel("browser");   // kernel syscall → re-projection
 *   k.activePanel              // derived from frame
 *   k.desktopMode              // derived from frame
 *
 * @module hologram-os/hooks/useKernel
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getKernelProjector,
  type ProjectionFrame,
  type BootEvent,
  type WidgetType,
  type KernelConfig,
  type PanelId,
  type DesktopMode,
} from "../projection-engine";
import { getBrowserAdapter } from "../surface-adapter";
import type { QKernelBoot, BootStage } from "@/modules/qkernel/q-boot";

export interface UseKernelResult {
  /** Current projection frame (null before boot) */
  frame: ProjectionFrame | null;
  /** Boot events for the portal animation */
  bootEvents: BootEvent[];
  /** Current boot stage */
  stage: BootStage;
  /** Whether the kernel is fully booted */
  isBooted: boolean;
  /** Whether boot is in progress */
  isBooting: boolean;
  /** Boot the kernel (call once) */
  boot: () => Promise<QKernelBoot>;
  /** Full kernel boot result */
  kernel: QKernelBoot | null;

  // ── Projection-derived state (read from kernel frame) ─────────────
  /** Active projection panel — derived from kernel config */
  activePanel: PanelId;
  /** Whether Lumen AI chat is open */
  chatOpen: boolean;
  /** Active desktop mode — derived from kernel palette */
  desktopMode: DesktopMode;
  /** Attention aperture (0–1) — derived from kernel config */
  aperture: number;

  // ── Kernel syscalls (write to kernel → triggers re-projection) ────
  /** Open a projection panel */
  openPanel: (panel: PanelId) => void;
  /** Close the active projection panel */
  closePanel: () => void;
  /** Set chat open state */
  setChatOpen: (open: boolean) => void;
  /** Switch desktop frame */
  switchDesktop: (mode: DesktopMode) => void;
  /** Set user text scale (0.9 | 1.0 | 1.15) */
  setUserScale: (scale: number) => void;
  /** Set palette mode */
  setPaletteMode: (mode: DesktopMode) => void;
  /** Set widget visibility */
  setWidgetVisible: (type: WidgetType, visible: boolean) => void;
  /** Get PID for a widget */
  getWidgetPid: (type: WidgetType) => number | undefined;
  /** Set attention aperture (0–1) */
  setAperture: (value: number) => void;
  /** Hide a widget on a desktop */
  hideDesktopWidget: (desktopId: string, widgetId: string) => void;
  /** Toggle all widgets on a desktop */
  toggleAllDesktopWidgets: (desktopId: string) => void;
  /** Set all-hidden for a desktop */
  setDesktopAllHidden: (desktopId: string, hidden: boolean) => void;
  /** Check if a widget is visible on a desktop */
  isDesktopWidgetVisible: (desktopId: string, widgetId: string) => boolean;
  /** Record a shortcut use — learning-analytics kernel syscall */
  recordShortcut: (key: string) => void;
  /** Get hint opacity for a shortcut (1 = learning, 0 = mastered) */
  shortcutHintOpacity: (key: string) => number;
  /** Whether a shortcut is fully mastered */
  isShortcutMastered: (key: string) => boolean;
  /** Record a human interaction for breathing rhythm */
  recordInteraction: () => void;
  /** Current breath period in ms */
  breathPeriodMs: number;
  /** Full breathing rhythm state */
  breathingRhythm: {
    intervals: number[];
    breathPeriodMs: number;
    lastEventAt: number;
    eventCount: number;
    dwellMs: number;
  };
  /** Current kernel config */
  config: Readonly<KernelConfig>;
  /** Boot time in ms */
  bootTimeMs: number;
}

export function useKernel(): UseKernelResult {
  const projector = getKernelProjector();
  const adapter = getBrowserAdapter();

  const [frame, setFrame] = useState<ProjectionFrame | null>(null);
  const [bootEvents, setBootEvents] = useState<BootEvent[]>([]);
  const [stage, setStage] = useState<BootStage>("off");
  const [isBooting, setIsBooting] = useState(false);
  const [kernel, setKernel] = useState<QKernelBoot | null>(null);
  const bootedRef = useRef(false);

  // Subscribe to projection frames + start interpolation
  useEffect(() => {
    const unsub = projector.onFrame((f) => {
      setFrame(f);
      setStage(f.stage);
      adapter.applyFrame(f);
    });
    // Start interpolation loop (60fps smoothing between kernel ticks)
    adapter.startInterpolation();
    return () => {
      unsub();
      adapter.stopInterpolation();
    };
  }, [projector, adapter]);

  // Subscribe to boot events
  useEffect(() => {
    const unsub = projector.onBoot((event) => {
      setBootEvents(prev => [...prev, event]);
      setStage(event.stage);
    });
    return unsub;
  }, [projector]);

  // If kernel is already booted (e.g., hot module reload), sync state
  useEffect(() => {
    if (projector.isRunning()) {
      const k = projector.getKernel();
      setKernel(k);
      setStage("running");
      setFrame(projector.projectFrame());
      setBootEvents([...projector.getBootEvents()]);
      bootedRef.current = true;
    }
  }, [projector]);

  const bootKernel = useCallback(async () => {
    if (bootedRef.current || isBooting) {
      return projector.getKernel()!;
    }
    setIsBooting(true);
    try {
      const result = await projector.boot();
      setKernel(result);
      bootedRef.current = true;
      return result;
    } finally {
      setIsBooting(false);
    }
  }, [projector, isBooting]);

  // ── Kernel syscalls ───────────────────────────────────────────────────

  const openPanel = useCallback((panel: PanelId) => {
    projector.openPanel(panel);
  }, [projector]);

  const closePanel = useCallback(() => {
    projector.closePanel();
  }, [projector]);

  const setChatOpen = useCallback((open: boolean) => {
    projector.setChatOpen(open);
  }, [projector]);

  const switchDesktop = useCallback((mode: DesktopMode) => {
    projector.switchDesktop(mode);
  }, [projector]);

  const setUserScale = useCallback((scale: number) => {
    projector.setUserScale(scale);
  }, [projector]);

  const setPaletteMode = useCallback((mode: DesktopMode) => {
    projector.setPaletteMode(mode);
  }, [projector]);

  const setWidgetVisible = useCallback((type: WidgetType, visible: boolean) => {
    projector.setWidgetVisible(type, visible);
  }, [projector]);

  const getWidgetPid = useCallback((type: WidgetType) => {
    return projector.getWidgetPid(type);
  }, [projector]);

  const setAperture = useCallback((value: number) => {
    projector.setAperture(value);
  }, [projector]);

  const hideDesktopWidget = useCallback((desktopId: string, widgetId: string) => {
    projector.hideDesktopWidget(desktopId, widgetId);
  }, [projector]);

  const toggleAllDesktopWidgets = useCallback((desktopId: string) => {
    projector.toggleAllDesktopWidgets(desktopId);
  }, [projector]);

  const setDesktopAllHidden = useCallback((desktopId: string, hidden: boolean) => {
    projector.setDesktopAllHidden(desktopId, hidden);
  }, [projector]);

  const isDesktopWidgetVisible = useCallback((desktopId: string, widgetId: string) => {
    return projector.isDesktopWidgetVisible(desktopId, widgetId);
  }, [projector]);

  const recordShortcut = useCallback((key: string) => {
    projector.recordShortcut(key);
  }, [projector]);

  const shortcutHintOpacity = useCallback((key: string) => {
    return projector.shortcutHintOpacity(key);
  }, [projector]);

  const isShortcutMastered = useCallback((key: string) => {
    return projector.isShortcutMastered(key);
  }, [projector]);

  const recordInteraction = useCallback(() => {
    projector.recordInteraction();
  }, [projector]);

  return {
    frame,
    bootEvents,
    stage,
    isBooted: kernel?.stage === "running",
    isBooting,
    boot: bootKernel,
    kernel,

    // Projection-derived state — single source of truth from kernel
    activePanel: projector.getActivePanel(),
    chatOpen: projector.isChatOpen(),
    desktopMode: projector.getDesktopMode(),
    aperture: projector.getAperture(),

    // Kernel syscalls
    openPanel,
    closePanel,
    setChatOpen,
    switchDesktop,
    setUserScale,
    setPaletteMode,
    setWidgetVisible,
    getWidgetPid,
    setAperture,
    hideDesktopWidget,
    toggleAllDesktopWidgets,
    setDesktopAllHidden,
    isDesktopWidgetVisible,
    recordShortcut,
    shortcutHintOpacity,
    isShortcutMastered,
    recordInteraction,
    breathPeriodMs: projector.getBreathPeriodMs(),
    breathingRhythm: projector.getBreathingRhythm(),
    config: projector.getConfig(),
    bootTimeMs: kernel?.bootTimeMs ?? 0,
  };
}
