/**
 * Sovereign Persistence Provider — Interface Types.
 * ═══════════════════════════════════════════════════
 *
 * Defines the contract any backend must fulfill to serve as the
 * knowledge graph's persistence layer. GrafeoDB (WASM/IndexedDB)
 * is the canonical store; providers handle cloud/remote sync.
 *
 * Think Docker: GrafeoDB = container image, Provider = registry.
 */

// ── Auth Context ────────────────────────────────────────────────────────────

export interface AuthContext {
  /** User ID from the auth provider */
  userId: string;
  /** Whether the user has an active authenticated session */
  isAuthenticated: boolean;
}

// ── Change Entry ────────────────────────────────────────────────────────────

export interface ChangeEntry {
  /** Content-addressed ID of this change */
  changeCid: string;
  /** Graph namespace this change belongs to */
  namespace: string;
  /** SPARQL UPDATE or N-Quads payload */
  payload: string;
  /** ISO timestamp */
  timestamp: string;
  /** Device that produced this change */
  deviceId: string;
  /** User who authored this change */
  userId: string;
}

// ── Sovereign Bundle ────────────────────────────────────────────────────────

export interface SovereignBundle {
  /** Format version for forward compatibility */
  version: "1.0.0";
  /** ISO export timestamp */
  exportedAt: string;
  /** Device that produced this bundle */
  deviceId: string;
  /** UOR seal hash for integrity verification */
  sealHash: string;
  /** Total quad count at export time */
  quadCount: number;
  /** JSON-LD @graph payload */
  graph: object;
  /** Namespace manifest */
  namespaces: string[];
  /** Schema metadata for target database reconstruction */
  schema: {
    tables: string[];
    rdfPrefixes: Record<string, string>;
  };
}

// ── Persistence Provider ────────────────────────────────────────────────────

export interface PersistenceProvider {
  /** Human-readable provider name */
  readonly name: string;

  /** Get current auth context without leaking backend details */
  getAuthContext(): Promise<AuthContext | null>;

  /** Push full N-Quads snapshot to remote */
  pushSnapshot(nquads: string): Promise<void>;

  /** Pull full N-Quads snapshot from remote (null if empty) */
  pullSnapshot(): Promise<string | null>;

  /** Push incremental changes */
  pushChanges(changes: ChangeEntry[]): Promise<void>;

  /** Pull changes since a version marker */
  pullChanges(sinceVersion: number): Promise<ChangeEntry[]>;

  /** Get current remote version number */
  getVersion(): Promise<number>;

  /** Export full portable sovereign bundle */
  exportBundle(): Promise<SovereignBundle>;
}
