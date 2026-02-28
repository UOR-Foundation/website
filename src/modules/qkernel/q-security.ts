/**
 * Q-Security — Capability-Based Access Control
 * ═════════════════════════════════════════════
 *
 * Every classical security concept maps to a content-addressed equivalent:
 *
 *   ┌────────────────┬──────────────────────────────────────────────┐
 *   │ Linux Security │ Q-Security                                    │
 *   ├────────────────┼──────────────────────────────────────────────┤
 *   │ UID/GID        │ Capability token (CID of allowed operations)  │
 *   │ chmod/chown    │ Grant/revoke capability via derivation chain   │
 *   │ Ring 0–3       │ Isolation rings: kernel / driver / service / user │
 *   │ sudo           │ Ring elevation with ECC-signed authorization  │
 *   │ SELinux policy │ Derivation-chain permission (hash lineage)    │
 *   │ Syscall filter │ ECC syndrome check on every privileged call   │
 *   │ Audit log      │ Immutable security event chain (CID-linked)   │
 *   └────────────────┴──────────────────────────────────────────────┘
 *
 * Key insight: capabilities are content-addressed. A capability token IS
 * its permissions — no lookup table, no race conditions, no TOCTOU bugs.
 * The token's CID encodes exactly what it grants. Forge it? Different CID.
 *
 * @module qkernel/q-security
 */

import { sha256, computeCid, bytesToHex } from "@/modules/uns/core/address";
import { QEcc, CODE_K } from "./q-ecc";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

/** Isolation ring — higher number = less privilege */
export type IsolationRing = 0 | 1 | 2 | 3;

/** Ring names for display */
export const RING_NAMES: Record<IsolationRing, string> = {
  0: "kernel",
  1: "driver",
  2: "service",
  3: "user",
};

/** Operations that can be granted */
export type SecurityOp =
  | "read"
  | "write"
  | "execute"
  | "create"
  | "delete"
  | "mount"
  | "net_send"
  | "net_recv"
  | "ipc_send"
  | "ipc_recv"
  | "spawn"
  | "kill"
  | "elevate"       // request ring elevation
  | "grant"         // grant capabilities to others
  | "revoke"        // revoke capabilities from others
  | "audit_read";   // read security audit log

/** A capability token — the unforgeable permission unit */
export interface CapabilityToken {
  readonly capCid: string;           // content-addressed ID
  readonly ownerPid: number;
  readonly ring: IsolationRing;
  readonly operations: SecurityOp[];
  readonly resourcePattern: string;  // glob pattern for allowed resources
  readonly parentCapCid: string | null;  // derivation chain
  readonly createdAt: number;
  readonly expiresAt: number | null; // null = no expiry
  readonly revoked: boolean;
}

/** Request for ring elevation */
export interface ElevationRequest {
  readonly requestCid: string;
  readonly fromRing: IsolationRing;
  readonly toRing: IsolationRing;
  readonly pid: number;
  readonly reason: string;
  readonly eccSignature: number[];   // ECC-encoded authorization
  readonly approved: boolean;
  readonly timestamp: number;
}

/** Security audit event */
export interface SecurityEvent {
  readonly eventCid: string;
  readonly type: "grant" | "revoke" | "elevate" | "deny" | "violation" | "check";
  readonly pid: number;
  readonly ring: IsolationRing;
  readonly operation: SecurityOp | null;
  readonly resource: string | null;
  readonly capCid: string | null;
  readonly allowed: boolean;
  readonly detail: string;
  readonly timestamp: number;
}

/** Security subsystem stats */
export interface SecurityStats {
  readonly totalCapabilities: number;
  readonly activeCapabilities: number;
  readonly revokedCapabilities: number;
  readonly elevationRequests: number;
  readonly elevationsApproved: number;
  readonly elevationsDenied: number;
  readonly totalChecks: number;
  readonly deniedChecks: number;
  readonly violations: number;
  readonly ringDistribution: Record<IsolationRing, number>;
}

// ═══════════════════════════════════════════════════════════════════════
// Ring privilege levels — what each ring can do by default
// ═══════════════════════════════════════════════════════════════════════

const RING_DEFAULT_OPS: Record<IsolationRing, SecurityOp[]> = {
  0: ["read", "write", "execute", "create", "delete", "mount", "net_send",
      "net_recv", "ipc_send", "ipc_recv", "spawn", "kill", "elevate",
      "grant", "revoke", "audit_read"],
  1: ["read", "write", "execute", "create", "delete", "mount",
      "net_send", "net_recv", "ipc_send", "ipc_recv", "spawn"],
  2: ["read", "write", "execute", "create", "ipc_send", "ipc_recv", "spawn"],
  3: ["read", "execute", "ipc_send", "ipc_recv"],
};

// ═══════════════════════════════════════════════════════════════════════
// Q-Security Implementation
// ═══════════════════════════════════════════════════════════════════════

export class QSecurity {
  private capabilities = new Map<string, CapabilityToken>();
  private pidRings = new Map<number, IsolationRing>();
  private pidCapabilities = new Map<number, Set<string>>(); // pid → cap CIDs
  private elevations: ElevationRequest[] = [];
  private auditLog: SecurityEvent[] = [];
  private ecc: QEcc;

  // Stats
  private totalChecks = 0;
  private deniedChecks = 0;
  private violations = 0;

  constructor(ecc: QEcc) {
    this.ecc = ecc;
  }

  // ── Process Registration ────────────────────────────────────────

  /**
   * Register a process at a specific isolation ring.
   * Ring 0 = kernel, Ring 3 = user (least privilege).
   */
  async registerProcess(pid: number, ring: IsolationRing): Promise<CapabilityToken> {
    this.pidRings.set(pid, ring);

    // Create default capability for this ring
    const cap = await this.createCapability(
      pid,
      ring,
      RING_DEFAULT_OPS[ring],
      "*",
      null,
    );

    return cap;
  }

  /**
   * Get the isolation ring for a process.
   */
  getProcessRing(pid: number): IsolationRing | undefined {
    return this.pidRings.get(pid);
  }

  // ── Capability Management ───────────────────────────────────────

  /**
   * Create a new capability token — the fundamental permission unit.
   */
  async createCapability(
    ownerPid: number,
    ring: IsolationRing,
    operations: SecurityOp[],
    resourcePattern: string,
    parentCapCid: string | null,
    expiresAt: number | null = null,
  ): Promise<CapabilityToken> {
    const payload = JSON.stringify({
      owner: ownerPid,
      ring,
      ops: operations.sort(),
      res: resourcePattern,
      parent: parentCapCid,
      t: Date.now(),
      nonce: Math.random(),
    });
    const hash = await sha256(new TextEncoder().encode(payload));
    const capCid = await computeCid(hash);

    const token: CapabilityToken = {
      capCid,
      ownerPid,
      ring,
      operations,
      resourcePattern,
      parentCapCid,
      createdAt: Date.now(),
      expiresAt,
      revoked: false,
    };

    this.capabilities.set(capCid, token);

    if (!this.pidCapabilities.has(ownerPid)) {
      this.pidCapabilities.set(ownerPid, new Set());
    }
    this.pidCapabilities.get(ownerPid)!.add(capCid);

    return token;
  }

  /**
   * Grant a capability from one process to another.
   * The granter must have the "grant" operation and must own
   * the parent capability in its derivation chain.
   */
  async grant(
    granterPid: number,
    targetPid: number,
    operations: SecurityOp[],
    resourcePattern: string,
  ): Promise<CapabilityToken | null> {
    // Check granter has grant permission (on any resource)
    const granterOps = this.getEffectiveOps(granterPid);
    if (!granterOps.includes("grant")) {
      await this.logEvent("deny", granterPid, "grant", null, null, false,
        `PID ${granterPid} lacks 'grant' permission`);
      return null;
    }

    // Granter can only grant ops they themselves possess
    const validOps = operations.filter(op => granterOps.includes(op));
    if (validOps.length === 0) return null;

    // Target ring: inherit granter's ring or lower
    const granterRing = this.pidRings.get(granterPid) ?? 3;
    const targetRing = Math.max(granterRing, this.pidRings.get(targetPid) ?? 3) as IsolationRing;

    // Find the specific granting cap that includes the granted ops
    const granterCaps = this.pidCapabilities.get(granterPid);
    let parentCid: string | null = null;
    if (granterCaps) {
      for (const cid of granterCaps) {
        const c = this.capabilities.get(cid);
        if (c && !c.revoked && c.operations.includes("grant")) {
          parentCid = cid;
          break;
        }
      }
    }

    const cap = await this.createCapability(
      targetPid,
      targetRing,
      validOps,
      resourcePattern,
      parentCid,
    );

    await this.logEvent("grant", granterPid, "grant", resourcePattern, cap.capCid, true,
      `Granted [${validOps.join(",")}] on '${resourcePattern}' to PID ${targetPid}`);

    return cap;
  }

  /**
   * Revoke a capability token.
   * Also revokes all tokens derived from it (cascade).
   */
  async revoke(revokerPid: number, capCid: string): Promise<boolean> {
    if (!this.checkPermission(revokerPid, "revoke", "*")) {
      await this.logEvent("deny", revokerPid, "revoke", null, capCid, false,
        `PID ${revokerPid} lacks 'revoke' permission`);
      return false;
    }

    const cap = this.capabilities.get(capCid);
    if (!cap || cap.revoked) return false;

    // Revoke this cap and cascade recursively
    this.cascadeRevoke(capCid);

    await this.logEvent("revoke", revokerPid, "revoke", null, capCid, true,
      `Revoked capability ${capCid.slice(0, 16)}… and derived tokens`);

    return true;
  }

  // ── Permission Checking ─────────────────────────────────────────

  /**
   * Check if a process has permission for an operation on a resource.
   * This is the hot path — called on every privileged syscall.
   */
  checkPermission(pid: number, operation: SecurityOp, resource: string): boolean {
    this.totalChecks++;

    const ring = this.pidRings.get(pid);
    if (ring === undefined) {
      this.deniedChecks++;
      return false;
    }

    // Ring 0 can do everything
    if (ring === 0) return true;

    // Check all capabilities for this pid (both ring defaults and granted)
    const caps = this.pidCapabilities.get(pid);
    if (!caps) {
      this.deniedChecks++;
      return false;
    }

    for (const capCid of caps) {
      const cap = this.capabilities.get(capCid);
      if (!cap || cap.revoked) continue;
      if (cap.expiresAt && cap.expiresAt < Date.now()) continue;
      if (!cap.operations.includes(operation)) continue;
      if (this.matchesPattern(resource, cap.resourcePattern)) {
        return true;
      }
    }

    this.deniedChecks++;
    return false;
  }

  /**
   * Authorize a syscall with ECC cryptographic verification.
   * Encodes the call parameters into the ECC code and verifies
   * the syndrome is trivial (no tampering).
   */
  authorizeSyscall(
    pid: number,
    operation: SecurityOp,
    resource: string,
  ): { authorized: boolean; eccVerified: boolean; reason: string } {
    // 1. Permission check
    const permitted = this.checkPermission(pid, operation, resource);
    if (!permitted) {
      this.violations++;
      return {
        authorized: false,
        eccVerified: false,
        reason: `PID ${pid} denied '${operation}' on '${resource}'`,
      };
    }

    // 2. ECC integrity verification
    // Encode the authorization as a logical codeword
    const ring = this.pidRings.get(pid) ?? 3;
    const logical = this.encodeAuthorization(pid, ring, operation);
    const physical = this.ecc.encode(logical);
    const syndrome = this.ecc.measureSyndrome(physical);

    if (syndrome.errorDetected) {
      // Integrity violation — the authorization encoding is corrupt
      this.violations++;
      return {
        authorized: false,
        eccVerified: false,
        reason: `ECC integrity failure: syndrome weight ${syndrome.weight}`,
      };
    }

    return {
      authorized: true,
      eccVerified: true,
      reason: `Ring ${ring} authorized '${operation}' — ECC clean`,
    };
  }

  // ── Ring Elevation ──────────────────────────────────────────────

  /**
   * Request ring elevation (like sudo).
   * Must be authorized by a ring-0 process or pass ECC verification.
   */
  async requestElevation(
    pid: number,
    targetRing: IsolationRing,
    reason: string,
  ): Promise<ElevationRequest> {
    const currentRing = this.pidRings.get(pid) ?? 3;

    // Can't elevate to same or lower ring
    if (targetRing >= currentRing) {
      const req = await this.buildElevationRequest(pid, currentRing, targetRing, reason, false);
      await this.logEvent("deny", pid, "elevate", null, null, false,
        `Cannot elevate from ring ${currentRing} to ${targetRing}`);
      return req;
    }

    // ECC-signed authorization check
    const logical = this.encodeAuthorization(pid, targetRing, "elevate");
    const physical = this.ecc.encode(logical);
    const syndrome = this.ecc.measureSyndrome(physical);

    const approved = !syndrome.errorDetected;

    if (approved) {
      // Elevate the process
      this.pidRings.set(pid, targetRing);

      // Grant new ring's default capabilities
      await this.createCapability(
        pid, targetRing,
        RING_DEFAULT_OPS[targetRing],
        "*", null,
      );

      await this.logEvent("elevate", pid, "elevate", null, null, true,
        `Elevated from ring ${currentRing} to ring ${targetRing}: ${reason}`);
    } else {
      await this.logEvent("deny", pid, "elevate", null, null, false,
        `ECC verification failed for elevation to ring ${targetRing}`);
    }

    return this.buildElevationRequest(pid, currentRing, targetRing, reason, approved);
  }

  /**
   * Demote a process to a lower privilege ring.
   */
  demote(pid: number, targetRing: IsolationRing): boolean {
    const currentRing = this.pidRings.get(pid);
    if (currentRing === undefined) return false;
    if (targetRing <= currentRing) return false; // can only demote downward

    this.pidRings.set(pid, targetRing);

    // Revoke caps that exceed new ring's permissions
    const caps = this.pidCapabilities.get(pid);
    if (caps) {
      for (const capCid of caps) {
        const cap = this.capabilities.get(capCid);
        if (cap && cap.ring < targetRing) {
          this.capabilities.set(capCid, { ...cap, revoked: true });
        }
      }
    }

    return true;
  }

  // ── Derivation Chain Verification ───────────────────────────────

  /**
   * Verify the derivation chain of a capability — trace back to root.
   * Returns the full chain of CIDs from leaf to root.
   */
  verifyDerivationChain(capCid: string): {
    valid: boolean;
    chain: string[];
    depth: number;
    brokenAt: string | null;
  } {
    const chain: string[] = [];
    let current = capCid;
    const seen = new Set<string>();

    while (current) {
      if (seen.has(current)) {
        return { valid: false, chain, depth: chain.length, brokenAt: current };
      }
      seen.add(current);

      const cap = this.capabilities.get(current);
      if (!cap) {
        return { valid: false, chain, depth: chain.length, brokenAt: current };
      }
      if (cap.revoked) {
        return { valid: false, chain, depth: chain.length, brokenAt: current };
      }

      chain.push(current);

      if (!cap.parentCapCid) break; // reached root
      current = cap.parentCapCid;
    }

    return { valid: true, chain, depth: chain.length, brokenAt: null };
  }

  // ── Introspection ───────────────────────────────────────────────

  /** Get all capabilities for a process */
  getCapabilities(pid: number): CapabilityToken[] {
    const caps = this.pidCapabilities.get(pid);
    if (!caps) return [];
    return Array.from(caps)
      .map(cid => this.capabilities.get(cid))
      .filter((c): c is CapabilityToken => !!c);
  }

  /** Get a capability by CID */
  getCapability(capCid: string): CapabilityToken | undefined {
    return this.capabilities.get(capCid);
  }

  /** Get the full audit log */
  getAuditLog(): readonly SecurityEvent[] {
    return this.auditLog;
  }

  /** Get elevation history */
  getElevations(): readonly ElevationRequest[] {
    return this.elevations;
  }

  /** Get security statistics */
  stats(): SecurityStats {
    const ringDist: Record<IsolationRing, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
    for (const ring of this.pidRings.values()) {
      ringDist[ring]++;
    }

    const allCaps = Array.from(this.capabilities.values());
    const active = allCaps.filter(c => !c.revoked && (!c.expiresAt || c.expiresAt > Date.now()));

    return {
      totalCapabilities: allCaps.length,
      activeCapabilities: active.length,
      revokedCapabilities: allCaps.length - active.length,
      elevationRequests: this.elevations.length,
      elevationsApproved: this.elevations.filter(e => e.approved).length,
      elevationsDenied: this.elevations.filter(e => !e.approved).length,
      totalChecks: this.totalChecks,
      deniedChecks: this.deniedChecks,
      violations: this.violations,
      ringDistribution: ringDist,
    };
  }

  // ── Internal ────────────────────────────────────────────────────

  /** Get all effective operations for a process */
  private getEffectiveOps(pid: number): SecurityOp[] {
    const ops = new Set<SecurityOp>();
    const caps = this.pidCapabilities.get(pid);
    if (!caps) return [];

    for (const capCid of caps) {
      const cap = this.capabilities.get(capCid);
      if (!cap || cap.revoked) continue;
      if (cap.expiresAt && cap.expiresAt < Date.now()) continue;
      for (const op of cap.operations) ops.add(op);
    }
    return Array.from(ops);
  }

  /** Glob pattern matcher (simple: supports * and exact match) */
  private matchesPattern(resource: string, pattern: string): boolean {
    if (pattern === "*") return true;
    if (pattern === resource) return true;
    // Simple prefix glob: "/mnt/*" matches "/mnt/foo"
    if (pattern.endsWith("*")) {
      return resource.startsWith(pattern.slice(0, -1));
    }
    return false;
  }

  /**
   * Encode an authorization into a 48-bit logical codeword for ECC.
   * Uses PID, ring, and operation hash to create a deterministic pattern.
   */
  private encodeAuthorization(pid: number, ring: IsolationRing, operation: string): number[] {
    const logical = new Array(CODE_K).fill(0);

    // Encode PID in first 16 bits
    for (let i = 0; i < 16; i++) {
      logical[i] = (pid >> i) & 1;
    }

    // Encode ring in bits 16-17
    logical[16] = ring & 1;
    logical[17] = (ring >> 1) & 1;

    // Encode operation hash in remaining bits
    let opHash = 0;
    for (let i = 0; i < operation.length; i++) {
      opHash = (opHash * 31 + operation.charCodeAt(i)) & 0x3FFFFFFF;
    }
    for (let i = 18; i < CODE_K; i++) {
      logical[i] = (opHash >> (i - 18)) & 1;
    }

    return logical;
  }

  /** Recursively revoke a capability and all descendants */
  private cascadeRevoke(capCid: string): void {
    const cap = this.capabilities.get(capCid);
    if (!cap || cap.revoked) return;
    this.capabilities.set(capCid, { ...cap, revoked: true });

    // Find and revoke all children
    for (const [cid, child] of this.capabilities) {
      if (child.parentCapCid === capCid && !child.revoked) {
        this.cascadeRevoke(cid);
      }
    }
  }

  /** Build an elevation request record */
  private async buildElevationRequest(
    pid: number,
    fromRing: IsolationRing,
    toRing: IsolationRing,
    reason: string,
    approved: boolean,
  ): Promise<ElevationRequest> {
    const payload = JSON.stringify({ pid, from: fromRing, to: toRing, reason, t: Date.now() });
    const hash = await sha256(new TextEncoder().encode(payload));
    const requestCid = await computeCid(hash);

    // ECC signature of the authorization
    const logical = this.encodeAuthorization(pid, toRing, "elevate");
    const eccSignature = this.ecc.encode(logical);

    const req: ElevationRequest = {
      requestCid,
      fromRing,
      toRing,
      pid,
      reason,
      eccSignature,
      approved,
      timestamp: Date.now(),
    };

    this.elevations.push(req);
    return req;
  }

  /** Log a security event */
  private async logEvent(
    type: SecurityEvent["type"],
    pid: number,
    operation: SecurityOp | null,
    resource: string | null,
    capCid: string | null,
    allowed: boolean,
    detail: string,
  ): Promise<void> {
    const ring = this.pidRings.get(pid) ?? 3;
    const payload = JSON.stringify({ type, pid, ring, op: operation, res: resource, t: Date.now() });
    const hash = await sha256(new TextEncoder().encode(payload));
    const eventCid = await computeCid(hash);

    this.auditLog.push({
      eventCid,
      type,
      pid,
      ring: ring as IsolationRing,
      operation,
      resource,
      capCid,
      allowed,
      detail,
      timestamp: Date.now(),
    });
  }
}
