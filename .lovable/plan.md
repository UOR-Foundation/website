

# Hypervisor-Style VM Status Console

## Concept

Redesign the EngineStatusIndicator panel to resemble a **hypervisor management console** (Proxmox/VMware/Hyper-V style). Two-column layout on one screen with clear VM vs Host separation. The copied report becomes a comprehensive self-improving technical document.

## Visual Panel Design

The panel widens to ~540px with a two-column grid layout. Everything fits on one screen — no scrolling.

```text
┌──────────────────────────────────────────────────────┐
│  ● DEGRADED    UOR/0.2.0           [Copy Report]    │
│  Glyph: ⡧⠧⣇⢩⢜⡾⢮⡺⣬⡢⢙⠣⡅⠆⡗⣘⡌⡪⠩⠇⡸⠺⠸⠐⢄⣥⣣⢭⣟⠧⣌⢫    │
├──────────────────────────┬───────────────────────────┤
│  VIRTUAL MACHINE         │  HOST DEVICE              │
│                          │                           │
│  Kernel    TS fallback   │  Projection  Remote       │
│  Ring      Verified ✓    │  Origin      *.lovable    │
│  Uptime    00:07:42      │  CPU         23 cores     │
│  Boot      35ms          │  Memory      — GB         │
│  Modules   23            │  GPU         —            │
│  Stack     22/23 ✓       │  Display     1920×1080    │
│                          │  WASM        ✓            │
│  P₀ ENCODE     ●        │  SIMD        ✓            │
│  P₁ DECODE     ●        │  SAB         ✗            │
│  P₂ COMPOSE    ●        │  Touch       No           │
│  P₃ STORE      ●        │                           │
│  P₄ RESOLVE    ●        │  PROVENANCE                │
│  P₅ OBSERVE    ●        │  Context     Remote       │
│  P₆ SEAL       ●        │  Hash        6727c…       │
│  7/7 verified            │                           │
├──────────────────────────┴───────────────────────────┤
│  ⚠ Compute Engine: WASM fallback to TypeScript       │
│  ⚠ SharedArrayBuffer: unavailable (optional)         │
├──────────────────────────────────────────────────────┤
│  Lattice-hash sealed · 128-bit preimage              │
└──────────────────────────────────────────────────────┘
```

### Key Design Decisions
- **Two-column split**: Left = Virtual Machine (the OS), Right = Host Device (where it's projected from). Instantly familiar to hypervisor users
- **Live uptime counter**: Ticks every second since boot, like a real VM console
- **No scrolling**: Everything fits in one view with compact 9-10px monospace text
- **Issues strip at bottom**: Full-width, only shows when degraded
- **Status bar header**: Status dot + OS version + Copy Report button in one line
- **No collapsible sections**: Everything visible at once

## Enhanced Markdown Report (Clipboard)

Add these sections to `formatMarkdownReport`:

1. **Executive Summary**: One-paragraph plain-English system state
2. **Kernel Functions table**: With ring basis and governed namespaces
3. **Categorized tech stack**: Critical / Recommended / Optional groupings with selection criteria columns (license, standard, portability, adoption)
4. **Timing Breakdown**: Boot time, seal time, uptime, verification interval
5. **Environment Capabilities Matrix**: WASM, SIMD, SAB, Workers, SharedMemory as a table
6. **Namespace Coverage**: Covered/uncovered with orphan details
7. **Recommendations**: Per-degradation with severity, impact, and action

### Self-Improvement Feature

Add a `## System Self-Assessment` section at the end of the report where the system analyzes its own report and suggests improvements:

- **Missing Metrics**: Identifies what the report doesn't yet measure (e.g., memory pressure, GC pauses, network latency to Supabase)
- **Coverage Gaps**: Which kernel functions lack depth in reporting
- **Suggested Enhancements**: Concrete additions the system recommends for future reports (e.g., "Add p95 seal verification latency", "Track IndexedDB storage quota usage")

This is generated deterministically from the current data — no AI call needed. A `buildSelfAssessment()` function inspects the receipt and identifies gaps.

## Files Changed

| File | Change |
|------|--------|
| `src/modules/boot/EngineStatusIndicator.tsx` | Full rewrite: two-column hypervisor layout, live uptime, wider panel, enhanced `formatMarkdownReport` with executive summary + capabilities matrix + self-assessment section |

## Implementation Details

- Panel width: `w-[540px]` with `grid grid-cols-2 gap-x-4`
- Uptime: `useEffect` interval computing `Date.now() - bootedAtMs`, formatted as `HH:MM:SS`
- Left column: VM identity (kernel, ring, uptime, boot, modules, stack summary, P₀–P₆ primitives)
- Right column: Host hardware (projection type, hostname, cores, memory, GPU, screen, WASM/SIMD/SAB/Touch capabilities, provenance hash)
- Bottom strip: Full-width issues (only shown when degraded)
- `buildSelfAssessment(receipt)` returns an array of `{ metric: string, status: "measured" | "missing", suggestion: string }` entries by checking what data the receipt contains vs what could be tracked
- No new dependencies

