/**
 * Your Space — "Control Your Experience" Section
 *
 * Three cards: OPERATIONS, PRIVACY, MARKETPLACE
 * Tied to UOR framework operations:
 * - Operations: UNS channels and data streams
 * - Privacy: UOR Privacy rules (IEEE 7012-2025 aligned)
 * - Marketplace: Protocol discovery via UOR registry
 */

import { useState } from "react";
import { Settings, ShieldCheck, Star, Plus, ChevronRight, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SpaceCard } from "./SpaceCard";

interface ControlSectionProps {
  isDark: boolean;
  votes: Record<string, number>;
  onVote: (slug: string) => void;
}

export const ControlSection = ({ isDark, votes, onVote }: ControlSectionProps) => {
  const navigate = useNavigate();
  const [channelName, setChannelName] = useState("");

  const text = isDark ? "text-white" : "text-gray-900";
  const textMuted = isDark ? "text-white/80" : "text-gray-700";
  const textSub = isDark ? "text-white/70" : "text-gray-500";
  const itemBorder = isDark ? "border-white/10 hover:border-white/30" : "border-gray-200 hover:border-gray-400";
  const itemIcon = isDark ? "text-white/60 group-hover:text-white" : "text-gray-400 group-hover:text-gray-700";
  const inputCls = isDark
    ? "bg-gray-800/60 border-gray-700/50 text-white focus:border-gray-500"
    : "bg-white border-gray-200 text-gray-900 focus:border-gray-400";

  return (
    <div className="mt-8">
      <h2 className={`${text} font-mono text-xl mb-6 tracking-wide`}>Control Your Experience</h2>
      <div className="grid grid-cols-3 gap-6">
        {/* OPERATIONS */}
        <SpaceCard
          title="Operations"
          icon={<Settings className={`w-4 h-4 ${text}`} />}
          isDark={isDark}
          moduleSlug="uns"
          uorDescription="Channels and streams are UNS-registered endpoints — each one is a content-addressed, discoverable resource in your namespace."
          editPanel={
            <div className="space-y-3">
              <p className={`${textSub} text-xs font-mono mb-2`}>Create a new data channel:</p>
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="Channel name..."
                className={`w-full ${inputCls} border rounded px-3 py-2 font-mono text-sm focus:outline-none transition-colors`}
              />
              <select className={`w-full ${inputCls} border rounded px-3 py-2 font-mono text-sm focus:outline-none transition-colors`}>
                <option>Public (discoverable)</option>
                <option>Private (invite only)</option>
                <option>Encrypted (end-to-end)</option>
              </select>
              <button className="w-full mt-1 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-mono rounded transition-all duration-200">
                Create Channel
              </button>
            </div>
          }
          expandedContent={
            <div className="space-y-3">
              <h4 className={`${text} font-mono text-sm font-medium`}>Active Channels</h4>
              <p className={`${textSub} text-xs font-mono leading-relaxed`}>
                Each channel is a UNS endpoint with its own canonical address. Data flowing through channels is tracked as UOR observables — giving you full visibility into what enters and leaves your namespace.
              </p>
              <div className={`text-xs font-mono ${textSub} italic`}>No channels created yet. Use the edit panel to create your first one.</div>
            </div>
          }
        >
          <div className="space-y-3">
            {[
              { icon: Plus, label: "Create Channels", onClick: () => {} },
              { icon: Settings, label: "Manage Streams", onClick: () => {} },
            ].map((item) => (
              <button key={item.label} onClick={item.onClick} className={`w-full text-left p-3 border ${itemBorder} rounded-lg transition-colors group cursor-pointer`}>
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 ${itemIcon}`} />
                  <span className={`${textMuted} text-sm group-hover:${text}`}>{item.label}</span>
                </div>
              </button>
            ))}
          </div>
        </SpaceCard>

        {/* PRIVACY — Replacing FIELDS with UOR Privacy integration */}
        <SpaceCard
          title="Privacy"
          icon={<ShieldCheck className={`w-4 h-4 ${text}`} />}
          isDark={isDark}
          moduleSlug="privacy"
          uorDescription="Your privacy rules are content-addressed UOR objects, aligned with IEEE 7012-2025. Apps must accept your terms before accessing your data."
          expandedContent={
            <div className="space-y-3">
              <h4 className={`${text} font-mono text-sm font-medium`}>Your Privacy Document</h4>
              <p className={`${textSub} text-xs font-mono leading-relaxed`}>
                When you define your privacy rules, the document passes through the UOR canonical pipeline — producing a tamper-proof address. Any app that wants your data must first submit an acceptance record referencing this exact address. Change a rule, and the address changes — so no one can silently rewrite the deal.
              </p>
              <button
                onClick={() => navigate("/projects/uor-privacy")}
                className="flex items-center gap-2 text-primary text-xs font-mono hover:underline cursor-pointer"
              >
                Learn more about UOR Privacy <ExternalLink size={10} />
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className={`p-3 rounded-lg border ${isDark ? "border-emerald-500/20 bg-emerald-500/5" : "border-emerald-200 bg-emerald-50"}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                <span className={`text-xs font-mono font-medium ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>Default: Block everything</span>
              </div>
              <p className={`text-[10px] font-mono ${textSub} leading-relaxed`}>
                Only explicitly allowed purposes are permitted. No exceptions.
              </p>
            </div>
            <button
              onClick={() => navigate("/projects/uor-privacy")}
              className={`w-full text-left p-3 border ${itemBorder} rounded-lg transition-colors group cursor-pointer`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className={`w-4 h-4 ${itemIcon}`} />
                <span className={`${textMuted} text-sm`}>Configure Privacy Rules</span>
                <ChevronRight className={`w-3 h-3 ml-auto ${itemIcon}`} />
              </div>
            </button>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Data Categories", value: "11" },
                { label: "Active Rules", value: "0" },
                { label: "Consents Given", value: "0" },
                { label: "Violations", value: "0" },
              ].map((stat) => (
                <div key={stat.label} className={`p-2 rounded border ${isDark ? "border-gray-700/30 bg-gray-800/20" : "border-gray-200 bg-gray-50"}`}>
                  <p className={`text-[10px] font-mono ${textSub}`}>{stat.label}</p>
                  <p className={`text-sm font-mono font-medium ${text}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </SpaceCard>

        {/* MARKETPLACE */}
        <SpaceCard
          title="Marketplace"
          icon={<Star className={`w-4 h-4 ${text}`} />}
          isDark={isDark}
          status="coming-soon"
          moduleSlug="registry"
          uorDescription="A protocol marketplace where every integration is a verified UOR module — discoverable, auditable, and trust-scored."
          votes={votes["registry"] || 0}
          onVote={() => onVote("registry")}
        >
          <p className={`${textSub} text-sm mb-4`}>
            Discover new protocols and widgets to enhance your digital sovereignty
          </p>
          <button className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
            <span>Browse Marketplace</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </SpaceCard>
      </div>
    </div>
  );
};
