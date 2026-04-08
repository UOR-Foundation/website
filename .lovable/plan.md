

## Fix: Remove Lens Toggles from Resolved Address Pages

### The Insight

You are correct. Each lens produces fundamentally different content (different text, different structure), which means each lens output hashes to a **different UOR address**. A lens toggle on a resolved address page is architecturally wrong — it mutates the content behind a supposedly immutable address.

The correct model: the lens is chosen at **generation time** (in the search bar or as a parameter), and the resulting content gets its own permanent address. Once you're viewing a resolved address, you're viewing one specific content object. The only valid toggle is **presentation format** (Human vs Machine vs Copy) — which changes how you *see* the same bytes, not the bytes themselves.

### What Changes

1. **Remove lens tabs from the Oracle/profile page** (`ContextualArticleView.tsx`)
   - Remove the entire lens switcher row (Encyclopedia, Magazine, Simple, Deep Dive, Story, Compute, etc.)
   - Remove the lens inspector button and the LensInspector panel
   - Keep only the content rendering — always use the lens that was active when the content was generated

2. **Remove lens tabs from the Reader toolbar** (`ReaderToolbar.tsx`)
   - Remove the "Lenses" label and the row of lens pill buttons at the bottom of the toolbar
   - The toolbar keeps: back, address/triword, copy, type badge, and the details toggle

3. **Keep the Human / Machine / Copy toggle** (already exists in the Oracle profile view at lines 2563-2574 of `ResolvePage.tsx`)
   - This is the correct abstraction: same content, different presentation format

4. **Move lens selection to the search/generation phase** (no code change needed now)
   - `handleLensChange` currently re-streams content — this will be removed
   - The `activeLens` will be set once at search time (defaulting to "encyclopedia") and locked thereafter
   - Future: the search bar could offer a lens picker *before* generating

5. **Clean up related state** in `ResolvePage.tsx`
   - Remove `handleLensChange` callback and stop passing it to child components
   - `activeLens` stays as internal state for the initial generation, but is no longer changeable post-resolve
   - Remove coherence engine's `recordLensSwitch` calls

### Files Affected

| File | Change |
|------|--------|
| `ReaderToolbar.tsx` | Remove lens pill row (~lines 456-510) |
| `ContextualArticleView.tsx` | Remove lens switcher (~lines 137-189), inspector panel, related props |
| `HumanContentView.tsx` | Remove `activeLens` / `onLensChange` prop forwarding |
| `ResolvePage.tsx` | Remove `handleLensChange`, stop passing `onLensChange` to children |

### What This Preserves

- The lens system itself (blueprints, renderers) — still used during generation
- The Human/Machine/Copy presentation toggle on the profile page
- The `activeLens` state for controlling which renderer displays the already-generated content
- All existing address computation and identity logic

