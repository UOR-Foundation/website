/**
 * Kconfig — Kernel Configuration Manifest
 * ≡ Linux Kconfig (top-level kernel configuration)
 *
 * Defines compile-time and runtime configuration options for the Q-Kernel.
 * Every subsystem declares its feature flags here, mirroring how Linux
 * uses Kconfig to enable/disable kernel features at build time.
 *
 * Usage:
 *   import { KCONFIG } from "@/hologram/kernel/Kconfig";
 *   if (KCONFIG.CONFIG_QECC) { ... }
 */

export const KCONFIG = {
  // ── Core ────────────────────────────────────────────────────────────
  /** Kernel version string (≡ LINUX_VERSION_CODE) */
  CONFIG_VERSION: "0.1.0",

  /** Kernel name identifier */
  CONFIG_KERNEL_NAME: "q-kernel",

  /** Maximum number of concurrent processes (≡ CONFIG_NR_CPUS) */
  CONFIG_MAX_PROCESSES: 256,

  /** Scheduler tick interval in ms (≡ CONFIG_HZ) */
  CONFIG_SCHED_TICK_MS: 16,

  // ── init/ — Boot ───────────────────────────────────────────────────
  /** Enable full POST ring integrity verification */
  CONFIG_POST_FULL_CHECK: true,

  /** Ring size for algebraic identity checks */
  CONFIG_RING_SIZE: 256,

  /** Enable Cayley-Dickson firmware hydration */
  CONFIG_CAYLEY_DICKSON: true,

  // ── mm/ — Memory Management ────────────────────────────────────────
  /** Enable content deduplication in MMU */
  CONFIG_MMU_DEDUP: true,

  /** Default page eviction strategy */
  CONFIG_MMU_EVICTION: "lru" as "lru" | "fifo" | "coherence",

  /** Maximum hot-tier page count before eviction */
  CONFIG_MMU_MAX_HOT_PAGES: 4096,

  // ── fs/ — Filesystem ───────────────────────────────────────────────
  /** Enable journal for crash recovery (≡ CONFIG_EXT4_FS_JOURNALLING) */
  CONFIG_FS_JOURNAL: true,

  /** Enable vault encryption layer (≡ CONFIG_DM_CRYPT) */
  CONFIG_VAULT: true,

  // ── block/ — Block I/O ─────────────────────────────────────────────
  /** I/O scheduler algorithm (≡ CONFIG_IOSCHED_*) */
  CONFIG_BIO_SCHEDULER: "deadline" as "deadline" | "noop" | "cfq",

  // ── net/ — Networking ──────────────────────────────────────────────
  /** Enable Fano mesh topology (≡ CONFIG_INET) */
  CONFIG_FANO_MESH: true,

  /** Maximum socket connections */
  CONFIG_MAX_SOCKETS: 128,

  /** Enable coherence-gated firewall */
  CONFIG_FIREWALL: true,

  // ── crypto/ — Cryptography ─────────────────────────────────────────
  /** Enable [[15,1,3]] stabilizer error correction */
  CONFIG_QECC: true,

  /** Enable Hamming coherence head */
  CONFIG_COHERENCE_HEAD: true,

  // ── arch/ — Architecture ───────────────────────────────────────────
  /** Gate fidelity threshold for circuit compilation */
  CONFIG_GATE_FIDELITY_MIN: 0.99,

  /** Enable noise simulation in statevector engine */
  CONFIG_NOISE_MODEL: true,

  /** Enable error mitigation (ZNE, measurement, RC) */
  CONFIG_ERROR_MITIGATION: true,

  // ── security/ — Security ───────────────────────────────────────────
  /** Number of isolation rings (≡ x86 ring model) */
  CONFIG_SECURITY_RINGS: 4,

  /** Enable TEE bridge (≡ CONFIG_INTEL_SGX) */
  CONFIG_TEE: true,

  /** Enable selective disclosure */
  CONFIG_DISCLOSURE: true,

  // ── ipc/ — Inter-Process Communication ─────────────────────────────
  /** Maximum IPC channels */
  CONFIG_IPC_MAX_CHANNELS: 64,

  /** Enable hash-linked message history */
  CONFIG_IPC_HASH_CHAIN: true,

  // ── agents/ [NOVEL] ────────────────────────────────────────────────
  /** Enable autonomous agent subsystem */
  CONFIG_AGENTS: true,

  /** Enable mirror protocol for inter-agent bonding */
  CONFIG_MIRROR_PROTOCOL: true,

  /** Enable procedural memory / habit formation */
  CONFIG_PROCEDURAL_MEMORY: true,

  // ── surface/ [NOVEL] ───────────────────────────────────────────────
  /** Enable holographic surface compositor */
  CONFIG_SURFACE: true,

  /** Enable multi-kernel supervisor */
  CONFIG_KERNEL_SUPERVISOR: true,
} as const;

/** Type-safe access to all config keys */
export type KconfigKey = keyof typeof KCONFIG;
