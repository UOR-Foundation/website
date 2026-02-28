/**
 * InfoCard — Expandable card for structured information display.
 */

import { useState, type ReactNode } from "react";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";

export interface InfoCardProps {
  title: string;
  icon?: ReactNode;
  badge?: string;
  badgeColor?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  /** If true, card is always expanded (no toggle) */
  alwaysOpen?: boolean;
}

export function InfoCard({
  title, icon, badge, badgeColor, children, defaultOpen = false, alwaysOpen = false,
}: InfoCardProps) {
  const [open, setOpen] = useState(defaultOpen || alwaysOpen);

  return (
    <div className="bg-card rounded-xl overflow-hidden transition-shadow hover:shadow-sm">
      <button
        type="button"
        onClick={() => !alwaysOpen && setOpen(o => !o)}
        className={`w-full flex items-center text-left ${
          alwaysOpen ? "cursor-default" : "cursor-pointer hover:bg-secondary/20"
        } transition-colors`}
        style={{ gap: "var(--holo-space-3)", padding: "var(--holo-space-3) var(--holo-space-4)" }}
      >
        {icon && <span className="text-primary">{icon}</span>}
        <span className="font-semibold flex-1" style={{ fontSize: "var(--holo-text-sm)" }}>{title}</span>
        {badge && (
          <span
            className="rounded-full font-mono font-medium"
            style={{
              fontSize: "var(--holo-text-xs)",
              padding: "2px var(--holo-space-2)",
              background: badgeColor ? `${badgeColor}20` : "hsl(var(--primary) / 0.1)",
              color: badgeColor ?? "hsl(var(--primary))",
            }}
          >
            {badge}
          </span>
        )}
        {!alwaysOpen && (
          open
            ? <IconChevronDown size={14} className="text-muted-foreground" />
            : <IconChevronRight size={14} className="text-muted-foreground" />
        )}
      </button>
      {open && (
        <div style={{ padding: "0 var(--holo-space-4) var(--holo-space-4)", display: "flex", flexDirection: "column", gap: "var(--holo-space-3)" }}
          className="border-t border-border"
        >
          <div style={{ paddingTop: "var(--holo-space-3)" }}>{children}</div>
        </div>
      )}
    </div>
  );
}
