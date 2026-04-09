

## Plan: Lens Manager — Browse, Create, Edit, and Delete Lenses

### Overview
Add a "Lens Manager" panel accessible from the lens bar in the ReaderToolbar. It shows all lenses (preset + custom) in a clean list, lets users inspect/edit any lens, create new ones from scratch, rename them, and delete custom lenses. Preset lenses can be cloned but not deleted.

### Changes

**1. New component: `LensManager.tsx`**
- File: `src/modules/oracle/components/LensManager.tsx`
- A slide-over panel (similar style to LensInspector) triggered by a small "Manage" button in the lens bar
- Layout:
  - **Header**: "Lens Manager" title with a "New Lens" button
  - **Lens list**: Each lens shows icon, name (editable for custom), description, tone/depth/audience summary, and action buttons:
    - **Inspect/Edit** — opens `LensInspector` for that lens
    - **Clone** — duplicates a preset as a new custom lens
    - **Delete** — removes custom lenses (with confirmation); disabled for presets
    - **Apply** — selects this lens for the current article
  - **New Lens flow**: Creates a blank custom lens with default params, opens it in the inspector immediately
- Data: reads `PRESET_BLUEPRINTS` + `loadCustomLenses()`, writes via `saveCustomLens()` / `deleteCustomLens()`
- Supports renaming custom lenses inline (click-to-edit on the name)

**2. Update `ReaderToolbar.tsx`**
- Add a small gear/settings button at the end of the lens bar row labeled "Manage" (or just a `Settings2` icon)
- Clicking it opens the `LensManager` panel
- Also show custom lenses alongside presets in the lens bar (load from `loadCustomLenses()`)
- Pass the `onLensChange` callback through so applying a lens from the manager switches the active lens

**3. Update `LensInspector.tsx`**
- Add an optional `onDelete` callback prop — when provided, shows a "Delete Lens" button in the footer (only for non-preset lenses)
- Add an optional `onRename` prop — when provided, makes the header label editable (click-to-edit text field)

### Files Modified
- `src/modules/oracle/components/LensManager.tsx` — new file
- `src/modules/oracle/components/ReaderToolbar.tsx` — add Manage button + show custom lenses in bar
- `src/modules/oracle/components/LensInspector.tsx` — add delete/rename support

