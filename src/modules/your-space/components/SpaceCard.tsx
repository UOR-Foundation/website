/**
 * SpaceCard — Reusable card wrapper for Your Space dashboard
 *
 * Features:
 * - Move grip icon (top-right) for drag reordering
 * - Edit button to toggle inline edit panel
 * - Click-to-expand: clicking the card body opens an expanded detail view
 * - "Coming Soon" overlay for modules not yet available, with upvote
 * - UOR framework alignment: each card maps to a UOR module
 *
 * UOR mapping: Every card has a `moduleSlug` linking it to a registered
 * UOR module, ensuring dashboard composition is itself content-addressable.
 */

import { useState, type ReactNode } from "react";
import {
  GripVertical, Pencil, X, ChevronDown, ChevronUp,
  ThumbsUp, Lock,
} from "lucide-react";

export type CardStatus = "active" | "coming-soon";

interface SpaceCardProps {
  title: string;
  icon: ReactNode;
  isDark: boolean;
  status?: CardStatus;
  moduleSlug?: string;         // UOR module slug this card represents
  uorDescription?: string;     // How UOR enables this capability
  children: ReactNode;
  editPanel?: ReactNode;       // Content shown in edit mode
  expandedContent?: ReactNode; // Content shown when expanded
  className?: string;
  votes?: number;              // Current upvote count for coming-soon
  onVote?: () => void;
}

export const SpaceCard = ({
  title,
  icon,
  isDark,
  status = "active",
  moduleSlug,
  uorDescription,
  children,
  editPanel,
  expandedContent,
  className = "",
  votes = 0,
  onVote,
}: SpaceCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const card = isDark
    ? "bg-gradient-to-br from-gray-900/40 to-gray-800/40 border-gray-700/50"
    : "bg-white border-gray-200 shadow-sm";
  const text = isDark ? "text-white" : "text-gray-900";
  const textMuted = isDark ? "text-gray-400" : "text-gray-500";
  const iconBtn = isDark
    ? "text-gray-500 hover:text-white"
    : "text-gray-400 hover:text-gray-700";

  const isComingSoon = status === "coming-soon";

  return (
    <div
      className={`${card} border rounded-lg backdrop-blur-sm transition-all duration-300 relative group flex flex-col ${
        isExpanded ? "col-span-1 md:col-span-2 lg:col-span-3 row-span-2" : ""
      } ${className}`}
    >
      {/* Coming-soon overlay */}
      {isComingSoon && (
        <div className={`absolute inset-0 z-30 rounded-lg flex flex-col items-center justify-center gap-4 ${
          isDark ? "bg-black/70 backdrop-blur-sm" : "bg-white/80 backdrop-blur-sm"
        }`}>
          <Lock size={24} className={textMuted} />
          <p className={`${text} font-mono text-sm font-medium`}>Coming Soon</p>
          {uorDescription && (
            <p className={`${textMuted} text-xs font-mono text-center max-w-[200px] leading-relaxed`}>
              {uorDescription}
            </p>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onVote?.();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-mono transition-all duration-200 cursor-pointer ${
              isDark
                ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/15"
            }`}
          >
            <ThumbsUp size={14} />
            <span>Vote to prioritize</span>
            {votes > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                isDark ? "bg-primary/20" : "bg-primary/10"
              }`}>
                {votes}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start p-5 pb-0">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className={`${text} font-mono text-sm tracking-wide uppercase`}>{title}</h3>
          {moduleSlug && (
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
              isDark ? "bg-white/5 text-gray-500" : "bg-gray-100 text-gray-400"
            }`}>
              {moduleSlug}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {expandedContent && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`${iconBtn} p-1 rounded transition-colors cursor-pointer`}
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          {editPanel && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`${iconBtn} p-1 rounded transition-colors cursor-pointer ${isEditing ? "!text-primary" : ""}`}
              title={isEditing ? "Close editor" : "Edit"}
            >
              {isEditing ? <X size={14} /> : <Pencil size={14} />}
            </button>
          )}
          <div className={`${iconBtn} p-1 cursor-grab active:cursor-grabbing transition-colors`} title="Drag to reorder">
            <GripVertical size={14} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className={`flex-1 p-5 pt-4 ${isComingSoon ? "pointer-events-none select-none blur-[2px]" : ""}`}>
        {isEditing && editPanel ? (
          <div className="animate-fade-in-up">
            {editPanel}
          </div>
        ) : (
          children
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && expandedContent && !isComingSoon && (
        <div className={`px-5 pb-5 border-t ${isDark ? "border-gray-700/30" : "border-gray-200"} animate-fade-in-up`}>
          <div className="pt-4">
            {expandedContent}
          </div>
        </div>
      )}

      {/* UOR module footer */}
      {uorDescription && !isComingSoon && !isEditing && (
        <div className={`px-5 pb-3`}>
          <p className={`text-[10px] font-mono ${textMuted} leading-relaxed border-t pt-2 ${
            isDark ? "border-gray-700/30" : "border-gray-100"
          }`}>
            UOR: {uorDescription}
          </p>
        </div>
      )}
    </div>
  );
};
