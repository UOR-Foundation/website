/**
 * SpaceCard — Clean, readable card for Your Space dashboard
 * Matches console aesthetic with clear typography.
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
  moduleSlug?: string;
  children: ReactNode;
  editPanel?: ReactNode;
  expandedContent?: ReactNode;
  className?: string;
  votes?: number;
  onVote?: () => void;
  dragListeners?: Record<string, unknown>;
}

export const SpaceCard = ({
  title,
  icon,
  isDark,
  status = "active",
  moduleSlug,
  children,
  editPanel,
  expandedContent,
  className = "",
  votes = 0,
  onVote,
  dragListeners,
}: SpaceCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const card = isDark
    ? "bg-white/[0.04] border-white/10"
    : "bg-white border-gray-200 shadow-sm";
  const text = isDark ? "text-white" : "text-gray-900";
  const textMuted = isDark ? "text-gray-400" : "text-gray-500";
  const iconBtn = isDark
    ? "text-gray-500 hover:text-white"
    : "text-gray-400 hover:text-gray-700";

  const isComingSoon = status === "coming-soon";

  return (
    <div
      className={`${card} border rounded-xl transition-all duration-300 relative group flex flex-col ${
        isExpanded ? "col-span-1 md:col-span-2 lg:col-span-3 row-span-2" : ""
      } ${className}`}
    >
      {/* Coming-soon overlay */}
      {isComingSoon && (
        <div className={`absolute inset-0 z-30 rounded-xl flex flex-col items-center justify-center gap-4 ${
          isDark ? "bg-black/70 backdrop-blur-sm" : "bg-white/80 backdrop-blur-sm"
        }`}>
          <Lock size={22} className={textMuted} />
          <p className={`${text} font-body text-base font-semibold`}>Coming Soon</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onVote?.();
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-body font-medium transition-all duration-200 cursor-pointer ${
              isDark
                ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/15"
            }`}
          >
            <ThumbsUp size={14} />
            <span>Vote to prioritize</span>
            {votes > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                isDark ? "bg-primary/20" : "bg-primary/10"
              }`}>
                {votes}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center px-5 pt-5 pb-0">
        <div className="flex items-center gap-2.5">
          {icon}
          <h3 className={`${text} font-body text-base font-semibold tracking-wide`}>{title}</h3>
          {moduleSlug && (
            <span className={`text-[10px] font-body px-2 py-0.5 rounded-full ${
              isDark ? "bg-white/5 text-gray-500" : "bg-gray-100 text-gray-400"
            }`}>
              {moduleSlug}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {expandedContent && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`${iconBtn} p-1.5 rounded-lg transition-colors cursor-pointer`}
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          {editPanel && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`${iconBtn} p-1.5 rounded-lg transition-colors cursor-pointer ${isEditing ? "!text-primary" : ""}`}
              title={isEditing ? "Close editor" : "Edit"}
            >
              {isEditing ? <X size={14} /> : <Pencil size={14} />}
            </button>
          )}
          <div
            className={`${iconBtn} p-1.5 cursor-grab active:cursor-grabbing transition-colors`}
            title="Drag to reorder"
            {...(dragListeners || {})}
          >
            <GripVertical size={14} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className={`flex-1 px-5 pb-5 pt-4 ${isComingSoon ? "pointer-events-none select-none blur-[2px]" : ""}`}>
        {isEditing && editPanel ? (
          <div className="animate-fade-in-up">{editPanel}</div>
        ) : (
          children
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && expandedContent && !isComingSoon && (
        <div className={`px-5 pb-5 border-t ${isDark ? "border-white/5" : "border-gray-100"} animate-fade-in-up`}>
          <div className="pt-4">{expandedContent}</div>
        </div>
      )}
    </div>
  );
};
