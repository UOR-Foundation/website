

# Align Visual Identity with Isaac Asimov's Foundation

## The Foundation Aesthetic

The Apple TV+ Foundation series is defined by a specific visual language: **deep midnight blue** backgrounds (never pure black), **gold/amber** as the primary accent (Hari Seldon's psychohistory equations, the living mural), and **purple/violet** as the secondary tone (imperial Trantor, the galactic empire). The cinematography uses rich, layered darks with warm mathematical glows cutting through vast space. It feels scholarly, imperial, and cosmic simultaneously.

Our current site uses teal as the primary accent and near-black backgrounds. The galaxy animation already echoes the Foundation's "living mural" title sequence beautifully. The SpaceX font and layout stay.

## Changes

### 1. Color Palette Shift
**File:** `src/index.css`

- `--background`: shift from `220 20% 4%` to a deep midnight navy `225 30% 5%` (not black, subtly blue)
- `--primary`: shift from teal `174 72% 46%` to Foundation gold `38 65% 55%` (warm amber-gold, like psychohistory equations)
- `--accent`: keep purple `270 50% 55%` (Trantor imperial violet)
- `--section-dark`: shift to `230 28% 4%` (deeper navy variant)
- `--card`: tint slightly navy `225 22% 7%`
- `--border`: tint navy `225 18% 13%`
- Update `--ring` to gold-ish

### 2. Galaxy Animation Colors
**File:** `src/modules/landing/components/galaxy.css`

- Shift the dot color spectrum from pure magenta-to-blue (`hsla(300..215)`) toward a **gold-to-purple** gradient: dots start at warm amber/gold (`hsla(38...)`) and transition through violet (`hsla(270...)`) to deep blue (`hsla(230...)`). This directly echoes the Foundation title sequence's living mural color language.

### 3. Glow and Divider Updates
**File:** `src/index.css`

- `.rule-accent` and `.rule-glow` gradients automatically pick up the new gold `--primary`
- `.btn-primary:hover` glows gold instead of teal
- `::selection` becomes a warm gold tint
- CTA section radial glow becomes gold-tinted

### 4. Section Label Color
All section label components already use `text-primary/70` which will automatically shift to gold. No component file changes needed.

### 5. Hologram Palette Alignment
**File:** `src/index.css`

- `--hologram-gold` stays gold (already aligned)
- `--hologram-purple-warm` stays purple (already aligned)
- These tokens were already Foundation-adjacent

## What Stays the Same
- SpaceX font (DM Sans), layout, and uppercase tracking
- Hero section structure and golden ratio positioning
- All content and copy
- Galaxy animation structure (just recoloring the dots)
- Component architecture (color changes flow through CSS variables)

## Files Modified
| File | Change |
|------|--------|
| `src/index.css` | Color tokens, glows, selection color |
| `src/modules/landing/components/galaxy.css` | Dot color spectrum gold-to-purple |

