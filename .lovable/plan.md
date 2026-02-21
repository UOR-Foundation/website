

# Codebase Cleanup — Dead Code Removal

## Summary

The project has accumulated a large number of unused UI components, an orphaned animation, a superseded edge function, and stale boilerplate. Removing these will cut roughly **40+ files**, eliminate **~10 unused npm dependencies**, and make the codebase significantly leaner.

---

## 1. Unused UI Components (40 files)

Only **4 UI components** are actually used by application code:

| Component | Used by |
|-----------|---------|
| `dialog` | `DonatePopup.tsx` |
| `toaster` + `toast` | `App.tsx`, `use-toast` hook |
| `sonner` | `App.tsx` |
| `tooltip` | `App.tsx` |

Every other file in `src/components/ui/` is dead code — either completely unreferenced, or only referenced by `sidebar.tsx` which is itself never used.

**Files to delete (40):**
accordion, alert-dialog, alert, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, drawer, dropdown-menu, form, hover-card, input-otp, input, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, switch, table, tabs, textarea, toggle-group, toggle

**Files to keep (5):**
`dialog.tsx`, `sonner.tsx`, `toast.tsx`, `toaster.tsx`, `tooltip.tsx`

**Note on `button.tsx`:** The button component is imported by several *other* unused UI components (carousel, sidebar, etc.) but is not used by any application code. It can be safely removed.

---

## 2. Duplicate Toast Re-export

`src/components/ui/use-toast.ts` is a one-line re-export of `src/hooks/use-toast.ts`. Nothing imports it. Delete it.

---

## 3. Unused Hook

`src/hooks/use-mobile.tsx` is only imported by `sidebar.tsx`, which is itself unused. Delete it.

---

## 4. Orphaned Animation

`src/components/animations/UORSpiralAnimation.tsx` is never imported anywhere. Delete it.

---

## 5. Stale Boilerplate

`src/App.css` is Vite's default boilerplate CSS. It is never imported by any file. Delete it.

---

## 6. Unused Static Asset

`public/placeholder.svg` is never referenced by any code. Delete it.

---

## 7. Superseded Edge Function

`supabase/functions/uor-verify/` is the old standalone verify endpoint. All its functionality has been consolidated into `uor-api`. It still has a config entry in `supabase/config.toml` (which is auto-managed, so we leave that alone). Delete the function directory.

---

## 8. Unused npm Dependencies to Remove

These packages are only used by the deleted UI components and serve no other purpose:

| Package | Only used by |
|---------|-------------|
| `embla-carousel-react` | carousel.tsx |
| `input-otp` | input-otp.tsx |
| `react-day-picker` | calendar.tsx |
| `react-resizable-panels` | resizable.tsx |
| `vaul` | drawer.tsx |
| `cmdk` | command.tsx |
| `recharts` | chart.tsx |
| `react-hook-form` | form.tsx |
| `@hookform/resolvers` | form.tsx |
| `zod` | form validation (unused) |

Several `@radix-ui` packages will also become removable, but since some are still needed (dialog, tooltip, toast) this requires checking each one individually. The following Radix packages can be removed:

`@radix-ui/react-accordion`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-aspect-ratio`, `@radix-ui/react-avatar`, `@radix-ui/react-checkbox`, `@radix-ui/react-collapsible`, `@radix-ui/react-context-menu`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-hover-card`, `@radix-ui/react-label`, `@radix-ui/react-menubar`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-popover`, `@radix-ui/react-progress`, `@radix-ui/react-radio-group`, `@radix-ui/react-scroll-area`, `@radix-ui/react-select`, `@radix-ui/react-separator`, `@radix-ui/react-slider`, `@radix-ui/react-switch`, `@radix-ui/react-tabs`, `@radix-ui/react-toggle`, `@radix-ui/react-toggle-group`

**Keep:** `@radix-ui/react-dialog`, `@radix-ui/react-toast`, `@radix-ui/react-tooltip`, `@radix-ui/react-slot`

---

## Execution Order

1. Delete the 40 unused UI component files
2. Delete `src/components/ui/use-toast.ts`
3. Delete `src/hooks/use-mobile.tsx`
4. Delete `src/components/animations/UORSpiralAnimation.tsx`
5. Delete `src/App.css`
6. Delete `public/placeholder.svg`
7. Delete `supabase/functions/uor-verify/index.ts`
8. Remove unused dependencies from `package.json`

---

## What is NOT Touched

- All page components (Index, About, Research, Projects, Standard, Donate, Blog posts, Api, NotFound)
- All layout components (Layout, Navbar, NavLink, Footer, DonatePopup, ScrollProgress)
- All section components (Hero, Intro, Pillars, Highlights, ProjectsShowcase, CTA, FrameworkLayers)
- Active animations (GalaxyAnimation, UORDiagram)
- Active edge functions (uor-api, project-submit)
- All public documentation files (llms.md, openapi.json, etc.)
- Auto-managed files (config.toml, .env, client.ts, types.ts)

