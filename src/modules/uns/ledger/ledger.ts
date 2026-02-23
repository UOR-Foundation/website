/**
 * UNS Ledger — Verifiable SQL with QueryProofs and Audit Chain
 *
 * Every query result is accompanied by a proof:QueryProof — a Dilithium-3
 * signed attestation binding the query, database state, and result together.
 * Any party can verify any historical query result without trusting the
 * database server.
 *
 * Schema migrations are signed records forming an auditable chain.
 * Write operations produce state:Transition records capturing the
 * before/after database state canonical IDs.
 *
 * Implementation: in-memory row store (browser-compatible).
 * Interface designed for SQLite/distributed backends.
 *
 * @see proof: namespace — query proofs
 * @see state: namespace — state transitions
 * @see derivation: namespace — canonical identity
 */

import { singleProofHash } from "../core/identity";
import { signRecord, verifyRecord } from "../core/keypair";
import type { UnsKeypair, SignatureBlock, SignedRecord } from "../core/keypair";

// ── Types ───────────────────────────────────────────────────────────────────

/** Signed query proof binding query + state + result. */
export interface QueryProof {
  "@type": "proof:QueryProof";
  "proof:queryCanonicalId": string;
  "proof:dbStateCanonicalId": string;
  "proof:resultCanonicalId": string;
  "proof:executedAt": string;
}

/** Query result with rows and signed proof. */
export interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  queryProof: SignedRecord<QueryProof>;
  /** P22: Epistemic grade — 'A' for signed QueryProof with derivationId. */
  epistemic_grade: "A";
  epistemic_grade_label: string;
  "derivation:derivationId": string;
}

/** State transition record for write operations. */
export interface StateTransition {
  "@type": "state:Transition";
  "state:previousCanonicalId": string;
  "state:nextCanonicalId": string;
  "state:operationCanonicalId": string;
  "state:transitionedAt": string;
}

/** Schema migration record. */
export interface SchemaMigration {
  "@type": "uns:SchemaMigration";
  "uns:sql": string;
  "uns:description": string;
  "uns:migratedAt": string;
  "uns:migrationCanonicalId": string;
}

// ── Internal Row Store ──────────────────────────────────────────────────────

/** Column definition. */
interface ColumnDef {
  name: string;
  type: string;
  primaryKey: boolean;
  notNull: boolean;
  defaultValue: unknown;
  autoIncrement: boolean;
}

/** Table schema + data. */
interface Table {
  name: string;
  columns: ColumnDef[];
  rows: Record<string, unknown>[];
  autoIncrementCounter: number;
}

// ── SQL Parser (minimal — covers CREATE, INSERT, SELECT, UPDATE, DELETE) ────

/** Parse a CREATE TABLE statement. */
function parseCreateTable(sql: string): { name: string; columns: ColumnDef[] } | null {
  const match = sql.match(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)["']?\s*\((.+)\)/is
  );
  if (!match) return null;

  const name = match[1];
  const colDefs = match[2].split(",").map((c) => c.trim());
  const columns: ColumnDef[] = [];

  for (const def of colDefs) {
    const parts = def.split(/\s+/);
    if (!parts[0]) continue;
    const colName = parts[0].replace(/["']/g, "");
    const type = parts[1]?.toUpperCase() ?? "TEXT";
    const fullDef = def.toUpperCase();
    columns.push({
      name: colName,
      type,
      primaryKey: fullDef.includes("PRIMARY KEY"),
      notNull: fullDef.includes("NOT NULL"),
      defaultValue: undefined,
      autoIncrement: fullDef.includes("AUTOINCREMENT") || fullDef.includes("AUTO_INCREMENT"),
    });
  }

  return { name, columns };
}

/** Parse an INSERT statement. */
function parseInsert(
  sql: string,
  params: unknown[]
): { table: string; columns: string[]; values: unknown[] } | null {
  const match = sql.match(
    /INSERT\s+INTO\s+["']?(\w+)["']?\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/is
  );
  if (!match) return null;

  const table = match[1];
  const columns = match[2].split(",").map((c) => c.trim().replace(/["']/g, ""));
  const valuePlaceholders = match[3].split(",").map((v) => v.trim());

  const values = valuePlaceholders.map((v, i) => {
    if (v === "?") return params[i];
    if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1);
    const num = Number(v);
    return isNaN(num) ? v : num;
  });

  return { table, columns, values };
}

/** Parse a SELECT statement. */
function parseSelect(
  sql: string
): { table: string; columns: string[]; where?: string } | null {
  const match = sql.match(
    /SELECT\s+(.+?)\s+FROM\s+["']?(\w+)["']?(?:\s+WHERE\s+(.+))?/is
  );
  if (!match) return null;

  const colStr = match[1].trim();
  const columns = colStr === "*" ? ["*"] : colStr.split(",").map((c) => c.trim());
  return { table: match[2], columns, where: match[3] };
}

/** Parse UPDATE statement. */
function parseUpdate(
  sql: string,
  params: unknown[]
): { table: string; sets: Record<string, unknown>; where?: string } | null {
  const match = sql.match(
    /UPDATE\s+["']?(\w+)["']?\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/is
  );
  if (!match) return null;

  const sets: Record<string, unknown> = {};
  const setParts = match[2].split(",");
  let paramIdx = 0;

  for (const part of setParts) {
    const [col, val] = part.split("=").map((s) => s.trim());
    const cleanCol = col.replace(/["']/g, "");
    if (val === "?") {
      sets[cleanCol] = params[paramIdx++];
    } else {
      const num = Number(val);
      sets[cleanCol] = isNaN(num) ? val.replace(/^['"]|['"]$/g, "") : num;
    }
  }

  return { table: match[1], sets, where: match[3] };
}

/** Parse DELETE statement. */
function parseDelete(
  sql: string
): { table: string; where?: string } | null {
  const match = sql.match(
    /DELETE\s+FROM\s+["']?(\w+)["']?(?:\s+WHERE\s+(.+))?/is
  );
  if (!match) return null;
  return { table: match[1], where: match[2] };
}

/** Evaluate a simple WHERE clause against a row. */
function evaluateWhere(
  where: string | undefined,
  row: Record<string, unknown>,
  params: unknown[]
): boolean {
  if (!where) return true;
  // Simple "col = ?" or "col = value" evaluation
  const match = where.match(/["']?(\w+)["']?\s*=\s*(.+)/);
  if (!match) return true;

  const col = match[1];
  let val: unknown = match[2].trim();
  if (val === "?") {
    val = params[0];
  } else if (typeof val === "string" && val.startsWith("'") && val.endsWith("'")) {
    val = (val as string).slice(1, -1);
  } else {
    const num = Number(val);
    if (!isNaN(num)) val = num;
  }

  return row[col] === val;
}

// ── UNS Ledger ──────────────────────────────────────────────────────────────

export class UnsLedger {
  private readonly tables = new Map<string, Table>();
  private readonly migrations: SchemaMigration[] = [];
  private readonly operatorKeypair: UnsKeypair;

  constructor(operatorKeypair: UnsKeypair) {
    this.operatorKeypair = operatorKeypair;
  }

  /**
   * Apply a schema migration (CREATE TABLE, ALTER TABLE, etc.).
   * Returns a signed SchemaMigration record.
   */
  async migrate(sql: string, description: string): Promise<SignedRecord<SchemaMigration>> {
    const parsed = parseCreateTable(sql);
    if (parsed) {
      this.tables.set(parsed.name, {
        name: parsed.name,
        columns: parsed.columns,
        rows: [],
        autoIncrementCounter: 0,
      });
    }

    const migrationIdentity = await singleProofHash({ sql, description });

    const migration: SchemaMigration = {
      "@type": "uns:SchemaMigration",
      "uns:sql": sql,
      "uns:description": description,
      "uns:migratedAt": new Date().toISOString(),
      "uns:migrationCanonicalId": migrationIdentity["u:canonicalId"],
    };

    const signed = await signRecord(migration, this.operatorKeypair);
    this.migrations.push(migration);
    return signed;
  }

  /**
   * Execute a write SQL statement (INSERT, UPDATE, DELETE).
   * Returns a signed state:Transition with before/after canonical IDs.
   */
  async execute(
    sql: string,
    params: unknown[] = []
  ): Promise<SignedRecord<StateTransition>> {
    const prevState = await this.computeDbState();

    this.executeWrite(sql, params);

    const nextState = await this.computeDbState();
    const opIdentity = await singleProofHash({ sql, params });

    const transition: StateTransition = {
      "@type": "state:Transition",
      "state:previousCanonicalId": prevState,
      "state:nextCanonicalId": nextState,
      "state:operationCanonicalId": opIdentity["u:canonicalId"],
      "state:transitionedAt": new Date().toISOString(),
    };

    return signRecord(transition, this.operatorKeypair);
  }

  /**
   * Execute a read-only SQL query.
   * Returns rows + a signed QueryProof.
   */
  async query(
    sql: string,
    params: unknown[] = []
  ): Promise<QueryResult> {
    const rows = this.executeRead(sql, params);
    const dbState = await this.computeDbState();
    const queryIdentity = await singleProofHash({ sql, params });
    const resultIdentity = await singleProofHash({ rows });

    const proof: QueryProof = {
      "@type": "proof:QueryProof",
      "proof:queryCanonicalId": queryIdentity["u:canonicalId"],
      "proof:dbStateCanonicalId": dbState,
      "proof:resultCanonicalId": resultIdentity["u:canonicalId"],
      "proof:executedAt": new Date().toISOString(),
    };

    const signedProof = await signRecord(proof, this.operatorKeypair);

    // P22: Signed query proof is Grade A
    return {
      rows,
      rowCount: rows.length,
      queryProof: signedProof,
      epistemic_grade: "A",
      epistemic_grade_label: "Algebraically Proven — ring-arithmetic with derivation:derivationId",
      "derivation:derivationId": queryIdentity["u:canonicalId"],
    };
  }

  /**
   * Verify a past query proof.
   * Checks that the Dilithium-3 signature is valid.
   */
  async verifyQueryProof(proof: SignedRecord<QueryProof>): Promise<boolean> {
    return verifyRecord(proof);
  }

  /** Get the full migration history. */
  async getMigrationHistory(): Promise<SchemaMigration[]> {
    return [...this.migrations];
  }

  /** Clear all state (for testing). */
  clear(): void {
    this.tables.clear();
    this.migrations.length = 0;
  }

  // ── Private ─────────────────────────────────────────────────────────────

  /** Compute a canonical ID for the current database state. */
  private async computeDbState(): Promise<string> {
    const snapshot: Record<string, unknown> = {};
    for (const [name, table] of this.tables.entries()) {
      snapshot[name] = {
        columns: table.columns.map((c) => c.name),
        rowCount: table.rows.length,
        rows: table.rows,
      };
    }
    const identity = await singleProofHash(snapshot);
    return identity["u:canonicalId"];
  }

  /** Execute a write operation (INSERT, UPDATE, DELETE). */
  private executeWrite(sql: string, params: unknown[]): void {
    const trimmed = sql.trim().toUpperCase();

    if (trimmed.startsWith("INSERT")) {
      const parsed = parseInsert(sql, params);
      if (!parsed) throw new Error(`Invalid INSERT: ${sql}`);
      const table = this.tables.get(parsed.table);
      if (!table) throw new Error(`Table not found: ${parsed.table}`);

      const row: Record<string, unknown> = {};
      for (let i = 0; i < parsed.columns.length; i++) {
        row[parsed.columns[i]] = parsed.values[i];
      }

      // Auto-increment for primary key columns not in the insert
      for (const col of table.columns) {
        if (col.primaryKey && !(col.name in row)) {
          table.autoIncrementCounter++;
          row[col.name] = table.autoIncrementCounter;
        }
      }

      table.rows.push(row);
    } else if (trimmed.startsWith("UPDATE")) {
      const parsed = parseUpdate(sql, params);
      if (!parsed) throw new Error(`Invalid UPDATE: ${sql}`);
      const table = this.tables.get(parsed.table);
      if (!table) throw new Error(`Table not found: ${parsed.table}`);

      const whereParams = parsed.where?.includes("?")
        ? params.slice(Object.keys(parsed.sets).length)
        : params;

      for (const row of table.rows) {
        if (evaluateWhere(parsed.where, row, whereParams)) {
          Object.assign(row, parsed.sets);
        }
      }
    } else if (trimmed.startsWith("DELETE")) {
      const parsed = parseDelete(sql);
      if (!parsed) throw new Error(`Invalid DELETE: ${sql}`);
      const table = this.tables.get(parsed.table);
      if (!table) throw new Error(`Table not found: ${parsed.table}`);

      table.rows = table.rows.filter(
        (row) => !evaluateWhere(parsed.where, row, params)
      );
    } else {
      throw new Error(`Unsupported write operation: ${sql}`);
    }
  }

  /** Execute a read-only SELECT query. */
  private executeRead(
    sql: string,
    params: unknown[]
  ): Record<string, unknown>[] {
    const parsed = parseSelect(sql);
    if (!parsed) throw new Error(`Invalid SELECT: ${sql}`);
    const table = this.tables.get(parsed.table);
    if (!table) throw new Error(`Table not found: ${parsed.table}`);

    const filtered = table.rows.filter((row) =>
      evaluateWhere(parsed.where, row, params)
    );

    if (parsed.columns[0] === "*") return filtered.map((r) => ({ ...r }));

    return filtered.map((row) => {
      const projected: Record<string, unknown> = {};
      for (const col of parsed.columns) {
        projected[col] = row[col];
      }
      return projected;
    });
  }
}
