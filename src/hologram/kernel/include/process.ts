/**
 * kernel/include/process — Process Descriptor Types
 * ≡ Linux include/linux/sched.h
 *
 * Defines the fundamental process abstraction shared by
 * the scheduler, syscall interface, and security subsystem.
 */

/** Process states (≡ Linux TASK_RUNNING, TASK_INTERRUPTIBLE, etc.) */
export type ProcessState = "running" | "ready" | "blocked" | "zombie" | "stopped";

/** Coherence zone (≡ Linux scheduling class: CFS, RT, DEADLINE) */
export type CoherenceZone = "convergent" | "exploring" | "divergent";

/** Minimal process descriptor (≡ task_struct core fields) */
export interface ProcessDescriptor {
  pid: number;
  parentPid: number;
  state: ProcessState;
  zone: CoherenceZone;
  hScore: number;         // ≡ nice value (but coherence-based)
  sessionCid: string;     // ≡ session id
  createdAt: number;      // ≡ start_time
  cpuTimeMs: number;      // ≡ utime + stime
  ring: number;           // ≡ privilege level (0-3)
}

/** Context switch record */
export interface ContextSwitch {
  fromPid: number;
  toPid: number;
  reason: "preempt" | "yield" | "block" | "exit";
  timestamp: number;
}
