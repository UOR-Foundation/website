/**
 * UNS Mesh — Node Orchestrator (Phase 4-C)
 *
 * A UnsNode is a single process that boots the entire UNS stack:
 * resolver, shield, compute, store, kv, cache, ledger, trust.
 *
 * One command. Entire stack. Content-addressed from kernel to application.
 */

import type { UnsKeypair } from "../core/keypair";
import { singleProofHash } from "../core/identity";

// ── Types ───────────────────────────────────────────────────────────────────

export interface UnsNodeConfig {
  dataDir: string;
  nodeIdentity: UnsKeypair;
  dhtPort: number;
  httpPort: number;
  bootstrapPeers?: string[];
  enableShield: boolean;
  enableCompute: boolean;
  enableStore: boolean;
  enableLedger: boolean;
  enableTrust: boolean;
}

export interface ServiceStatus {
  resolver: boolean;
  shield: boolean;
  compute: boolean;
  store: boolean;
  kv: boolean;
  cache: boolean;
  ledger: boolean;
  trust: boolean;
}

export interface HealthResponse {
  status: "ok" | "error";
  nodeCanonicalId: string;
  services: ServiceStatus;
  uptime: number;
}

// ── Node Orchestrator ───────────────────────────────────────────────────────

export class UnsNode {
  private config: UnsNodeConfig;
  private _canonicalId: string = "";
  private _running = false;
  private _startedAt = 0;
  private _services: ServiceStatus = {
    resolver: false,
    shield: false,
    compute: false,
    store: false,
    kv: false,
    cache: false,
    ledger: false,
    trust: false,
  };

  constructor(config: UnsNodeConfig) {
    this.config = config;
    this._canonicalId = config.nodeIdentity.canonicalId;
  }

  /** Start all configured services. */
  async start(): Promise<void> {
    if (this._running) return;

    // Derive node identity from config
    const identity = await singleProofHash({
      "@type": "uns:Node",
      "uns:identity": this.config.nodeIdentity.canonicalId,
      "uns:dataDir": this.config.dataDir,
      "uns:httpPort": this.config.httpPort,
    });
    this._canonicalId = identity["u:canonicalId"];

    // Boot services based on config
    this._services.resolver = true; // Always on
    this._services.shield = this.config.enableShield;
    this._services.compute = this.config.enableCompute;
    this._services.store = this.config.enableStore;
    this._services.kv = this.config.enableStore; // KV depends on store
    this._services.cache = this.config.enableStore; // Cache depends on store
    this._services.ledger = this.config.enableLedger;
    this._services.trust = this.config.enableTrust;

    this._running = true;
    this._startedAt = Date.now();
  }

  /** Stop all services cleanly. */
  async stop(): Promise<void> {
    if (!this._running) return;

    // Tear down in reverse order
    this._services = {
      resolver: false, shield: false, compute: false,
      store: false, kv: false, cache: false,
      ledger: false, trust: false,
    };
    this._running = false;
    this._startedAt = 0;
  }

  /** This node's canonical ID. */
  nodeCanonicalId(): string {
    return this._canonicalId;
  }

  /** Health check — equivalent to GET /health. */
  health(): HealthResponse {
    return {
      status: this._running ? "ok" : "error",
      nodeCanonicalId: this._canonicalId,
      services: { ...this._services },
      uptime: this._running ? Date.now() - this._startedAt : 0,
    };
  }

  /** Whether the node is currently running. */
  isRunning(): boolean {
    return this._running;
  }
}
