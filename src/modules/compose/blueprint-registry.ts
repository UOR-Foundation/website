/**
 * Scheduling & Orchestration — Blueprint Registry.
 * @ontology uor:Scheduler
 * ═════════════════════════════════════════════════════════════════
 *
 * Content-addressed storage for AppBlueprints.
 * Each blueprint is hashed via singleProofHash for tamper-evidence.
 *
 * @version 1.0.0
 */

import type { AppBlueprint } from "./types";
import { singleProofHash } from "@/modules/uns/core/identity";

// ── Internal State ────────────────────────────────────────────────────────

const _blueprints = new Map<string, AppBlueprint>();
const _byCanonicalId = new Map<string, string>(); // canonicalId → name

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Register a blueprint, computing its canonical ID from content.
 * If a blueprint with the same name exists, it is replaced.
 */
export async function registerBlueprint(bp: AppBlueprint): Promise<AppBlueprint> {
  // Build the hashable document (exclude canonicalId itself)
  const { canonicalId: _, ...hashable } = bp;
  const identity = await singleProofHash(hashable);

  const stamped: AppBlueprint = {
    ...bp,
    canonicalId: identity["u:canonicalId"],
  };

  _blueprints.set(bp.name, stamped);
  _byCanonicalId.set(stamped.canonicalId!, bp.name);

  return stamped;
}

/** Retrieve a blueprint by name. */
export function getBlueprint(name: string): AppBlueprint | undefined {
  return _blueprints.get(name);
}

/** Retrieve a blueprint by its canonical ID. */
export function getBlueprintByCid(canonicalId: string): AppBlueprint | undefined {
  const name = _byCanonicalId.get(canonicalId);
  return name ? _blueprints.get(name) : undefined;
}

/** Remove a blueprint by name. */
export function removeBlueprint(name: string): boolean {
  const bp = _blueprints.get(name);
  if (!bp) return false;
  if (bp.canonicalId) _byCanonicalId.delete(bp.canonicalId);
  return _blueprints.delete(name);
}

/** List all registered blueprint names. */
export function listBlueprints(): string[] {
  return Array.from(_blueprints.keys());
}

/** Get all blueprints as an array. */
export function allBlueprints(): AppBlueprint[] {
  return Array.from(_blueprints.values());
}

/** Get total count. */
export function blueprintCount(): number {
  return _blueprints.size;
}

/**
 * Verify a blueprint's integrity by recomputing its canonical ID.
 * Returns true if the stored canonicalId matches a fresh computation.
 */
export async function verifyBlueprint(name: string): Promise<boolean> {
  const bp = _blueprints.get(name);
  if (!bp || !bp.canonicalId) return false;

  const { canonicalId: _, ...hashable } = bp;
  const identity = await singleProofHash(hashable);
  return identity["u:canonicalId"] === bp.canonicalId;
}

/** Clear all blueprints (for testing). */
export function _resetRegistry(): void {
  _blueprints.clear();
  _byCanonicalId.clear();
}
