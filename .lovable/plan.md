

# Performance Optimization: Crisp Loading and Navigation

## Problem

Every page in the app (26 routes) is eagerly imported in `App.tsx`. When a user visits the homepage, the browser downloads and parses JavaScript for the Dashboard, SPARQL Editor, Ring Explorer, Conformance page, and 20+ other pages they may never visit. This is the single largest drag on perceived speed.

Additionally, 12 font weight files are loaded synchronously via CSS `@import`, and both the UOR Module Registry and Content Registry run crypto computations (SHA-256 hashing for 26 modules + 22 content objects) synchronously during initial render.

## Solution: Three surgical changes, zero visual impact

### 1. Lazy-load all routes except the homepage

Convert 25 of the 26 route imports in `App.tsx` from eager to lazy using React's built-in `React.lazy()` + `Suspense`. The homepage (`IndexPage`) stays eagerly loaded so it renders instantly. Every other page loads its JavaScript only when the user navigates to it.

**Before (current):**
```typescript
import { DashboardPage } from "@/modules/dashboard";
import { RingExplorerPage } from "@/modules/ring-core";
// ... 23 more eager imports
```

**After:**
```typescript
import { IndexPage } from "@/modules/landing";  // eager — homepage

const DashboardPage = lazy(() => import("@/modules/dashboard/pages/DashboardPage"));
const RingExplorerPage = lazy(() => import("@/modules/ring-core/pages/RingExplorerPage"));
// ... 23 more lazy imports
```

All routes wrapped in a minimal `<Suspense>` with no visible fallback (zero layout shift):
```typescript
<Suspense fallback={null}>
  <Routes>
    <Route path="/" element={<IndexPage />} />
    <Route path="/dashboard" element={<DashboardPage />} />
    {/* ... */}
  </Routes>
</Suspense>
```

This means Vite code-splits each page into its own chunk. Initial bundle shrinks dramatically.

### 2. Trim font weight imports to only what is used

Currently loading 12 font files (6 Playfair Display weights + 6 DM Sans weights). The CSS only uses a subset. Removing unused weights eliminates unnecessary network requests.

**Remove from `src/index.css`:**
- `@fontsource/playfair-display/400-italic.css` (no italic headings in the design)
- `@fontsource/playfair-display/500-italic.css` (same)
- `@fontsource/dm-sans/300.css` (font-light not used anywhere)
- `@fontsource/dm-sans/400-italic.css` (no italic body text)

This removes 4 font file network requests from initial load.

### 3. Defer registry initialization off the critical path

The two registry init calls (`initializeRegistry` and `initializeContentRegistry`) run SHA-256 hashing for 48 objects during mount. Move them behind `requestIdleCallback` so the UI renders first, then certificates are computed when the browser is idle.

**Before:**
```typescript
useEffect(() => {
  initializeRegistry().catch(console.error);
  initializeContentRegistry().catch(console.error);
}, []);
```

**After:**
```typescript
useEffect(() => {
  const init = () => {
    initializeRegistry().catch(console.error);
    initializeContentRegistry().catch(console.error);
  };
  if ("requestIdleCallback" in window) {
    requestIdleCallback(init);
  } else {
    setTimeout(init, 100);
  }
}, []);
```

The certificates still compute. The verification badge still shows "26 modules verified." It just happens 50-200ms later, after the homepage is already painted.

---

## Files Modified

| File | Change |
|---|---|
| `src/App.tsx` | Lazy-load 25 routes, defer registry init, add Suspense |
| `src/index.css` | Remove 4 unused font weight imports |

## Files NOT Modified

Everything else. Zero visual changes. Zero UX changes. Zero API changes.

## Expected Impact

- **Initial JS bundle**: Roughly 60-70% smaller (only homepage + core shell loaded)
- **Font requests**: 4 fewer HTTP requests on initial load
- **First Contentful Paint**: Faster by the combined savings of deferred JS parsing + fewer fonts
- **Navigation**: Route transitions load their chunk on demand (Vite preloads on hover for `<Link>` elements, so transitions still feel instant)
- **Certificates**: Still computed, just 100-200ms later (invisible to user)

