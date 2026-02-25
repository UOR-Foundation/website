/**
 * Virtual I/O Layer — POSIX Syscall Interface for the Hologram OS
 * ═══════════════════════════════════════════════════════════════════
 *
 * The holographic principle applied to system calls:
 *   Every POSIX syscall is a projection of a UOR operation.
 *
 * This module provides a thin, elegant facade that maps the familiar
 * POSIX process model onto the existing UOR primitive stack:
 *
 *   ┌──────────────┬──────────────────────────────────────────────┐
 *   │ POSIX        │ UOR Primitive                                │
 *   ├──────────────┼──────────────────────────────────────────────┤
 *   │ fork()       │ forkExecutableBlueprint() → engine.spawn()  │
 *   │ exec()       │ engine.spawn(blueprint)                      │
 *   │ read(fd)     │ refractLens (rehydrate from canonical form)  │
 *   │ write(fd,d)  │ focusLens (dehydrate through pipeline)       │
 *   │ mmap(addr)   │ project(hash, projection) — memory-mapped   │
 *   │ pipe(fd[2])  │ LensWire (element-to-element data flow)      │
 *   │ kill(pid)    │ engine.kill(pid)                              │
 *   │ wait(pid)    │ engine event listener on "halted"             │
 *   │ dup2(fd)     │ IOChannel rebinding                          │
 *   │ ioctl(fd,r)  │ engine.tick(pid, pos, dir) — device control  │
 *   │ suspend      │ engine.suspendProcess(pid)                    │
 *   │ resume       │ engine.resumeProcess(bp, suspended)           │
 *   └──────────────┴──────────────────────────────────────────────┘
 *
 * Design principle: ZERO new state. Every operation delegates to an
 * existing UOR primitive. The Virtual I/O layer adds only naming and
 * composition — no new data structures, no new storage, no new identity.
 *
 * @module uns/core/hologram/virtual-io
 */

import type { HologramEngine, EngineTick } from "./engine";
import type {
  ExecutableBlueprint,
  SuspendedSession,
  IOChannel,
} from "./executable-blueprint";
import {
  forkExecutableBlueprint,
  grindExecutableBlueprint,
} from "./executable-blueprint";
import {
  composeLens,
  element,
  focusLens,
  refractLens,
  dehydrate,
  type RefractionModality,
  type FocusResult,
  type RefractResult,
} from "./lens";
import { project, type ProjectionInput, type HologramProjection } from "./index";

// ── File Descriptor Table ──────────────────────────────────────────────────

/**
 * A virtual file descriptor — a reference to a data channel on a process.
 *
 * In POSIX, file descriptors are integers indexing into a per-process table.
 * Here, they are typed references to IOChannels on an engine process.
 * No new state is created — the fd resolves to existing IOChannel + PID.
 */
export interface FileDescriptor {
  /** File descriptor number (0=stdin, 1=stdout, 2=stderr, 3+=custom). */
  readonly fd: number;
  /** The process this fd belongs to. */
  readonly pid: string;
  /** The underlying IOChannel. */
  readonly channel: IOChannel;
  /** Whether the fd is open. */
  open: boolean;
}

/**
 * Standard file descriptor constants.
 */
export const STDIN  = 0;
export const STDOUT = 1;
export const STDERR = 2;
export const NETFD  = 3;

/**
 * A pipe — two connected file descriptors across processes.
 * Data written to pipe[1] can be read from pipe[0].
 * Implemented as a shared buffer with no external state.
 */
export interface Pipe {
  /** Read end. */
  readonly read: FileDescriptor;
  /** Write end. */
  readonly write: FileDescriptor;
  /** Internal buffer (in-memory only, no persistence). */
  readonly buffer: unknown[];
}

// ── Virtual Syscalls ───────────────────────────────────────────────────────

/**
 * vExec — Execute a blueprint as a new process.
 *
 * Maps to: engine.spawn(blueprint)
 * POSIX equivalent: exec()
 *
 * @returns The new process PID.
 */
export async function vExec(
  engine: HologramEngine,
  blueprint: ExecutableBlueprint,
): Promise<string> {
  return engine.spawn(blueprint);
}

/**
 * vForkBlueprint — Fork a blueprint and spawn the child.
 *
 * The pragmatic fork: takes the parent blueprint directly.
 * This is the recommended API when the caller has the blueprint.
 *
 * Maps to: forkExecutableBlueprint() → engine.spawn()
 *
 * @returns The child PID and the forked blueprint.
 */
export async function vForkBlueprint(
  engine: HologramEngine,
  parentBlueprint: ExecutableBlueprint,
  overrides?: {
    name?: string;
    version?: string;
    description?: string;
    scheduler?: Partial<ExecutableBlueprint["scheduler"]>;
  },
): Promise<{ childPid: string; childBlueprint: ExecutableBlueprint }> {
  const childBlueprint = forkExecutableBlueprint(parentBlueprint, {
    name: overrides?.name,
    version: overrides?.version,
    description: overrides?.description,
    scheduler: overrides?.scheduler,
  });
  const childPid = await engine.spawn(childBlueprint);
  return { childPid, childBlueprint };
}

/**
 * vRead — Read from a process's lens pipeline (rehydration).
 *
 * Maps to: refractLens(lens, proof, modality)
 * POSIX equivalent: read(fd, buf, count)
 *
 * "Reading" in the holographic model is rehydration — unpacking
 * canonical form into a desired modality. The file descriptor
 * determines which channel (and therefore which modality) to read.
 *
 * @param engine   The engine instance.
 * @param pid      The process to read from.
 * @param modality The output format (nquads, jsonld, hologram, etc.)
 * @returns        The refracted (rehydrated) output.
 */
export async function vRead(
  engine: HologramEngine,
  pid: string,
  modality: RefractionModality = "identity",
): Promise<RefractResult> {
  // Get the current identity of the process
  const tick = await engine.tick(pid); // read-only tick (no interaction)
  const identity = tick.identity;

  // Create a minimal identity lens for refraction
  const identityLens = composeLens("vRead:identity", [
    element("passthrough", async (x) => x, "identity"),
  ]);

  // Dehydrate the identity to get a proof
  const { proof } = await dehydrate(identity);

  // Refract through the lens into the target modality
  return refractLens(identityLens, proof, modality);
}

/**
 * vWrite — Write data through a process's lens pipeline (dehydration).
 *
 * Maps to: engine.execute(pid, data) → focusLens
 * POSIX equivalent: write(fd, data, len)
 *
 * "Writing" is dehydration — pushing data through the lens pipeline
 * to produce a canonical, content-addressed output.
 *
 * @returns The pipeline output.
 */
export async function vWrite(
  engine: HologramEngine,
  pid: string,
  data: unknown,
): Promise<unknown> {
  return engine.execute(pid, data);
}

/**
 * vMmap — Memory-map a projection of a process's identity.
 *
 * Maps to: project(hash, projectionName)
 * POSIX equivalent: mmap(addr, len, prot, flags, fd, offset)
 *
 * Memory-mapping in the holographic model means binding a projection
 * of the process's canonical identity to a "virtual address" —
 * a protocol-native identifier that other systems can reference.
 *
 * @param engine     The engine instance.
 * @param pid        The process whose identity to map.
 * @param projection The projection name (e.g., "did", "ipv6", "activitypub").
 * @returns          The projected identifier and metadata.
 */
export async function vMmap(
  engine: HologramEngine,
  pid: string,
  projection: string,
): Promise<MmapResult> {
  // Get process identity via read-only tick
  const tick = await engine.tick(pid);
  const identity = tick.identity;

  // Project the identity through the requested standard
  const projected = project(identity, projection);

  return {
    pid,
    projection,
    address: projected.value,
    fidelity: projected.fidelity,
    spec: projected.spec,
    identity,
  };
}

/**
 * Result of a memory-mapped projection.
 */
export interface MmapResult {
  /** The process that was mapped. */
  readonly pid: string;
  /** The projection standard used. */
  readonly projection: string;
  /** The projected address/identifier. */
  readonly address: string;
  /** Whether the mapping is lossless. */
  readonly fidelity: "lossless" | "lossy";
  /** Specification URL. */
  readonly spec: string;
  /** The source identity. */
  readonly identity: ProjectionInput;
}

/**
 * vIoctl — Device control (interaction/tick).
 *
 * Maps to: engine.tick(pid, position, direction)
 * POSIX equivalent: ioctl(fd, request, ...)
 *
 * In the Hologram OS, ioctl is how you send control signals
 * that evolve the process's PolyTree state.
 *
 * @returns The engine tick result.
 */
export async function vIoctl(
  engine: HologramEngine,
  pid: string,
  position: number,
  direction: number,
): Promise<EngineTick> {
  return engine.tick(pid, position, direction);
}

/**
 * vKill — Terminate a process.
 *
 * Maps to: engine.kill(pid)
 * POSIX equivalent: kill(pid, SIGKILL)
 */
export function vKill(engine: HologramEngine, pid: string): void {
  engine.kill(pid);
}

/**
 * vWait — Wait for a process to halt.
 *
 * Maps to: engine.on("halted") listener
 * POSIX equivalent: waitpid(pid, &status, 0)
 *
 * Returns a promise that resolves when the process halts.
 * If the process is already halted, resolves immediately.
 */
export function vWait(
  engine: HologramEngine,
  pid: string,
): Promise<void> {
  // Check if already halted
  const info = engine.getProcessInfo(pid);
  if (info.status === "halted") return Promise.resolve();

  return new Promise<void>((resolve) => {
    const unsub = engine.on((event) => {
      if (
        (event.type === "halted" || event.type === "killed") &&
        event.pid === pid
      ) {
        unsub();
        resolve();
      }
    });
  });
}

/**
 * vSuspend — Hibernate a process to canonical bytes.
 *
 * Maps to: engine.suspendProcess(pid)
 * POSIX equivalent: SIGSTOP + core dump
 *
 * @returns The suspended session (can be resumed later).
 */
export async function vSuspend(
  engine: HologramEngine,
  pid: string,
): Promise<SuspendedSession> {
  return engine.suspendProcess(pid);
}

/**
 * vResume — Wake a process from hibernation.
 *
 * Maps to: engine.resumeProcess(blueprint, suspended)
 * POSIX equivalent: restore from core dump
 *
 * @returns The new PID of the resumed process.
 */
export async function vResume(
  engine: HologramEngine,
  blueprint: ExecutableBlueprint,
  suspended: SuspendedSession,
): Promise<string> {
  return engine.resumeProcess(blueprint, suspended);
}

/**
 * vPipe — Create a pipe between two processes.
 *
 * Maps to: LensWire (conceptual data flow connection)
 * POSIX equivalent: pipe(fd[2])
 *
 * Creates a unidirectional data channel. Data written to the write end
 * flows to the read end. The pipe buffer is in-memory only.
 *
 * @returns A Pipe with read and write FileDescriptors.
 */
export function vPipe(
  writerPid: string,
  writerChannel: IOChannel,
  readerPid: string,
  readerChannel: IOChannel,
): Pipe {
  const buffer: unknown[] = [];

  return {
    read: {
      fd: STDIN,
      pid: readerPid,
      channel: readerChannel,
      open: true,
    },
    write: {
      fd: STDOUT,
      pid: writerPid,
      channel: writerChannel,
      open: true,
    },
    buffer,
  };
}

/**
 * vDup2 — Duplicate a file descriptor (rebind an I/O channel).
 *
 * Maps to: IOChannel rebinding
 * POSIX equivalent: dup2(oldfd, newfd)
 *
 * Creates a new FileDescriptor pointing to the same IOChannel
 * but with a different fd number. This allows channel aliasing.
 */
export function vDup2(
  source: FileDescriptor,
  newFd: number,
): FileDescriptor {
  return {
    fd: newFd,
    pid: source.pid,
    channel: source.channel,
    open: source.open,
  };
}

/**
 * vOpen — Open a file descriptor for a process channel.
 *
 * Maps to: IOChannel lookup
 * POSIX equivalent: open(path, flags)
 *
 * Opens a named channel on a process and returns a file descriptor.
 */
export function vOpen(
  pid: string,
  channel: IOChannel,
  fd?: number,
): FileDescriptor {
  return {
    fd: fd ?? (channel.direction === "in" ? STDIN : STDOUT),
    pid,
    channel,
    open: true,
  };
}

/**
 * vClose — Close a file descriptor.
 *
 * POSIX equivalent: close(fd)
 */
export function vClose(descriptor: FileDescriptor): void {
  (descriptor as { open: boolean }).open = false;
}

// ── Compound Operations (Convenience) ──────────────────────────────────────

/**
 * vForkExec — Fork a blueprint and immediately execute it.
 *
 * Maps to: fork() + exec() — the classic UNIX pattern.
 * Creates a child process from a modified parent blueprint.
 *
 * @returns The child PID.
 */
export async function vForkExec(
  engine: HologramEngine,
  parentBlueprint: ExecutableBlueprint,
  overrides?: {
    name?: string;
    version?: string;
    description?: string;
    scheduler?: Partial<ExecutableBlueprint["scheduler"]>;
  },
): Promise<string> {
  const { childPid } = await vForkBlueprint(engine, parentBlueprint, overrides);
  return childPid;
}

/**
 * vMmapAll — Memory-map ALL projections of a process's identity.
 *
 * Returns every registered projection (DID, CID, IPv6, ActivityPub, etc.)
 * as a map of projection name → address string.
 *
 * This is the holographic principle in its purest form:
 * one process, one identity, every standard simultaneously.
 */
export async function vMmapAll(
  engine: HologramEngine,
  pid: string,
): Promise<ReadonlyMap<string, MmapResult>> {
  const tick = await engine.tick(pid);
  const identity = tick.identity;
  const hologram = project(identity);

  const results = new Map<string, MmapResult>();
  for (const [name, proj] of Object.entries(hologram.projections)) {
    results.set(name, {
      pid,
      projection: name,
      address: proj.value,
      fidelity: proj.fidelity,
      spec: proj.spec,
      identity,
    });
  }
  return results;
}

/**
 * vStat — Get process status information.
 *
 * Maps to: engine.getProcessInfo(pid)
 * POSIX equivalent: stat() / fstat()
 */
export function vStat(
  engine: HologramEngine,
  pid: string,
): {
  pid: string;
  status: string;
  tickCount: number;
  historyLength: number;
  spawnedAt: string;
  blueprintCid: string;
} {
  return engine.getProcessInfo(pid);
}

/**
 * vPs — List all running processes.
 *
 * Maps to: engine.listProcesses()
 * POSIX equivalent: ps aux
 */
export function vPs(engine: HologramEngine): string[] {
  return engine.listProcesses();
}
