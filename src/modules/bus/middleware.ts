/**
 * Sovereign Bus — Built-in Middleware.
 * ═════════════════════════════════════════════════════════════════
 *
 * Pluggable cross-cutting concerns applied to every local bus call.
 *
 * @version 1.0.0
 */

import type { Middleware, BusContext, NextFn } from "./types";

/**
 * Timing middleware — stamps ctx.meta.elapsed after execution.
 */
export const timingMiddleware: Middleware = async (
  ctx: BusContext,
  next: NextFn,
) => {
  const result = await next();
  ctx.meta.elapsed = performance.now() - ctx.startTime;
  return result;
};

/**
 * Logging middleware — logs method calls to console in development.
 */
export const loggingMiddleware: Middleware = async (
  ctx: BusContext,
  next: NextFn,
) => {
  try {
    const result = await next();
    if (import.meta.env.DEV) {
      console.debug(
        `[bus] ${ctx.method} → ${(ctx.meta.elapsed as number)?.toFixed(1) ?? "?"}ms`,
      );
    }
    return result;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.error(`[bus] ${ctx.method} ✗`, err);
    }
    throw err;
  }
};
