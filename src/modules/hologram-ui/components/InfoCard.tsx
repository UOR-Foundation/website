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
    <div className="bg-card border border-border rounded-xl overflow-hidden transition-shadow hover:shadow-sm">
      <button
        type="button"
        onClick={() => !alwaysOpen && setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left ${
          alwaysOpen ? "cursor-default" : "cursor-pointer hover:bg-secondary/20"
        } transition-colors`}
      >
        {icon && <span className="text-primary">{icon}</span>}
        <span className="font-semibold text-sm flex-1">{title}</span>
        {badge && (
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium"
            style={{
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
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {children}
        </div>
      )}
    </div>
  );
}
