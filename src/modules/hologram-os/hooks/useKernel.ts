/**
 * useKernel — React hook for the Q-Linux kernel projection
 * ═════════════════════════════════════════════════════════
 *
 * Provides React components access to the kernel's projection engine.
 * This is the React-side consumer of ProjectionFrames.
 *
 * Usage:
 *   const { frame, isBooted, boot, bootEvents } = useKernel();
 *
 * The kernel boots once. Subsequent calls to useKernel() share
 * the same singleton KernelProjector.
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
  /** Set user text scale (0.9 | 1.0 | 1.15) */
  setUserScale: (scale: number) => void;
  /** Set palette mode */
  setPaletteMode: (mode: "dark" | "light" | "image") => void;
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
      // Let the surface adapter translate frame → DOM
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

  const setUserScale = useCallback((scale: number) => {
    projector.setUserScale(scale);
  }, [projector]);

  const setPaletteMode = useCallback((mode: "dark" | "light" | "image") => {
    projector.setPaletteMode(mode);
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
    setUserScale,
    setPaletteMode,
    setWidgetVisible,
    getWidgetPid,
    config: projector.getConfig(),
    bootTimeMs: kernel?.bootTimeMs ?? 0,
  };
}
