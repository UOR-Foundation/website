/**
 * Hologram UI — Tabler-Inspired Visual Projection Components
 * ═══════════════════════════════════════════════════════════
 *
 * The first "visual projection" in the UOR hologram system.
 * Every other projection maps hash → protocol string.
 * This module maps hash → perceivable React component tree.
 *
 * That IS what a hologram literally is: projecting abstract
 * data into a form that can be perceived and interacted with.
 *
 * Design philosophy:
 *   - Tabler's layout patterns + Tailwind's design system
 *   - No Bootstrap dependency — pure Tailwind semantic tokens
 *   - Every component accepts UOR data structures directly
 *   - @tabler/icons-react for the icon system (5000+ MIT icons)
 *
 * @module hologram-ui/components
 */

export { StatCard, type StatCardProps } from "./StatCard";
export { DataTable, type DataTableProps, type DataTableColumn } from "./DataTable";
export { MetricBar, type MetricBarProps } from "./MetricBar";
export { InfoCard, type InfoCardProps } from "./InfoCard";
export { DashboardGrid } from "./DashboardGrid";
export { PageShell, type PageShellProps } from "./PageShell";
