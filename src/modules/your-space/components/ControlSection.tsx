/**
 * Your Space — "Control Your Experience" Section
 * 
 * Three cards: OPERATIONS, FIELDS, MARKETPLACE
 * Tied to UOR framework operations:
 * - Operations: UNS channels and data streams
 * - Fields: Resonance management (observable fields) and deployment
 * - Marketplace: Protocol discovery via UOR registry
 */

import { Settings, Zap, Star, Plus, Download, ChevronRight, GripVertical, Edit } from "lucide-react";

interface ControlSectionProps {
  isDark: boolean;
}

export const ControlSection = ({ isDark }: ControlSectionProps) => {
  const card = isDark
    ? "bg-black/40 border-white/20"
    : "bg-white border-gray-200 shadow-sm";
  const text = isDark ? "text-white" : "text-gray-900";
  const textMuted = isDark ? "text-white/80" : "text-gray-700";
  const textSub = isDark ? "text-white/70" : "text-gray-500";
  const iconMuted = isDark ? "text-white/40" : "text-gray-400";
  const itemBorder = isDark ? "border-white/10 hover:border-white/30" : "border-gray-200 hover:border-gray-400";
  const itemIcon = isDark ? "text-white/60 group-hover:text-white" : "text-gray-400 group-hover:text-gray-700";

  return (
    <div className="mt-8">
      <h2 className={`${text} font-mono text-xl mb-6 tracking-wide`}>Control Your Experience</h2>
      <div className="grid grid-cols-3 gap-6">
        {/* OPERATIONS */}
        <div className={`p-6 ${card} border rounded-lg backdrop-blur-sm`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Settings className={`w-5 h-5 ${text}`} />
              <h3 className={`${text} font-mono text-sm tracking-wide uppercase`}>OPERATIONS</h3>
            </div>
            <div className="flex items-center gap-2">
              <GripVertical className={`w-4 h-4 ${iconMuted}`} />
              <Edit className={`w-4 h-4 ${iconMuted}`} />
            </div>
          </div>
          <div className="space-y-3">
            {[
              { icon: Plus, label: "Create Channels" },
              { icon: Settings, label: "Manage Streams" },
            ].map((item) => (
              <button key={item.label} className={`w-full text-left p-3 border ${itemBorder} rounded-lg transition-colors group`}>
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 ${itemIcon}`} />
                  <span className={`${textMuted} text-sm group-hover:${text}`}>{item.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* FIELDS */}
        <div className={`p-6 ${card} border rounded-lg backdrop-blur-sm`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Zap className={`w-5 h-5 ${text}`} />
              <h3 className={`${text} font-mono text-sm tracking-wide uppercase`}>FIELDS</h3>
            </div>
            <div className="flex items-center gap-2">
              <GripVertical className={`w-4 h-4 ${iconMuted}`} />
              <Edit className={`w-4 h-4 ${iconMuted}`} />
            </div>
          </div>
          <div className="space-y-3">
            {[
              { icon: Zap, label: "Resonance Management" },
              { icon: Download, label: "Deploy" },
            ].map((item) => (
              <button key={item.label} className={`w-full text-left p-3 border ${itemBorder} rounded-lg transition-colors group`}>
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 ${itemIcon}`} />
                  <span className={`${textMuted} text-sm group-hover:${text}`}>{item.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* MARKETPLACE */}
        <div className={`p-6 ${card} border rounded-lg backdrop-blur-sm`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Star className={`w-5 h-5 ${text}`} />
              <h3 className={`${text} font-mono text-sm tracking-wide uppercase`}>MARKETPLACE</h3>
            </div>
            <div className="flex items-center gap-2">
              <GripVertical className={`w-4 h-4 ${iconMuted}`} />
              <Edit className={`w-4 h-4 ${iconMuted}`} />
            </div>
          </div>
          <p className={`${textSub} text-sm mb-4`}>
            Discover new protocols and widgets to enhance your digital sovereignty
          </p>
          <button className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
            <span>Browse Marketplace</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
