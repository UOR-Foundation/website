/**
 * Platform Utilities — Internalized common helpers
 * ═════════════════════════════════════════════════
 *
 * Small, self-contained utilities that eliminate external deps.
 *
 * @module hologram/platform/utils
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind class merge (replaces @/lib/utils). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** SHA-256 hex digest of a UTF-8 string (replaces @/lib/crypto). */
export async function sha256hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Check if viewport is mobile-width (replaces @/hooks/use-mobile). */
export function isMobileViewport(breakpoint = 768): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < breakpoint;
}
