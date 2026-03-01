/**
 * Hologram UI — Component Barrel
 * ═══════════════════════════════
 *
 * Organized into architectural sub-directories:
 *
 *   shell/        — Core OS scaffolding (ProjectionShell, DesktopSurface, HologramFrame)
 *   projections/  — Functional application views (BrowserProjection, CodeProjection, etc.)
 *   panels/       — Content panels rendered inside projections (AppsPanel, HologramMessenger, etc.)
 *   widgets/      — Desktop-integrated tools (CoherenceWidget, DayProgressRing, etc.)
 *   overlays/     — Visual guides and vignettes (FocusVignette, SnapGuideOverlay, etc.)
 *   lumen/        — AI-centric interface (HologramAiChat, VoiceOrb, GlobalLumenOverlay)
 *
 * @module hologram-ui/components
 */

// ── Core UI Primitives (re-exported from core/ui) ──────────────────────────
export { StatCard, type StatCardProps } from "@/modules/core/ui/StatCard";
export { DataTable, type DataTableProps, type DataTableColumn } from "@/modules/core/ui/DataTable";
export { MetricBar, type MetricBarProps } from "@/modules/core/ui/MetricBar";
export { InfoCard, type InfoCardProps } from "@/modules/core/ui/InfoCard";
export { DashboardGrid } from "@/modules/core/ui/DashboardGrid";

// ── Shell (Core OS Scaffolding) ────────────────────────────────────────────
export { PageShell, type PageShellProps } from "./shell/PageShell";

// ── Projections (Phase 2 — Visual Hologram Renderers) ──────────────────────
export { DynamicProjection, MultiProjection } from "./projections/DynamicProjection";
export type { DynamicProjectionProps, MultiProjectionProps } from "./projections/DynamicProjection";

// ── Frame System (Composable Layer Architecture) ───────────────────────────
export { default as HologramFrame, HologramViewport, OverlayFrame, useHologramFrame, useDepthShift, frameRegistry, IDENTITY_TRANSFORM } from "./shell/HologramFrame";
export type { FrameLayer, FrameDescriptor, Transform3D } from "./shell/HologramFrame";
