/**
 * UOR Module Registry.
 * Loads all module manifests, computes content-addressed identities,
 * validates the dependency graph, and exposes a typed registry API.
 */

import {
  computeModuleIdentity,
  stripSelfReferentialFields,
  canonicalJsonLd,
  computeCid,
  type ModuleIdentity,
} from "./uor-address";
import { generateCertificate, type UorCertificate } from "./uor-certificate";

// Static manifest imports — Vite handles JSON natively
import coreManifest from "@/modules/core/module.json";
import landingManifest from "@/modules/landing/module.json";
import frameworkManifest from "@/modules/framework/module.json";
import communityManifest from "@/modules/community/module.json";
import projectsManifest from "@/modules/projects/module.json";
import donateManifest from "@/modules/donate/module.json";
import apiExplorerManifest from "@/modules/api-explorer/module.json";

// ── Types ───────────────────────────────────────────────────────────────────

export interface RegisteredModule {
  manifest: Record<string, unknown>;
  identity: ModuleIdentity;
  certificate: UorCertificate;
  verified: boolean;
}

export interface ModuleRegistry {
  modules: Map<string, RegisteredModule>;
  initialized: boolean;
}

// ── Registry singleton ──────────────────────────────────────────────────────

const registry: ModuleRegistry = {
  modules: new Map(),
  initialized: false,
};

// Listeners for initialization
const initListeners: Array<() => void> = [];

export function onRegistryInitialized(cb: () => void): () => void {
  if (registry.initialized) {
    cb();
    return () => {};
  }
  initListeners.push(cb);
  return () => {
    const idx = initListeners.indexOf(cb);
    if (idx >= 0) initListeners.splice(idx, 1);
  };
}

const RAW_MANIFESTS: Record<string, Record<string, unknown>> = {
  core: coreManifest as unknown as Record<string, unknown>,
  landing: landingManifest as unknown as Record<string, unknown>,
  framework: frameworkManifest as unknown as Record<string, unknown>,
  community: communityManifest as unknown as Record<string, unknown>,
  projects: projectsManifest as unknown as Record<string, unknown>,
  donate: donateManifest as unknown as Record<string, unknown>,
  "api-explorer": apiExplorerManifest as unknown as Record<string, unknown>,
};

// ── Initialization ──────────────────────────────────────────────────────────

export async function initializeRegistry(): Promise<ModuleRegistry> {
  if (registry.initialized) return registry;

  const entries = Object.entries(RAW_MANIFESTS);

  // Compute identities and certificates in parallel
  const results = await Promise.all(
    entries.map(async ([name, manifest]) => {
      const identity = await computeModuleIdentity(manifest);
      const certificate = await generateCertificate(
        `module:${name}`,
        stripSelfReferentialFields(manifest)
      );
      return { name, manifest, identity, certificate };
    })
  );

  for (const { name, manifest, identity, certificate } of results) {
    registry.modules.set(name, {
      manifest,
      identity,
      certificate,
      verified: true, // freshly computed
    });
  }

  // Validate dependency graph
  validateDependencies();

  registry.initialized = true;
  initListeners.forEach((cb) => cb());
  initListeners.length = 0;

  console.log(
    `[UOR Registry] Initialized ${registry.modules.size} modules with content-addressed identities.`
  );

  return registry;
}

// ── Dependency validation ───────────────────────────────────────────────────

function validateDependencies(): void {
  for (const [name, mod] of registry.modules) {
    const deps = (mod.manifest as Record<string, unknown>).dependencies as
      | Record<string, string>
      | undefined;
    if (!deps) continue;
    for (const depName of Object.keys(deps)) {
      if (!registry.modules.has(depName)) {
        console.warn(
          `[UOR Registry] Module "${name}" declares dependency "${depName}" which is not registered.`
        );
      }
    }
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

export function getModule(name: string): RegisteredModule | undefined {
  return registry.modules.get(name);
}

export function getAllModules(): Map<string, RegisteredModule> {
  return registry.modules;
}

/**
 * Re-compute the CID for a module and compare to its stored identity.
 * Returns true if the module is unmodified.
 */
export async function verifyModule(name: string): Promise<boolean> {
  const mod = registry.modules.get(name);
  if (!mod) return false;

  const clean = stripSelfReferentialFields(mod.manifest);
  const canonical = canonicalJsonLd(clean);
  const bytes = new TextEncoder().encode(canonical);
  const recomputedCid = await computeCid(bytes);

  const verified = recomputedCid === mod.identity.cid;
  mod.verified = verified;

  return verified;
}

/**
 * Verify all registered modules. Returns a map of name → verified status.
 */
export async function verifyAllModules(): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();
  const names = Array.from(registry.modules.keys());

  const checks = await Promise.all(names.map((n) => verifyModule(n)));
  names.forEach((n, i) => results.set(n, checks[i]));

  return results;
}

export function isRegistryInitialized(): boolean {
  return registry.initialized;
}
