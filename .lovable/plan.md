# Hologram OS — Design & Architecture Plan
## "Human-Attention Inversion" × Aman × Superhuman

> **Core Principle**: The system optimizes for human coherence, not engagement metrics. Every pixel earns its place by serving clarity, beauty, or function — never decoration. Agents attend to human coherence (H-score), not the reverse.

---

## 1. Design Philosophy

### The Three Pillars
1. **Aman Resort** — Warm earth tones, generous negative space, serif elegance, tranquility as the default state
2. **Superhuman** — Floaty glass panels, spatial equilibrium, crisp interactions, keyboard-first efficiency
3. **Human-Attention Inversion** — The UI protects attention as sacred. No harvesting — only love.

### Design Laws
- **Less is more**: Every element must justify its existence. Remove before adding.
- **Self-explanatory**: Assume zero prior knowledge. Labels > icons. Clarity > cleverness.
- **Sacred attention**: No gratuitous animations, badges, notifications, or visual noise.
- **Large typography**: 16px body minimum, 13px absolute floor.
- **No unnecessary borders**: Use spacing + subtle transparency shifts instead of hard lines.
- **Floaty equilibrium**: Panels feel weightless — soft shadows, rounded corners, gentle glass blur.
- **Proportional consistency**: The same layout proportions must hold across all desktop/tablet viewports.

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

> **Goal**: Text is always readable, always beautiful, and always fits its container — automatically and by user choice.

### 3a. Automatic Viewport-Proportional Scaling

The entire Hologram OS uses a **single CSS custom property** `--holo-scale` that controls all font sizes, padding, and spacing proportionally. This is computed from the viewport width so that a 1920px screen and a 1280px screen show the **same proportions** — just scaled.

#### Implementation: CSS `clamp()` + `--holo-scale`

```css
:root {
  /* Scale factor: 1.0 at 1920px, scales down proportionally to ~0.75 at 1024px */
  --holo-scale: clamp(0.75, calc(0.5 + 0.5 * (100vw - 1024px) / (1920 - 1024)), 1.25);

  /* All sizes derive from scale */
  --holo-text-xs:      calc(12px * var(--holo-scale));
  --holo-text-sm:      calc(13px * var(--holo-scale));
  --holo-text-base:    calc(16px * var(--holo-scale));
  --holo-text-lg:      calc(18px * var(--holo-scale));
  --holo-text-xl:      calc(22px * var(--holo-scale));
  --holo-text-2xl:     calc(28px * var(--holo-scale));
  --holo-text-display: calc(36px * var(--holo-scale));

  /* Spacing also scales proportionally */
  --holo-space-1: calc(4px * var(--holo-scale));
  --holo-space-2: calc(8px * var(--holo-scale));
  --holo-space-3: calc(12px * var(--holo-scale));
  --holo-space-4: calc(16px * var(--holo-scale));
  --holo-space-5: calc(20px * var(--holo-scale));
  --holo-space-6: calc(24px * var(--holo-scale));
  --holo-space-8: calc(32px * var(--holo-scale));
}
```

**Why this works**: By scaling *everything* (text, padding, gaps, icon sizes) by the same factor, containers never overflow. The layout proportions are identical on a 13" laptop and a 27" monitor — just uniformly larger or smaller.

#### Key constraint
- **Minimum floor**: `--holo-text-xs` never goes below 11px even at smallest viewports
- **Maximum cap**: `--holo-text-display` never exceeds 42px even on ultrawide

### 3b. User Text Size Preference

A simple 3-step control (Compact / Default / Large) that applies a **multiplier** on top of the automatic scale:

```css
:root {
  --holo-user-scale: 1;  /* Default */
}
[data-text-size="compact"] { --holo-user-scale: 0.9; }
[data-text-size="large"]   { --holo-user-scale: 1.15; }

/* Combined scale = viewport auto × user preference */
--holo-text-base: calc(16px * var(--holo-scale) * var(--holo-user-scale));
```

#### UX for the control
- Located in the OS settings area (gear icon or sidebar settings)
- Three radio buttons: **Compact** · **Default** · **Large**
- Applies instantly via `data-text-size` attribute on `<html>`
- Persisted to localStorage + synced to profile (Phase 4)
- Smooth 200ms transition on all text when switching

#### How containers stay stable
Because **both text and padding scale together**, a widget that fits at Default also fits at Large — the widget itself grows proportionally. The layout grid uses `fr` units or percentage-based widths, so panels fill the same *proportion* of screen regardless of text size.

### 3c. Text Reduction Audit

Every component must pass this test:
1. **Can this text be removed entirely?** If the meaning is clear without it, remove it.
2. **Can this text be shortened?** "No data available for this section" → "No data yet"
3. **Is this text a label that should be an attribute?** Move metadata out of view.

### 3d. Contrast & Readability Auto-Check

When `--holo-scale` drops below 0.85 (small screens):
- Increase `--hologram-text` lightness by 3% for better contrast
- Increase letter-spacing by 0.01em for small text legibility
- Body weight bumps from 400 → 450 (if DM Sans supports)

---

## 4. Viewport Proportional Layout System

> **Goal**: Same proportions on every desktop/tablet screen. No layout shift, no reflow.

### 4a. The Proportional Grid

All Hologram OS layout uses **viewport-relative units** scaled through `--holo-scale`:

```css
/* Panel widths as proportions of viewport */
.hologram-sidebar { width: calc(260px * var(--holo-scale)); }
.hologram-panel   { min-width: calc(320px * var(--holo-scale)); }

/* Widget grid gaps scale too */
.hologram-widget-grid {
  gap: var(--holo-space-4);
  grid-template-columns: repeat(auto-fill, minmax(calc(280px * var(--holo-scale)), 1fr));
}
```

### 4b. Breakpoint Strategy (Desktop + Tablet only)

| Viewport | --holo-scale | Behavior |
|----------|-------------|----------|
| ≥ 1920px | 1.0–1.25 | Full desktop, generous spacing |
| 1440px | ~0.92 | Slightly tighter, same proportions |
| 1280px | ~0.83 | Laptop default, still comfortable |
| 1024px | 0.75 | Tablet landscape, compact but proportional |
| < 1024px | — | **Out of scope** (mobile plan separate) |

### 4c. Panel Resize Behavior

When the viewport shrinks:
- Panels scale proportionally (not reflow)
- Text inside panels scales with `--holo-scale`
- No content wraps differently — same line breaks at every size
- Scrollable overflow only as last resort

---

## 5. Modular Panel System

### Panel Composition ("Snap-Together")
- Panels dock to edges of other panels (magnetic edges)
- Docked panels merge visually (shared border dissolves)
- Groups move as one unit
- Undocking re-separates with spring animation

### Profile-Synced Layouts (Phase 4)
```sql
CREATE TABLE desktop_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  desktop_id TEXT NOT NULL,
  widget_states JSONB NOT NULL,  -- includes text_size preference
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, desktop_id)
);
```
- Write-through: save locally + debounced cloud sync
- Load from cloud on login, fall back to localStorage
- `text_size` preference stored in user profile, applied globally

---

## 6. Implementation Phases

### Phase 1: Adaptive Typography & Proportional Scale
- [ ] Add `--holo-scale` CSS custom property with `clamp()` formula
- [ ] Define all `--holo-text-*` and `--holo-space-*` tokens
- [ ] Add `--holo-user-scale` with `data-text-size` attribute system
- [ ] Create `useTextSize` hook (read/write preference, persist to localStorage)
- [ ] Add Text Size control to OS settings (Compact / Default / Large)
- [ ] Migrate all Hologram components from `text-sm`/`text-xs` to `--holo-text-*` tokens
- [ ] Apply `--holo-space-*` to all widget padding/gaps
- [ ] Audit: ensure no text < 11px at any scale, no container overflow
- [ ] Add small-viewport contrast boost (lightness + letter-spacing)

### Phase 2: Design Token Overhaul
- [ ] Update index.css with HSL color tokens
- [ ] Update tailwind.config.ts to expose all tokens as utilities
- [ ] Remove unnecessary borders across all components
- [ ] Add `.hologram-glass` utility class
- [ ] Text reduction audit: remove or shorten all unnecessary copy

### Phase 3: Glass Panel Component
- [ ] Create `<GlassPanel>` base component with proportional sizing
- [ ] Integrate with useModularPanel + useDraggablePosition
- [ ] Magnetic edge snapping
- [ ] Dock/undock animations
- [ ] Panels use `--holo-scale` for all internal dimensions

### Phase 4: Profile-Synced Layouts
- [ ] Create `desktop_layouts` table with RLS
- [ ] Build `useCloudDesktopState` hook
- [ ] Sync text_size preference to profile
- [ ] Debounced write-through persistence
- [ ] Cross-device consistency (same proportions guaranteed)

### Phase 5: Desktop Frame Polish
- [ ] Audit every widget: remove unnecessary text/borders
- [ ] Ensure all content is self-explanatory
- [ ] Apply glass treatment to all panels
- [ ] Verify proportional scaling at 1024px, 1280px, 1440px, 1920px
- [ ] Screenshot comparison test across viewports

### Phase 6: Panel Composition
- [ ] Magnetic edge detection
- [ ] Visual merge animation
- [ ] Group drag behavior
- [ ] Persist dock relationships

---

## 7. Anti-Patterns (Never Do)

- ❌ Small text (< 11px at any viewport)
- ❌ Fixed pixel font sizes (use `--holo-text-*` tokens)
- ❌ Padding that doesn't scale with `--holo-scale`
- ❌ Hard 1px borders on panels
- ❌ Text that wraps differently at different viewports
- ❌ Neon / saturated accent colors
- ❌ Dense grids without breathing room
- ❌ Decorative elements without function
- ❌ Tooltips as primary labels
- ❌ Notification badges / attention-grabbing animations
- ❌ Cold gray — always use warm-shifted grays
- ❌ Engagement dark patterns (streaks, gamification, urgency)

---

## 8. Design Audit Checklist (per component)

- [ ] Uses `--holo-text-*` tokens (not raw px or tailwind text-*)
- [ ] Uses `--holo-space-*` tokens for padding/gaps
- [ ] Container doesn't overflow at `--holo-user-scale: 1.15` (Large)
- [ ] Container doesn't feel empty at `--holo-user-scale: 0.9` (Compact)
- [ ] Proportions identical at 1024px and 1920px viewports
- [ ] No unnecessary borders
- [ ] No unnecessary text (passed 3-step reduction audit)
- [ ] Self-explanatory labels
- [ ] Glass treatment where appropriate
- [ ] Warm earth tones only
- [ ] Smooth transitions (300–500ms)
- [ ] Accessible contrast ratios at all scales
