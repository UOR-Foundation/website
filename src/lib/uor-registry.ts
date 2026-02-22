/**
 * UOR Module Registry.
 * Loads all 26 module manifests, computes content-addressed identities,
 * validates the dependency graph, and exposes a typed registry API.
 *
 * Every registered module receives:
 *  - A CIDv1 content hash (deterministic identity)
 *  - A UOR Braille address (algebraic identity)
 *  - A cert:ModuleCertificate (self-verification receipt)
 */

import {
  computeModuleIdentity,
  stripSelfReferentialFields,
  canonicalJsonLd,
  computeCid,
  type ModuleIdentity,
} from "./uor-address";
import { generateCertificate, type UorCertificate } from "./uor-certificate";

// ── Static manifest imports (all 26 modules) ───────────────────────────────

// Layer 0: Presentation & Shell
import coreManifest from "@/modules/core/module.json";
import landingManifest from "@/modules/landing/module.json";
import frameworkManifest from "@/modules/framework/module.json";
import communityManifest from "@/modules/community/module.json";
import projectsManifest from "@/modules/projects/module.json";
import donateManifest from "@/modules/donate/module.json";
import apiExplorerManifest from "@/modules/api-explorer/module.json";

// Layer 1: Algebraic CPU
import ringCoreManifest from "@/modules/ring-core/module.json";
import identityManifest from "@/modules/identity/module.json";
import triadManifest from "@/modules/triad/module.json";

// Layer 2: Derivation & KG
import derivationManifest from "@/modules/derivation/module.json";
import kgStoreManifest from "@/modules/kg-store/module.json";
import jsonldManifest from "@/modules/jsonld/module.json";
import epistemicManifest from "@/modules/epistemic/module.json";

// Layer 3: Structure & Resolution
import shaclManifest from "@/modules/shacl/module.json";
import sparqlManifest from "@/modules/sparql/module.json";
import resolverManifest from "@/modules/resolver/module.json";
import semanticIndexManifest from "@/modules/semantic-index/module.json";
import morphismManifest from "@/modules/morphism/module.json";

// Layer 4: Observability & State
import observableManifest from "@/modules/observable/module.json";
import traceManifest from "@/modules/trace/module.json";
import stateManifest from "@/modules/state/module.json";

// Layer 5: Verification & Agent Tools
import selfVerifyManifest from "@/modules/self-verify/module.json";
import agentToolsManifest from "@/modules/agent-tools/module.json";
import codeKgManifest from "@/modules/code-kg/module.json";
import dashboardManifest from "@/modules/dashboard/module.json";

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
  // Presentation & Shell
  core: coreManifest as unknown as Record<string, unknown>,
  landing: landingManifest as unknown as Record<string, unknown>,
  framework: frameworkManifest as unknown as Record<string, unknown>,
  community: communityManifest as unknown as Record<string, unknown>,
  projects: projectsManifest as unknown as Record<string, unknown>,
  donate: donateManifest as unknown as Record<string, unknown>,
  "api-explorer": apiExplorerManifest as unknown as Record<string, unknown>,

  // Algebraic CPU
  "ring-core": ringCoreManifest as unknown as Record<string, unknown>,
  identity: identityManifest as unknown as Record<string, unknown>,
  triad: triadManifest as unknown as Record<string, unknown>,

  // Derivation & KG
  derivation: derivationManifest as unknown as Record<string, unknown>,
  "kg-store": kgStoreManifest as unknown as Record<string, unknown>,
  jsonld: jsonldManifest as unknown as Record<string, unknown>,
  epistemic: epistemicManifest as unknown as Record<string, unknown>,

  // Structure & Resolution
  shacl: shaclManifest as unknown as Record<string, unknown>,
  sparql: sparqlManifest as unknown as Record<string, unknown>,
  resolver: resolverManifest as unknown as Record<string, unknown>,
  "semantic-index": semanticIndexManifest as unknown as Record<string, unknown>,
  morphism: morphismManifest as unknown as Record<string, unknown>,

  // Observability & State
  observable: observableManifest as unknown as Record<string, unknown>,
  trace: traceManifest as unknown as Record<string, unknown>,
  state: stateManifest as unknown as Record<string, unknown>,

  // Verification & Agent Tools
  "self-verify": selfVerifyManifest as unknown as Record<string, unknown>,
  "agent-tools": agentToolsManifest as unknown as Record<string, unknown>,
  "code-kg": codeKgManifest as unknown as Record<string, unknown>,
  dashboard: dashboardManifest as unknown as Record<string, unknown>,
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
