/**
 * DashboardGrid — Responsive grid layout for dashboard sections.
 */

import type { ReactNode } from "react";

interface DashboardGridProps {
  children: ReactNode;
  /** Number of columns at sm+ breakpoint (default: 3) */
  cols?: 2 | 3 | 4;
  className?: string;
}

const colClass = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export function DashboardGrid({ children, cols = 3, className = "" }: DashboardGridProps) {
  return (
    <div className={`grid grid-cols-1 ${colClass[cols]} ${className}`} style={{ gap: "var(--holo-space-3)" }}>
      {children}
    </div>
  );
}
