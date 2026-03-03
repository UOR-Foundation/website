/**
 * Platform Utilities — Internalized common helpers
 * ═════════════════════════════════════════════════
 *
 * Small, self-contained utilities. Zero npm dependencies.
 *
 * @module hologram/platform/utils
 */

/** SHA-256 hex digest of a UTF-8 string. */
export async function sha256hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Check if viewport is mobile-width. */
export function isMobileViewport(breakpoint = 768): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < breakpoint;
}

/** Minimal kernel logger — replaces external kernelLog dependency. */
export function kernelLog(
  subsystem: string,
  action: string,
  detail?: string,
  meta?: Record<string, unknown>,
): void {
  if (typeof console !== "undefined") {
    console.debug(`[kernel:${subsystem}] ${action}${detail ? ` — ${detail}` : ""}`, meta ?? "");
  }
}
