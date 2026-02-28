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

---

## 2. Design System Tokens

### Typography
| Role | Font | Size | Weight |
|------|------|------|--------|
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

## 3. Modular Panel System

### Panel Composition ("Snap-Together")
- Panels dock to edges of other panels (magnetic edges)
- Docked panels merge visually (shared border dissolves)
- Groups move as one unit
- Undocking re-separates with spring animation

### Profile-Synced Layouts (Phase 2)
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
- Write-through: save locally + debounced cloud sync
- Load from cloud on login, fall back to localStorage

---

## 4. Implementation Phases

### Phase 1: Design Token Overhaul
- [ ] Update index.css with HSL token variables
- [ ] Update tailwind.config.ts to expose tokens
- [ ] Increase base font sizes (16px body, 13px floor)
- [ ] Remove unnecessary borders across all components
- [ ] Add .hologram-glass utility class

### Phase 2: Glass Panel Component
- [ ] Create `<GlassPanel>` base component
- [ ] Integrate with useModularPanel + useDraggablePosition
- [ ] Magnetic edge snapping
- [ ] Dock/undock animations

### Phase 3: Desktop Frame Polish
- [ ] Audit every widget: remove unnecessary text/borders
- [ ] Ensure all content is self-explanatory
- [ ] Apply glass treatment to all panels
- [ ] Verify minimum 13px font size everywhere

### Phase 4: Profile-Synced Layouts
- [ ] Create desktop_layouts table with RLS
- [ ] Build useCloudDesktopState hook
- [ ] Debounced write-through persistence
- [ ] Cross-device consistency

### Phase 5: Panel Composition
- [ ] Magnetic edge detection
- [ ] Visual merge animation
- [ ] Group drag behavior
- [ ] Persist dock relationships

---

## 5. Anti-Patterns (Never Do)

- ❌ Small text (< 13px)
- ❌ Hard 1px borders on panels
- ❌ Neon / saturated accent colors
- ❌ Dense grids without breathing room
- ❌ Decorative elements without function
- ❌ Tooltips as primary labels
- ❌ Notification badges / attention-grabbing animations
- ❌ Cold gray — always use warm-shifted grays
- ❌ Engagement dark patterns (streaks, gamification, urgency)

---

## 6. Design Audit Checklist (per component)

- [ ] Font size ≥ 13px everywhere
- [ ] No unnecessary borders
- [ ] No unnecessary text
- [ ] Self-explanatory labels
- [ ] Glass treatment where appropriate
- [ ] Generous padding (min p-4, prefer p-5+)
- [ ] Warm earth tones only
- [ ] Smooth transitions (300–500ms)
- [ ] Accessible contrast ratios
