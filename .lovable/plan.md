

# About Page Streamlining

## What changes
One file: `src/modules/core/pages/AboutPage.tsx`

The About page already has good content and structure. The refinements bring it into tighter alignment with the Docs, Community, and Projects pages:

### 1. Hero (minor copy tightening)
- Subtitle becomes: "A 501(c)(3) nonprofit maintaining the UOR specification and the projects built on it."
- Add two hero buttons matching other pages: "Governance on GitHub" and "Make a Donation" (opens donate popup)

### 2. Merge "What We Do" and "Our Principles" into one section
- These two 3-card grids feel redundant as separate sections. Combine into a single "What We Do" section with the three activity cards only.
- Move the three principles (Transparency, Interoperability, Trust) into a compact inline row below the cards, similar to how Projects shows the maturity model: colored dot + title + one-line description. No full card treatment. This reduces visual weight while keeping the content.

### 3. Governance Board (keep as-is)
- The board cards with photos are already clean and match the design system. No changes needed.

### 4. Resources (keep as-is)
- The 2-column link list is already compact and scannable. No changes.

### 5. Support the Foundation (keep as-is)
- Donate button and copy are already clean. No changes.

### 6. Remove redundant icons
- "Our Principles" cards all use the same Shield icon, which adds no information. The new inline treatment removes icons entirely for principles.

## Summary of visual flow
Hero → What We Do (3 cards + 3 inline principles) → Governance Board → Resources → Support

This reduces the page from 5 distinct content sections to 4, matching the tighter rhythm of Community and Projects.

