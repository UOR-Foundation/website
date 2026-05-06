# Performance & Responsiveness Pass

Goal: make every navigation feel instant and every scroll feel buttery, on both desktop and mobile, without changing the look of the site.

We already did a hero tune-up. This pass applies the same discipline across the whole app: smaller initial JS, faster route changes, fewer paints, no jank during scroll.

---

## 1. Faster route transitions

**Problem:** every menu click loads a fresh chunk + waits for `Suspense fallback={null}` (blank screen). Pages also reset scroll synchronously and remount the entire `Layout`.

**Changes**
- Add a tiny route-level transition: subtle fade so navigation never feels "blank".
- Hoist `Layout` (Navbar + Footer + ScrollProgress) **above** `<Routes>` so the chrome doesn't unmount/remount on every navigation. Each page just renders its own `<main>` content. Big perceived-speed win.
- Prefetch lazy route chunks on hover/focus of nav links and on `requestIdleCallback` after first paint. Clicks then resolve from memory.
- Replace `useEffect(scrollTo)` with the router's built-in pattern (a small `ScrollToTop` that runs after paint via `requestAnimationFrame`) so it doesn't block the new page's first paint.

## 2. Hero / landing — finish what we started

- Mount `PrimeGrid` only after the hero is interactive (idle callback) and **pause its RAF loop** when the hero scrolls out of view (IntersectionObserver — same pattern we used on the galaxy).
- Disable `PrimeConstellationBg` whenever `prefers-reduced-motion` is set, the tab is hidden, or the device reports `navigator.hardwareConcurrency <= 4` / `deviceMemory <= 4`.
- Drop the desktop dot count slightly more (MAX_N from 4000 → 2500) — visually identical, ~40% fewer arcs per frame.
- Cap canvas DPR to 1 on any device with `deviceMemory <= 4`.

## 3. Smaller initial JS bundle

- Audit `src/App.tsx` providers: `PrivyWalletProvider`, `AuthPromptProvider`, `sovereignBoot`, bus modules. Defer anything not needed for the landing route until after first paint (already partially done — extend it).
- Code-split `lucide-react` icon imports that pull large icon graphs on the homepage into per-icon imports (already mostly OK; verify Navbar / Footer).
- Lazy-load `IndexPage` too (today it's eager). The landing route is the most common entry but we can still ship the shell HTML faster by deferring secondary sections — already done with `LazySection`, but the main hero JS can be split from below-the-fold sections.

## 4. Image & font hygiene

- Convert `uor-icon-new.png` (and any other PNG > 20 KB used above the fold) to AVIF/WebP with PNG fallback. Add explicit `width`/`height` to every `<img>` to prevent CLS.
- Add `loading="lazy"` and `decoding="async"` to all below-the-fold images (only the logo and hero stay eager).
- Self-hosted fonts: ensure `font-display: swap` and preload only the **one** display weight used above the fold.

## 5. Scroll & paint discipline

- `ScrollProgress` and Navbar scroll listeners: confirm both are `passive: true` and rAF-throttled (Navbar already is; verify ScrollProgress).
- Replace any `backdrop-blur-2xl` on always-visible surfaces with `backdrop-blur-md` on mobile (huge GPU cost on low-end Android). The Navbar already conditions blur on `scrolled`; extend that pattern to any other sticky surface.
- Remove `will-change` from elements that aren't actively animating.

## 6. Data / network

- Confirm React Query defaults (already good: `staleTime 5min`, `refetchOnWindowFocus: false`).
- Add `<link rel="preconnect">` for Supabase URL and any other origin used on first paint.

## 7. Verification

After changes, measure with the in-browser performance profiler:
- Hero: scripting time per second while idle on `/` (target: < 30 ms/s desktop, < 60 ms/s mobile).
- Route change `/` → `/framework`: time to first paint of new route (target: < 150 ms after click on warm cache).
- Lighthouse mobile Performance score on `/` (target: ≥ 90).

---

## Technical notes

- Hoisting `Layout`: `<Route element={<Layout/>}>` wrapping nested routes that render `<Outlet/>`. Page components stop importing `Layout` themselves.
- Prefetching: a small `usePrefetchOnHover(factory)` hook that calls the same `() => import(...)` factories already declared in `App.tsx`. Wire into `Navbar` `<Link>`s.
- Device-class gating: a `useDeviceClass()` hook returning `"low" | "mid" | "high"` from `hardwareConcurrency`, `deviceMemory`, `matchMedia("(prefers-reduced-motion)")`. Animations consult it.
- No design changes. No copy changes. No backend changes.

## Out of scope

- Refactoring the 2,895-line `ResolvePage` and other heavy inner pages — that's a separate cleanup; lazy-loading already isolates them from the homepage.
- Changing the visual style of the hero, navbar, or any section.
