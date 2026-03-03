/**
 * Q-Secure Mesh — Phase 8: Q-Security ↔ Agent Mesh Integration
 * ══════════════════════════════════════════════════════════════
 *
 * Enforces ring-based isolation on all agent operations.
 * All methods now sync (agent operations are sync after crystallization).
 *
 * @module qkernel/q-secure-mesh
 */

import { QSecurity, type IsolationRing, type SecurityOp, type CapabilityToken, type SecurityStats } from "./q-security";
import { QAgentMesh, QAgent, type MeshStats, type ResourceEnvelope } from "./q-agent";
import { QSched } from "./q-sched";
import { QIpc, type QChannel } from "./q-ipc";
import { QNet } from "./q-net";
import { QEcc } from "./q-ecc";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

/** Result of a security-gated operation */
export interface SecureResult<T = void> {
  readonly allowed: boolean;
  readonly eccVerified: boolean;
  readonly ring: IsolationRing;
  readonly reason: string;
  readonly data?: T;
}

/** Secure agent descriptor — agent + its security context */
export interface SecureAgentInfo {
  readonly agentId: string;
  readonly name: string;
  readonly pid: number;
  readonly ring: IsolationRing;
  readonly capabilities: CapabilityToken[];
  readonly state: string;
  readonly hScore: number;
  readonly zone: string;
}

/** Combined mesh + security stats */
export interface SecureMeshStats {
  readonly mesh: MeshStats;
  readonly security: SecurityStats;
}

// ═══════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════

const DEFAULT_AGENT_RING: IsolationRing = 3;
const ORCHESTRATOR_PID = 0;

// ═══════════════════════════════════════════════════════════════════════
// Secure Agent Mesh (all sync after crystallization)
// ═══════════════════════════════════════════════════════════════════════

export class QSecureMesh {
  readonly security: QSecurity;
  readonly mesh: QAgentMesh;
  private ecc: QEcc;
  private sched: QSched;
  private ipc: QIpc;
  private net: QNet;

  constructor(sched: QSched, ipc: QIpc, net: QNet, ecc: QEcc) {
    this.sched = sched;
    this.ipc = ipc;
    this.net = net;
    this.ecc = ecc;
    this.security = new QSecurity(ecc);
    this.mesh = new QAgentMesh(sched, ipc, net);
  }

  /** Initialize — register the mesh orchestrator at Ring 0. */
  init(): CapabilityToken {
    return this.security.registerProcess(ORCHESTRATOR_PID, 0);
  }

  // ── Secure Agent Lifecycle (now sync) ────────────────────────

  spawn(
    callerPid: number,
    name: string,
    hScore = 0.7,
    agentRing: IsolationRing = DEFAULT_AGENT_RING,
    envelope?: ResourceEnvelope,
  ): SecureResult<QAgent> {
    const auth = this.security.authorizeSyscall(callerPid, "spawn", `agent:${name}`);
    if (!auth.authorized) {
      return { allowed: false, eccVerified: auth.eccVerified, ring: this.security.getProcessRing(callerPid) ?? 3, reason: auth.reason };
    }

    const agent = this.mesh.spawn(name, hScore, envelope);
    this.security.registerProcess(agent.pid, agentRing);

    return {
      allowed: true, eccVerified: auth.eccVerified, ring: agentRing,
      reason: `Spawned ${name} at Ring ${agentRing}`, data: agent,
    };
  }

  despawn(callerPid: number, agentId: string): SecureResult<boolean> {
    const auth = this.security.authorizeSyscall(callerPid, "kill", `agent:${agentId}`);
    if (!auth.authorized) {
      return { allowed: false, eccVerified: auth.eccVerified, ring: this.security.getProcessRing(callerPid) ?? 3, reason: auth.reason };
    }
    const ok = this.mesh.despawn(agentId);
    return {
      allowed: true, eccVerified: auth.eccVerified,
      ring: this.security.getProcessRing(callerPid) ?? 0,
      reason: ok ? `Despawned ${agentId}` : `Agent ${agentId} not found`, data: ok,
    };
  }

  // ── Secure IPC ────────────────────────────────────────────────

  openChannel(agent: QAgent, name: string, peerPids: number[], minH = 0.0): SecureResult<QChannel> {
    const auth = this.security.authorizeSyscall(agent.pid, "ipc_send", `channel:${name}`);
    if (!auth.authorized) {
      return { allowed: false, eccVerified: auth.eccVerified, ring: this.security.getProcessRing(agent.pid) ?? 3, reason: auth.reason };
    }
    for (const peerPid of peerPids) {
      if (!this.security.checkPermission(peerPid, "ipc_recv", `channel:${name}`)) {
        return { allowed: false, eccVerified: auth.eccVerified, ring: this.security.getProcessRing(agent.pid) ?? 3,
          reason: `Peer PID ${peerPid} lacks 'ipc_recv' capability for channel:${name}` };
      }
    }
    const ch = agent.openChannel(name, peerPids, minH);
    return { allowed: true, eccVerified: auth.eccVerified, ring: this.security.getProcessRing(agent.pid) ?? 3,
      reason: `Channel ${name} opened`, data: ch };
  }

  communicate(agent: QAgent, channelCid: string, payload: Uint8Array): SecureResult<{ sent: boolean }> {
    const auth = this.security.authorizeSyscall(agent.pid, "ipc_send", `msg:${channelCid.slice(0, 16)}`);
    if (!auth.authorized) {
      return { allowed: false, eccVerified: auth.eccVerified, ring: this.security.getProcessRing(agent.pid) ?? 3, reason: auth.reason };
    }
    const result = agent.communicate(channelCid, payload);
    return { allowed: true, eccVerified: auth.eccVerified, ring: this.security.getProcessRing(agent.pid) ?? 3,
      reason: result.sent ? "Message sent" : `Send failed: ${result.reason}`, data: { sent: result.sent } };
  }

  // ── Secure Execution ──────────────────────────────────────────

  think(agent: QAgent, input: unknown): SecureResult<{ entryCid: string }> {
    const auth = this.security.authorizeSyscall(agent.pid, "execute", `agent:${agent.id}:think`);
    if (!auth.authorized) {
      return { allowed: false, eccVerified: auth.eccVerified, ring: this.security.getProcessRing(agent.pid) ?? 3, reason: auth.reason };
    }
    const entry = agent.think(input);
    return { allowed: true, eccVerified: auth.eccVerified, ring: this.security.getProcessRing(agent.pid) ?? 3,
      reason: "Thought executed", data: { entryCid: entry.entryCid } };
  }

  // ── Secure Lifecycle Management ────────────────────────────────

  freeze(callerPid: number, agent: QAgent): SecureResult<{ snapshotCid: string }> {
    const callerRing = this.security.getProcessRing(callerPid) ?? 3;
    if (callerRing > 1) {
      return { allowed: false, eccVerified: false, ring: callerRing, reason: `Ring ${callerRing} cannot freeze agents (requires Ring 0-1)` };
    }
    const snapshot = agent.freeze();
    return { allowed: true, eccVerified: true, ring: callerRing,
      reason: `Frozen ${agent.name}`, data: { snapshotCid: snapshot.snapshotCid } };
  }

  thaw(callerPid: number, agent: QAgent): SecureResult<boolean> {
    const callerRing = this.security.getProcessRing(callerPid) ?? 3;
    if (callerRing > 1) {
      return { allowed: false, eccVerified: false, ring: callerRing, reason: `Ring ${callerRing} cannot thaw agents (requires Ring 0-1)` };
    }
    const ok = agent.thaw();
    return { allowed: true, eccVerified: true, ring: callerRing,
      reason: ok ? `Thawed ${agent.name}` : `Cannot thaw ${agent.name}`, data: ok };
  }

  // ── Mesh-Wide Operations (Ring 0 Only) ─────────────────────────

  tick(callerPid: number): SecureResult<ReturnType<QAgentMesh["tick"]>> {
    const callerRing = this.security.getProcessRing(callerPid) ?? 3;
    if (callerRing !== 0) {
      return { allowed: false, eccVerified: false, ring: callerRing, reason: `Ring ${callerRing} cannot run scheduler tick (requires Ring 0)` };
    }
    const result = this.mesh.tick();
    return { allowed: true, eccVerified: true, ring: 0, reason: "Tick executed", data: result };
  }

  broadcast(callerPid: number, senderAgent: QAgent, payload: Uint8Array): SecureResult<{ delivered: number; rejected: number }> {
    const callerRing = this.security.getProcessRing(callerPid) ?? 3;
    if (callerRing !== 0) {
      return { allowed: false, eccVerified: false, ring: callerRing, reason: `Ring ${callerRing} cannot broadcast (requires Ring 0)` };
    }
    const result = this.mesh.broadcast(senderAgent, payload);
    return { allowed: true, eccVerified: true, ring: 0, reason: `Broadcast delivered to ${result.delivered}`, data: result };
  }

  // ── Ring Elevation ─────────────────────────────────────────────

  elevate(agentPid: number, targetRing: IsolationRing, reason: string): SecureResult<{ approved: boolean }> {
    const req = this.security.requestElevation(agentPid, targetRing, reason);
    return {
      allowed: req.approved, eccVerified: true,
      ring: req.approved ? targetRing : (this.security.getProcessRing(agentPid) ?? 3),
      reason: req.approved ? `Elevated PID ${agentPid} to Ring ${targetRing}` : `Elevation denied: Ring ${req.fromRing} → ${targetRing}`,
      data: { approved: req.approved },
    };
  }

  grant(granterPid: number, targetPid: number, operations: SecurityOp[], resourcePattern: string): SecureResult<CapabilityToken | null> {
    const cap = this.security.grant(granterPid, targetPid, operations, resourcePattern);
    if (!cap) {
      return { allowed: false, eccVerified: false, ring: this.security.getProcessRing(granterPid) ?? 3,
        reason: `Grant denied: PID ${granterPid} cannot grant [${operations.join(",")}]` };
    }
    return { allowed: true, eccVerified: true, ring: this.security.getProcessRing(granterPid) ?? 0,
      reason: `Granted [${operations.join(",")}] to PID ${targetPid}`, data: cap };
  }

  // ── Introspection ──────────────────────────────────────────────

  getSecureAgentInfo(agent: QAgent): SecureAgentInfo {
    return {
      agentId: agent.id, name: agent.name, pid: agent.pid,
      ring: this.security.getProcessRing(agent.pid) ?? 3,
      capabilities: this.security.getCapabilities(agent.pid),
      state: agent.state, hScore: agent.hScore, zone: agent.zone,
    };
  }

  stats(): SecureMeshStats {
    return { mesh: this.mesh.stats(), security: this.security.stats() };
  }

  allAgents(): QAgent[] { return this.mesh.allAgents(); }
  getAuditLog() { return this.security.getAuditLog(); }
}
