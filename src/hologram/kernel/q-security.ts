/**
 * Q-Security — Capability-Based Access Control
 * ═════════════════════════════════════════════
 *
 * Every classical security concept maps to a content-addressed equivalent.
 * Now derived from genesis/ axioms — zero external crypto deps.
 *
 * @module qkernel/q-security
 */

import { toHex, encodeUtf8 } from "@/hologram/genesis/axiom-ring";
import { sha256 } from "@/hologram/genesis/axiom-hash";
import { createCid } from "@/hologram/genesis/axiom-cid";
import { canonicalEncode } from "@/hologram/genesis/axiom-codec";
import { QEcc, CODE_K } from "./q-ecc";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

export type IsolationRing = 0 | 1 | 2 | 3;

export const RING_NAMES: Record<IsolationRing, string> = {
  0: "kernel", 1: "driver", 2: "service", 3: "user",
};

export type SecurityOp =
  | "read" | "write" | "execute" | "create" | "delete" | "mount"
  | "net_send" | "net_recv" | "ipc_send" | "ipc_recv"
  | "spawn" | "kill" | "elevate" | "grant" | "revoke" | "audit_read";

export interface CapabilityToken {
  readonly capCid: string;
  readonly ownerPid: number;
  readonly ring: IsolationRing;
  readonly operations: SecurityOp[];
  readonly resourcePattern: string;
  readonly parentCapCid: string | null;
  readonly createdAt: number;
  readonly expiresAt: number | null;
  readonly revoked: boolean;
}

export interface ElevationRequest {
  readonly requestCid: string;
  readonly fromRing: IsolationRing;
  readonly toRing: IsolationRing;
  readonly pid: number;
  readonly reason: string;
  readonly eccSignature: number[];
  readonly approved: boolean;
  readonly timestamp: number;
}

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
// Ring privilege levels
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
// Q-Security Implementation (all sync — no more async sha256)
// ═══════════════════════════════════════════════════════════════════════

export class QSecurity {
  private capabilities = new Map<string, CapabilityToken>();
  private pidRings = new Map<number, IsolationRing>();
  private pidCapabilities = new Map<number, Set<string>>();
  private elevations: ElevationRequest[] = [];
  private auditLog: SecurityEvent[] = [];
  private ecc: QEcc;

  private totalChecks = 0;
  private deniedChecks = 0;
  private violations = 0;

  constructor(ecc: QEcc) { this.ecc = ecc; }

  // ── Process Registration ────────────────────────────────────────

  registerProcess(pid: number, ring: IsolationRing): CapabilityToken {
    this.pidRings.set(pid, ring);
    return this.createCapability(pid, ring, RING_DEFAULT_OPS[ring], "*", null);
  }

  getProcessRing(pid: number): IsolationRing | undefined { return this.pidRings.get(pid); }

  // ── Capability Management ───────────────────────────────────────

  createCapability(
    ownerPid: number, ring: IsolationRing, operations: SecurityOp[],
    resourcePattern: string, parentCapCid: string | null,
    expiresAt: number | null = null,
  ): CapabilityToken {
    const payload = canonicalEncode({
      owner: ownerPid, ring, ops: operations.sort(),
      res: resourcePattern, parent: parentCapCid,
      t: Date.now(), nonce: Math.random(),
    });
    const hash = sha256(payload);
    const capCid = createCid(hash).string;

    const token: CapabilityToken = {
      capCid, ownerPid, ring, operations, resourcePattern,
      parentCapCid, createdAt: Date.now(), expiresAt, revoked: false,
    };

    this.capabilities.set(capCid, token);
    if (!this.pidCapabilities.has(ownerPid)) this.pidCapabilities.set(ownerPid, new Set());
    this.pidCapabilities.get(ownerPid)!.add(capCid);

    return token;
  }

  grant(
    granterPid: number, targetPid: number,
    operations: SecurityOp[], resourcePattern: string,
  ): CapabilityToken | null {
    const granterOps = this.getEffectiveOps(granterPid);
    if (!granterOps.includes("grant")) {
      this.logEvent("deny", granterPid, "grant", null, null, false, `PID ${granterPid} lacks 'grant' permission`);
      return null;
    }

    const validOps = operations.filter(op => granterOps.includes(op));
    if (validOps.length === 0) return null;

    const granterRing = this.pidRings.get(granterPid) ?? 3;
    const targetRing = Math.max(granterRing, this.pidRings.get(targetPid) ?? 3) as IsolationRing;

    const granterCaps = this.pidCapabilities.get(granterPid);
    let parentCid: string | null = null;
    if (granterCaps) {
      for (const cid of granterCaps) {
        const c = this.capabilities.get(cid);
        if (c && !c.revoked && c.operations.includes("grant")) { parentCid = cid; break; }
      }
    }

    const cap = this.createCapability(targetPid, targetRing, validOps, resourcePattern, parentCid);
    this.logEvent("grant", granterPid, "grant", resourcePattern, cap.capCid, true,
      `Granted [${validOps.join(",")}] on '${resourcePattern}' to PID ${targetPid}`);
    return cap;
  }

  revoke(revokerPid: number, capCid: string): boolean {
    if (!this.checkPermission(revokerPid, "revoke", "*")) {
      this.logEvent("deny", revokerPid, "revoke", null, capCid, false, `PID ${revokerPid} lacks 'revoke' permission`);
      return false;
    }
    const cap = this.capabilities.get(capCid);
    if (!cap || cap.revoked) return false;
    this.cascadeRevoke(capCid);
    this.logEvent("revoke", revokerPid, "revoke", null, capCid, true, `Revoked capability ${capCid.slice(0, 16)}…`);
    return true;
  }

  // ── Permission Checking ─────────────────────────────────────────

  checkPermission(pid: number, operation: SecurityOp, resource: string): boolean {
    this.totalChecks++;
    const ring = this.pidRings.get(pid);
    if (ring === undefined) { this.deniedChecks++; return false; }
    if (ring === 0) return true;

    const caps = this.pidCapabilities.get(pid);
    if (!caps) { this.deniedChecks++; return false; }

    for (const capCid of caps) {
      const cap = this.capabilities.get(capCid);
      if (!cap || cap.revoked) continue;
      if (cap.expiresAt && cap.expiresAt < Date.now()) continue;
      if (!cap.operations.includes(operation)) continue;
      if (this.matchesPattern(resource, cap.resourcePattern)) return true;
    }

    this.deniedChecks++;
    return false;
  }

  authorizeSyscall(pid: number, operation: SecurityOp, resource: string): { authorized: boolean; eccVerified: boolean; reason: string } {
    const permitted = this.checkPermission(pid, operation, resource);
    if (!permitted) {
      this.violations++;
      return { authorized: false, eccVerified: false, reason: `PID ${pid} denied '${operation}' on '${resource}'` };
    }

    const ring = this.pidRings.get(pid) ?? 3;
    const logical = this.encodeAuthorization(pid, ring, operation);
    const physical = this.ecc.encode(logical);
    const syndrome = this.ecc.measureSyndrome(physical);

    if (syndrome.errorDetected) {
      this.violations++;
      return { authorized: false, eccVerified: false, reason: `ECC integrity failure: syndrome weight ${syndrome.weight}` };
    }

    return { authorized: true, eccVerified: true, reason: `Ring ${ring} authorized '${operation}' — ECC clean` };
  }

  // ── Ring Elevation ──────────────────────────────────────────────

  requestElevation(pid: number, targetRing: IsolationRing, reason: string): ElevationRequest {
    const currentRing = this.pidRings.get(pid) ?? 3;

    if (targetRing >= currentRing) {
      const req = this.buildElevationRequest(pid, currentRing, targetRing, reason, false);
      this.logEvent("deny", pid, "elevate", null, null, false, `Cannot elevate from ring ${currentRing} to ${targetRing}`);
      return req;
    }

    const logical = this.encodeAuthorization(pid, targetRing, "elevate");
    const physical = this.ecc.encode(logical);
    const syndrome = this.ecc.measureSyndrome(physical);
    const approved = !syndrome.errorDetected;

    if (approved) {
      this.pidRings.set(pid, targetRing);
      this.createCapability(pid, targetRing, RING_DEFAULT_OPS[targetRing], "*", null);
      this.logEvent("elevate", pid, "elevate", null, null, true, `Elevated from ring ${currentRing} to ring ${targetRing}: ${reason}`);
    } else {
      this.logEvent("deny", pid, "elevate", null, null, false, `ECC verification failed for elevation to ring ${targetRing}`);
    }

    return this.buildElevationRequest(pid, currentRing, targetRing, reason, approved);
  }

  demote(pid: number, targetRing: IsolationRing): boolean {
    const currentRing = this.pidRings.get(pid);
    if (currentRing === undefined || targetRing <= currentRing) return false;
    this.pidRings.set(pid, targetRing);
    const caps = this.pidCapabilities.get(pid);
    if (caps) {
      for (const capCid of caps) {
        const cap = this.capabilities.get(capCid);
        if (cap && cap.ring < targetRing) this.capabilities.set(capCid, { ...cap, revoked: true });
      }
    }
    return true;
  }

  // ── Derivation Chain Verification ───────────────────────────────

  verifyDerivationChain(capCid: string): { valid: boolean; chain: string[]; depth: number; brokenAt: string | null } {
    const chain: string[] = [];
    let current = capCid;
    const seen = new Set<string>();

    while (current) {
      if (seen.has(current)) return { valid: false, chain, depth: chain.length, brokenAt: current };
      seen.add(current);
      const cap = this.capabilities.get(current);
      if (!cap) return { valid: false, chain, depth: chain.length, brokenAt: current };
      if (cap.revoked) return { valid: false, chain, depth: chain.length, brokenAt: current };
      chain.push(current);
      if (!cap.parentCapCid) break;
      current = cap.parentCapCid;
    }

    return { valid: true, chain, depth: chain.length, brokenAt: null };
  }

  // ── Introspection ───────────────────────────────────────────────

  getCapabilities(pid: number): CapabilityToken[] {
    const caps = this.pidCapabilities.get(pid);
    if (!caps) return [];
    return Array.from(caps).map(cid => this.capabilities.get(cid)).filter((c): c is CapabilityToken => !!c);
  }

  getCapability(capCid: string): CapabilityToken | undefined { return this.capabilities.get(capCid); }
  getAuditLog(): readonly SecurityEvent[] { return this.auditLog; }
  getElevations(): readonly ElevationRequest[] { return this.elevations; }

  stats(): SecurityStats {
    const ringDist: Record<IsolationRing, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
    for (const ring of this.pidRings.values()) ringDist[ring]++;
    const allCaps = Array.from(this.capabilities.values());
    const active = allCaps.filter(c => !c.revoked && (!c.expiresAt || c.expiresAt > Date.now()));

    return {
      totalCapabilities: allCaps.length, activeCapabilities: active.length,
      revokedCapabilities: allCaps.length - active.length,
      elevationRequests: this.elevations.length,
      elevationsApproved: this.elevations.filter(e => e.approved).length,
      elevationsDenied: this.elevations.filter(e => !e.approved).length,
      totalChecks: this.totalChecks, deniedChecks: this.deniedChecks,
      violations: this.violations, ringDistribution: ringDist,
    };
  }

  // ── Internal ────────────────────────────────────────────────────

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

  private matchesPattern(resource: string, pattern: string): boolean {
    if (pattern === "*") return true;
    if (pattern === resource) return true;
    if (pattern.endsWith("*")) return resource.startsWith(pattern.slice(0, -1));
    return false;
  }

  private encodeAuthorization(pid: number, ring: IsolationRing, operation: string): number[] {
    const logical = new Array(CODE_K).fill(0);
    for (let i = 0; i < 16; i++) logical[i] = (pid >> i) & 1;
    logical[16] = ring & 1;
    logical[17] = (ring >> 1) & 1;
    let opHash = 0;
    for (let i = 0; i < operation.length; i++) opHash = (opHash * 31 + operation.charCodeAt(i)) & 0x3FFFFFFF;
    for (let i = 18; i < CODE_K; i++) logical[i] = (opHash >> (i - 18)) & 1;
    return logical;
  }

  private cascadeRevoke(capCid: string): void {
    const cap = this.capabilities.get(capCid);
    if (!cap || cap.revoked) return;
    this.capabilities.set(capCid, { ...cap, revoked: true });
    for (const [cid, child] of this.capabilities) {
      if (child.parentCapCid === capCid && !child.revoked) this.cascadeRevoke(cid);
    }
  }

  private buildElevationRequest(pid: number, fromRing: IsolationRing, toRing: IsolationRing, reason: string, approved: boolean): ElevationRequest {
    const payload = canonicalEncode({ pid, from: fromRing, to: toRing, reason, t: Date.now() });
    const hash = sha256(payload);
    const requestCid = createCid(hash).string;
    const logical = this.encodeAuthorization(pid, toRing, "elevate");
    const eccSignature = this.ecc.encode(logical);
    const req: ElevationRequest = { requestCid, fromRing, toRing, pid, reason, eccSignature, approved, timestamp: Date.now() };
    this.elevations.push(req);
    return req;
  }

  private logEvent(type: SecurityEvent["type"], pid: number, operation: SecurityOp | null, resource: string | null, capCid: string | null, allowed: boolean, detail: string): void {
    const ring = this.pidRings.get(pid) ?? 3;
    const payload = canonicalEncode({ type, pid, ring, op: operation, res: resource, t: Date.now() });
    const hash = sha256(payload);
    const eventCid = createCid(hash).string;
    this.auditLog.push({ eventCid, type, pid, ring: ring as IsolationRing, operation, resource, capCid, allowed, detail, timestamp: Date.now() });
  }
}
