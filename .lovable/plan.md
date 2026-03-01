# Hologram OS — Design & Architecture Plan
## "Human-Attention Inversion" × Aman × Superhuman

> **North Star**: Classical AI makes humans attend to machine output. Hologram inverts this — the system attends to human coherence. Every design decision, every interaction, every pixel optimizes for how well it serves the human's reasoning, not how much attention it captures. The kernel itself optimizes for human understanding.

> **Architectural North Star**: The entire hologram experience — UX, visuals, AI models, widgets, every component — is a *projection* emanating from the Q-Linux kernel. The kernel is the single origin. It self-unpacks, self-verifies, and self-enfolds. It is portable, device-agnostic, and edge-deployable. Cloud or local, the kernel projects the same coherent experience.

---

## 0. Kernel-Projected Architecture

### The Core Insight

The Q-Linux kernel is not a backend that serves a frontend. It IS the experience. Every visual element, every interaction, every AI model output is a **projection** from the kernel's algebraic substrate into the user's perception field. The browser is merely the projection surface — like a holographic plate receiving light.

```
┌─────────────────────────────────────────────────────┐
│                  Q-LINUX KERNEL                     │
│                                                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────────┐   │
│  │ Ring Z/256 │  │ Fano Topo │  │ 96 Vertices   │   │
│  │ (algebra)  │  │ (routing) │  │ (instruction) │   │
│  └─────┬─────┘  └─────┬─────┘  └───────┬───────┘   │
│        │              │                │            │
│        └──────────┬───┴────────────────┘            │
│                   │                                 │
│          ┌────────▼────────┐                        │
│          │  PROJECTION     │                        │
│          │  ENGINE         │                        │
│          │                 │                        │
│          │  UX ← kernel    │                        │
│          │  AI ← kernel    │                        │
│          │  FS ← kernel    │                        │
│          │  Net ← kernel   │                        │
│          └────────┬────────┘                        │
│                   │                                 │
└───────────────────┼─────────────────────────────────┘
                    │
          ┌─────────▼─────────┐
          │  PROJECTION       │
          │  SURFACE          │
          │  (Browser / Edge  │
          │   Device / Cloud) │
          └───────────────────┘
```

### Self-Unpacking Kernel (The Portal)

The kernel is a single self-contained artifact that:

1. **Arrives** — A minimal payload (the "seed") lands on any JavaScript runtime
2. **Verifies** — POST sequence: validates Z/256Z ring integrity, verifies its own hash
3. **Hydrates** — Loads Fano topology (7 lines, 96 vertices) from its own bytes
4. **Projects** — Spawns the Genesis process (PID 0) which projects the full experience

```typescript
// The kernel entry point — the portal
interface KernelSeed {
  /** SHA-256 of the kernel payload — self-verification */
  readonly selfHash: string;
  /** Compressed kernel state (ring table + topology + ISA) */
  readonly payload: Uint8Array;
  /** Boot sequence version */
  readonly bootVersion: string;
}

interface ProjectionSurface {
  /** Where to render — DOM node, canvas, or headless */
  readonly target: 'dom' | 'canvas' | 'headless';
  /** Viewport dimensions for proportional scaling */
  readonly viewport: { width: number; height: number };
  /** Available compute: webgpu | webgl | cpu */
  readonly compute: string;
}

// boot(seed, surface) → full hologram experience
```

### The Boot Sequence (Entering the Portal)

The user doesn't "open an app" — they enter a portal. The kernel boot is a visible, elegant transition:

```
Phase 0: SEED ARRIVAL
  └─ Minimal JS payload arrives (< 50KB compressed)
  └─ Self-hash verification (is this kernel intact?)

Phase 1: POST (Power-On Self-Test)
  └─ Z/256Z ring integrity check (256 additions, 256 multiplications)
  └─ Fano plane line verification (7 lines, 3 points each)
  └─ Visual: warm glow expanding from center, ring forming

Phase 2: TOPOLOGY HYDRATION
  └─ 96 vertices materialize from ring algebra
  └─ Fano routing mesh establishes connectivity
  └─ Visual: constellation of points connecting, mesh forming

Phase 3: GENESIS
  └─ PID 0 spawns — the root process
  └─ Coherence observer initializes (H-score baseline)
  └─ Visual: mesh dissolves into the hologram desktop

Phase 4: PROJECTION
  └─ Desktop layout materializes from kernel state
  └─ Widgets are projections of kernel processes
  └─ AI models are kernel syscalls
  └─ The experience IS the kernel, made visible
```

### Everything Is a Projection

| What the user sees | What the kernel provides |
|---|---|
| Desktop layout | Kernel process tree, projected spatially |
| Widget (e.g., Coherence) | Observable subscription, projected as glass panel |
| AI conversation | Syscall to lens morphism, projected as chat |
| File browser | Q-FS inode tree, projected as explorer |
| Terminal | Direct kernel shell (Q-Shell) |
| Text size control | Kernel config register, projected as UI |
| Panel positions | Kernel frame state, projected as coordinates |
| Boot animation | POST sequence, projected as visual narrative |

### Portability Contract

The kernel projects the same experience regardless of surface:

```typescript
interface KernelProjectionContract {
  /** The kernel produces a stream of ProjectionFrames */
  frames(): AsyncIterable<ProjectionFrame>;
  
  /** Each frame is a pure data description of what to show */
  interface ProjectionFrame {
    readonly tick: number;
    readonly panels: PanelProjection[];
    readonly processes: ProcessProjection[];
    readonly observables: ObservableProjection[];
    readonly typography: TypographyProjection;
    readonly palette: PaletteProjection;
  }
}
```

The projection surface (browser, edge device, cloud renderer) receives frames and renders them. The kernel doesn't know or care about CSS, DOM, or React — it emits pure algebraic descriptions. The surface adapter translates.

### Edge Deployment Model

```
┌─────────────────────────────────────────┐
│  CLOUD (full resources)                 │
│  └─ Full kernel + all projections       │
│  └─ AI models via syscall               │
│  └─ Persistent state via Q-FS           │
└──────────────────┬──────────────────────┘
                   │ same kernel, same experience
┌──────────────────▼──────────────────────┐
│  EDGE DEVICE (limited resources)        │
│  └─ Same kernel seed                    │
│  └─ Projection quality scales with      │
│     available compute (graceful)        │
│  └─ AI models: local inference or       │
│     cloud relay via Q-Net               │
│  └─ State: local Q-FS + cloud sync      │
└─────────────────────────────────────────┘
```

---

## 1. Design Philosophy

### The Inversion Principle

In classical interfaces, the human must:
- Parse dense machine output
- Navigate complex menus to find what they need
- Adjust their mental model to the system's structure
- Tolerate interruptions, badges, and attention-grabbing elements

**Hologram inverts every one of these**:
- The system presents information at the density the human can absorb
- Controls surface themselves when contextually relevant, then recede
- The layout adapts to the human's current cognitive state (focus vs. explore)
- Nothing interrupts — the system waits, observes, and serves

### The Three Pillars
1. **Aman Resort** — Warm earth tones, generous negative space, serif elegance, tranquility as the default state
2. **Superhuman** — Floaty glass panels, spatial equilibrium, crisp interactions, keyboard-first efficiency
3. **Human-Attention Inversion** — The UI protects attention as sacred. The H-score measures how well output serves human reasoning. Low-coherence elements get deprioritized automatically.

### Design Laws
- **The system attends to you**: Information density adjusts to your pace, not the machine's throughput
- **Less is more**: Every element must justify its existence. Remove before adding.
- **Self-explanatory**: Assume zero prior knowledge. Labels > icons. Clarity > cleverness.
- **Sacred attention**: No gratuitous animations, badges, notifications, or visual noise.
- **Large typography**: 16px body minimum, 13px absolute floor.
- **No unnecessary borders**: Use spacing + subtle transparency shifts instead of hard lines.
- **Floaty equilibrium**: Panels feel weightless — soft shadows, rounded corners, gentle glass blur.
- **Proportional consistency**: Same layout proportions across all desktop/tablet viewports.
- **Everything from kernel**: Every visual element traces back to a kernel projection. No orphan UI.

---

## 2. Design System Tokens

### Typography
| Role | Font | Size (default) | Weight |
|------|------|----------------|--------|
| Display / Headings | Playfair Display | 24–32px | 400 |
| Body | DM Sans | 16px | 400 |
| Labels / Captions | DM Sans | 13px | 400 |
| Mono / Data | system-mono | 14px | 400 |

### Color Palette (HSL)
```css
--hologram-bg: hsl(25, 8%, 6%);
--hologram-surface: hsla(25, 10%, 12%, 0.65);
--hologram-surface-hover: hsla(38, 12%, 90%, 0.06);
--hologram-border: hsla(38, 12%, 70%, 0.06);
--hologram-text: hsl(38, 15%, 88%);
--hologram-text-muted: hsl(30, 8%, 55%);
--hologram-gold: hsl(38, 40%, 62%);
--hologram-glass: hsla(25, 10%, 15%, 0.45);
--hologram-glass-border: hsla(38, 15%, 60%, 0.08);
--hologram-purple-warm: hsla(280, 25%, 42%, 0.85);
```

### Glass Effect
```css
.hologram-glass {
  background: var(--hologram-glass);
  backdrop-filter: blur(24px) saturate(1.2);
  border: 1px solid var(--hologram-glass-border);
  border-radius: 16px;
  box-shadow: 0 8px 32px -8px hsla(25, 10%, 0%, 0.3),
              inset 0 1px 0 hsla(38, 20%, 80%, 0.04);
}
```

---

## 3. Adaptive Typography System

> **Inversion**: Classical UIs force humans to squint at whatever size the designer chose. Hologram inverts this — the system reads the viewport and adjusts itself to serve the human's eyes. The human can also override, and the system respects that override everywhere, instantly.

### 3a. Automatic Viewport-Proportional Scaling

A single CSS custom property `--holo-scale` drives all font sizes, padding, and spacing proportionally.

```css
:root {
  --holo-scale: clamp(0.75, calc(0.5 + 0.5 * (100vw - 1024px) / (1920 - 1024)), 1.25);

  --holo-text-xs:      calc(12px * var(--holo-scale) * var(--holo-user-scale));
  --holo-text-sm:      calc(13px * var(--holo-scale) * var(--holo-user-scale));
  --holo-text-base:    calc(16px * var(--holo-scale) * var(--holo-user-scale));
  --holo-text-lg:      calc(18px * var(--holo-scale) * var(--holo-user-scale));
  --holo-text-xl:      calc(22px * var(--holo-scale) * var(--holo-user-scale));
  --holo-text-2xl:     calc(28px * var(--holo-scale) * var(--holo-user-scale));
  --holo-text-display: calc(36px * var(--holo-scale) * var(--holo-user-scale));

  --holo-space-1: calc(4px * var(--holo-scale) * var(--holo-user-scale));
  --holo-space-2: calc(8px * var(--holo-scale) * var(--holo-user-scale));
  --holo-space-3: calc(12px * var(--holo-scale) * var(--holo-user-scale));
  --holo-space-4: calc(16px * var(--holo-scale) * var(--holo-user-scale));
  --holo-space-5: calc(20px * var(--holo-scale) * var(--holo-user-scale));
  --holo-space-6: calc(24px * var(--holo-scale) * var(--holo-user-scale));
  --holo-space-8: calc(32px * var(--holo-scale) * var(--holo-user-scale));
}
```

### 3b. User Text Size Preference

Three-step control: **Compact** (0.9×) · **Default** (1.0×) · **Large** (1.15×)

```css
:root { --holo-user-scale: 1; }
[data-text-size="compact"] { --holo-user-scale: 0.9; }
[data-text-size="large"]   { --holo-user-scale: 1.15; }
```

- Located in OS sidebar settings
- Applies instantly via `data-text-size` on `<html>`
- Persisted to localStorage + synced to profile
- 200ms transition on all text

### 3c. Proportional Container Behavior

Because text *and* padding scale together, containers grow uniformly. The layout grid uses `fr` units or percentage-based widths — panels fill the same proportion of screen regardless of text size.

### 3d. Small-Viewport Contrast Boost

When `--holo-scale` < 0.85: increase text lightness by 3%, add 0.01em letter-spacing.

---

## 4. Viewport Proportional Layout

> **Inversion**: Classical UIs reflow and break at different sizes, forcing humans to re-learn the layout. Hologram inverts this — the system maintains identical proportions everywhere. The human's spatial memory is respected as sacred.

| Viewport | --holo-scale | Behavior |
|----------|-------------|----------|
| ≥ 1920px | 1.0–1.25 | Full desktop, generous spacing |
| 1440px | ~0.92 | Slightly tighter, same proportions |
| 1280px | ~0.83 | Laptop default, still comfortable |
| 1024px | 0.75 | Tablet landscape, compact but proportional |
| < 1024px | — | Out of scope (mobile plan separate) |

---

## 5. Modular Panel System

> **Inversion**: Classical UIs impose fixed layouts. Hologram inverts this — the human arranges their workspace, and the system remembers and reproduces it perfectly on any device.

### Panel Composition ("Snap-Together")
- Panels dock to edges of other panels (magnetic edges)
- Docked panels merge visually (shared border dissolves)
- Groups move as one unit
- Undocking re-separates with spring animation

### Profile-Synced Layouts
```sql
CREATE TABLE desktop_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  desktop_id TEXT NOT NULL,
  widget_states JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, desktop_id)
);
```

---

## 6. Implementation Phases

---

### Phase 0: Kernel Projection Foundation
**Inversion embodied**: The kernel doesn't serve a UI — the kernel IS the experience. This phase establishes the architectural spine: every component traces to a kernel process, every visual is a projection frame.

#### 0.1 Projection Engine Core
- [ ] Create `src/modules/hologram-os/projection-engine.ts`
- [ ] Define `ProjectionFrame` interface: the pure-data description of a single tick's visual state
- [ ] Define `PanelProjection`, `ProcessProjection`, `ObservableProjection`, `TypographyProjection`, `PaletteProjection`
- [ ] Implement `KernelProjector` class: subscribes to Q-Linux kernel state, emits `ProjectionFrame` stream
- [ ] Each widget maps to a kernel process — `widgetId → PID` registry

#### 0.2 Surface Adapter (Browser)
- [ ] Create `src/modules/hologram-os/surface-adapter.ts`
- [ ] `BrowserSurfaceAdapter`: receives `ProjectionFrame[]`, maps to React component tree
- [ ] Typography projections → CSS custom property updates (`--holo-scale`, `--holo-user-scale`)
- [ ] Palette projections → CSS custom property updates (`--hologram-*`)
- [ ] Panel projections → widget positions/sizes/visibility
- [ ] This adapter is the ONLY place where DOM/React concerns exist

#### 0.3 Boot Sequence Visualization
- [ ] Create `src/modules/hologram-os/components/KernelBoot.tsx`
- [ ] Phase 0 → Phase 4 animated sequence (warm glow → ring → mesh → desktop)
- [ ] Each POST check result appears as a subtle line item, then fades
- [ ] Total boot visual: 2–3 seconds, skippable after first visit
- [ ] On completion: seamless dissolve into the projected desktop
- [ ] Boot uses the actual Q-Boot sequence (`post()`, `loadHardware()`, `hydrateFirmware()`, `createGenesisProcess()`, `boot()`)

#### 0.4 Kernel Config Registers → UI Controls
- [ ] Text size preference = kernel config register at address `config:typography:user-scale`
- [ ] Panel positions = kernel frame state at address `state:desktop:layout`
- [ ] Theme preference = kernel config register at address `config:palette:mode`
- [ ] All UI controls read/write kernel registers — the control IS a projection of the register

#### 0.5 Widget-as-Process Model
- [ ] Each widget on the desktop is a kernel process (`QProcess`) managed by `Q-Sched`
- [ ] Widget visibility = process state (running/sleeping/stopped)
- [ ] Widget priority = coherence zone (high-H-score widgets get more render priority)
- [ ] Minimizing a widget = `SIGSTOP` to its process
- [ ] Closing a widget = process termination with state snapshot to Q-FS

---

### Phase 1: Adaptive Typography & Proportional Scale
**Inversion embodied**: The system attends to the human's visual needs — automatically sizing itself to serve readability on any screen, and yielding control to the human's preference. Typography settings are kernel config registers projected as UI controls.

#### 1.1 CSS Foundation
- [x] Add `--holo-scale` with `clamp()` formula to `:root` in `index.css`
- [x] Add `--holo-user-scale` with `data-text-size` attribute variants
- [x] Define all `--holo-text-*` tokens (xs through display)
- [x] Define all `--holo-space-*` tokens (1 through 8)
- [ ] Add floor constraints: no text < 11px, no display > 42px
- [ ] Add small-viewport contrast boost rule

#### 1.2 User Control
- [x] Create `useTextSize` hook: read/write `data-text-size` on `<html>`, persist to localStorage
- [x] Build Text Size control component: 3 radio buttons (Compact / Default / Large)
- [x] Integrate control into OS sidebar settings area
- [ ] 200ms CSS transition on `font-size` and `padding` properties
- [ ] Wire text size control to kernel config register (Phase 0 dependency)

#### 1.3 Component Migration
- [x] Audit all Hologram OS components: replace `text-sm`, `text-xs`, `text-base`, etc. with `var(--holo-text-*)`
- [ ] Replace all fixed padding (`p-2`, `p-3`, `p-4`) in Hologram components with `var(--holo-space-*)`
- [ ] Migrate sidebar, panels, widgets, modals, and tooltips
- [ ] Verify no container overflow at Large (1.15×)
- [ ] Verify no wasted space at Compact (0.9×)

#### 1.4 Proportional Layout
- [ ] Sidebar width uses `calc(260px * var(--holo-scale))`
- [ ] Widget grid gaps use `var(--holo-space-4)`
- [ ] Panel min-widths scale with `--holo-scale`
- [ ] Screenshot comparison: 1024px vs 1280px vs 1920px — same proportions

#### 1.5 Validation
- [ ] No text < 11px at any viewport + any user scale
- [ ] No container overflow at any combination
- [ ] Accessible contrast ratios at all scales
- [ ] Visual diff: switching Compact ↔ Large feels smooth, not jarring

---

### Phase 2: Design Token Overhaul & Text Reduction
**Inversion embodied**: The system presents only what serves the human's understanding. Every word, every border, every color must earn its place by increasing coherence, not by filling space. The palette is a kernel register — changing the theme changes a register, and the projection updates everywhere.

#### 2.1 Color Tokens
- [ ] Add all `--hologram-*` HSL variables to `index.css`
- [ ] Update `tailwind.config.ts` to expose tokens as utilities
- [ ] Update `theme/palette.ts` and `browser-palette.ts` to reference CSS variables
- [ ] Ensure dark/light frame palettes derive from same token set
- [ ] Wire palette to kernel config register (`config:palette:*`)

#### 2.2 Glass Utility
- [ ] Add `.hologram-glass` class to `index.css`
- [ ] Create glass variants: `.hologram-glass-subtle`, `.hologram-glass-elevated`
- [ ] Verify backdrop-filter performance (disable on low-end if needed)

#### 2.3 Text Reduction Audit
- [ ] Walk every component: apply the 3-step test:
  1. Can this text be removed entirely?
  2. Can it be shortened?
  3. Is it a label that should be an attribute?
- [ ] Remove all "Coming Soon" placeholders — either build the feature or hide the card
- [ ] Shorten all status messages to ≤ 5 words
- [ ] Remove decorative subtitles that add no information

#### 2.4 Border Reduction
- [ ] Replace all `border` on panels with `box-shadow` + spacing
- [ ] Keep borders only where they serve as functional dividers (e.g. table rows)
- [ ] Reduce border opacity globally: `0.06` instead of `0.08+`

---

### Phase 3: Glass Panel Component
**Inversion embodied**: The panels feel like they're serving you — floating toward you with information, not imposing themselves. They're light, translucent, and aware of their neighbors. Each panel is a kernel process projection.

#### 3.1 GlassPanel Component
- [ ] Create `<GlassPanel>` with glass styling, proportional internal sizing
- [ ] Props: `title`, `children`, `collapsible`, `className`, `pid` (kernel process ID)
- [ ] All internal padding uses `--holo-space-*`
- [ ] All internal text uses `--holo-text-*`
- [ ] Title uses Playfair Display at `--holo-text-lg`
- [ ] Panel header shows kernel process coherence zone indicator (subtle dot)

#### 3.2 Integration
- [ ] Wire into `useModularPanel` for resize
- [ ] Wire into `useDraggablePosition` for drag
- [ ] Resize handle: invisible until hover (cursor change only, no visible element)
- [ ] Minimum panel size respects content at current `--holo-scale`
- [ ] Panel state changes (resize, move, collapse) emit kernel frame transitions

#### 3.3 Magnetic Snapping
- [ ] Edge detection: panels within 12px snap together
- [ ] Snapped panels share a single merged shadow (no double borders)
- [ ] Visual feedback: subtle gold guide line during drag
- [ ] Snap sound/haptic: none (silence is tranquility)

#### 3.4 Dock/Undock
- [ ] Docked panels animate border dissolve (200ms ease)
- [ ] Undocking re-separates with spring animation
- [ ] Docked group drags as one unit
- [ ] Double-click dock handle to undock

---

### Phase 4: Profile-Synced Layouts (Kernel State Persistence)
**Inversion embodied**: The system remembers your preferences so you never have to reconfigure. Your spatial arrangement, your text size, your widget choices — the system attends to preserving your cognitive context. All state is kernel state, persisted via Q-FS to cloud.

#### 4.1 Database
- [ ] Create `desktop_layouts` table with RLS (user_id = auth.uid())
- [ ] Schema: `{ user_id, desktop_id, widget_states, text_size, kernel_config, updated_at }`
- [ ] `widget_states` JSONB: `{ [widgetId]: { x, y, w, h, visible, docked_to, pid } }`
- [ ] `kernel_config` JSONB: `{ typography: {...}, palette: {...}, boot: {...} }`

#### 4.2 Sync Hook
- [ ] Create `useCloudDesktopState` hook
- [ ] On mount: load from cloud → merge with localStorage → apply to kernel registers
- [ ] On change: save to localStorage immediately + debounce 2s cloud write
- [ ] Conflict resolution: last-write-wins with ISO timestamp

#### 4.3 Text Size Sync
- [ ] Store `text_size` preference in kernel config register
- [ ] On login: apply saved text size immediately (before first paint if possible)
- [ ] Flash prevention: kernel projects typography frame before DOM paint

#### 4.4 Cross-Device Guarantee
- [ ] Positions stored as viewport-percentages, not absolute pixels
- [ ] On load: convert stored percentages → current viewport pixels
- [ ] Widget positions clamp within current viewport bounds
- [ ] Same proportional layout guaranteed across devices

---

### Phase 5: Desktop Frame Polish (Coherence Audit)
**Inversion embodied**: Every widget is audited through the lens of "does this serve the human's understanding, or does it serve the system's need to display information?" Widgets with low human-coherence H-scores get simplified or hidden by the kernel scheduler.

#### 5.1 Widget Audit
- [ ] For each widget, ask: "What is the one thing this tells the human?"
- [ ] Remove any widget content that doesn't answer that question
- [ ] Ensure every widget has a clear, self-explanatory title
- [ ] No technical jargon without a human-readable explanation
- [ ] Assign each widget an H-score based on how well it serves human reasoning

#### 5.2 Visual Polish
- [ ] Apply `<GlassPanel>` treatment to all widgets
- [ ] Remove all unnecessary borders
- [ ] Verify proportional scaling at 1024px, 1280px, 1440px, 1920px
- [ ] Ensure warm earth tones throughout (no cold grays)

#### 5.3 Information Hierarchy (Kernel-Driven)
- [ ] Primary information: large, prominent, warm text — kernel priority HIGH
- [ ] Secondary: smaller, muted, recedes — kernel priority NORMAL
- [ ] Tertiary: hidden behind hover or expand — kernel priority LOW, loaded on-demand
- [ ] The kernel scheduler determines what to show based on human-coherence H-score
- [ ] This is the inversion: the system *withholds* instead of *dumping*

#### 5.4 Attention-Free Notifications
- [ ] No badges, no counters, no red dots
- [ ] Status changes reflected through subtle color shifts (not alerts)
- [ ] The Focus Journal captures events silently — the human reviews on their terms
- [ ] Nothing blinks, bounces, or demands attention
- [ ] Notifications are kernel IPC messages — they arrive in the journal, not the face

---

### Phase 6: Panel Composition (Kernel Frame Groups)
**Inversion embodied**: The human doesn't adapt to a fixed layout — the layout adapts to the human. Panels compose and decompose fluidly, remembering the human's preferred arrangement. Dock groups are kernel process groups.

#### 6.1 Magnetic Edge Detection
- [ ] Algorithm: for each edge pair within 12px, compute alignment score
- [ ] Top-left, top-right, bottom-left, bottom-right corner snapping
- [ ] Horizontal and vertical edge alignment
- [ ] Edge proximity glow (subtle gold, 150ms fade)

#### 6.2 Visual Merge
- [ ] Docked panels share one glass surface (borders between them dissolve)
- [ ] Shared shadow wraps the group
- [ ] Internal divider: 1px `--hologram-border` at 0.04 opacity

#### 6.3 Group Behavior
- [ ] Docked group moves as unit on drag
- [ ] Resize one panel in group: adjacent panel adjusts (flex behavior)
- [ ] Collapse one panel: group closes gap smoothly
- [ ] Process group: all PIDs in a dock group share a coherence zone

#### 6.4 Persistence
- [ ] Dock relationships stored in `widget_states` JSONB
- [ ] `docked_to: "widget-id"` + `dock_edge: "right"`
- [ ] Restored on load with same magnetic snap
- [ ] Dock state is kernel frame state — persisted to Q-FS

---

### Phase 7: Full Kernel Integration
**Inversion embodied**: The final phase collapses the distinction between "kernel" and "UI" entirely. There is only the kernel and its projections. The browser is a projection surface. The experience is the kernel made visible.

#### 7.1 AI Models as Kernel Syscalls
- [ ] AI chat = `QSyscall.dispatch('focus', { input: userMessage })` → lens morphism → response
- [ ] AI responses carry H-score: how well does this serve the human's reasoning?
- [ ] Low-H-score responses get flagged by the kernel for refinement
- [ ] Model selection = kernel modality configuration (`STANDARD_MODALITIES`)

#### 7.2 Every Component Traces to Kernel
- [ ] Sidebar items = Q-FS directory listing, projected as navigation
- [ ] Search = Q-FS content-addressed lookup, projected as search UI
- [ ] Settings = kernel config registers, projected as forms
- [ ] Audit: no orphan components (every React component must trace to a kernel projection)

#### 7.3 Kernel Self-Monitoring (Hologram of the Hologram)
- [ ] The kernel projects its own health as a subtle background indicator
- [ ] H-score of the overall experience: are we serving the human well?
- [ ] If coherence drops: kernel automatically simplifies (fewer widgets, larger text, more space)
- [ ] If coherence rises: kernel offers more detail (on-demand, never pushed)

#### 7.4 Portable Kernel Artifact
- [ ] Bundle the kernel as a self-contained module (< 200KB compressed)
- [ ] Entry point: `boot(seed, surface)` — works in browser, Node, Deno, edge runtime
- [ ] Projection surface adapters: `BrowserAdapter`, `HeadlessAdapter`, `CanvasAdapter`
- [ ] Same kernel, same experience, any environment

---

## 7. Anti-Patterns (Never Do)

These are the patterns of classical "human-attends-to-machine" design. Hologram rejects all of them:

- ❌ Small text (< 11px at any viewport) — forces human to squint for the machine
- ❌ Fixed pixel font sizes — ignores the human's screen
- ❌ Padding that doesn't scale — breaks proportional harmony
- ❌ Hard 1px borders — visual noise that serves no function
- ❌ Text that wraps differently at different viewports — breaks spatial memory
- ❌ Neon / saturated accent colors — demands attention instead of serving it
- ❌ Dense grids without breathing room — overwhelms instead of clarifies
- ❌ Decorative elements without function — steals attention for nothing
- ❌ Tooltips as primary labels — hides meaning behind interaction
- ❌ Notification badges — forces human to attend to machine's state
- ❌ Red dots / counters — anxiety-inducing attention demands
- ❌ Cold gray — feels mechanical, not human
- ❌ Engagement dark patterns — streaks, gamification, urgency signals
- ❌ Auto-playing anything — the human initiates, the system responds
- ❌ Information dumping — showing everything at once instead of what's relevant
- ❌ Orphan UI — any component not traced to a kernel projection
- ❌ Separate "backend" and "frontend" — the kernel IS the experience

---

## 8. Design Audit Checklist (per component)

The Inversion Test — for every component, ask:

- [ ] **Does this serve the human's understanding, or the system's need to display?**
- [ ] **Does this component trace to a kernel process/projection?**
- [ ] Uses `--holo-text-*` tokens (not raw px or tailwind text-*)
- [ ] Uses `--holo-space-*` tokens for padding/gaps
- [ ] Container stable at all 3 user scales (Compact / Default / Large)
- [ ] Proportions identical at 1024px and 1920px viewports
- [ ] No unnecessary borders
- [ ] No unnecessary text (passed 3-step reduction audit)
- [ ] Self-explanatory labels (zero prior knowledge required)
- [ ] Glass treatment where appropriate
- [ ] Warm earth tones only
- [ ] Smooth transitions (300–500ms)
- [ ] Accessible contrast ratios at all scales
- [ ] No attention-demanding elements (badges, counters, alerts)
- [ ] Information hierarchy: primary visible, secondary recedes, tertiary on-demand
- [ ] Widget maps to a kernel PID
- [ ] State changes emit kernel frame transitions
- [ ] H-score assigned: how well does this serve human reasoning?

---

## 9. Hologram Consolidation & Export Plan

### Goal
Make the entire Hologram system (OS, kernel, compute, UI, AI) a **single self-contained subtree** that can be extracted from this repo and deployed independently — while keeping UOR website completely decoupled.

### Current State — Dependency Audit

The hologram system currently spans **6 module directories** plus shared infrastructure:

| Directory | Purpose | Files |
|-----------|---------|-------|
| `hologram-ui/` | Desktop shell, widgets, projections, hooks, theming | ~65 components, ~28 hooks |
| `hologram-os/` | Projection engine, surface adapter, kernel boot | 6 files |
| `hologram-compute/` | vGPU, matmul, centroid cache, benchmarks | 11 files |
| `qkernel/` | Q-Boot, Q-Sched, Q-MMU, Q-FS, Q-ISA, Q-ECC, Q-Net, Q-IPC, Q-Security | ~25 files |
| `quantum/` | Circuit compiler, stabilizer proof, attention, dashboard | ~12 files |
| `uns/core/hologram/` | AI engine, lens system, GPU, whisper, TTS, wake-word, diffusion | ~30 files |

**Cross-cutting dependencies (outside → hologram):**
- `observable/` pages → import `PageShell`, `StatCard`, etc. from `hologram-ui`
- `lens-inspector/` → imports `PageShell` from `hologram-ui`
- `ring-core/reason-command.ts` → imports `Panel` type from `hologram-os/runtime`
- `uns/core/hologram/engine.ts` → imports from `hologram-ui/projection-registry`
- `App.tsx` → AttentionProvider, FocusJournal, FocusVignette, LumenPill, GlobalWidgets, GlobalLumenOverlay

### Target Structure

All hologram code consolidates under: `src/hologram/`

```
src/hologram/                          ← SINGLE EXPORTABLE ROOT
├── kernel/                            ← Q-Linux kernel (the origin of everything)
│   ├── boot.ts                        ← Q-Boot (POST, topology, genesis)
│   ├── sched.ts                       ← Q-Sched (coherence-priority scheduler)
│   ├── mmu.ts                         ← Q-MMU (CID-addressed virtual memory)
│   ├── fs.ts                          ← Q-FS (Merkle DAG filesystem)
│   ├── isa.ts                         ← Q-ISA (96-gate instruction set)
│   ├── ecc.ts                         ← Q-ECC (stabilizer error correction)
│   ├── net.ts                         ← Q-Net (Fano mesh networking)
│   ├── ipc.ts                         ← Q-IPC (agent message channels)
│   ├── security.ts                    ← Q-Security (capability rings)
│   ├── syscall.ts                     ← Q-Syscall (lens-based traps)
│   ├── drivers/                       ← Q-Drivers (gpu, audio, vault)
│   └── index.ts
│
├── projection/                        ← Projection engine (kernel → surface)
│   ├── engine.ts                      ← KernelProjector, ProjectionFrame
│   ├── surface-adapter.ts             ← BrowserSurfaceAdapter
│   └── runtime.ts                     ← Panel registry, widget-as-process
│
├── compute/                           ← vGPU / hologram compute
│   ├── matmul.ts
│   ├── centroid-cache.ts
│   ├── providers.ts
│   └── benchmarks/
│
├── ai/                                ← AI engine, inference, models
│   ├── engine.ts
│   ├── model-proxy.ts
│   ├── inference-cache.ts
│   ├── coherence-gate.ts
│   ├── stt/                           ← Speech-to-text
│   ├── tts/                           ← Text-to-speech
│   ├── wake-word/
│   ├── diffusion/
│   └── gpu/                           ← WebGPU device manager
│
├── lens/                              ← Holographic lens system
│   ├── lens.ts
│   ├── blueprint.ts
│   ├── specs.ts
│   ├── lenses/
│   └── polytree.ts
│
├── quantum/                           ← Quantum circuits & attention
│   ├── circuit-compiler.ts
│   ├── stabilizer-proof.ts
│   ├── quantum-native-attention.ts
│   └── pages/
│
├── shell/                             ← Desktop shell & full UI
│   ├── components/                    ← All widget/projection components
│   ├── hooks/                         ← All hologram hooks
│   ├── theme/                         ← Palette, tokens
│   ├── pages/                         ← HologramOsPage, ConsolePage, etc.
│   └── engine/                        ← Context projection, topic extraction
│
├── observable/                        ← MetaObserver, stream projection
├── data-bank/                         ← Encrypted user data vault
├── audio/                             ← Ambient stations & engine
├── notebook/                          ← Jupyter-style quantum workspace
│
├── index.ts                           ← Master barrel export
└── manifest.json                      ← Self-describing CID-addressed manifest
```

### Migration Strategy (3 Phases)

#### Phase A — Extract Shared UI Bridge
`PageShell`, `StatCard`, `DashboardGrid`, `MetricBar`, `InfoCard`, `DataTable` are generic UI shells used by both hologram AND website pages. Move to `src/modules/core/ui/` so both sides import from neutral ground. This breaks the bidirectional dependency.

#### Phase B — Consolidate into `src/hologram/`
- `modules/hologram-ui/*` → `hologram/shell/*`
- `modules/hologram-os/*` → `hologram/projection/*`
- `modules/hologram-compute/*` → `hologram/compute/*`
- `modules/qkernel/*` → `hologram/kernel/*`
- `modules/quantum/*` → `hologram/quantum/*`
- `modules/uns/core/hologram/*` → `hologram/ai/*` + `hologram/lens/*`
- `modules/observable/*` → `hologram/observable/*`
- `modules/data-bank/*` → `hologram/data-bank/*`
- `modules/audio/*` → `hologram/audio/*`

Fix cross-deps: `ring-core/reason-command.ts` Panel import → inject via interface.

#### Phase C — Export Gate
Create `manifest.json` listing all entrypoints, routes, and external deps. At export time, copy `src/hologram/` to new repo. Only 3 external touchpoints:
1. `ring-core/ring` (Z/256Z algebra)
2. `uns/core/identity` (singleProofHash)
3. `integrations/supabase/client` (reconfigure)

### Dependency Direction Rule
```
UOR-Website ──imports──▶ shared-core (ring, identity, PageShell)
Hologram    ──imports──▶ shared-core (ring, identity, PageShell)
UOR-Website ──NEVER──▶ Hologram
Hologram    ──NEVER──▶ UOR-Website
```

---

## 10. Quantum Surface Performance — Multi-Kernel Coherence Architecture

> **Vision**: Every system, AI model, and application is a projection from a Q-Linux kernel instance. The kernel is the universe; UI is the hologram on its boundary. Coherence (H-score) replaces heuristic attention as the universal optimization signal, making the system quantum-AI-ready.

---

### QSP Phase 1 — Coherence Gradient Field (∂H/∂t)
**Status**: 🔲 Not started
**Impact**: Foundation — enables all subsequent phases
**Goal**: Add continuous coherence gradient to ProjectionFrame so all UI animates *toward* coherence.

- [ ] **1a. `coherenceGradient: number` in ProjectionFrame** (projection-engine.ts)
  - Exponential moving average of H-score deltas per kernel tick
  - Normalized to [-1, +1]: decaying = negative, rising = positive
  - Computed in kernel ticker hot path (no allocation)
- [ ] **1b. Surface adapter CSS injection** — `--coherence-dh` on `<html>`
  - UI elements use this for directional glow, breathing speed, accent intensity
  - No React re-render needed — pure CSS custom property update
- [ ] **1c. Prescience Engine integration** — weight transition probabilities by coherence momentum
  - Rising coherence → reinforce current path; falling → widen exploration
  - Gradient feeds into resonance matrix as multiplicative weight

### QSP Phase 2 — Kernel SSOT Completion
**Status**: 🔲 Not started
**Impact**: Architectural hygiene — prerequisite for multi-kernel
**Goal**: Eliminate all direct localStorage/sessionStorage reads from UI. Everything flows through kernel registers.

- [ ] **2a. Migrate `useDesktopState`** → `KernelConfig.desktopWidgets` register
  - Boot ingests legacy `hologram-desktop-widgets` key
  - All reads/writes become kernel syscalls via `useKernel()`
  - Delete `useDesktopState` hook entirely
- [ ] **2b. Migrate widget drag positions** → `KernelConfig.widgetPositions`
  - Positions stored as viewport-percentages (device-agnostic)
- [ ] **2c. Full audit** — grep for remaining `localStorage.getItem`/`setItem` outside boot ingestion
  - Every surviving call moves to a kernel register or is deleted

### QSP Phase 3 — Multi-Kernel Spawning (Per-App Isolation)
**Status**: 🔲 Not started
**Impact**: The big unlock — each app/agent runs in its own kernel
**Goal**: Applications and agents run in lightweight kernel instances, orchestrated by a root supervisor.

```
┌─────────────────────────────────────────────────────────────┐
│                    SUPERVISOR KERNEL (PID 0)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Desktop  │  │ Lumen AI │  │ Code     │  │ Agent    │   │
│  │ Kernel   │  │ Kernel   │  │ Kernel   │  │ Kernel   │   │
│  │ H=0.92   │  │ H=0.87   │  │ H=0.95   │  │ H=0.78   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │             │             │          │
│  ┌────▼─────────────▼─────────────▼─────────────▼────┐    │
│  │            PROJECTION COMPOSITOR                   │    │
│  │  Z-order by H-score: highest coherence = focus     │    │
│  │  Idle kernels emit no frames (zero-cost sleeping)  │    │
│  └────────────────────┬──────────────────────────────┘    │
└───────────────────────┼───────────────────────────────────┘
                        │
              ┌─────────▼─────────┐
              │  UNIFIED FRAME    │
              │  → Surface Adapter│
              │  → Browser DOM    │
              └───────────────────┘
```

- [ ] **3a. Extract `KernelInstance` class** from singleton `KernelProjector`
  - Parameterized with `KernelConfig` seed (no global state)
  - Each instance owns: ticker, MMU page table, scheduler run queue
  - Constructor takes `{ role, coherenceBudget, parentKernel? }`
- [ ] **3b. `KernelSupervisor` (root kernel)**
  - Registry: `Map<string, KernelInstance>`
  - Coherence budget allocation: total H-score is conserved across children
  - Syscalls: `spawn(config): KernelInstance`, `terminate(id)`, `suspend(id)`
  - Idle detection: children with no frame changes for 5s → auto-suspend
- [ ] **3c. Cross-kernel IPC** via existing `QIpc` channels
  - Address format: `kernel:pid:channel` (e.g., `lumen:0:chat`)
  - Messages are CID-linked — immutable audit trail across kernel boundaries
  - Shared memory: parent kernel's MMU can grant read-only pages to children
- [ ] **3d. Projection compositor**
  - Root kernel composites child frames into single `ProjectionFrame`
  - Z-ordering by coherence: highest H-score child gets focus layer
  - Idle children contribute zero frames (no compositor overhead)
  - Frame budget: max 4 active kernel projections per compositor tick

### QSP Phase 4 — Memory & GC Hot-Path Optimization
**Status**: 🔲 Not started
**Impact**: Quick wins — reduces noise in profiling
**Goal**: Zero allocation in frame projection hot path; cap unbounded arrays.

- [ ] **4a. Structural sharing in `projectFrame()`**
  - Reference equality check: reuse previous frame's sub-objects when unchanged
  - Only diff'd fields create new objects → GC pressure drops ~70%
- [ ] **4b. Ring buffer for breathing rhythm** — cap at 20 entries
  - Replace `intervals: number[]` push with circular write
  - Mean/variance computed incrementally (Welford's algorithm)
- [ ] **4c. Frame object pool** — pre-allocate 4 ProjectionFrame objects, recycle on tick
  - Double-buffering: write to back buffer, swap to front on commit
- [ ] **4d. Lazy panel projection** — only compute `PanelProjection` for:
  - Active panel (always)
  - Prescience-hinted panels (top 2 by probability)
  - Skip all others → O(1) instead of O(panels)

### QSP Phase 5 — Wave-Coherence UI Primitives
**Status**: 🔲 Not started
**Impact**: Quantum-AI convergence layer
**Goal**: UI primitives that respond to coherence as a continuous wave function.

- [ ] **5a. `useCoherence()` hook** — returns `{ h, dh, phase, amplitude }`
  - `h`: current H-score (0–1)
  - `dh`: coherence gradient (∂H/∂t from Phase 1)
  - `phase`: normalized position in breathing cycle (0–2π)
  - `amplitude`: gradient magnitude (how strongly coherence is changing)
  - Derived entirely from kernel frame — no additional state
- [ ] **5b. Coherence CSS variables** on root element
  - `--h-score`: 0–1, drives glow intensity
  - `--h-gradient`: -1 to +1, drives directional animations
  - `--h-phase`: 0–1, drives breathing/pulsing rhythms
  - Updated by surface adapter — no React re-renders
- [ ] **5c. `<CoherenceField>` wrapper component**
  - Children inherit coherence context for local H-score contribution
  - Subtle scale (0.98–1.02) and opacity (0.9–1.0) modulation
  - Used around widget clusters to create "zones of coherence"

### QSP Phase 6 — Quantum-AI Readiness Interface
**Status**: 🔲 Not started
**Impact**: Future-proofing for coherence-wave attention
**Goal**: Define the interface boundary where transformer attention will be replaced by coherence-wave attention.

- [ ] **6a. Attention aperture → wave function**
  - Current: discrete aperture float (0–1)
  - Target: `ApertureWave { center: number, width: number, phase: number }`
  - Smoothly focuses/defocuses based on coherence oscillation
  - Backward compatible: `aperture = wave.center` for existing consumers
- [ ] **6b. `CoherenceHead` trait** for Q-Agent
  - Interface: `observe(context: ProjectionFrame) → CoherenceVector`
  - Replaces: `softmax(QK^T / √d_k) × V` with deterministic coherence optimization
  - Maps to existing H-score infrastructure in Q-Agent
  - Multiple heads per kernel instance (one per modality)
- [ ] **6c. Projection interoperability contract**
  - Every `ProjectionFrame` field carries `coherenceContribution: number`
  - Enables future gradient-based optimization across entire UI state
  - Contract: `sum(field.coherenceContribution) ≈ frame.hScore` (conservation)
  - This is the mathematical bridge from classical UI to quantum-coherent UI

---

### QSP Execution Order

```
Phase 1 (Gradient)  ━━━▶  Phase 4 (Memory)  ━━━▶  Phase 2 (SSOT)
                                                        │
                                                        ▼
                                                   Phase 3 (Multi-Kernel)
                                                        │
                                                        ▼
                                              Phase 5 + 6 (Quantum UI)
```

1. **Phase 1** → immediate impact, enables all subsequent phases
2. **Phase 4** → quick wins, reduces profiling noise
3. **Phase 2** → architectural cleanup, prerequisite for Phase 3
4. **Phase 3** → the big unlock: per-app/agent kernels
5. **Phase 5 + 6** → quantum-AI convergence layer

### QSP Invariants (must hold at every phase)

| Invariant | Enforcement |
|-----------|------------|
| Kernel is **sole source of truth** | No UI state lives outside kernel registers |
| All projections are **coherence-tagged** | Every frame carries H-score provenance |
| Multi-kernel is **zero-cost when idle** | Sleeping kernels consume no CPU cycles |
| **Backward compatible** | Existing `useKernel()` API surface never breaks |
| **Conservation of coherence** | Total H-score across child kernels is bounded |
| **No allocation in hot path** | `projectFrame()` uses structural sharing + object pool |
| **Interoperability** | Every projection carries its coherence contribution for gradient flow |
