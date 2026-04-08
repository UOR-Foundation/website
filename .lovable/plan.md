

## Enhance Profile Search Bar — Google-Style Header

### What Changes

**File: `src/modules/oracle/pages/ResolvePage.tsx`** (lines ~948-974)

Redesign the profile-state header bar from a minimal thin strip to a more pronounced, Google-style search header:

1. **Left: UOR logo** — Import and display `uor-hexagon.png` (already imported) as a small clickable logo (~28px) that navigates back to search home
2. **Center: Pronounced search bar** — Make the input more visible against the dark background:
   - Increase background opacity (`bg-muted/20` → `bg-white/8` or similar)
   - Add a more visible border (`border-white/15`)
   - Slightly larger padding and font size
   - Wider max-width (from `max-w-4xl` to `max-w-2xl` centered, like Google's proportions)
   - Keep the rounded-full pill shape
3. **Right: Profile/identity avatar** — Add a small circular icon button (~32px) with a subtle user silhouette or shield icon, representing "sovereign identity access." Purely visual for now (no wiring), styled like Google's profile circle with a gradient or initial letter placeholder

### Layout Structure
```text
┌─────────────────────────────────────────────────────┐
│ [UOR logo]    [═══ search input ═══  🔍]    [👤]   │
└─────────────────────────────────────────────────────┘
```

- Header height increases slightly (h-16 → h-14 with more padding, ~py-3)
- Logo on the far left, profile icon on the far right, search centered between them
- Use `justify-between` with three sections: left logo, center input, right profile icon

### No other files modified. No backend changes.

