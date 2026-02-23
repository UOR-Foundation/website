/**
 * Your Space — "Monitor" Section
 * Cards: Data, Social (coming soon), Resources
 */

import { Database, Users, HardDrive, Wifi, Upload, Download } from "lucide-react";
import { SpaceCard } from "./SpaceCard";

interface MonitorSectionProps {
  isDark: boolean;
  votes: Record<string, number>;
  onVote: (slug: string) => void;
}

export const MonitorSection = ({ isDark, votes, onVote }: MonitorSectionProps) => {
  const text = isDark ? "text-white" : "text-gray-900";
  const textMuted = isDark ? "text-gray-400" : "text-gray-500";

  return (
    <div>
      <h2 className={`${text} font-body text-xl font-semibold mb-6`}>Monitor Your Activity</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* DATA */}
        <SpaceCard
          title="Data"
          icon={<Database className={text} size={16} />}
          isDark={isDark}
          moduleSlug="observable"
          expandedContent={
            <div className="space-y-3">
              <h4 className={`${text} font-body text-sm font-semibold`}>Data Flow Details</h4>
              <p className={`${textMuted} text-sm font-body leading-relaxed`}>
                Every data stream is tracked as a UOR observable. See exactly which apps read or write your data, with verifiable consent records.
              </p>
            </div>
          }
        >
          <div className="space-y-4">
            {[
              { icon: Wifi, label: "App Connections", value: "12", color: isDark ? "text-blue-400" : "text-blue-600" },
              { icon: Upload, label: "Data Sent", value: "2.4 GB", color: isDark ? "text-orange-400" : "text-orange-600" },
              { icon: Download, label: "Data Received", value: "8.7 GB", color: isDark ? "text-emerald-400" : "text-emerald-600" },
            ].map((m) => (
              <div key={m.label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <m.icon className={m.color} size={16} />
                  <span className={`${textMuted} font-body text-sm`}>{m.label}</span>
                </div>
                <span className={`${text} font-body text-lg font-semibold`}>{m.value}</span>
              </div>
            ))}
          </div>
        </SpaceCard>

        {/* SOCIAL — Coming Soon */}
        <SpaceCard
          title="Social"
          icon={<Users className={text} size={16} />}
          isDark={isDark}
          status="coming-soon"
          moduleSlug="trust"
          votes={votes["trust"] || 0}
          onVote={() => onVote("trust")}
        >
          <div className="space-y-4">
            {[
              { label: "Connections", value: "—" },
              { label: "Trust Score", value: "—" },
              { label: "Engagement", value: "—" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <span className={`${textMuted} font-body text-sm`}>{s.label}</span>
                <span className={`${text} font-body text-sm font-medium`}>{s.value}</span>
              </div>
            ))}
          </div>
        </SpaceCard>

        {/* RESOURCES */}
        <SpaceCard
          title="Resources"
          icon={<HardDrive className={text} size={16} />}
          isDark={isDark}
          moduleSlug="compute"
          expandedContent={
            <div className="space-y-3">
              <h4 className={`${text} font-body text-sm font-semibold`}>Resource Allocation</h4>
              <p className={`${textMuted} text-sm font-body leading-relaxed`}>
                Every compute cycle, byte of storage, and bandwidth allocation is a measured UOR observable — verifiable and auditable.
              </p>
            </div>
          }
        >
          <div className="space-y-4">
            {[
              { label: "Compute", value: "8.2 TFLOPS", color: isDark ? "text-cyan-400" : "text-cyan-600" },
              { label: "Bandwidth", value: "124 GB/h", color: isDark ? "text-blue-400" : "text-blue-600" },
              { label: "Storage", value: "1.8 TB", color: isDark ? "text-purple-400" : "text-purple-600" },
              { label: "Credits", value: "+2,847", color: isDark ? "text-emerald-400" : "text-emerald-600" },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between">
                <span className={`${textMuted} font-body text-sm`}>{r.label}</span>
                <span className={`${r.color} font-body text-sm font-semibold`}>{r.value}</span>
              </div>
            ))}
          </div>
        </SpaceCard>
      </div>
    </div>
  );
};
