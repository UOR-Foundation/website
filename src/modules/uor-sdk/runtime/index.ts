/**
 * UOR SDK — Runtime Module Barrel
 *
 * Complete Build→Ship→Run pipeline for vibe-coded applications.
 *
 * Build:  Import source → content-addressed UorImage
 * Ship:   Push to registry + create deployment snapshot
 * Run:    WASM sandbox with execution tracing
 */

// ── Build ───────────────────────────────────────────────────────────────────
export { buildAppImage } from "./image-builder";
export type { ImageBuildOptions, ImageBuildResult } from "./image-builder";

// ── Ship ────────────────────────────────────────────────────────────────────
export { shipApp } from "./registry-ship";
export type { ShipInput, ShipResult } from "./registry-ship";

// ── Run ─────────────────────────────────────────────────────────────────────
export {
  runApp,
  listInstances,
  getInstance,
  stopAll,
  getRuntimeStatus,
} from "./wasm-loader";
export type {
  WasmRuntimeConfig,
  WasmAppInstance,
  RuntimeStatus,
} from "./wasm-loader";
