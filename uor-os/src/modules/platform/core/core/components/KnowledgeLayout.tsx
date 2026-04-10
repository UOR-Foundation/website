/**
 * KnowledgeLayout — Algebrica-inspired three-column layout.
 * Left: KnowledgeSidebar (fixed 260px)
 * Center: Main content (scrollable, optional prose measure)
 * Right: Optional contextual panel (collapsible)
 */

import { ReactNode } from "react";
import KnowledgeSidebar, {
  type BacklinkEntry,
  type TopNode,
} from "@/modules/data/knowledge-graph/components/KnowledgeSidebar";

interface KnowledgeLayoutProps {
  children: ReactNode;
  /** Right panel content — pass null to hide */
  rightPanel?: ReactNode;
  /** Current concept/page ID for sidebar trail highlight */
  currentId?: string;
  /** Backlinks for Discover section */
  backlinks?: BacklinkEntry[];
  /** Top nodes for Most Explored */
  topNodes?: TopNode[];
  /** Navigate handler from sidebar */
  onSidebarNavigate?: (id: string, path?: string) => void;
  /** Apply prose measure (680px max-width) to center content */
  proseMeasure?: boolean;
  /** Additional className for the outer container */
  className?: string;
}

export default function KnowledgeLayout({
  children,
  rightPanel,
  currentId,
  backlinks = [],
  topNodes = [],
  onSidebarNavigate,
  proseMeasure = false,
  className = "",
}: KnowledgeLayoutProps) {
  return (
    <div className={`fixed inset-0 flex bg-[hsl(220_15%_4%)] text-zinc-200 overflow-hidden ${className}`}>
      {/* Left sidebar */}
      <KnowledgeSidebar
        currentId={currentId}
        backlinks={backlinks}
        topNodes={topNodes}
        onNavigate={onSidebarNavigate}
      />

      {/* Center content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {proseMeasure ? (
            <div className="max-w-[680px] mx-auto px-6 py-6">{children}</div>
          ) : (
            children
          )}
        </div>
      </div>

      {/* Right panel */}
      {rightPanel && (
        <div className="w-[320px] shrink-0 border-l border-white/[0.06] overflow-y-auto">
          {rightPanel}
        </div>
      )}
    </div>
  );
}
