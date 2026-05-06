/**
 * Maps href → dynamic import factory for the matching route component.
 * Used by the Navbar to warm-up route chunks on hover/focus and on idle,
 * so route navigation feels instant on warm cache.
 */
const map: Record<string, () => Promise<unknown>> = {
  "/about": () => import("@/modules/core/pages/AboutPage"),
  "/framework": () => import("@/modules/core/pages/StandardPage"),
  "/community": () => import("@/modules/community/pages/ResearchPage"),
  "/projects": () => import("@/modules/projects/pages/ProjectsPage"),
};

const warmed = new Set<string>();

export function prefetchRoute(href: string) {
  const fn = map[href];
  if (!fn || warmed.has(href)) return;
  warmed.add(href);
  // Fire-and-forget; ignore failures (offline, etc.)
  fn().catch(() => warmed.delete(href));
}

/** Warm the most likely next routes during idle time. */
export function prefetchPrimaryRoutesOnIdle() {
  if (typeof window === "undefined") return;
  const run = () => Object.keys(map).forEach(prefetchRoute);
  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(run, { timeout: 2500 });
  } else {
    setTimeout(run, 1500);
  }
}