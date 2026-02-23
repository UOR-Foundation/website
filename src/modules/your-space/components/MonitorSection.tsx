/**
 * Your Space — "Monitor" Section with drag-and-drop reordering
 * Uses semantic tokens for theme compatibility.
 */

import { Database, Users, HardDrive, Wifi, Upload, Download } from "lucide-react";
import { SpaceCard } from "./SpaceCard";
import { SortableSection } from "./SortableSection";

interface MonitorSectionProps {
  isDark: boolean;
  votes: Record<string, number>;
  onVote: (slug: string) => void;
}

export const MonitorSection = ({ isDark, votes, onVote }: MonitorSectionProps) => {
  const cards: Record<string, React.ReactElement> = {
    data: (
      <SpaceCard
        title="Data"
        icon={<Database className="text-foreground" size={16} />}
        isDark={isDark}
        moduleSlug="observable"
        expandedContent={
          <div className="space-y-3">
            <h4 className="text-foreground font-body text-sm font-semibold">Data Flow Details</h4>
            <p className="text-muted-foreground text-sm font-body leading-relaxed">
              Every data stream is tracked as a UOR observable. See exactly which apps read or write your data, with verifiable consent records.
            </p>
          </div>
        }
      >
        <div className="space-y-4">
          {[
            { icon: Wifi, label: "App Connections", value: "12", color: "text-blue-600 dark:text-blue-400" },
            { icon: Upload, label: "Data Sent", value: "2.4 GB", color: "text-orange-600 dark:text-orange-400" },
            { icon: Download, label: "Data Received", value: "8.7 GB", color: "text-emerald-600 dark:text-emerald-400" },
          ].map((m) => (
            <div key={m.label} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <m.icon className={m.color} size={16} />
                <span className="text-muted-foreground font-body text-sm">{m.label}</span>
              </div>
              <span className="text-foreground font-body text-lg font-semibold">{m.value}</span>
            </div>
          ))}
        </div>
      </SpaceCard>
    ),
    social: (
      <SpaceCard
        title="Social"
        icon={<Users className="text-foreground" size={16} />}
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
              <span className="text-muted-foreground font-body text-sm">{s.label}</span>
              <span className="text-foreground font-body text-sm font-medium">{s.value}</span>
            </div>
          ))}
        </div>
      </SpaceCard>
    ),
    resources: (
      <SpaceCard
        title="Resources"
        icon={<HardDrive className="text-foreground" size={16} />}
        isDark={isDark}
        moduleSlug="compute"
        expandedContent={
          <div className="space-y-3">
            <h4 className="text-foreground font-body text-sm font-semibold">Resource Allocation</h4>
            <p className="text-muted-foreground text-sm font-body leading-relaxed">
              Every compute cycle, byte of storage, and bandwidth allocation is a measured UOR observable — verifiable and auditable.
            </p>
          </div>
        }
      >
        <div className="space-y-4">
          {[
            { label: "Compute", value: "8.2 TFLOPS", color: "text-cyan-600 dark:text-cyan-400" },
            { label: "Bandwidth", value: "124 GB/h", color: "text-blue-600 dark:text-blue-400" },
            { label: "Storage", value: "1.8 TB", color: "text-purple-600 dark:text-purple-400" },
            { label: "Credits", value: "+2,847", color: "text-emerald-600 dark:text-emerald-400" },
          ].map((r) => (
            <div key={r.label} className="flex items-center justify-between">
              <span className="text-muted-foreground font-body text-sm">{r.label}</span>
              <span className={`${r.color} font-body text-sm font-semibold`}>{r.value}</span>
            </div>
          ))}
        </div>
      </SpaceCard>
    ),
  };

  return (
    <div>
      <h2 className="text-foreground font-body text-xl font-semibold mb-6">Monitor Your Activity</h2>
      <SortableSection
        initialOrder={["data", "social", "resources"]}
        cards={cards}
        storageKey="uor-space-monitor-order"
      />
    </div>
  );
};
