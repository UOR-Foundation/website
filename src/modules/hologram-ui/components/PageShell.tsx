/**
 * PageShell — Tabler-inspired page layout with sticky header and breadcrumb.
 */

import { Link } from "react-router-dom";
import { IconArrowLeft } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { CoherenceWidget } from "./CoherenceWidget";

export interface PageShellProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  backTo?: string;
  actions?: ReactNode;
  badge?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}

export function PageShell({
  title, subtitle, icon, backTo = "/", actions, badge, headerRight, children,
}: PageShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky header bar — fades with focus */}
      <header
        className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm transition-all duration-700"
        style={{
          opacity: "var(--focus-chrome-opacity, 1)",
          filter: "blur(var(--focus-blur-chrome, 0px))",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link
            to={backTo}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <IconArrowLeft size={16} />
          </Link>
          {icon && <span className="text-primary">{icon}</span>}
          <h1 className="text-sm font-semibold tracking-tight">{title}</h1>
          {badge && (
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-mono font-medium">
              {badge}
            </span>
          )}
          <div className="ml-auto flex items-center gap-3">
            <CoherenceWidget />
            {headerRight}
            {actions && <>{actions}</>}
            {!actions && !headerRight && subtitle && (
              <span className="text-[10px] font-mono text-muted-foreground hidden sm:block">
                {subtitle}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Content — scales and boosts contrast with focus */}
      <main
        className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 transition-all duration-700 origin-top"
        style={{
          transform: "scale(var(--focus-content-scale, 1))",
          filter: `contrast(var(--focus-contrast, 1)) saturate(var(--focus-saturation, 1))`,
        }}
      >
        {children}
      </main>
    </div>
  );
}
