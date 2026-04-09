/**
 * Sovereign Bus — Module Registry.
 * ═════════════════════════════════════════════════════════════════
 *
 * A Map<string, OperationDescriptor> keyed by "ns/op".
 * Modules register at import time. The bus reads this at dispatch.
 *
 * @version 1.0.0
 */

import type { ModuleRegistration, OperationDescriptor, Middleware } from "./types";

// ── Internal State ────────────────────────────────────────────────────────

const _methods = new Map<string, OperationDescriptor>();
const _modules = new Map<string, ModuleRegistration>();
const _middleware: Middleware[] = [];

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Register a module and all its operations on the bus.
 * Calling register() twice with the same ns replaces the previous registration.
 */
export function register(mod: ModuleRegistration): void {
  _modules.set(mod.ns, mod);
  for (const [opName, descriptor] of Object.entries(mod.operations)) {
    const key = `${mod.ns}/${opName}`;
    // Inherit module-level remote flag if op doesn't override
    if (descriptor.remote === undefined && mod.defaultRemote) {
      descriptor.remote = true;
    }
    _methods.set(key, descriptor);
  }
}

/** Resolve a method string ("kernel/derive") to its descriptor */
export function resolve(method: string): OperationDescriptor | undefined {
  return _methods.get(method);
}

/** Check if a method is registered */
export function has(method: string): boolean {
  return _methods.has(method);
}

/** Get all registered method names */
export function listMethods(): string[] {
  return Array.from(_methods.keys());
}

/** Get all registered modules */
export function listModules(): ModuleRegistration[] {
  return Array.from(_modules.values());
}

/** Get a module registration by namespace */
export function getModule(ns: string): ModuleRegistration | undefined {
  return _modules.get(ns);
}

/** Get all registered methods with their descriptors (for introspection) */
export function allDescriptors(): Map<string, OperationDescriptor> {
  return new Map(_methods);
}

// ── Middleware ─────────────────────────────────────────────────────────────

/** Add a middleware function to the bus pipeline */
export function use(mw: Middleware): void {
  _middleware.push(mw);
}

/** Get the middleware stack (read-only) */
export function getMiddleware(): readonly Middleware[] {
  return _middleware;
}

/** Clear all registrations (for testing) */
export function _reset(): void {
  _methods.clear();
  _modules.clear();
  _middleware.length = 0;
}
