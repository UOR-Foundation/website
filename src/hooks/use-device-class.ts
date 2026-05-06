import { useEffect, useState } from "react";

export type DeviceClass = "low" | "mid" | "high";

/**
 * Cheap device-class heuristic. Used to gate expensive animations.
 *  - low:  prefers-reduced-motion, or hardwareConcurrency <= 4, or deviceMemory <= 4
 *  - mid:  hardwareConcurrency <= 8
 *  - high: anything else
 * Always "high" during SSR / first paint to avoid hydration jumps.
 */
export function useDeviceClass(): DeviceClass {
  const [cls, setCls] = useState<DeviceClass>("high");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const cores = (navigator as any).hardwareConcurrency ?? 8;
    const mem = (navigator as any).deviceMemory ?? 8;
    if (reduced || cores <= 4 || mem <= 4) setCls("low");
    else if (cores <= 8) setCls("mid");
    else setCls("high");
  }, []);

  return cls;
}