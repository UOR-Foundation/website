/**
 * Your Space — "Monitor" Section with drag-and-drop reordering
 * Uses semantic tokens for theme compatibility.
 */

import { Database, Users, HardDrive, Wifi, Upload, Download, GitBranch } from "lucide-react";
import { SpaceCard } from "./SpaceCard";
import { SortableSection } from "./SortableSection";
import { ContextGraph } from "./ContextGraph";
import { TrustGraphVisualization } from "./TrustGraphVisualization";

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
        title="Trust Graph"
        icon={<Users className="text-foreground" size={16} />}
        isDark={isDark}
        moduleSlug="trust"
        expandedContent={
          <div className="space-y-3">
            <h4 className="text-foreground font-body text-sm font-semibold">Fano-Plane Trust Topology</h4>
            <p className="text-muted-foreground text-sm font-body leading-relaxed">
              Your trust score is computed from three dimensions: individual coherence (Φ), social attestations (PageRank), and temporal depth (τ). 
              The Fano plane maps these 7 trust dimensions onto 7 collinear attestation channels — a topology where every pair of dimensions shares exactly one verification path.
            </p>
          </div>
        }
      >
        <TrustGraphVisualization isDark={isDark} />
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
    context: (
      <SpaceCard
        title="Context Graph"
        icon={<GitBranch className="text-foreground" size={16} />}
        isDark={isDark}
        moduleSlug="context-graph"
        expandedContent={
          <div className="space-y-3">
            <h4 className="text-foreground font-body text-sm font-semibold">How It Works</h4>
            <p className="text-muted-foreground text-sm font-body leading-relaxed">
              Your context graph is projected from atomic triples in your knowledge graph. Conversations with the hologram automatically enrich it with interest, task, and domain nodes.
            </p>
          </div>
        }
      >
        <ContextGraph isDark={isDark} />
      </SpaceCard>
    ),
  };

  return (
    <div>
      <h2 className="text-foreground font-body text-xl font-semibold mb-6">Monitor Your Activity</h2>
      <SortableSection
        initialOrder={["context", "data", "social", "resources"]}
        cards={cards}
        storageKey="uor-space-monitor-order"
      />
    </div>
  );
};
