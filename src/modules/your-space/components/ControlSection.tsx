/**
 * Your Space — "Control" Section
 * Cards: Operations, Privacy, Marketplace (coming soon)
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
  const textMuted = isDark ? "text-gray-400" : "text-gray-500";
  const itemBorder = isDark ? "border-white/10 hover:border-white/20" : "border-gray-200 hover:border-gray-300";
  const inputCls = isDark
    ? "bg-white/5 border-white/10 text-white focus:border-white/30"
    : "bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400";

  return (
    <div>
      <h2 className={`${text} font-body text-xl font-semibold mb-6`}>Control Your Experience</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* OPERATIONS */}
        <SpaceCard
          title="Operations"
          icon={<Settings className={text} size={16} />}
          isDark={isDark}
          moduleSlug="uns"
          editPanel={
            <div className="space-y-3">
              <p className={`${textMuted} text-sm font-body`}>Create a new data channel:</p>
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="Channel name..."
                className={`w-full ${inputCls} border rounded-lg px-3 py-2.5 font-body text-sm focus:outline-none transition-colors`}
              />
              <select className={`w-full ${inputCls} border rounded-lg px-3 py-2.5 font-body text-sm focus:outline-none transition-colors`}>
                <option>Public (discoverable)</option>
                <option>Private (invite only)</option>
                <option>Encrypted (end-to-end)</option>
              </select>
              <button className="w-full mt-1 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-body font-medium rounded-lg transition-all">
                Create Channel
              </button>
            </div>
          }
          expandedContent={
            <div className="space-y-3">
              <h4 className={`${text} font-body text-sm font-semibold`}>Active Channels</h4>
              <p className={`${textMuted} text-sm font-body leading-relaxed`}>
                Each channel is a UNS endpoint with its own canonical address. Data flowing through channels is tracked as UOR observables.
              </p>
              <p className={`text-sm font-body ${textMuted} italic`}>No channels created yet.</p>
            </div>
          }
        >
          <div className="space-y-3">
            {[
              { icon: Plus, label: "Create Channels" },
              { icon: Settings, label: "Manage Streams" },
            ].map((item) => (
              <button key={item.label} className={`w-full text-left p-3.5 border ${itemBorder} rounded-lg transition-colors group cursor-pointer`}>
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 ${textMuted}`} />
                  <span className={`${text} text-sm font-body font-medium`}>{item.label}</span>
                </div>
              </button>
            ))}
          </div>
        </SpaceCard>

        {/* PRIVACY */}
        <SpaceCard
          title="Privacy"
          icon={<ShieldCheck className={text} size={16} />}
          isDark={isDark}
          moduleSlug="privacy"
          expandedContent={
            <div className="space-y-3">
              <h4 className={`${text} font-body text-sm font-semibold`}>Your Privacy Document</h4>
              <p className={`${textMuted} text-sm font-body leading-relaxed`}>
                Your privacy rules produce a tamper-proof address through UOR. Apps must accept this exact address before accessing your data. Change a rule, the address changes — no silent rewrites.
              </p>
              <button
                onClick={() => navigate("/projects/uor-privacy")}
                className="flex items-center gap-2 text-primary text-sm font-body font-medium hover:underline cursor-pointer"
              >
                Learn more about UOR Privacy <ExternalLink size={12} />
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <div className={`p-3.5 rounded-lg border ${isDark ? "border-emerald-500/20 bg-emerald-500/5" : "border-emerald-200 bg-emerald-50"}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className={`text-sm font-body font-semibold ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
                  Default: Block everything
                </span>
              </div>
              <p className={`text-sm font-body ${textMuted}`}>
                Only explicitly allowed purposes are permitted.
              </p>
            </div>
            <button
              onClick={() => navigate("/projects/uor-privacy")}
              className={`w-full text-left p-3.5 border ${itemBorder} rounded-lg transition-colors group cursor-pointer`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className={`w-4 h-4 ${textMuted}`} />
                <span className={`${text} text-sm font-body font-medium`}>Configure Privacy Rules</span>
                <ChevronRight className={`w-3.5 h-3.5 ml-auto ${textMuted}`} />
              </div>
            </button>
          </div>
        </SpaceCard>

        {/* MARKETPLACE — Coming Soon */}
        <SpaceCard
          title="Marketplace"
          icon={<Star className={text} size={16} />}
          isDark={isDark}
          status="coming-soon"
          moduleSlug="registry"
          votes={votes["registry"] || 0}
          onVote={() => onVote("registry")}
        >
          <div className="space-y-3">
            <p className={`${textMuted} text-sm font-body`}>
              Discover verified protocols to enhance your digital sovereignty.
            </p>
          </div>
        </SpaceCard>
      </div>
    </div>
  );
};
