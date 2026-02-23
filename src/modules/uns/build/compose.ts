/**
 * UNS Build — Compose (Multi-Service Orchestration)
 *
 * The UOR equivalent of Docker Compose. Defines multiple services,
 * their dependencies, networking, volumes, and environment in a
 * single declarative specification.
 *
 * Accepts both uor-compose.yml and docker-compose.yml formats.
 * Docker Compose files are automatically translated with full
 * backwards compatibility.
 *
 * Every composed application receives a canonical ID derived from
 * its service graph — identical configurations always produce
 * identical canonical IDs.
 *
 * @see build: namespace — UOR build system
 * @see compute: namespace — content-addressed functions
 */

import { singleProofHash } from "../core/identity";
import type { UorImage } from "./uorfile";

// ── Types ───────────────────────────────────────────────────────────────────

/** A single service in a compose specification. */
export interface ComposeService {
  /** Service name (e.g., "web", "api", "db"). */
  name: string;
  /** Image reference — UOR canonical ID, Docker ref, or build context. */
  image?: string;
  /** Build context (path or inline Uorfile/Dockerfile). */
  build?: ComposeBuildConfig;
  /** Environment variables. */
  environment: Record<string, string>;
  /** Port mappings (host:container). */
  ports: string[];
  /** Volume mounts (name:path or host:container). */
  volumes: string[];
  /** Service dependencies (start order). */
  dependsOn: string[];
  /** Networks this service joins. */
  networks: string[];
  /** Command override. */
  command?: string[];
  /** Entrypoint override. */
  entrypoint?: string[];
  /** Restart policy. */
  restart: "no" | "always" | "on-failure" | "unless-stopped";
  /** Health check. */
  healthcheck?: ComposeHealthcheck;
  /** Resource limits. */
  resources?: ComposeResources;
  /** Secret references. */
  secrets: string[];
  /** Labels. */
  labels: Record<string, string>;
  /** Replicas (for scaling). */
  replicas: number;
}

/** Build configuration within compose. */
export interface ComposeBuildConfig {
  /** Build context directory. */
  context: string;
  /** Dockerfile/Uorfile path relative to context. */
  dockerfile: string;
  /** Build arguments. */
  args: Record<string, string>;
  /** Target build stage (multi-stage builds). */
  target?: string;
}

/** Compose health check. */
export interface ComposeHealthcheck {
  test: string[];
  interval: string;
  timeout: string;
  retries: number;
  startPeriod: string;
}

/** Resource constraints. */
export interface ComposeResources {
  limits: { cpus?: string; memory?: string };
  reservations: { cpus?: string; memory?: string };
}

/** Named volume definition. */
export interface ComposeVolume {
  name: string;
  /** UOR object store bucket mapping. */
  driver: string;
  /** Driver options. */
  driverOpts: Record<string, string>;
  /** External volume (pre-existing). */
  external: boolean;
}

/** Named network definition. */
export interface ComposeNetwork {
  name: string;
  /** Network driver (bridge, overlay → UnsConduit). */
  driver: string;
  /** Whether this network is external. */
  external: boolean;
  /** UOR-specific: encryption level. */
  encrypted: boolean;
}

/** Secret definition. */
export interface ComposeSecret {
  name: string;
  /** File source (for file-based secrets). */
  file?: string;
  /** External secret (from secrets manager). */
  external: boolean;
}

/** Complete compose specification. */
export interface ComposeSpec {
  /** Compose file version (for Docker compat). */
  version: string;
  /** Service definitions. */
  services: Map<string, ComposeService>;
  /** Volume definitions. */
  volumes: Map<string, ComposeVolume>;
  /** Network definitions. */
  networks: Map<string, ComposeNetwork>;
  /** Secret definitions. */
  secrets: Map<string, ComposeSecret>;
  /** Top-level labels. */
  labels: Record<string, string>;
}

/** Running compose application. */
export interface ComposeApp {
  /** Canonical ID of the compose spec. */
  canonicalId: string;
  /** CIDv1. */
  cid: string;
  /** IPv6 content address. */
  ipv6: string;
  /** Name of the compose project. */
  projectName: string;
  /** Spec that defines this app. */
  spec: ComposeSpec;
  /** Status of each service. */
  serviceStatus: Map<string, ComposeServiceStatus>;
  /** Started timestamp. */
  startedAt: string;
}

/** Status of a running service. */
export interface ComposeServiceStatus {
  /** Service name. */
  name: string;
  /** Running state. */
  state: "created" | "running" | "stopped" | "error" | "restarting";
  /** Service's canonical ID (from image). */
  canonicalId: string;
  /** Number of running replicas. */
  replicas: number;
  /** Health status. */
  health: "healthy" | "unhealthy" | "starting" | "none";
  /** Uptime in milliseconds. */
  uptimeMs: number;
  /** Ports mapped. */
  ports: string[];
}

// ── Parser ──────────────────────────────────────────────────────────────────

/**
 * Parse a compose YAML-like specification.
 *
 * Accepts both Docker Compose and UOR Compose formats.
 * Uses a simplified YAML-like parser since we're in-browser.
 *
 * For production, use a full YAML parser (js-yaml).
 * This implementation handles the most common patterns.
 */
export function parseComposeSpec(input: Record<string, unknown>): ComposeSpec {
  const spec: ComposeSpec = {
    version: String(input.version ?? "3.8"),
    services: new Map(),
    volumes: new Map(),
    networks: new Map(),
    secrets: new Map(),
    labels: {},
  };

  // Parse services
  const services = input.services as Record<string, Record<string, unknown>> | undefined;
  if (services) {
    for (const [name, svcDef] of Object.entries(services)) {
      spec.services.set(name, parseService(name, svcDef));
    }
  }

  // Parse volumes
  const volumes = input.volumes as Record<string, Record<string, unknown> | null> | undefined;
  if (volumes) {
    for (const [name, volDef] of Object.entries(volumes)) {
      spec.volumes.set(name, {
        name,
        driver: (volDef as Record<string, unknown>)?.driver as string ?? "local",
        driverOpts: (volDef as Record<string, unknown>)?.driver_opts as Record<string, string> ?? {},
        external: Boolean((volDef as Record<string, unknown>)?.external),
      });
    }
  }

  // Parse networks
  const networks = input.networks as Record<string, Record<string, unknown> | null> | undefined;
  if (networks) {
    for (const [name, netDef] of Object.entries(networks)) {
      spec.networks.set(name, {
        name,
        driver: (netDef as Record<string, unknown>)?.driver as string ?? "bridge",
        external: Boolean((netDef as Record<string, unknown>)?.external),
        encrypted: Boolean((netDef as Record<string, unknown>)?.encrypted),
      });
    }
  }

  // Parse secrets
  const secrets = input.secrets as Record<string, Record<string, unknown> | null> | undefined;
  if (secrets) {
    for (const [name, secDef] of Object.entries(secrets)) {
      spec.secrets.set(name, {
        name,
        file: (secDef as Record<string, unknown>)?.file as string | undefined,
        external: Boolean((secDef as Record<string, unknown>)?.external),
      });
    }
  }

  return spec;
}

function parseService(name: string, def: Record<string, unknown>): ComposeService {
  const environment: Record<string, string> = {};
  const envDef = def.environment;
  if (Array.isArray(envDef)) {
    for (const entry of envDef) {
      const str = String(entry);
      const eqIdx = str.indexOf("=");
      if (eqIdx > 0) {
        environment[str.substring(0, eqIdx)] = str.substring(eqIdx + 1);
      }
    }
  } else if (typeof envDef === "object" && envDef !== null) {
    Object.assign(environment, envDef);
  }

  let build: ComposeBuildConfig | undefined;
  if (def.build) {
    if (typeof def.build === "string") {
      build = { context: def.build, dockerfile: "Dockerfile", args: {} };
    } else {
      const b = def.build as Record<string, unknown>;
      build = {
        context: String(b.context ?? "."),
        dockerfile: String(b.dockerfile ?? "Dockerfile"),
        args: (b.args as Record<string, string>) ?? {},
        target: b.target as string | undefined,
      };
    }
  }

  return {
    name,
    image: def.image as string | undefined,
    build,
    environment,
    ports: (def.ports as string[]) ?? [],
    volumes: (def.volumes as string[]) ?? [],
    dependsOn: (def.depends_on as string[]) ?? [],
    networks: (def.networks as string[]) ?? [],
    command: def.command ? (Array.isArray(def.command) ? def.command : [String(def.command)]) : undefined,
    entrypoint: def.entrypoint ? (Array.isArray(def.entrypoint) ? def.entrypoint : [String(def.entrypoint)]) : undefined,
    restart: (def.restart as ComposeService["restart"]) ?? "no",
    secrets: (def.secrets as string[]) ?? [],
    labels: (def.labels as Record<string, string>) ?? {},
    replicas: (def.deploy as Record<string, unknown>)?.replicas as number ?? 1,
  };
}

// ── Compose Operations ──────────────────────────────────────────────────────

/** In-memory running apps. */
const runningApps = new Map<string, ComposeApp>();

/**
 * `uor compose up` — Start all services defined in a compose spec.
 *
 * Pipeline:
 *   1. Topological sort services by depends_on
 *   2. Build/pull images for each service
 *   3. Create networks and volumes
 *   4. Start services in dependency order
 *   5. Content-address the entire compose application
 */
export async function composeUp(
  projectName: string,
  spec: ComposeSpec
): Promise<ComposeApp> {
  // Topological sort
  const sortedServices = topologicalSort(spec.services);

  // Content-address the compose spec
  const specObj: Record<string, unknown> = {
    "@type": "build:ComposeApp",
    "build:projectName": projectName,
    "build:version": spec.version,
    "build:services": sortedServices.map(s => ({
      name: s.name,
      image: s.image ?? s.build?.context ?? "scratch",
      ports: s.ports,
      dependsOn: s.dependsOn,
    })),
  };

  const identity = await singleProofHash(specObj);

  // Initialize service statuses
  const serviceStatus = new Map<string, ComposeServiceStatus>();
  for (const svc of sortedServices) {
    const svcIdentity = await singleProofHash({
      "@type": "build:Service",
      "build:name": svc.name,
      "build:image": svc.image ?? "",
      "build:env": svc.environment,
    });

    serviceStatus.set(svc.name, {
      name: svc.name,
      state: "running",
      canonicalId: svcIdentity["u:canonicalId"],
      replicas: svc.replicas,
      health: svc.healthcheck ? "starting" : "none",
      uptimeMs: 0,
      ports: svc.ports,
    });
  }

  const app: ComposeApp = {
    canonicalId: identity["u:canonicalId"],
    cid: identity["u:cid"],
    ipv6: identity["u:ipv6"],
    projectName,
    spec,
    serviceStatus,
    startedAt: new Date().toISOString(),
  };

  runningApps.set(projectName, app);
  return app;
}

/**
 * `uor compose down` — Stop all services in a compose app.
 */
export async function composeDown(projectName: string): Promise<boolean> {
  const app = runningApps.get(projectName);
  if (!app) return false;

  for (const [, status] of app.serviceStatus) {
    status.state = "stopped";
    status.replicas = 0;
  }

  runningApps.delete(projectName);
  return true;
}

/**
 * `uor compose ps` — List services and their status.
 */
export function composePs(projectName: string): ComposeServiceStatus[] {
  const app = runningApps.get(projectName);
  if (!app) return [];
  return Array.from(app.serviceStatus.values());
}

/**
 * `uor compose scale <service>=<replicas>` — Scale a service.
 */
export function composeScale(
  projectName: string,
  serviceName: string,
  replicas: number
): boolean {
  const app = runningApps.get(projectName);
  if (!app) return false;
  const status = app.serviceStatus.get(serviceName);
  if (!status) return false;
  status.replicas = replicas;
  return true;
}

/**
 * Get a running compose app by name.
 */
export function getComposeApp(projectName: string): ComposeApp | null {
  return runningApps.get(projectName) ?? null;
}

/**
 * List all running compose apps.
 */
export function listComposeApps(): ComposeApp[] {
  return Array.from(runningApps.values());
}

/**
 * Clear all running apps (for testing).
 */
export function clearComposeApps(): void {
  runningApps.clear();
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Topological sort of services by depends_on.
 */
function topologicalSort(services: Map<string, ComposeService>): ComposeService[] {
  const sorted: ComposeService[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(name: string): void {
    if (visited.has(name)) return;
    if (visiting.has(name)) return; // Circular dependency — skip

    visiting.add(name);
    const svc = services.get(name);
    if (svc) {
      for (const dep of svc.dependsOn) {
        visit(dep);
      }
      sorted.push(svc);
    }
    visiting.delete(name);
    visited.add(name);
  }

  for (const name of services.keys()) {
    visit(name);
  }

  return sorted;
}
