/**
 * Schema.org × UOR Functor — Module Barrel Export
 * ═══════════════════════════════════════════════
 *
 * F : SchemaOrg → UOR
 *
 * One functor. 806 types. Zero per-type code.
 * Every Schema.org object is already UOR-native — this module
 * makes that relationship explicit and computable.
 *
 * @module schema-org
 */

// ── Functor ────────────────────────────────────────────────────────────────
export {
  schemaToUor,
  addressType,
  addressAllTypes,
  verifyTypeIdentity,
  getCacheSize,
  clearCache,
} from "./functor";

// ── Vocabulary ─────────────────────────────────────────────────────────────
export {
  SCHEMA_ORG_HIERARCHY,
  SCHEMA_ORG_TYPE_NAMES,
  SCHEMA_ORG_TYPE_COUNT,
  getAncestorChain,
  getChildren,
  getDepth,
  getMaxDepth,
} from "./vocabulary";

// ── Types ──────────────────────────────────────────────────────────────────
export type {
  SchemaOrgType,
  SchemaOrgProperty,
  SchemaOrgUorIdentity,
  SchemaOrgDualType,
  FunctorResult,
  SchemaOrgRegistryStats,
} from "./types";

// ── Page ───────────────────────────────────────────────────────────────────
export { default as SchemaOrgExplorerPage } from "./pages/SchemaOrgExplorerPage";
