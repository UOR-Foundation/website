

# VM-Style System Status Panel

## Concept

Redesign the diagnostic panel to look like a **hypervisor management console** (think Proxmox, VMware, Hyper-V). Two distinct panes side-by-side on one screen — no scrolling:

```text
┌─────────────────────────────────────────────────┐
│  ● Sealed                        Copy Report    │
│  ⡧⠧⣇⢩⢜⡾⢮⡺⣬⡢⢙⠣⡅⠆⡗⣘⡌⡪⠩⠇⡸⠺⠸⠐⢄⣥⣣⢭⣟⠧⣌⢫  │
├────────────────────────┬────────────────────────┤
│  VIRTUAL MACHINE       │  HOST HARDWARE         │
│                        │                        │
│  OS      UOR/0.2.0     │  Projection  Remote    │
│  Kernel  TS fallback   │  Hostname    *.lovable │
│  Ring    Verified ✓    │  Cores       23        │
│  Uptime  00:04:12      │  Memory      — GB      │
│  Modules 23            │  GPU         —         │
│  Seal    37ms          │  Screen      1920×1080 │
│                        │  WASM        Yes       │
│  KERNEL PRIMITIVES     │  SIMD        Yes       │
│  P₀ encode   ●        │  SAB         No        │
│  P₁ decode   ●        │  Touch       No        │
│  P₂ compose  ●        │                        │
│  P₃ store    ●        │  PROVENANCE            │
│  P₄ resolve  ●        │  Context     Remote    │
│  P₅ observe  ●        │  Hash        6727c7…   │
│  P₆ seal     ●        │                        │
│  7/7 verified          │                        │
├────────────────────────┴────────────────────────┤
│  STACK  21/23 operational                       │
│  ⚠ WebAssembly SIMD (optional)                 │
│  ⚠ SharedArrayBuffer (optional)                │
├─────────────────────────────────────────────────┤
│  Lattice-hash sealed · 128-bit preimage        │
└─────────────────────────────────────────────────┘
```

## Key Design Decisions

- **Two-column layout** — left is the virtual OS, right is the host projecting it. Instantly familiar to anyone who's used a hypervisor
- **No scrolling** — everything fits in one view by making font sizes compact (9-10px mono) and removing progressive disclosure toggles
- **Uptime counter** — live ticking clock since boot, like a real VM console
- **Projection label** — "Local" vs "Remote (hostname)" prominently shown on the hardware side, making it clear where the OS is being projected from
- **Status bar footer** — stack health + issues in a single bottom strip
- **Wider panel** — expand from `w-80` (320px) to `w-[520px]` to fit two columns comfortably

## Changes

| File | Change |
|------|--------|
| `src/modules/boot/EngineStatusIndicator.tsx` | Full rewrite of the panel body: two-column grid layout, uptime counter, remove collapsible sections, flatten all info into one screen |

## Implementation Details

- Replace the single-column `space-y-2.5` layout with a CSS grid: `grid-cols-2` with a divider
- Add a `useEffect` interval for live uptime display (diff from `receipt.seal.bootedAt`)
- Left column: Status, seal glyph, kernel info, P₀–P₆ primitives as a compact list with dots
- Right column: All hardware/provenance data — cores, memory, GPU, screen, WASM/SIMD/SAB capabilities, execution context, provenance hash (truncated)
- Bottom strip (full-width): Stack summary line + any failing components listed inline
- Issues section stays but moves to the bottom strip area
- Remove `showDetails` toggle entirely — everything is visible at once
- `formatMarkdownReport` stays unchanged (already comprehensive)
- Max height constraint: `max-h-[85vh]` with the layout designed to never need it

