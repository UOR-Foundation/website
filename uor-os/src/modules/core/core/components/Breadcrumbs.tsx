/**
 * Breadcrumbs — Algebrica-style provenance breadcrumb trail.
 * Subtle 10px mono, zinc-500. Always traces back.
 */

import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  action?: () => void;
}

interface BreadcrumbsProps {
  path: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ path, className = "" }: BreadcrumbsProps) {
  return (
    <nav className={`flex items-center gap-1 text-[10px] font-mono text-zinc-500 ${className}`}>
      {path.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={8} className="text-zinc-700" />}
          {item.action ? (
            <button
              onClick={item.action}
              className="hover:text-zinc-300 transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-zinc-400">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
