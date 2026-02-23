/**
 * Developers module barrel export — public API only.
 */

// Pages
export { default as DevelopersPage } from "./pages/DevelopersPage";

// Data (for content registry certification)
export { docCategories, docPillars, overviewCategories } from "./data/doc-categories";
export type { DocCategory, DocPillar } from "./data/doc-categories";
export { devNavSections } from "./data/nav-sections";
export type { DocNavSection, DocNavItem } from "./data/nav-sections";
