/**
 * Developers module barrel export — public API only.
 *
 * This module is designed for future extraction into a standalone
 * repository at developers.uor.foundation. All data, components,
 * and pages are self-contained with no cross-module dependencies
 * beyond the core layout shell.
 *
 * Connection endpoints:
 *   IN  → core/Layout (page shell)
 *   OUT → /developers (route mount)
 *   DATA → doc-categories, nav-sections (serializable, certifiable)
 */

// Pages
export { default as DevelopersPage } from "./pages/DevelopersPage";

// Data (for content registry certification)
export { docCategories } from "./data/doc-categories";
export type { DocCategory } from "./data/doc-categories";
export { devNavSections } from "./data/nav-sections";
export type { DocNavSection, DocNavItem } from "./data/nav-sections";
