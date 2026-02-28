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

  // Subscribe to projection frames
  useEffect(() => {
    const unsub = projector.onFrame((f) => {
      setFrame(f);
      setStage(f.stage);
      adapter.applyFrame(f);
    });
    return unsub;
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
    projector.setPaletteMode(mode as "dark" | "light" | "image");
  }, [projector]);

  const setWidgetVisible = useCallback((type: WidgetType, visible: boolean) => {
    projector.setWidgetVisible(type, visible);
  }, [projector]);

  const getWidgetPid = useCallback((type: WidgetType) => {
    return projector.getWidgetPid(type);
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

    // Kernel syscalls
    openPanel,
    closePanel,
    setChatOpen,
    switchDesktop,
    setUserScale,
    setPaletteMode,
    setWidgetVisible,
    getWidgetPid,
    config: projector.getConfig(),
    bootTimeMs: kernel?.bootTimeMs ?? 0,
  };
}
