/**
 * DynamicProjection — The Universal Visual Projection Renderer
 * ═════════════════════════════════════════════════════════════
 *
 * This component IS the holographic principle made visible.
 *
 * Given a UIProjectionResult (component type + resolved props),
 * it renders the corresponding React component. This completes
 * the projection pipeline:
 *
 *   Hash Bytes → UIProjectionResult → React Component Tree
 *
 * The same identity, projected through different component types,
 * produces different visual representations — just as the same
 * SHA-256 hash projected through "did" and "activitypub" produces
 * different protocol strings.
 *
 * Usage:
 *   import { resolveUIProjection } from "../projection-registry";
 *   import { DynamicProjection } from "./DynamicProjection";
 *
 *   const result = resolveUIProjection(identity, "ui:stat-card");
 *   <DynamicProjection projection={result} />
 *
 * Or with the shorthand:
 *   <DynamicProjection source={identity} type="ui:stat-card" />
 *
 * @module hologram-ui/components/DynamicProjection
 */

import { useMemo, type ReactNode } from "react";
import type { ProjectionInput } from "@/modules/uns/core/hologram/index";
import {
  resolveUIProjection,
  type UIComponentType,
  type UIProjectionResult,
} from "../projection-registry";
import { StatCard, type StatCardProps } from "./StatCard";
import { DataTable, type DataTableProps } from "./DataTable";
import { MetricBar, type MetricBarProps } from "./MetricBar";
import { InfoCard, type InfoCardProps } from "./InfoCard";
import { DashboardGrid } from "./DashboardGrid";
import { PageShell, type PageShellProps } from "./PageShell";

// ── Props ───────────────────────────────────────────────────────────────────

export interface DynamicProjectionProps {
  /** Pre-resolved projection result. */
  projection?: UIProjectionResult;
  /** Shorthand: source identity (requires `type`). */
  source?: ProjectionInput;
  /** Shorthand: component type (requires `source`). */
  type?: UIComponentType;
  /** Additional prop overrides. */
  overrides?: Record<string, unknown>;
  /** Children for container components (InfoCard, PageShell, DashboardGrid). */
  children?: ReactNode;
  /** Optional className wrapper. */
  className?: string;
}

// ── Component Map ──────────────────────────────────────────────────────────

/**
 * Maps each UIComponentType to its React renderer.
 * Each renderer is a pure function: props → ReactNode.
 */
const RENDERERS: Record<
  UIComponentType,
  (props: Record<string, unknown>, children?: ReactNode) => ReactNode
> = {
  "ui:stat-card": (props) => (
    <StatCard {...(props as unknown as StatCardProps)} />
  ),

  "ui:data-table": (props) => {
    const { columns, data, getKey, ...rest } = props as Record<string, unknown>;
    return (
      <DataTable
        columns={(columns as DataTableProps<Record<string, unknown>>["columns"]) ?? []}
        data={(data as Record<string, unknown>[]) ?? []}
        getKey={
          typeof getKey === "function"
            ? (getKey as (row: Record<string, unknown>) => string)
            : (row: Record<string, unknown>) => String(row.id ?? row.field ?? Math.random())
        }
        {...rest}
      />
    );
  },

  "ui:metric-bar": (props) => (
    <MetricBar {...(props as unknown as MetricBarProps)} />
  ),

  "ui:info-card": (props, children) => (
    <InfoCard {...(props as unknown as Omit<InfoCardProps, "children">)}>
      {children ?? (props.children as ReactNode) ?? (
        <div className="text-xs text-muted-foreground font-mono">
          {(props as Record<string, unknown>).source
            ? `Source: ${((props as Record<string, unknown>).source as ProjectionInput)?.cid?.slice(0, 32)}…`
            : "No content provided"}
        </div>
      )}
    </InfoCard>
  ),

  "ui:page-shell": (props, children) => (
    <PageShell {...(props as unknown as Omit<PageShellProps, "children">)}>
      {children ?? (props.children as ReactNode) ?? (
        <div className="text-sm text-muted-foreground">Empty shell</div>
      )}
    </PageShell>
  ),

  "ui:dashboard-grid": (props, children) => (
    <DashboardGrid cols={(props.cols as 2 | 3 | 4) ?? 3} className={props.className as string}>
      {children ?? (props.children as ReactNode) ?? null}
    </DashboardGrid>
  ),
};

// ── Component ──────────────────────────────────────────────────────────────

/**
 * DynamicProjection — renders any UI projection result.
 *
 * Accepts either a pre-resolved UIProjectionResult or a (source, type)
 * pair for inline resolution. The component is deterministic: same
 * identity + same type = same visual output.
 */
export function DynamicProjection({
  projection,
  source,
  type,
  overrides,
  children,
  className,
}: DynamicProjectionProps) {
  // Resolve the projection
  const resolved = useMemo(() => {
    if (projection) {
      // Apply overrides to pre-resolved projection
      if (overrides) {
        return {
          ...projection,
          props: { ...projection.props, ...overrides },
        };
      }
      return projection;
    }
    if (source && type) {
      return resolveUIProjection(source, type, overrides);
    }
    return null;
  }, [projection, source, type, overrides]);

  if (!resolved) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-xs text-destructive">
        DynamicProjection: provide either `projection` or both `source` + `type`.
      </div>
    );
  }

  const renderer = RENDERERS[resolved.type];
  if (!renderer) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-xs text-destructive">
        Unknown UI projection type: {resolved.type}
      </div>
    );
  }

  return (
    <div className={className} data-projection-type={resolved.type}>
      {renderer(resolved.props, children)}
    </div>
  );
}

// ── Multi-Projection Renderer ──────────────────────────────────────────────

export interface MultiProjectionProps {
  /** The canonical identity to project. */
  source: ProjectionInput;
  /** Which component types to render (defaults to all). */
  types?: UIComponentType[];
  /** Layout: grid or list. */
  layout?: "grid" | "list";
  /** Grid column count (for grid layout). */
  cols?: 2 | 3 | 4;
  /** Optional className. */
  className?: string;
}

/**
 * MultiProjection — renders multiple visual projections of the same identity.
 *
 * This is the visual equivalent of the full hologram: one identity,
 * projected through every registered visual standard simultaneously.
 */
export function MultiProjection({
  source,
  types,
  layout = "grid",
  cols = 3,
  className,
}: MultiProjectionProps) {
  const componentTypes = types ?? ([
    "ui:stat-card",
    "ui:metric-bar",
    "ui:info-card",
  ] as UIComponentType[]);

  const projections = useMemo(
    () => componentTypes.map((t) => resolveUIProjection(source, t)),
    [source, componentTypes],
  );

  if (layout === "list") {
    return (
      <div className={`space-y-3 ${className ?? ""}`}>
        {projections.map((p) => (
          <DynamicProjection key={p.type} projection={p} />
        ))}
      </div>
    );
  }

  return (
    <DashboardGrid cols={cols} className={className}>
      {projections.map((p) => (
        <DynamicProjection key={p.type} projection={p} />
      ))}
    </DashboardGrid>
  );
}
