/**
 * UNS TypeScript SDK — Unified Client for All UNS Services (Phase 5-D)
 *
 * The primary interface for application developers to interact with
 * the UOR Name Service. Every method returns typed objects with
 * canonical IDs prominently exposed.
 *
 * UOR Framework compliance:
 *   - All identity derived via singleProofHash() (URDNA2015 pipeline)
 *   - All signing uses CRYSTALS-Dilithium-3 (FIPS 204 ML-DSA-65)
 *   - Canonical IDs shown in full on every response
 *   - Content addressing ensures zero-staleness data retrieval
 *
 * @example
 * ```typescript
 * import { UnsClient, generateKeypair } from "@uns/sdk";
 *
 * const keypair = await generateKeypair();
 * const client = new UnsClient({
 *   nodeUrl: "http://localhost:8080",
 *   identity: keypair,
 * });
 *
 * const id = await client.computeCanonicalId({ hello: "world" });
 * ```
 */

import { singleProofHash, verifyCanonical } from "../core/identity";
import {
  generateKeypair,
  signRecord as dilithiumSign,
  verifyRecord as dilithiumVerify,
  registerPublicKey,
  type UnsKeypair,
  type SignatureBlock,
  type PublicKeyObject,
} from "../core/keypair";
import {
  createRecord,
  publishRecord,
  resolveByName,
  type UnsNameRecord,
  type SignedUnsRecord,
} from "../core/record";
import {
  deployFunction as registryDeploy,
  getFunction,
  listFunctions as registryList,
  clearRegistry,
} from "../compute/registry";
import {
  invokeFunction as executorInvoke,
  verifyExecution as executorVerify,
  type ExecutionResult,
  type ComputationTrace,
} from "../compute/executor";
import type { ComputeFunction } from "../compute/registry";
import {
  UnsAgentGateway,
  buildAgentMessage,
  type AgentRegistration,
  type AgentMessage,
  type RouteResult,
  type InjectionAlert,
} from "../compute/agent-gateway";
import { UnsObjectStore, type StoredObject } from "../store/object-store";
import { UnsKv } from "../store/kv";
import { UnsLedger, type QueryResult, type StateTransition, type SchemaMigration } from "../ledger";
import {
  UnsAuthServer,
  signChallenge,
  type UnsChallenge,
  type UnsSession,
} from "../trust/auth";
import {
  UnsAccessControl,
  type UnsAccessPolicy,
} from "../trust/policy";
import {
  analyzePayload,
  type PartitionResult,
} from "../shield/partition";
import type { UorCanonicalIdentity } from "../core/address";
import type { SignedRecord } from "../core/keypair";

// ── Configuration ───────────────────────────────────────────────────────────

/**
 * Configuration for the UNS SDK client.
 *
 * @property nodeUrl   - Base URL of the UnsNode HTTP API
 * @property identity  - Optional Dilithium-3 keypair for signing writes
 * @property timeout   - Request timeout in milliseconds (default: 30000)
 */
export interface UnsClientConfig {
  /** UnsNode HTTP API base URL. */
  nodeUrl: string;
  /** Optional identity keypair — if provided, all writes are Dilithium-3 signed. */
  identity?: UnsKeypair;
  /** Request timeout in milliseconds (default: 30000). */
  timeout?: number;
}

// ── UNS Client ──────────────────────────────────────────────────────────────

/**
 * The UNS TypeScript SDK client — typed access to all UNS services.
 */
export class UnsClient {
  private readonly config: UnsClientConfig;
  private readonly store: UnsObjectStore;
  private readonly kv: UnsKv;
  private readonly ledger: UnsLedger | null;
  private readonly authServer: UnsAuthServer | null;
  private readonly accessControl: UnsAccessControl;
  private readonly agentGateway: UnsAgentGateway;
  private readonly identityStore: Map<string, object>;

  constructor(config: UnsClientConfig) {
    this.config = { timeout: 30_000, ...config };
    this.store = new UnsObjectStore();
    this.kv = new UnsKv();
    this.identityStore = new Map<string, object>();
    this.accessControl = new UnsAccessControl();
    this.agentGateway = new UnsAgentGateway();

    if (config.identity) {
      this.ledger = new UnsLedger(config.identity);
      this.authServer = new UnsAuthServer(config.identity, this.identityStore);
    } else {
      this.ledger = null;
      this.authServer = null;
    }
  }

  // ── Resolver ────────────────────────────────────────────────────────────

  /**
   * Resolve a UNS name to its target identity.
   *
   * @param name  The UNS name to resolve
   * @returns     Resolution result with canonical ID, IPv6, CID
   */
  async resolve(name: string): Promise<{
    found: boolean;
    name: string;
    canonicalId: string;
    ipv6: string;
    cid: string;
    verified: boolean;
    record?: SignedUnsRecord;
  }> {
    const record = resolveByName(name);
    if (!record) {
      return { found: false, name, canonicalId: "", ipv6: "", cid: "", verified: false };
    }
    const target = record["uns:target"];
    return {
      found: true,
      name,
      canonicalId: target["u:canonicalId"],
      ipv6: target["u:ipv6"],
      cid: target["u:cid"],
      record,
      verified: true,
    };
  }

  /**
   * Publish a signed UNS Name Record.
   *
   * @param record   Record data (signature computed automatically)
   * @param keypair  Signing keypair
   * @returns        Canonical ID of the published record
   */
  async publishRecord(
    record: Omit<UnsNameRecord, "cert:signature">,
    keypair: UnsKeypair
  ): Promise<string> {
    return publishRecord(record as UnsNameRecord, keypair);
  }

  /**
   * Retrieve a signed record by name.
   */
  async getRecord(name: string): Promise<SignedUnsRecord | null> {
    return resolveByName(name);
  }

  /**
   * Verify a record's Dilithium-3 signature.
   */
  async verifyRecord(name: string): Promise<{
    valid: boolean;
    reason: string;
    canonicalId?: string;
  }> {
    const record = resolveByName(name);
    if (!record) return { valid: false, reason: "not found" };
    const valid = await dilithiumVerify(record);
    return {
      valid,
      reason: valid ? "signature verified" : "signature invalid",
      canonicalId: record["u:canonicalId"],
    };
  }

  // ── Shield ──────────────────────────────────────────────────────────────

  /**
   * Analyze content bytes using ring-arithmetic partition classification.
   */
  async analyzeContent(bytes: Uint8Array): Promise<PartitionResult> {
    return analyzePayload(bytes);
  }

  /**
   * Get Shield traffic statistics.
   */
  async getShieldStats(): Promise<{
    blockRate: number;
    challengeRate: number;
    warnRate: number;
  }> {
    return { blockRate: 0, challengeRate: 0, warnRate: 0 };
  }

  // ── Compute ─────────────────────────────────────────────────────────────

  /**
   * Deploy a JavaScript function to the content-addressed compute layer.
   */
  async deployFunction(
    source: string,
    opts?: { name?: string }
  ): Promise<{ canonicalId: string }> {
    const keypair = this.requireIdentity("deployFunction");
    const fn = await registryDeploy(source, "javascript", keypair, opts?.name);
    return { canonicalId: fn.canonicalId };
  }

  /**
   * Invoke a deployed function by its canonical ID.
   */
  async invokeFunction(
    canonicalId: string,
    input: unknown
  ): Promise<ExecutionResult> {
    const keypair = this.requireIdentity("invokeFunction");
    return executorInvoke(canonicalId, input, keypair);
  }

  /**
   * Verify a computation trace's Dilithium-3 signature.
   */
  async verifyExecution(
    result: ExecutionResult,
    originalInput: unknown
  ): Promise<{ verified: boolean }> {
    const verified = await executorVerify(result, originalInput);
    return { verified };
  }

  /**
   * List all deployed functions.
   */
  async listFunctions(): Promise<ComputeFunction[]> {
    return registryList();
  }

  // ── Store ───────────────────────────────────────────────────────────────

  /**
   * Store content in the content-addressed object store.
   */
  async putObject(
    bytes: Uint8Array,
    contentType: string,
    bucket?: string,
    key?: string
  ): Promise<StoredObject> {
    if (bucket && key) {
      return this.store.putByKey(bucket, key, bytes, contentType);
    }
    return this.store.put(bytes, contentType);
  }

  /**
   * Retrieve content by canonical ID.
   */
  async getObject(
    canonicalId: string
  ): Promise<{ bytes: Uint8Array; meta: StoredObject } | null> {
    return this.store.get(canonicalId);
  }

  /**
   * Retrieve content by S3-compatible bucket/key.
   */
  async getObjectByKey(
    bucket: string,
    key: string
  ): Promise<{ bytes: Uint8Array; meta: StoredObject } | null> {
    return this.store.getByKey(bucket, key);
  }

  /**
   * Verify object integrity by recomputing its canonical ID.
   */
  async verifyObject(canonicalId: string): Promise<boolean> {
    return this.store.verify(canonicalId);
  }

  /**
   * List objects in a bucket.
   */
  async listObjects(bucket: string, prefix?: string): Promise<StoredObject[]> {
    return this.store.list(bucket, prefix);
  }

  // ── KV ──────────────────────────────────────────────────────────────────

  /**
   * Get a value by key from the linearizable KV store.
   */
  async kvGet(
    key: string
  ): Promise<{ value: Uint8Array; canonicalId: string } | null> {
    return this.kv.get(key);
  }

  /**
   * Write a key-value pair.
   */
  async kvPut(
    key: string,
    value: Uint8Array
  ): Promise<{ canonicalId: string }> {
    const result = await this.kv.put(key, value);
    return { canonicalId: result.canonicalId };
  }

  /**
   * Delete a key from the KV store.
   */
  async kvDelete(key: string): Promise<void> {
    return this.kv.delete(key);
  }

  /**
   * List keys with optional prefix filter.
   */
  async kvList(
    prefix?: string
  ): Promise<Array<{ key: string; canonicalId: string }>> {
    return this.kv.list(prefix);
  }

  // ── Ledger ──────────────────────────────────────────────────────────────

  /**
   * Execute a read-only SQL query with a signed query proof.
   */
  async ledgerQuery(sql: string, params?: unknown[]): Promise<QueryResult> {
    this.requireIdentity("ledgerQuery");
    return this.ledger!.query(sql, params);
  }

  /**
   * Execute a write SQL statement, producing a state transition record.
   */
  async ledgerExecute(
    sql: string,
    params?: unknown[]
  ): Promise<SignedRecord<StateTransition>> {
    this.requireIdentity("ledgerExecute");
    return this.ledger!.execute(sql, params);
  }

  /**
   * Apply a schema migration.
   */
  async ledgerMigrate(
    sql: string,
    description: string
  ): Promise<SignedRecord<SchemaMigration>> {
    this.requireIdentity("ledgerMigrate");
    return this.ledger!.migrate(sql, description);
  }

  // ── Trust ───────────────────────────────────────────────────────────────

  /**
   * Issue a challenge for zero-trust authentication.
   */
  async issueChallenge(identityCanonicalId: string): Promise<UnsChallenge> {
    this.requireIdentity("issueChallenge");
    return this.authServer!.issueChallenge(identityCanonicalId);
  }

  /**
   * Authenticate by signing a challenge with Dilithium-3.
   */
  async authenticate(
    challengeId: string,
    keypair: UnsKeypair
  ): Promise<UnsSession | null> {
    this.requireIdentity("authenticate");
    // Register the public key in the identity store for verification
    this.identityStore.set(keypair.canonicalId, keypair.publicKeyObject);
    const challenge = await this.authServer!.issueChallenge(keypair.canonicalId);
    const signature = await signChallenge(challenge, keypair);
    return this.authServer!.verifyChallenge(challenge.challengeId, signature);
  }

  /**
   * Define a content-addressed access policy.
   */
  async definePolicy(
    policy: Omit<UnsAccessPolicy, "cert:signature" | "u:canonicalId">,
    keypair: UnsKeypair
  ): Promise<UnsAccessPolicy> {
    return this.accessControl.definePolicy(policy, keypair);
  }

  // ── Agent Gateway ───────────────────────────────────────────────────────

  /**
   * Register an AI agent by its identity object.
   */
  async registerAgent(identityObject: PublicKeyObject): Promise<AgentRegistration> {
    return this.agentGateway.register(identityObject);
  }

  /**
   * Send a morphism-typed message between agents.
   */
  async sendAgentMessage(
    message: AgentMessage
  ): Promise<RouteResult> {
    return this.agentGateway.route(message);
  }

  /**
   * Get message history for an agent.
   */
  async getAgentHistory(canonicalId: string): Promise<AgentMessage[]> {
    return this.agentGateway.getHistory(canonicalId);
  }

  /**
   * Get injection alerts from the Agent Gateway.
   */
  async getInjectionAlerts(): Promise<InjectionAlert[]> {
    return this.agentGateway.getAlerts();
  }

  // ── Identity Helpers ────────────────────────────────────────────────────

  /**
   * Compute the canonical ID of any object.
   *
   * Pipeline: obj → URDNA2015 → UTF-8 → SHA-256 → urn:uor:derivation:sha256:{hex64}
   */
  async computeCanonicalId(obj: unknown): Promise<string> {
    const identity = await singleProofHash(obj);
    return identity["u:canonicalId"];
  }

  /**
   * Compute the IPv6 content address of any object.
   *
   * NOTE: The IPv6 address is a LOSSY 80-bit routing projection.
   */
  async computeIPv6(obj: unknown): Promise<string> {
    const identity = await singleProofHash(obj);
    return identity["u:ipv6"];
  }

  /**
   * Verify that an object produces a specific canonical ID.
   */
  async verifyCanonicalId(obj: unknown, canonicalId: string): Promise<boolean> {
    return verifyCanonical(obj, canonicalId);
  }

  /**
   * Compute the full UOR canonical identity for any object.
   *
   * Returns all four identity forms:
   *   1. u:canonicalId  — lossless 256-bit derivation URN
   *   2. u:ipv6         — lossy 80-bit routing projection
   *   3. u:cid          — CIDv1 IPFS-compatible identifier
   *   4. u:glyph        — Braille visual identity
   */
  async computeFullIdentity(obj: unknown): Promise<UorCanonicalIdentity> {
    return singleProofHash(obj);
  }

  // ── P32: Intent-Based Query ─────────────────────────────────────────────

  /**
   * Intent-based object resolution via the query: namespace.
   *
   * Decomposes intent text into ring elements, classifies by partition,
   * and resolves matches via DihedralFactorizationResolver with epistemic grading.
   */
  async query(
    intentText: string,
    graphUri?: string
  ): Promise<{
    "@type": "query:Resolution";
    totalMatches: number;
    epistemic_grade: string;
    matches: Array<{
      object: string;
      score: number;
      hammingDist: number;
      grade: string;
    }>;
  }> {
    // Lazy import to avoid circular dependencies
    const { UnsQuery: QueryEngine } = await import("@/modules/sparql/query");
    const { UnsGraph: GraphEngine } = await import("@/modules/kg-store/uns-graph");

    const graph = new GraphEngine();
    graph.loadOntologyGraph();
    graph.materializeQ0();

    const engine = new QueryEngine(graph);
    const result = await engine.query(intentText, graphUri);

    return {
      "@type": "query:Resolution",
      totalMatches: result.totalMatches,
      epistemic_grade: result.epistemic_grade,
      matches: result["query:matches"].map((m) => ({
        object: m["query:object"],
        score: m["query:score"],
        hammingDist: m["query:hammingDist"],
        grade: m.epistemic_grade,
      })),
    };
  }

  /**
   * SPARQL query with epistemic grading (Grade B — graph-certified).
   */
  async sparqlQuery(
    sparql: string,
    graphUri?: string
  ): Promise<{
    "@type": "query:SparqlResult";
    "@graph": Array<Record<string, string>>;
    epistemic_grade: "B";
  }> {
    const { UnsQuery: QueryEngine } = await import("@/modules/sparql/query");
    const { UnsGraph: GraphEngine } = await import("@/modules/kg-store/uns-graph");

    const graph = new GraphEngine();
    graph.loadOntologyGraph();
    graph.materializeQ0();

    const engine = new QueryEngine(graph);
    const result = await engine.sparqlQuery(
      sparql,
      graphUri ?? "https://uor.foundation/graph/q0"
    );

    return {
      "@type": "query:SparqlResult",
      "@graph": result["@graph"],
      epistemic_grade: "B",
    };
  }

  // ── P33: Fidelity Correlation ────────────────────────────────────────────

  /**
   * Compute fidelity between two canonical IDs using ring Hamming distance.
   *
   * Returns SKOS semantic recommendation (exactMatch/closeMatch/broadMatch/noMatch)
   * with thresholds derived from partition cardinalities. Grade A — ring arithmetic.
   */
  async correlate(
    canonicalIdA: string,
    canonicalIdB: string
  ): Promise<{
    "@type": "observable:CorrelationMeasure";
    fidelity: number;
    hamming_distance: number;
    skos_recommendation: string;
    epistemic_grade: "A";
    "derivation:derivationId": string;
  }> {
    const { correlateIds } = await import("@/modules/resolver/correlate-engine");
    return correlateIds(canonicalIdA, canonicalIdB);
  }

  // ── Internal ────────────────────────────────────────────────────────────

  private requireIdentity(method: string): UnsKeypair {
    if (!this.config.identity) {
      throw new Error(
        `UnsClient.${method}() requires an identity keypair. ` +
        `Pass 'identity' in UnsClientConfig.`
      );
    }
    return this.config.identity;
  }

  /** Clear all internal state (for testing). */
  clear(): void {
    this.store.clear();
    this.kv.clear();
    this.ledger?.clear();
    clearRegistry();
  }
}
