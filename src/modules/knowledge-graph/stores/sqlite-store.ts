/**
 * Native SQLite Knowledge Graph Store
 * ═════════════════════════════════════════════════════════════════
 *
 * When running in Tauri, uses tauri-plugin-sql for native SQLite
 * persistence. Faster than IndexedDB, supports complex queries,
 * and persists reliably across app restarts.
 *
 * Implements the same interface as the GrafeoDB WASM store so
 * the rest of the system is unaware of which backend is active.
 *
 * @layer knowledge-graph/stores
 */

import { invoke } from "@/lib/runtime";

// ── Types ───────────────────────────────────────────────────────────────

export interface Triple {
  subject: string;
  predicate: string;
  object: string;
  graph: string;
  isLiteral: boolean;
  createdAt: number;
}

export interface SQLiteGraphStore {
  init(): Promise<void>;
  insertTriple(t: Triple): Promise<void>;
  deleteTriple(subject: string, predicate: string, object: string): Promise<void>;
  deleteBySubject(subject: string): Promise<void>;
  query(subject?: string, predicate?: string, object?: string, graph?: string): Promise<Triple[]>;
  count(): Promise<number>;
  allSubjects(): Promise<string[]>;
}

// ── Implementation ──────────────────────────────────────────────────────

let _db: any = null;

async function getDb(): Promise<any> {
  if (_db) return _db;
  try {
    // @ts-ignore — Tauri plugin only available in desktop builds
    const mod = await import(/* @vite-ignore */ "@tauri-apps/plugin-sql");
    const Database = (mod as any).default ?? (mod as any).Database;
    _db = await Database.load("sqlite:uor-knowledge-graph.db");
    return _db;
  } catch (err) {
    console.warn("[SQLiteStore] Failed to load SQL plugin:", (err as Error).message);
    return null;
  }
}

export function createSQLiteStore(): SQLiteGraphStore {
  return {
    async init() {
      const db = await getDb();
      if (!db) return;

      await db.execute(`
        CREATE TABLE IF NOT EXISTS triples (
          subject TEXT NOT NULL,
          predicate TEXT NOT NULL,
          object TEXT NOT NULL,
          graph TEXT NOT NULL DEFAULT 'urn:uor:local',
          is_literal INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (subject, predicate, object, graph)
        )
      `);

      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_triples_subject ON triples(subject)
      `);
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_triples_predicate ON triples(predicate)
      `);
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_triples_graph ON triples(graph)
      `);

      console.log("[SQLiteStore] Initialized with native SQLite");
    },

    async insertTriple(t: Triple) {
      const db = await getDb();
      if (!db) return;
      await db.execute(
        `INSERT OR REPLACE INTO triples (subject, predicate, object, graph, is_literal, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [t.subject, t.predicate, t.object, t.graph, t.isLiteral ? 1 : 0, t.createdAt],
      );
    },

    async deleteTriple(subject: string, predicate: string, object: string) {
      const db = await getDb();
      if (!db) return;
      await db.execute(
        `DELETE FROM triples WHERE subject = $1 AND predicate = $2 AND object = $3`,
        [subject, predicate, object],
      );
    },

    async deleteBySubject(subject: string) {
      const db = await getDb();
      if (!db) return;
      await db.execute(`DELETE FROM triples WHERE subject = $1`, [subject]);
    },

    async query(subject?: string, predicate?: string, object?: string, graph?: string) {
      const db = await getDb();
      if (!db) return [];

      const conditions: string[] = [];
      const params: string[] = [];
      let idx = 1;

      if (subject) { conditions.push(`subject = $${idx++}`); params.push(subject); }
      if (predicate) { conditions.push(`predicate = $${idx++}`); params.push(predicate); }
      if (object) { conditions.push(`object = $${idx++}`); params.push(object); }
      if (graph) { conditions.push(`graph = $${idx++}`); params.push(graph); }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
      const rows = await db.select(`SELECT * FROM triples ${where}`, params);

      return (rows as any[]).map((r) => ({
        subject: r.subject,
        predicate: r.predicate,
        object: r.object,
        graph: r.graph,
        isLiteral: !!r.is_literal,
        createdAt: r.created_at,
      }));
    },

    async count() {
      const db = await getDb();
      if (!db) return 0;
      const rows = await db.select("SELECT COUNT(*) as cnt FROM triples");
      return (rows as any[])[0]?.cnt ?? 0;
    },

    async allSubjects() {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select("SELECT DISTINCT subject FROM triples");
      return (rows as any[]).map((r) => r.subject);
    },
  };
}
