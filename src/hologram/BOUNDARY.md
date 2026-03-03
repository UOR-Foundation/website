# Hologram — External Dependency Boundary Manifest

> **Rule**: No file in `src/hologram/` may import from outside `src/hologram/`
> except through files explicitly listed in this manifest.
>
> To migrate to a standalone repo, rewrite ONLY these boundary files.

---

## Boundary Files

### 1. `platform/bridge.ts` — Host Infrastructure Adapter
The **primary** boundary. Wires platform interfaces to the host app.

| External Import | What It Provides | Platform Interface |
|---|---|---|
| `@/integrations/supabase/client` | Database, auth, edge functions | `BackendAdapter` |
| `@/modules/uns/core/identity` | `singleProofHash` (URDNA2015 → CID) | `IdentityAdapter` |
| `@/modules/uns/core/keypair` | `generateKeypair`, `signRecord` (Dilithium-3) | `IdentityAdapter` |
| `@/modules/uns/core/hologram/gpu` | WebGPU matmul, LUT engine | `GpuAdapter`, `LutEngineAdapter` |
| `@/modules/data-bank/lib/sync` | Encrypted localStorage + cloud sync | `StorageAdapter` |
| `@/modules/data-bank/lib/graph-compression` | Triple compression codec | `CompressionAdapter` |

**Migration**: Provide your own implementations of `HologramPlatform` and call `setPlatform()`.

### 2. `platform/triword.ts` — Vocabulary Data
Proxies the canonical three-word vocabulary (3 × 256 wordlists).

| External Import | What It Provides |
|---|---|
| `@/lib/uor-triword` | `getWordlist("observer"\|"observable"\|"context")` |

**Migration**: Copy the three `readonly string[]` arrays (768 words total) inline.

### 3. `platform/adapters/index.ts` — React Hook Adapters
Optional UI hooks used by kernel notebook components.

| External Import | What It Provides |
|---|---|
| `@/modules/hologram-ui/hooks/useScreenTheme` | Light/dark theme cascade from desktop mode |
| `@/modules/data-bank` | `useDataBank()` — encrypted key-value persistence |

**Migration**: Replace `useScreenTheme` with a `localStorage` preference. Replace `useDataBank` with a hook over `StorageAdapter`.

---

## NPM Dependencies (Used Directly in Hologram)

| Package | Where Used | Required for Standalone |
|---|---|---|
| `react`, `react-dom` | Kernel UI components, hooks | ✅ Yes |
| `lucide-react` | Icons in notebook/shell components | ✅ Yes (or swap icon lib) |
| `framer-motion` | Animations in QShellEmbed | ✅ Yes (or remove) |
| `react-router-dom` | CeremonyPage navigation | ✅ Yes (or swap router) |

---

## Internal-Only Modules (Zero External Deps)

These modules have **no imports outside `src/hologram/`**:

- `genesis/` — Axiom layer (hash, ring, codec, CID, mirror, signal, constitution)
- `platform/geometric-coherence.ts` — δ₀ constants, H-score, spectral health
- `platform/reward-circuit.ts` — Reward signals, EMA accumulator
- `platform/foundation-types.ts` — UOR algebraic substrate types
- `platform/identity-types.ts` — Canonical identity shapes
- `platform/utils.ts` — `sha256hex`, `isMobileViewport`, `kernelLog`
- `kernel/` (all `.ts` files) — Q-Boot, Q-MMU, Q-Sched, Q-FS, Q-ECC, etc.

---

## Verification

Run this grep to confirm no new leaks have been introduced:

```bash
# Should return ONLY bridge.ts, triword.ts, and adapters/index.ts
grep -rn 'from "@/\(modules\|integrations\|lib\|hooks\|components\)/' src/hologram/ \
  --include='*.ts' --include='*.tsx'
```
