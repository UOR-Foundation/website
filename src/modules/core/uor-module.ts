/**
 * UorModule<T> — Generic Module Lifecycle Base
 * ═════════════════════════════════════════════
 *
 * Every UOR module follows the same four-phase lifecycle:
 *
 *   register → observe → certify → remediate
 *
 * This base class encodes that pattern once, eliminating duplication
 * across ring-core, morphism, trace, certificate, and every future module.
 *
 * The lifecycle is the Observer Theory applied to modules themselves:
 *
 *   register()   — Module joins the observation network
 *   observe(op)  — Each operation is assessed for coherence (H-score → Zone)
 *   certify()    — Module issues a self-verification certificate
 *   remediate()  — If DRIFT/COLLAPSE, the entropy pump prescribes correction
 *
 * Subclasses implement `executeOperation()` — the module-specific logic.
 * Everything else (coherence tracking, zone assignment, certification,
 * remediation) is handled by the base class.
 *
 * This IS the simplification: one class, one pattern, every module.
 *
 * @module core/uor-module
 */

import { popcount } from "@/modules/observable/h-score";

// ── Types ───────────────────────────────────────────────────────────────────

export type CoherenceZone = "COHERENCE" | "DRIFT" | "COLLAPSE";
export type LogosClass = "isometry" | "embedding" | "arbitrary";

/** Record of a single observed operation. */
export interface OperationRecord<T = unknown> {
  readonly opId: string;
  readonly opName: string;
  readonly inputHash: number;
  readonly outputHash: number;
  readonly hammingDist: number;
  readonly logosClass: LogosClass;
  readonly timestamp: string;
  readonly result: T;
}

/** Module self-certification result. */
export interface ModuleCertificate {
  readonly moduleId: string;
  readonly moduleName: string;
  readonly zone: CoherenceZone;
  readonly hScore: number;
  readonly phi: number;
  readonly operationCount: number;
  readonly gradeACount: number;
  readonly isometryCount: number;
  readonly issuedAt: string;
  readonly verified: boolean;
  readonly failures: string[];
}

/** Remediation prescription. */
export interface RemediationResult {
  readonly protocol: "OIP" | "EDP" | "CAP";
  readonly reason: string;
  readonly prescribedAction: string;
  readonly urgency: "low" | "medium" | "high" | "critical";
  readonly issuedAt: string;
}

/** Module health snapshot (the complete lifecycle state). */
export interface ModuleHealth {
  readonly moduleId: string;
  readonly moduleName: string;
  readonly zone: CoherenceZone;
  readonly hScore: number;
  readonly phi: number;
  readonly epsilon: number;
  readonly logosCompliance: number;
  readonly operationCount: number;
  readonly gradeACount: number;
  readonly isometryCount: number;
  readonly cumulativeDebt: number;
  readonly lastCertificate: ModuleCertificate | null;
  readonly activeRemediation: RemediationResult | null;
  readonly registeredAt: string;
  readonly lastOperationAt: string;
}

// ── Thresholds ──────────────────────────────────────────────────────────────

const DEFAULT_THRESHOLDS = { low: 2, high: 5 };

// ── UorModule Base Class ────────────────────────────────────────────────────

/**
 * Generic UOR Module with the unified lifecycle.
 *
 * T = the result type of module operations.
 *
 * Usage:
 *   class RingModule extends UorModule<ByteTuple> {
 *     executeOperation(name, input) { ... return output; }
 *     verifySelf() { ... return { verified, failures }; }
 *   }
 *
 *   const ring = new RingModule("ring-core", "Q0 Ring");
 *   ring.register();
 *   const result = ring.observe("neg", inputByte, outputByte, computedResult);
 *   const cert = ring.certify();
 *   const remedy = ring.remediate();
 */
export abstract class UorModule<T = unknown> {
  readonly moduleId: string;
  readonly moduleName: string;

  // ── Lifecycle State ──
  private _zone: CoherenceZone = "COHERENCE";
  private _hScore = 0;
  private _phi = 1;
  private _epsilon = 0;
  private _operationCount = 0;
  private _gradeACount = 0;
  private _isometryCount = 0;
  private _cumulativeDebt = 0;
  private _registeredAt = "";
  private _lastOperationAt = "";
  private _lastCertificate: ModuleCertificate | null = null;
  private _activeRemediation: RemediationResult | null = null;
  private _registered = false;
  private _history: OperationRecord<T>[] = [];
  private _thresholds = { ...DEFAULT_THRESHOLDS };

  constructor(moduleId: string, moduleName: string) {
    this.moduleId = moduleId;
    this.moduleName = moduleName;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1: REGISTER
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Register this module in the observation network.
   * Optionally provide custom zone thresholds.
   */
  register(thresholds?: { low: number; high: number }): ModuleHealth {
    if (thresholds) this._thresholds = { ...thresholds };
    this._registeredAt = new Date().toISOString();
    this._registered = true;
    this._zone = "COHERENCE";
    this._hScore = 0;
    this._phi = 1;
    this._epsilon = 0;
    this._operationCount = 0;
    this._gradeACount = 0;
    this._isometryCount = 0;
    this._cumulativeDebt = 0;
    this._lastCertificate = null;
    this._activeRemediation = null;
    this._history = [];
    return this.health();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 2: OBSERVE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Observe an operation: assess coherence, update zone, track metrics.
   *
   * @param opName      Operation name (e.g., "neg", "embed", "hash")
   * @param inputHash   First byte of input hash (0-255)
   * @param outputHash  First byte of output hash (0-255)
   * @param result      The actual computation result (module-specific type T)
   */
  observe(
    opName: string,
    inputHash: number,
    outputHash: number,
    result: T,
  ): OperationRecord<T> {
    if (!this._registered) this.register();

    const previousH = this._hScore;
    const hammingDist = popcount((inputHash ^ outputHash) >>> 0);

    // Logos classification
    const logosClass: LogosClass =
      hammingDist <= this._thresholds.low ? "isometry" :
      hammingDist <= this._thresholds.high ? "embedding" : "arbitrary";

    const now = new Date().toISOString();
    const record: OperationRecord<T> = {
      opId: `${this.moduleId}:${opName}:${this._operationCount}`,
      opName,
      inputHash,
      outputHash,
      hammingDist,
      logosClass,
      timestamp: now,
      result,
    };

    this._history.push(record);
    if (this._history.length > 100) this._history = this._history.slice(-100);

    // Update metrics
    this._operationCount++;
    this._lastOperationAt = now;

    if (logosClass === "isometry") {
      this._isometryCount++;
      this._gradeACount++;
    } else if (logosClass === "embedding") {
      this._gradeACount++;
    }

    // H-score: EMA
    this._hScore = this._hScore * 0.7 + hammingDist * 0.3;

    // Zone
    this._zone =
      this._hScore <= this._thresholds.low ? "COHERENCE" :
      this._hScore <= this._thresholds.high ? "DRIFT" : "COLLAPSE";

    // Cumulative debt
    this._cumulativeDebt += hammingDist;

    // Entropy pump rate
    const delta = hammingDist - previousH;
    this._epsilon = this._epsilon * 0.8 + (-delta) * 0.2;

    // Phi
    this._phi = this._gradeACount / this._operationCount;

    // Auto-remediate if needed
    this._activeRemediation = this._zone === "COHERENCE"
      ? null
      : this.buildRemediation();

    return record;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3: CERTIFY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Issue a self-verification certificate.
   * Calls the abstract `verifySelf()` method for module-specific checks.
   */
  certify(): ModuleCertificate {
    const { verified, failures } = this.verifySelf();

    const cert: ModuleCertificate = {
      moduleId: this.moduleId,
      moduleName: this.moduleName,
      zone: this._zone,
      hScore: this._hScore,
      phi: this._phi,
      operationCount: this._operationCount,
      gradeACount: this._gradeACount,
      isometryCount: this._isometryCount,
      issuedAt: new Date().toISOString(),
      verified,
      failures,
    };

    this._lastCertificate = cert;
    return cert;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 4: REMEDIATE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get the current remediation prescription (null if COHERENCE).
   */
  remediate(): RemediationResult | null {
    return this._activeRemediation;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ABSTRACT — subclasses implement these
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Module-specific self-verification logic.
   * Return { verified: true/false, failures: string[] }.
   */
  protected abstract verifySelf(): { verified: boolean; failures: string[] };

  // ═══════════════════════════════════════════════════════════════════════════
  // ACCESSORS
  // ═══════════════════════════════════════════════════════════════════════════

  get zone(): CoherenceZone { return this._zone; }
  get hScore(): number { return this._hScore; }
  get phi(): number { return this._phi; }
  get epsilon(): number { return this._epsilon; }
  get isRegistered(): boolean { return this._registered; }
  get operationCount(): number { return this._operationCount; }
  get history(): readonly OperationRecord<T>[] { return this._history; }

  /** Complete health snapshot. */
  health(): ModuleHealth {
    return {
      moduleId: this.moduleId,
      moduleName: this.moduleName,
      zone: this._zone,
      hScore: this._hScore,
      phi: this._phi,
      epsilon: this._epsilon,
      logosCompliance: this._operationCount > 0 ? this._isometryCount / this._operationCount : 1,
      operationCount: this._operationCount,
      gradeACount: this._gradeACount,
      isometryCount: this._isometryCount,
      cumulativeDebt: this._cumulativeDebt,
      lastCertificate: this._lastCertificate,
      activeRemediation: this._activeRemediation,
      registeredAt: this._registeredAt,
      lastOperationAt: this._lastOperationAt,
    };
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private buildRemediation(): RemediationResult {
    const now = new Date().toISOString();

    if (this._zone === "COLLAPSE") {
      return {
        protocol: "CAP",
        reason: `${this.moduleName} H=${this._hScore.toFixed(2)} exceeds collapse threshold`,
        prescribedAction: "Quarantine outputs. Re-derive from Grade-A graph. Require isometry proof.",
        urgency: "critical",
        issuedAt: now,
      };
    }

    // DRIFT
    if (this._epsilon > 0) {
      return {
        protocol: "OIP",
        reason: `${this.moduleName} in DRIFT, ε=${this._epsilon.toFixed(3)} (improving)`,
        prescribedAction: "Continue remediation. Increase Logos-compliant operations.",
        urgency: "low",
        issuedAt: now,
      };
    }

    return {
      protocol: "EDP",
      reason: `${this.moduleName} in DRIFT, ε=${this._epsilon.toFixed(3)} (not improving)`,
      prescribedAction: "Broadcast drift evidence. Request cross-module verification.",
      urgency: this._epsilon < -0.5 ? "high" : "medium",
      issuedAt: now,
    };
  }
}
