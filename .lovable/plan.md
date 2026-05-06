## Plan

Remove the "Key Concepts / Framework Layers" section from the `/framework` page.

### Changes
- `src/modules/core/pages/StandardPage.tsx`
  - Delete the `<section>` block (lines 116–169) that renders Key Concepts → Framework Layers cards.
  - Remove the now-unused `frameworkLayers` import.

No other pages reference this section, so no further cleanup needed.