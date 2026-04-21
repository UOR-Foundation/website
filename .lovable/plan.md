

# Rewrite the "Canonical Rust Crate" Release Post

## What This Does

Replace the current "Release" highlight card (which links externally to crates.io) with a proper, on-site article post that matches the format of `BlogPost1.tsx` exactly. Same layout, same typography, same back-link, same closing CTA — just the new content you supplied.

## The Three Changes

### 1. New page: `src/modules/community/pages/BlogCanonicalRustCrate.tsx`
A direct structural clone of `BlogPost1.tsx` with:
- **Back link** → "Back to Community" (`/research#blog`)
- **Meta row** → `April 2, 2026` · tag `Release` (using the same `accent` chip styling)
- **Title** → "uor-foundation v0.1.5 — Canonical Rust Crate"
- **Hero image** → `blog-uor-framework-launch.png` (the staircase image already used for this card — same one shown in the screenshot you uploaded)
- **Article body** organized into the sections from your draft, using the existing `prose-uor` styling, `<blockquote>` treatment, bulleted lists with primary dots, and `<h2>` section headers identical to BlogPost1:
  1. Lead paragraph ("We gave every digital object…")
  2. **Imagine this** (with the `tool_call.json` round-trip block rendered as a styled `<pre>` code block)
  3. **How UOR works**
  4. **How UOR is different** (bulleted list)
  5. **What can UOR enable?** (bulleted list — AI pipelines, data sharing, deepfakes, data lakes)
  6. **Why does UOR matter?**
  7. **Try it yourself in under 30 seconds** — describes the playground and links to `uor.foundation/try`; includes the `cargo add uor-foundation` snippet as a `<pre>` block
  8. Closing pull-quote ("A digital object's identity should travel with the object…")
  9. **Learn more** with three links (live playground, developer guide, open repository)
- **CTA footer** → identical to BlogPost1 (Discord button + "Back to Community")

The "Embedded Wasm Playground" you mention is referenced as a link out to `/try` rather than embedded inline — keeping this post tight and matching the read-then-act flow of the other posts. (If you want it actually embedded, say the word and I'll add an iframe slot; current site has no `/try` route yet so we'd be planning that surface too.)

### 2. Route registration: `src/App.tsx`
Add one line:
```tsx
const BlogCanonicalRustCrate = lazy(() => import("@/modules/community/pages/BlogCanonicalRustCrate"));
// …
<Route path="/blog/canonical-rust-crate" element={<BlogCanonicalRustCrate />} />
```

### 3. Re-point the highlight card: `src/data/highlights.ts`
Change the `href` of the Release card from the external crates.io URL to the new internal route, so clicking the card on the home page opens the article instead of leaving the site:
```ts
href: "/blog/canonical-rust-crate",
```
The card itself (image, title, date, tag) stays exactly as it is — matches the screenshot you uploaded.

## What I'm NOT Touching

- `BlogPost1.tsx` and the Semantic Web post — kept as the format reference
- `highlights.ts` other fields — title, date, tag, image stay identical
- The `HighlightsSection` grid component — already handles internal vs external `href` correctly
- The `src/custom-sw.ts` build errors shown in the build log — those are a pre-existing missing-dependency issue (workbox packages not installed) unrelated to this rewrite. Flag if you want them fixed in the same pass and I'll add a separate step to install `workbox-precaching`, `workbox-routing`, `workbox-strategies`, `workbox-expiration` and add the `__WB_MANIFEST` type declaration.

## Result

The home-page Release card (the one in your screenshot) opens an in-site article matching the visual rhythm of the other two community-highlight posts: same back link, same meta chip, same prose styling, same closing CTA — with your new copy as the body. Crisp, clear, and consistent.

