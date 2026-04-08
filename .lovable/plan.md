

# Result Page Overhaul — Golden Ratio Layout, Readability & Chain Toggle

## What Changes

### 1. Header Bar — Bigger, Bolder
- Increase header height from `h-14` to `h-16`
- Back arrow: `w-5 h-5` (from `w-4 h-4`)
- Search icon: `w-4 h-4` (from `w-3.5 h-3.5`)
- Header input text: `text-base` (from `text-sm`)

### 2. "Continue Chain in Oracle" Button — Move to Top
- Move the CTA button from below the metadata to directly after the ADDRESS title block (before IPv6/CID)
- Make it more prominent: larger padding, bolder text, stronger gradient

### 3. Unified Font Size — `text-base` Everywhere
All non-title text standardized to `text-base` (16px):
- Labels ("ADDRESS", "IPv6", "CID", "CHAIN OF PROOFS", "LINK 1", etc.): `text-xs` uppercase (keep smaller for labels only)
- IPv6 value, CID value, engine status, link Q/A text, verify button: all `text-base`
- Copy button label text: `text-xs` → `text-sm`

### 4. Contrast Fix for Dark Background
- IPv6 value: `text-primary/70` → `text-primary` (full primary color)
- CID value: `text-muted-foreground/30` → `text-foreground/60`
- CID label: `text-muted-foreground/30` → `text-muted-foreground/50`
- Engine status: `text-muted-foreground/30` → `text-foreground/50`
- "Verify determinism" button: `text-muted-foreground/30` → `text-foreground/50`
- Chain link headers, Q/A text: increase opacity across the board
- Copy buttons: `text-muted-foreground/25` → `text-muted-foreground/40`

### 5. Rename "Verify determinism" → "Verify Integrity"
Clearer, more intuitive label for what the button does.

### 6. Golden Ratio Layout for Result Content
- Result container padding-top: `py-8` → use `pt-[calc(100vh*0.09)]` (φ-derived top margin)
- Address title: `text-2xl md:text-3xl` → `text-3xl md:text-4xl`
- Space between address block and CTA: `gap` using `calc(2rem * 1.618)`
- Space between CTA and chain section: `calc(2rem * 1.618)`
- Content max-width stays `max-w-3xl` but inner padding increases to `px-6 md:px-8`

### 7. Chain of Proofs — Raw/Readable Toggle
Add a toggle at the top of the Chain of Proofs section:
- Two-state toggle: **"Readable"** (current card view) | **"Raw"** (JSON code view)
- Default: Readable
- New state: `chainViewMode: "readable" | "raw"`
- Raw view: renders `JSON.stringify(result.source, null, 2)` in a `<pre>` block with syntax-appropriate styling
- Toggle is a small pill group next to the "CHAIN OF PROOFS" header

### Technical Details

**Single file changed:** `src/modules/oracle/pages/ResolvePage.tsx`

- Add state: `const [chainViewMode, setChainViewMode] = useState<"readable" | "raw">("readable")`
- Reorder JSX: move the Oracle CTA button block above the IPv6/CID metadata
- Update all font sizes and opacity values as listed above
- Add conditional rendering in the Chain of Proofs section based on `chainViewMode`
- The raw view reuses the existing `<pre>` styling from the standard content block

