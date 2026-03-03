/**
 * kernel/lib/invariants — Runtime Assertion Helpers
 * ≡ Linux lib/bug.c — BUG_ON(), WARN_ON(), BUILD_BUG_ON()
 *
 * Kernel-internal assertion primitives. When an invariant fails,
 * these produce structured diagnostics rather than silent corruption.
 */

/** Kernel panic — unrecoverable invariant violation (≡ BUG_ON) */
export function kernelPanic(subsystem: string, message: string): never {
  const msg = `[KERNEL PANIC] ${subsystem}: ${message}`;
  console.error(msg);
  throw new Error(msg);
}

/** Warning — invariant concern but recoverable (≡ WARN_ON) */
export function kernelWarn(subsystem: string, message: string): void {
  console.warn(`[KERNEL WARN] ${subsystem}: ${message}`);
}

/** Assert condition or panic (≡ BUG_ON(!condition)) */
export function kernelAssert(condition: boolean, subsystem: string, message: string): asserts condition {
  if (!condition) kernelPanic(subsystem, message);
}

/** Assert at type level — compile-time exhaustiveness check (≡ BUILD_BUG_ON) */
export function assertNever(x: never, subsystem: string): never {
  return kernelPanic(subsystem, `Unexpected value: ${x}`);
}

/** Bounded value assertion — clamp and warn if out of range */
export function kernelClamp(value: number, min: number, max: number, subsystem: string, label: string): number {
  if (value < min || value > max) {
    kernelWarn(subsystem, `${label}=${value} outside [${min},${max}], clamping`);
    return Math.max(min, Math.min(max, value));
  }
  return value;
}
