/**
 * Triword Vocabulary — Internalized wordlists
 * ═════════════════════════════════════════════
 *
 * Re-exports the canonical triword getWordlist function.
 * In the standalone repo, this file contains the wordlists directly.
 * In the host repo, it proxies to the canonical source.
 *
 * @module hologram/platform/triword
 */

// Proxy to the host app's canonical triword vocabulary.
// When migrated to standalone repo, replace this single line with
// the full OBSERVERS/OBSERVABLES/CONTEXTS arrays from uor-triword.ts.
export { getWordlist } from "@/lib/uor-triword";
