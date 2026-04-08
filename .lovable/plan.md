

## Cover Image for Address Profiles

Add a subtle, delightful cover image banner at the top of every address profile — like a social network cover photo. Ten pre-populated cover images are deterministically assigned based on the CID hash, so each address always gets the same cover.

### Approach

**1. Cover Images (10 abstract/geometric images)**
Generate 10 abstract gradient/geometric cover images using the Lovable AI image generation model. Store them in `src/assets/covers/` as `cover-0.png` through `cover-9.png`. These will be abstract, dark-toned visuals that complement the existing dark UI — think nebula gradients, geometric meshes, topographic lines, crystalline patterns.

**2. Deterministic Assignment**
Hash the CID string, take the last digit modulo 10 to pick which cover image each address gets. Same address always shows the same cover.

**3. Cover Banner Component**
Insert a full-width rounded cover image container (roughly 180px tall on desktop, 120px on mobile) immediately above the Profile Header section (~line 1397 in `ResolvePage.tsx`). The glyph avatar will overlap the bottom edge of the cover (negative margin), creating the classic social profile look.

**4. Future Editability**
Add a subtle camera/edit icon overlay on the cover that shows on hover — disabled for now but wired for future upload functionality.

### Layout Change

```text
┌─────────────────────────────────────────┐
│         COVER IMAGE (180px)             │
│         (abstract gradient/pattern)     │
│                                         │
│   ┌──────┐                              │
│   │ GLYPH│ ← overlaps bottom of cover  │
└───┴──────┴──────────────────────────────┘
    OWL · BOREAL · MILL
    CONCEPT badge · Discovered
```

### Files to Modify

- **`src/modules/oracle/pages/ResolvePage.tsx`** — Add cover image section before profile header, adjust avatar positioning with negative top margin to overlap the cover
- **New: `src/assets/covers/`** — 10 generated abstract cover images
- **New: `src/modules/oracle/components/ProfileCover.tsx`** — Small component that takes a CID, picks a cover, renders the banner with hover edit overlay

### Technical Details
- Images generated at ~1200x400px, compressed PNG
- Deterministic selection: `cid.charCodeAt(cid.length - 1) % 10`
- Rounded corners (`rounded-xl`) to match card aesthetic
- Subtle gradient overlay at bottom for smooth transition to profile content
- Avatar shifts up with `mt-[-36px]` to overlap the cover edge

