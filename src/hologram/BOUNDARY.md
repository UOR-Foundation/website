# Hologram — External Dependency Boundary

> **Rule**: Every file in `src/hologram/` uses only relative imports.  
> External dependencies enter through exactly **ONE** file: `platform/bridge.ts`.  
> To migrate to a standalone repo, **rewrite that single file**.

---

## The Single Gateway: `platform/bridge.ts`

All traffic between Hologram and the outside world passes through this one file.  
No other file in `src/hologram/` may import from `@/` or any external npm module
(beyond `react` and `react-dom`).

```
┌──────────────────────────────────────────────────────────┐
│                    HOST APPLICATION                       │
│  (Supabase, UNS, Data Bank, GPU, Hologram UI hooks)      │
└───────────────────────┬──────────────────────────────────┘
                        │
                   bridge.ts  ← THE ONLY GATEWAY
                        │
┌───────────────────────┴──────────────────────────────────┐
│                   HOLOGRAM KERNEL                         │
│  genesis/ → kernel/ → platform interfaces                 │
│  (100% self-contained, zero external imports)             │
└──────────────────────────────────────────────────────────┘
```

### External `@/` Imports in bridge.ts

| Import | Purpose | Platform Interface | Migration |
|---|---|---|---|
| `@/integrations/supabase/client` | Database, auth, edge functions | `BackendAdapter` | Any REST/SQL client |
| `@/modules/uns/core/identity` | `singleProofHash` (URDNA2015 → CID) | `IdentityAdapter` | Any SHA-256 hasher |
| `@/modules/uns/core/keypair` | `generateKeypair`, `signRecord` (Dilithium-3) | `IdentityAdapter` | Any PQC library |
| `@/modules/uns/core/hologram/gpu` | WebGPU matmul, LUT engine | `GpuAdapter` | WebGPU / CPU fallback |
| `@/modules/data-bank/lib/sync` | Encrypted key-value persistence | `StorageAdapter` | localStorage / IndexedDB |
| `@/modules/data-bank/lib/graph-compression` | Triple compression codec | `CompressionAdapter` | fflate / custom |
| `@/modules/hologram-ui/hooks/useScreenTheme` | Light/dark theme cascade | React hook (re-export) | localStorage pref |
| `@/modules/data-bank` (useDataBank) | Encrypted notebook persistence | React hook (re-export) | Hook over StorageAdapter |

### NPM Peer Dependencies (re-exported through bridge.ts)

| Package | What's Re-exported | Used By | Migration |
|---|---|---|---|
| `framer-motion` | `motion`, `AnimatePresence` | QShellEmbed | CSS transitions / remove |
| `react-router-dom` | `useNavigate`, `useParams`, `useLocation` | CeremonyPage | Any router / callback |
| `lucide-react` | ~40 icon components | Notebook, Shell | Any icon set / SVG |

> **Key**: Kernel files import these from `../../platform/bridge`, never directly.  
> Swapping the animation or icon library = changing ONE import block in bridge.ts.

---

## Self-Contained Modules (Zero External Deps)

Everything below has **no imports outside `src/hologram/`**:

- `genesis/` — Axiom layer (hash, ring, codec, CID, mirror, signal, constitution)
- `kernel/` — All Q-subsystems, agents, TEE, stabilizer, surface, notebook, shell
- `platform/*.ts` — Types, geometric coherence, reward circuit, triword vocabulary, utils

---

## Verification

```bash
# Must return ONLY platform/bridge.ts
grep -rn 'from "@/' src/hologram/ --include='*.ts' --include='*.tsx'

# Must return ZERO results (npm deps routed through bridge)
grep -rn 'from "lucide-react\|from "framer-motion\|from "react-router-dom' \
  src/hologram/ --include='*.ts' --include='*.tsx' | grep -v bridge.ts
```

---

## See Also

- [`PROJECTION_MANIFEST.md`](./PROJECTION_MANIFEST.md) — The universal pattern for adding any new system as a projection
- [`kernel/README.md`](./kernel/README.md) — Rosetta Stone: holographic ↔ traditional OS terminology
