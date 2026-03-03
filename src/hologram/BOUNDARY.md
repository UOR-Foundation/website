# Hologram — External Dependency Boundary

> **Rule**: Every file in `src/hologram/` uses only relative imports.
> External dependencies exist in exactly **2 boundary files**.
> To migrate to a standalone repo, rewrite only these 2 files.

---

## Boundary Files

### 1. `platform/bridge.ts` — Infrastructure Adapter

The **primary** boundary. Wires `HologramPlatform` interfaces to the host app.

| External Import | Purpose | Platform Interface |
|---|---|---|
| `@/integrations/supabase/client` | Database, auth, edge functions | `BackendAdapter` |
| `@/modules/uns/core/identity` | `singleProofHash` (URDNA2015 → CID) | `IdentityAdapter` |
| `@/modules/uns/core/keypair` | `generateKeypair`, `signRecord` (Dilithium-3) | `IdentityAdapter` |
| `@/modules/uns/core/hologram/gpu` | WebGPU matmul, LUT engine | `GpuAdapter`, `LutEngineAdapter` |
| `@/modules/data-bank/lib/sync` | Encrypted localStorage + cloud sync | `StorageAdapter` |
| `@/modules/data-bank/lib/graph-compression` | Triple compression codec | `CompressionAdapter` |

**Migration**: Implement `HologramPlatform` and call `setPlatform()`.

### 2. `platform/adapters/index.ts` — React Hook Proxies

Optional UI hooks used by kernel notebook components.

| External Import | Purpose |
|---|---|
| `@/modules/hologram-ui/hooks/useScreenTheme` | Light/dark theme cascade |
| `@/modules/data-bank` | `useDataBank()` — encrypted key-value persistence |

**Migration**: Replace `useScreenTheme` with a `localStorage` preference.
Replace `useDataBank` with a hook over `StorageAdapter`.

---

## NPM Dependencies

| Package | Where Used | Required |
|---|---|---|
| `react`, `react-dom` | UI components, hooks | ✅ |
| `lucide-react` | Icons in notebook/shell | ✅ (or swap) |
| `framer-motion` | Animations | ✅ (or remove) |
| `react-router-dom` | CeremonyPage navigation | ✅ (or swap) |

---

## Internal-Only Modules (Zero External Deps)

Everything below has **no imports outside `src/hologram/`**:

- `genesis/` — Axiom layer (hash, ring, codec, CID, mirror, signal, constitution)
- `kernel/` — Q-Boot, Q-MMU, Q-Sched, Q-FS, Q-ECC, Q-ISA, Q-Net, Q-IPC, Q-Agent, Q-Security, Q-Vault, Q-Ceremony, Q-Sovereignty, Q-Disclosure, Q-Trust-Mesh, TEE Bridge, Stabilizer Engine, Holographic Surface, Circuit Compiler, Procedural Memory, Mirror Protocol, Kernel Supervisor, Notebook, QShell
- `platform/geometric-coherence.ts` — δ₀ constants, H-score, spectral health
- `platform/reward-circuit.ts` — Reward signals, EMA accumulator
- `platform/foundation-types.ts` — UOR algebraic substrate types
- `platform/identity-types.ts` — Canonical identity shapes
- `platform/triword.ts` — 768-word canonical vocabulary (internalized)
- `platform/utils.ts` — `sha256hex`, `isMobileViewport`, `kernelLog`

---

## Verification

```bash
# Should return ONLY bridge.ts and adapters/index.ts
grep -rn 'from "@/' src/hologram/ --include='*.ts' --include='*.tsx'
```
