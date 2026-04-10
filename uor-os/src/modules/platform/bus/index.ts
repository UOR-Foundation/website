/**
 * Service Mesh — Barrel Export.
 * @ontology uor:ServiceMesh
 * ═════════════════════════════════════════════════════════════════
 *
 * The canonical entry point for the entire system.
 *
 *   import { bus } from "@/modules/platform/bus";
 *   const result = await bus.call("kernel/derive", payload);
 *
 * @version 2.0.0
 */

// Re-export types
export type {
  RpcRequest,
  RpcResponse,
  RpcSuccess,
  RpcError,
  SovereignResult,
  BusHandler,
  OperationDescriptor,
  ModuleRegistration,
  Middleware,
  BusContext,
} from "./types";
export { RPC_ERRORS } from "./types";

// Re-export registry
export { register, resolve, has, listMethods, listModules, use } from "./registry";

// Re-export bus core
export { call, batch, canCall, isReachable } from "./bus";

// Re-export introspection
export { registerIntrospect } from "./introspect";
export type { DiscoverResult, MethodInfo } from "./introspect";

// Re-export external client
export { createSovereignClient } from "./client";
export type { SovereignClientConfig } from "./client";

// Re-export middleware
export { timingMiddleware, loggingMiddleware } from "./middleware";

// Re-export manifest
export { BUS_MANIFEST, getRemoteMethods, getLocalMethods, isInManifest } from "./manifest";
export type { ManifestEntry, ManifestModule } from "./manifest";

// Re-export hooks
export { useBusCall, useBusLazy, useBusReachable } from "./hooks";
export type { BusCallState } from "./hooks";

// Re-export boot module
export { useBootStatus, EngineStatusIndicator } from "@/modules/platform/boot";

// ── Convenience namespace ─────────────────────────────────────────────────

import { call, batch, canCall, isReachable } from "./bus";
import { register, listMethods, listModules, use } from "./registry";
import { registerIntrospect } from "./introspect";
import { timingMiddleware, loggingMiddleware } from "./middleware";

/**
 * The Sovereign Bus — single namespace for the entire API surface.
 *
 * @example
 * import { bus } from "@/modules/platform/bus";
 * bus.init();
 * const result = await bus.call("kernel/derive", { content: "hello" });
 */
export const bus = {
  call,
  batch,
  canCall,
  isReachable,
  register,
  listMethods,
  listModules,
  use,

  /**
   * Initialize the bus with default middleware and introspection.
   * Call once at app startup.
   */
  init() {
    use(timingMiddleware);
    use(loggingMiddleware);
    registerIntrospect();
    // Module registrations are loaded via side-effect imports
    // in the modules that call register()
  },
} as const;

/**
 * Initialize the full sovereign engine: load WASM + init bus.
 * Call once at app startup for complete sovereign bootstrap.
 */
export async function loadEngine(): Promise<void> {
  const { loadWasm } = await import("@/lib/wasm/uor-bridge");
  await loadWasm();
  bus.init();
}
