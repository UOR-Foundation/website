/**
 * Hologram UI — Module Barrel
 * ════════════════════════════
 *
 * The visual projection layer of the UOR hologram.
 * Maps abstract UOR data → perceivable React components.
 *
 * @module hologram-ui
 */

export {
  StatCard, DataTable, MetricBar, InfoCard, DashboardGrid, PageShell,
  DynamicProjection, MultiProjection,
  type StatCardProps, type DataTableProps, type DataTableColumn,
  type MetricBarProps, type InfoCardProps, type PageShellProps,
  type DynamicProjectionProps, type MultiProjectionProps,
} from "./components";

// ── UI Projection Registry ─────────────────────────────────────────────────
export {
  resolveUIProjection,
  resolveAllUIProjections,
  UI_PROJECTIONS,
  type UIComponentType,
  type UIProjectionSpec,
  type UIProjectionResult,
  type PropSchema,
} from "./projection-registry";

// ── Context Projection Engine ──────────────────────────────────────────────
export {
  projectProfile,
  fetchAndProject,
  recordInterest,
  recordTask,
  recordDomainVisit,
  recordInteraction,
  CONTEXT_PREDICATES,
} from "./engine/contextProjection";

export { useContextProjection, type ContextProjectionHandle } from "./hooks/useContextProjection";
