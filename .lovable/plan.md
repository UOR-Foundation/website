

# System Monitor as a Desktop App Window

## Concept

Transform the system monitor from a modal overlay into a **registered desktop app** that opens as a proper OS window — just like Oracle, Library, or Vault. The window will display a Hyper-V/Proxmox-inspired monitoring dashboard with metric cards, availability indicators, and live data, all wired to real system telemetry from the boot receipt.

## Design (inspired by the Motadata reference)

```text
┌─── System Monitor ──────────────────────────────────────────────────┐
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Virtual   │ │ CPU      │ │ Memory   │ │ Modules  │ │ Network  │ │
│  │ Machine   │ │ 23 cores │ │ — GB     │ │ Loaded   │ │ Caps     │ │
│  │  1   ●    │ │ ████ 90% │ │ Avail/Fr │ │  23      │ │ WASM ✓   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│                                                                     │
│  ┌─────────────────────┐ ┌──────────────────────────────────────┐  │
│  │ System Availability  │ │ Kernel Primitives                    │  │
│  │                      │ │                                      │  │
│  │   ● Up 99.9%         │ │ P₀ encode  ●   P₁ decode  ●        │  │
│  │   Uptime 00:12:34    │ │ P₂ compose ●   P₃ store   ●        │  │
│  │   Boot   35ms        │ │ P₄ resolve ●   P₅ observe ●        │  │
│  │   Seal   Verified    │ │ P₆ seal    ●   7/7 verified         │  │
│  └─────────────────────┘ └──────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────┐ ┌──────────────────────────────────────┐  │
│  │ Stack Health         │ │ Host Hardware                        │  │
│  │ 22/23 operational    │ │ Projected from *.lovable.app         │  │
│  │ ████████████████░ 96%│ │ Display 1920×1080 · Touch: No       │  │
│  │ ⚠ SIMD (optional)   │ │ GPU: Unknown · WASM ✓ SIMD ✓ SAB ✗ │  │
│  └─────────────────────┘ └──────────────────────────────────────┘  │
│                                                                     │
│  Lattice-hash sealed · 128-bit preimage · Session a7c2f…          │
│                                                          [Copy Report] │
└─────────────────────────────────────────────────────────────────────┘
```

## Changes

| File | Change |
|------|--------|
| `src/modules/boot/SystemMonitorApp.tsx` | **New file.** Full-page system monitor component with metric cards, availability ring, kernel primitives grid, stack health bar, host hardware section — all reading from `useBootStatus()`. Includes Copy Report button reusing the existing `formatMarkdownReport`. |
| `src/modules/desktop/lib/desktop-apps.ts` | Register `"system-monitor"` app with `Activity` icon, `category: "OBSERVE"`, `defaultSize: { w: 820, h: 560 }`. |
| `src/modules/desktop/lib/os-taxonomy.ts` | Add `"system-monitor"` to the `OBSERVE` category's `appIds` array. |
| `src/modules/boot/EngineStatusIndicator.tsx` | Keep the status dot trigger, but instead of opening a modal, dispatch `window.dispatchEvent(new CustomEvent("uor:open-app", { detail: "system-monitor" }))` to open the desktop window. Remove the modal/backdrop/drag code entirely. |

## Implementation Details

### Metric Cards Row (top)
Six cards in a responsive grid, each with an icon, title, subtitle, and primary value:
- **Virtual Machine**: Status dot + "1 Running" + seal status label
- **CPU**: Core count + idle estimation bar (decorative — browser can't measure real CPU idle)
- **Memory**: Available/Free from `performance.memory` if available, else "Restricted"
- **Modules**: Count of loaded bus modules
- **Stack**: X/Y operational with a mini progress bar
- **Capabilities**: WASM/SIMD/SAB/Workers as compact check marks

### Availability Section (middle-left)
- Large circular availability indicator showing uptime percentage (computed from `uptimeMs / (uptimeMs + 0)` = 100% since boot — realistic for a single-session VM)
- Live uptime counter ticking every second
- Boot time in ms
- Seal status with color

### Kernel Primitives (middle-right)
- 2-column grid of P₀–P₆ with dot indicators, compact and scannable

### Stack Health (bottom-left)
- Progress bar showing operational/total ratio
- List of failing components (if any) with severity icons

### Host Hardware (bottom-right)
- Projection badge (Local vs Remote)
- Display, GPU, Touch, and capabilities matrix as compact rows

### Footer
- Seal hash info + Copy Report button

### Status Dot Behavior
- The dot in the tab bar stays — clicking it now opens the System Monitor as a window via the existing `uor:open-app` event system
- All modal/backdrop/drag code removed from `EngineStatusIndicator.tsx`, making it a thin trigger component

### Styling
- Dark theme by default (matching the OS dark mode), with theme-awareness via `useDesktopTheme`
- Metric cards use subtle colored icons (green for healthy, amber for degraded)
- Monospace for values, proportional for labels
- No scrolling needed at 820×560

