/**
 * Your Space — "Monitor Your Activity" Section
 *
 * Three cards: DATA, SOCIAL, RESOURCES
 * Tied to UOR framework observables, trust scores, and compute metrics.
 * Uses pure CSS visualizations (no recharts dependency).
 */

import { Database, Users, HardDrive, Wifi, Upload, Download, Cpu, Network } from "lucide-react";
import { SpaceCard } from "./SpaceCard";

interface MonitorSectionProps {
  isDark: boolean;
  votes: Record<string, number>;
  onVote: (slug: string) => void;
}

const socialData = [
  { month: "Jan", connections: 250, followers: 250 },
  { month: "Mar", connections: 275, followers: 320 },
  { month: "May", connections: 298, followers: 380 },
  { month: "Jul", connections: 367, followers: 420 },
  { month: "Sep", connections: 398, followers: 450 },
  { month: "Nov", connections: 420, followers: 480 },
  { month: "Dec", connections: 405, followers: 460 },
];

const resourceBreakdown = [
  { name: "Compute", pct: 25, color: "#06B6D4" },
  { name: "Bandwidth", pct: 35, color: "#3B82F6" },
  { name: "Credits", pct: 22, color: "#10B981" },
  { name: "Storage", pct: 18, color: "#8B5CF6" },
];

const Sparkline = ({ data, dataKey, color, maxVal }: { data: typeof socialData; dataKey: "connections" | "followers"; color: string; maxVal: number }) => {
  const w = 200;
  const h = 80;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((d[dataKey] - 200) / (maxVal - 200)) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
  );
};

export const MonitorSection = ({ isDark, votes, onVote }: MonitorSectionProps) => {
  const text = isDark ? "text-white" : "text-gray-900";
  const textMuted = isDark ? "text-gray-400" : "text-gray-500";

  return (
    <div className="mt-8">
      <h2 className={`${text} font-mono text-xl mb-6 tracking-wide`}>Monitor Your Activity</h2>
      <div className="grid grid-cols-3 gap-6">
        {/* DATA */}
        <SpaceCard
          title="Data"
          icon={<Database className={text} size={16} />}
          isDark={isDark}
          moduleSlug="observable"
          uorDescription="Live data flow metrics are UOR observables — each measurement is content-addressed and verifiable."
          expandedContent={
            <div className="space-y-3">
              <h4 className={`${text} font-mono text-sm font-medium`}>Data Flow Details</h4>
              <p className={`${textMuted} text-xs font-mono leading-relaxed`}>
                Every data stream in your space is tracked as a UOR observable. You can see exactly which apps are reading or writing your data, how much is flowing, and verify that every access has a valid consent record.
              </p>
            </div>
          }
          className="h-80"
        >
          <div className="flex-1 flex h-full">
            <div className="flex-1 relative overflow-hidden rounded-lg flex items-center justify-center">
              <div
                className="absolute inset-0 opacity-60"
                style={{
                  background: `
                    radial-gradient(circle at 30% 40%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
                    radial-gradient(circle at 70% 70%, rgba(16, 185, 129, 0.3) 0%, transparent 50%),
                    radial-gradient(circle at 50% 50%, rgba(147, 51, 234, 0.2) 0%, transparent 40%)
                  `,
                }}
              />
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full border-2 border-blue-400/40 flex items-center justify-center animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-purple-500/40" />
                </div>
                <span className={`${textMuted} text-xs font-mono`}>LIVE FLOW</span>
              </div>
            </div>
            <div className={`w-48 flex flex-col justify-center space-y-6 pl-4 border-l ${isDark ? "border-gray-700/30" : "border-gray-200"}`}>
              {[
                { icon: Wifi, label: "APP CONNECTIONS", value: "12", color: "text-blue-400" },
                { icon: Upload, label: "DATA STREAMED OUT", value: "2.4GB", color: "text-orange-400" },
                { icon: Download, label: "DATA RECEIVED", value: "8.7GB", color: "text-green-400" },
              ].map((m) => (
                <div key={m.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <m.icon className={m.color} size={14} />
                    <span className={`${textMuted} font-mono text-xs tracking-wide`}>{m.label}</span>
                  </div>
                  <span className={`${m.color} font-mono text-lg font-light`}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </SpaceCard>

        {/* SOCIAL */}
        <SpaceCard
          title="Social"
          icon={<Users className={text} size={16} />}
          isDark={isDark}
          status="coming-soon"
          moduleSlug="trust"
          uorDescription="Social connections will be trust-scored through verified UOR interactions — not follower counts."
          votes={votes["trust"] || 0}
          onVote={() => onVote("trust")}
          className="h-80"
        >
          <div className="flex-1 flex gap-4 h-full">
            <div className="flex-1 min-h-0 flex flex-col">
              <svg viewBox="0 0 200 80" className="w-full flex-1" preserveAspectRatio="none">
                <Sparkline data={socialData} dataKey="connections" color="#3B82F6" maxVal={500} />
                <Sparkline data={socialData} dataKey="followers" color="#10B981" maxVal={500} />
              </svg>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span className={`${textMuted} text-[10px] font-mono`}>Connections</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className={`${textMuted} text-[10px] font-mono`}>Followers</span>
                </div>
              </div>
            </div>
            <div className="w-36 flex flex-col justify-center space-y-3">
              {[
                { label: "Connections", value: "405", color: "text-blue-400" },
                { label: "Followers", value: "460", color: "text-green-400" },
                { label: "Engagement", value: "+62.0%", color: "text-blue-400" },
                { label: "Trust Score", value: "+84.0%", color: "text-green-400" },
              ].map((s) => (
                <div key={s.label} className={`flex justify-between py-1 border-b ${isDark ? "border-gray-700/50" : "border-gray-100"}`}>
                  <span className={`${textMuted} font-mono text-xs`}>{s.label}</span>
                  <span className={`${s.color} font-mono text-xs`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </SpaceCard>

        {/* RESOURCES */}
        <SpaceCard
          title="Resources"
          icon={<HardDrive className={text} size={16} />}
          isDark={isDark}
          moduleSlug="compute"
          uorDescription="Compute, bandwidth, and storage consumption — tracked as UOR observables with verifiable metrics."
          expandedContent={
            <div className="space-y-3">
              <h4 className={`${text} font-mono text-sm font-medium`}>Resource Allocation</h4>
              <p className={`${textMuted} text-xs font-mono leading-relaxed`}>
                Every compute cycle, byte of storage, and bandwidth allocation is a measured UOR observable. This means resource consumption is verifiable and auditable — you can prove exactly what you used and what you were charged for.
              </p>
            </div>
          }
          className="h-80"
        >
          <div className="flex-1 flex gap-4 h-full">
            <div className="w-48 flex flex-col items-center justify-center">
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  {(() => {
                    let offset = 0;
                    return resourceBreakdown.map((seg) => {
                      const el = (
                        <circle
                          key={seg.name}
                          cx="18" cy="18" r="14"
                          fill="none"
                          stroke={seg.color}
                          strokeWidth="4"
                          strokeDasharray={`${seg.pct} ${100 - seg.pct}`}
                          strokeDashoffset={-offset}
                        />
                      );
                      offset += seg.pct;
                      return el;
                    });
                  })()}
                </svg>
              </div>
              <div className={`flex justify-between items-center w-full mt-3 pt-3 border-t ${isDark ? "border-cyan-400/20" : "border-gray-200"}`}>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                  <span className="text-cyan-300 font-mono text-xs">OUT</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-emerald-300 font-mono text-xs">IN</span>
                </div>
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center space-y-3 pl-4">
              <div className="space-y-2">
                {[
                  { icon: Upload, label: "COMPUTE", value: "8.2T", color: "text-cyan-400" },
                  { icon: Network, label: "BANDWIDTH", value: "124GB/h", color: "text-blue-400" },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <r.icon className={r.color} size={10} />
                      <span className={`${textMuted} font-mono text-xs`}>{r.label}</span>
                    </div>
                    <span className={`${r.color} font-mono text-xs`}>{r.value}</span>
                  </div>
                ))}
              </div>
              <div className={`space-y-2 pt-2 border-t ${isDark ? "border-cyan-400/20" : "border-gray-200"}`}>
                {[
                  { icon: Download, label: "CREDITS", value: "+2,847", color: "text-emerald-400" },
                  { icon: Cpu, label: "CPU", value: "73.2%", color: "text-blue-300" },
                  { icon: HardDrive, label: "STORAGE", value: "1.8TB", color: "text-purple-400" },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <r.icon className={r.color} size={10} />
                      <span className={`${textMuted} font-mono text-xs`}>{r.label}</span>
                    </div>
                    <span className={`${r.color} font-mono text-xs`}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SpaceCard>
      </div>
    </div>
  );
};
