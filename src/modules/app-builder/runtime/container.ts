/**
 * UOR Container Runtime — In-Memory Container Lifecycle
 * ══════════════════════════════════════════════════════
 *
 * Provides a Docker-style container abstraction for UOR app images.
 * Containers are ephemeral, in-memory constructs — no real OS isolation.
 */

export interface PortMapping {
  hostPort: number;
  containerPort: number;
  protocol: "tcp" | "udp";
}

export interface ContainerCreateOptions {
  name: string;
  imageId: string;
  env?: Record<string, string>;
  ports?: PortMapping[];
}

export type ContainerState = "created" | "running" | "paused" | "stopped" | "crashed" | "removed";

export interface UorContainer {
  id: string;
  name: string;
  imageId: string;
  state: ContainerState;
  env: Record<string, string>;
  ports: PortMapping[];
  createdAt: number;
  startedAt: number | null;
  stoppedAt: number | null;
}

export interface ContainerInspection {
  container: UorContainer;
  uptimeMs: number;
  memoryEstimate: number;
}

// ── In-memory store ────────────────────────────────────────────────────────

const containers = new Map<string, UorContainer>();

function genId(): string {
  return `ctr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createContainer(opts: ContainerCreateOptions): UorContainer {
  const ctr: UorContainer = {
    id: genId(),
    name: opts.name,
    imageId: opts.imageId,
    state: "created",
    env: opts.env ?? {},
    ports: opts.ports ?? [],
    createdAt: Date.now(),
    startedAt: null,
    stoppedAt: null,
  };
  containers.set(ctr.id, ctr);
  return ctr;
}

export function startContainer(id: string): void {
  const ctr = containers.get(id);
  if (!ctr) throw new Error(`Container ${id} not found`);
  ctr.state = "running";
  ctr.startedAt = Date.now();
}

export function stopContainer(id: string): void {
  const ctr = containers.get(id);
  if (!ctr) throw new Error(`Container ${id} not found`);
  ctr.state = "stopped";
  ctr.stoppedAt = Date.now();
}

export function removeContainer(id: string): void {
  const ctr = containers.get(id);
  if (!ctr) throw new Error(`Container ${id} not found`);
  ctr.state = "removed";
  containers.delete(id);
}

export function listContainers(): UorContainer[] {
  return Array.from(containers.values());
}

export function inspectContainer(id: string): ContainerInspection {
  const ctr = containers.get(id);
  if (!ctr) throw new Error(`Container ${id} not found`);
  const uptimeMs = ctr.state === "running" && ctr.startedAt
    ? Date.now() - ctr.startedAt
    : 0;
  return { container: ctr, uptimeMs, memoryEstimate: 0 };
}
