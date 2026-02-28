# Hologram OS — Design & Architecture Plan
## "Human-Attention Inversion" × Aman × Superhuman

> **North Star**: Classical AI makes humans attend to machine output. Hologram inverts this — the system attends to human coherence. Every design decision, every interaction, every pixel optimizes for how well it serves the human's reasoning, not how much attention it captures. The kernel itself optimizes for human understanding.

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

### Phase 1: Adaptive Typography & Proportional Scale
**Inversion embodied**: The system attends to the human's visual needs — automatically sizing itself to serve readability on any screen, and yielding control to the human's preference.

#### 1.1 CSS Foundation
- [ ] Add `--holo-scale` with `clamp()` formula to `:root` in `index.css`
- [ ] Add `--holo-user-scale` with `data-text-size` attribute variants
- [ ] Define all `--holo-text-*` tokens (xs through display)
- [ ] Define all `--holo-space-*` tokens (1 through 8)
- [ ] Add floor constraints: no text < 11px, no display > 42px
- [ ] Add small-viewport contrast boost rule

#### 1.2 User Control
- [ ] Create `useTextSize` hook: read/write `data-text-size` on `<html>`, persist to localStorage
- [ ] Build Text Size control component: 3 radio buttons (Compact / Default / Large)
- [ ] Integrate control into OS sidebar settings area
- [ ] 200ms CSS transition on `font-size` and `padding` properties

#### 1.3 Component Migration
- [ ] Audit all Hologram OS components: replace `text-sm`, `text-xs`, `text-base`, etc. with `var(--holo-text-*)` 
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
**Inversion embodied**: The system presents only what serves the human's understanding. Every word, every border, every color must earn its place by increasing coherence, not by filling space.

#### 2.1 Color Tokens
- [ ] Add all `--hologram-*` HSL variables to `index.css`
- [ ] Update `tailwind.config.ts` to expose tokens as utilities
- [ ] Update `theme/palette.ts` and `browser-palette.ts` to reference CSS variables
- [ ] Ensure dark/light frame palettes derive from same token set

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
**Inversion embodied**: The panels feel like they're serving you — floating toward you with information, not imposing themselves. They're light, translucent, and aware of their neighbors.

#### 3.1 GlassPanel Component
- [ ] Create `<GlassPanel>` with glass styling, proportional internal sizing
- [ ] Props: `title`, `children`, `collapsible`, `className`
- [ ] All internal padding uses `--holo-space-*`
- [ ] All internal text uses `--holo-text-*`
- [ ] Title uses Playfair Display at `--holo-text-lg`

#### 3.2 Integration
- [ ] Wire into `useModularPanel` for resize
- [ ] Wire into `useDraggablePosition` for drag
- [ ] Resize handle: invisible until hover (cursor change only, no visible element)
- [ ] Minimum panel size respects content at current `--holo-scale`

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

### Phase 4: Profile-Synced Layouts
**Inversion embodied**: The system remembers your preferences so you never have to reconfigure. Your spatial arrangement, your text size, your widget choices — the system attends to preserving your cognitive context across sessions and devices.

#### 4.1 Database
- [ ] Create `desktop_layouts` table with RLS (user_id = auth.uid())
- [ ] Schema: `{ user_id, desktop_id, widget_states, text_size, updated_at }`
- [ ] `widget_states` JSONB: `{ [widgetId]: { x, y, w, h, visible, docked_to } }`

#### 4.2 Sync Hook
- [ ] Create `useCloudDesktopState` hook
- [ ] On mount: load from cloud → merge with localStorage → apply
- [ ] On change: save to localStorage immediately + debounce 2s cloud write
- [ ] Conflict resolution: last-write-wins with ISO timestamp

#### 4.3 Text Size Sync
- [ ] Store `text_size` preference in profile or layout row
- [ ] On login: apply saved text size immediately (before first paint if possible)
- [ ] Flash prevention: server-render `data-text-size` attribute if SSR, else brief loader

#### 4.4 Cross-Device Guarantee
- [ ] Positions stored as viewport-percentages, not absolute pixels
- [ ] On load: convert stored percentages → current viewport pixels
- [ ] Widget positions clamp within current viewport bounds
- [ ] Same proportional layout guaranteed across devices

---

### Phase 5: Desktop Frame Polish
**Inversion embodied**: Every widget is audited through the lens of "does this serve the human's understanding, or does it serve the system's need to display information?" Anything that serves only the system gets removed or simplified.

#### 5.1 Widget Audit
- [ ] For each widget, ask: "What is the one thing this tells the human?"
- [ ] Remove any widget content that doesn't answer that question
- [ ] Ensure every widget has a clear, self-explanatory title
- [ ] No technical jargon without a human-readable explanation

#### 5.2 Visual Polish
- [ ] Apply `<GlassPanel>` treatment to all widgets
- [ ] Remove all unnecessary borders
- [ ] Verify proportional scaling at 1024px, 1280px, 1440px, 1920px
- [ ] Ensure warm earth tones throughout (no cold grays)

#### 5.3 Information Hierarchy
- [ ] Primary information: large, prominent, warm text
- [ ] Secondary: smaller, muted, recedes
- [ ] Tertiary: hidden behind hover or expand — the system only shows it when the human asks
- [ ] This is the inversion: the system *withholds* instead of *dumping*

#### 5.4 Attention-Free Notifications
- [ ] No badges, no counters, no red dots
- [ ] Status changes reflected through subtle color shifts (not alerts)
- [ ] The Focus Journal captures events silently — the human reviews on their terms
- [ ] Nothing blinks, bounces, or demands attention

---

### Phase 6: Panel Composition
**Inversion embodied**: The human doesn't adapt to a fixed layout — the layout adapts to the human. Panels compose and decompose fluidly, remembering the human's preferred arrangement.

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

#### 6.4 Persistence
- [ ] Dock relationships stored in `widget_states` JSONB
- [ ] `docked_to: "widget-id"` + `dock_edge: "right"` 
- [ ] Restored on load with same magnetic snap

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

---

## 8. Design Audit Checklist (per component)

The Inversion Test — for every component, ask:

- [ ] **Does this serve the human's understanding, or the system's need to display?**
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
