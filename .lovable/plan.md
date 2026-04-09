

# Crate Version Sync Strategy — Seamless UOR Engine Updates

## Problem

When `uor-foundation` on crates.io bumps from v0.2.0 → v0.3.0+, the current system has three tightly coupled layers that all need manual updates:
1. **WASM binary + shim** (`src/lib/wasm/uor-foundation/`) — the compiled crate
2. **Bridge adapter** (`src/lib/wasm/uor-bridge.ts`) — 30+ hand-wired function wrappers
3. **TypeScript type projection** (`src/types/uor-foundation/`) — 441 traits → TS interfaces

Today, adding a single new export to the crate requires touching all three layers plus every consumer. The goal: **swap the WASM binary, run one command, done**.

## Architecture

```text
┌─────────────────────────────────────────────────────────┐
│  Upstream consumers (bus, oracle, KG, UI)                │
│  import ONLY from: @/modules/engine                      │
│  ↓ stable contract — never changes shape                │
├─────────────────────────────────────────────────────────┤
│  ENGINE CONTRACT  (src/modules/engine/contract.ts)       │
│  One interface: UorEngineContract                        │
│  Versioned: { version, ring, address, meta }             │
│  All methods typed, all with TS fallback guarantee       │
├─────────────────────────────────────────────────────────┤
│  ENGINE ADAPTER   (src/modules/engine/adapter.ts)        │
│  Implements contract by delegating to WASM or TS         │
│  AUTO-GENERATED from .d.ts via sync script               │
├─────────────────────────────────────────────────────────┤
│  WASM BINARY      (src/lib/wasm/uor-foundation/)         │
│  Drop-in replacement — swap files, run sync              │
├─────────────────────────────────────────────────────────┤
│  VERSION MANIFEST (src/modules/engine/crate-manifest.ts) │
│  Expected version, export list hash, namespace count     │
│  Boot-time validation: actual exports vs manifest        │
└─────────────────────────────────────────────────────────┘
```

## Implementation

### 1. Create `src/modules/engine/contract.ts` — The Stable API

A single TypeScript interface that **never breaks**:

```typescript
export interface UorEngineContract {
  // Identity
  readonly version: string;           // crate version
  readonly engine: "wasm" | "typescript";

  // Ring R_8
  neg(x: number): number;
  bnot(x: number): number;
  succ(x: number): number;
  pred(x: number): number;
  add(a: number, b: number): number;
  sub(a: number, b: number): number;
  mul(a: number, b: number): number;
  xor(a: number, b: number): number;
  and(a: number, b: number): number;
  or(a: number, b: number): number;

  // Verification
  verifyCriticalIdentity(x: number): boolean;
  verifyAllCriticalIdentity(): boolean;

  // Analysis
  bytePopcount(x: number): number;
  byteBasis(x: number): number[];
  classifyByte(x: number): string;
  factorize(x: number): number[];
  evaluateExpr(expr: string): number;

  // Meta (version-extensible)
  listNamespaces(): string[];
  listEnums(): string[];

  // Extension point: new crate exports land here
  // without breaking existing consumers
  extensions: Record<string, (...args: any[]) => any>;
}
```

All upstream code imports `getEngine()` which returns this contract. When the crate adds new exports, they appear in `extensions` first — zero breakage. Once stabilized, they get promoted to the contract interface in a minor version bump.

### 2. Create `src/modules/engine/crate-manifest.ts` — Version Anchor

```typescript
export const CRATE_MANIFEST = {
  version: "0.2.0",
  expectedExports: [
    "neg", "bnot", "succ", "pred", "ring_add", ...
  ],
  exportHash: "sha256:<hash-of-sorted-export-names>",
  namespaceCount: 33,
  classCount: 441,
  propertyCount: 892,
} as const;
```

At boot, the engine adapter compares `Object.keys(wasmModule)` against this manifest. Mismatches are logged as "crate version drift" — new exports are auto-discovered and wired into `extensions`, removed exports trigger a degraded status.

### 3. Create `src/modules/engine/adapter.ts` — Auto-Wiring Layer

Replaces the current hand-coded `uor-bridge.ts`. Instead of 30+ individual wrapper functions, it:

- Reads all exports from the loaded WASM module dynamically
- Maps known exports to the contract interface
- Routes unknown new exports to `extensions`
- Falls back to the TS ring engine (`@/lib/uor-ring`) for any missing export
- Logs which functions are WASM-accelerated vs TS-fallback

### 4. Create `scripts/sync-crate.ts` — The Update Script

A single command that automates the entire update process:

```bash
npx ts-node scripts/sync-crate.ts --wasm-dir src/lib/wasm/uor-foundation
```

What it does:
1. Reads the new `uor_wasm_shim.d.ts` to extract all exported function signatures
2. Reads the current `crate-manifest.ts` to detect what changed (added/removed/modified)
3. Generates a diff report: "3 new exports, 0 removed, 1 signature changed"
4. Auto-updates `crate-manifest.ts` with the new export list + hash
5. Auto-generates `adapter.ts` wiring for any new exports (with TS fallback stubs)
6. Flags any **removed** exports that existing code depends on (searches `src/` for usages)
7. Updates the version string in the manifest

The script is **non-destructive** — it writes to a staging file first and shows a diff before overwriting.

### 5. Update `src/modules/engine/index.ts` — Single Entry Point

The barrel export becomes the **only** import path:

```typescript
export { getEngine, initEngine } from "./adapter";
export type { UorEngineContract } from "./contract";
export { CRATE_MANIFEST } from "./crate-manifest";

// Re-export convenience functions (delegate to getEngine())
export const neg = (x: number) => getEngine().neg(x);
// ... etc — backward compatible
```

Existing code that does `import { neg } from "@/modules/engine"` keeps working unchanged. New code can use `getEngine()` for the full contract.

### 6. Type Projection Sync Strategy

For `src/types/uor-foundation/`, create a **type version tag** at the top of `index.ts`:

```typescript
export const TYPE_PROJECTION_VERSION = "0.2.0";
export const TYPE_PROJECTION_HASH = "sha256:<hash-of-all-type-files>";
```

The boot sequence compares this against `CRATE_MANIFEST.version`. If they diverge, the system logs a warning but **does not break** — types are structural in TypeScript, so additive changes (new interfaces) are non-breaking. Only removals or signature changes need attention.

The sync script also generates a `type-drift-report.md` showing which Rust traits have no TypeScript counterpart and vice versa.

## Update Workflow (When Crate Bumps)

```text
1. Download new WASM artifacts (3 files) into src/lib/wasm/uor-foundation/
2. Run: npx ts-node scripts/sync-crate.ts
3. Script outputs:
   ✓ crate-manifest.ts updated (v0.2.0 → v0.3.0)
   ✓ 5 new exports auto-wired to extensions
   ✓ 0 breaking changes detected
   ✓ adapter.ts regenerated
   ⚠ Type projection drift: 12 new traits not yet projected
4. Boot the app — seal recomputes automatically (new version → new seal)
5. Done. Zero upstream refactoring.
```

## Files Summary

| Action | File | Purpose |
|---|---|---|
| Create | `src/modules/engine/contract.ts` | Stable interface all consumers depend on |
| Create | `src/modules/engine/crate-manifest.ts` | Version + export inventory for drift detection |
| Create | `src/modules/engine/adapter.ts` | Dynamic WASM→Contract wiring with TS fallback |
| Create | `scripts/sync-crate.ts` | One-command update automation |
| Modify | `src/modules/engine/index.ts` | Re-export via contract + backward compat shims |
| Modify | `src/lib/wasm/uor-bridge.ts` | Thin wrapper delegating to adapter (deprecate gradually) |
| Modify | `src/types/uor-foundation/index.ts` | Add version tag + drift hash |

