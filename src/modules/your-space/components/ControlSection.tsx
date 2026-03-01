/**
 * Your Space — "Control" Section with drag-and-drop reordering
 * Uses semantic tokens for theme compatibility.
 */

import { useState } from "react";
import { Settings, ShieldCheck, Star, Plus, ChevronRight, ExternalLink, DatabaseZap, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SpaceCard } from "./SpaceCard";
import { SortableSection } from "./SortableSection";
import { PrivacySettingsPanel } from "./PrivacySettingsPanel";
import { DataBankPanel } from "./DataBankPanel";
import { InteroperabilityPanel } from "./InteroperabilityPanel";

interface ControlSectionProps {
  isDark: boolean;
  votes: Record<string, number>;
  onVote: (slug: string) => void;
}

export const ControlSection = ({ isDark, votes, onVote }: ControlSectionProps) => {
  const navigate = useNavigate();
  const [channelName, setChannelName] = useState("");

  const cards: Record<string, React.ReactElement> = {
    operations: (
      <SpaceCard
        title="Operations"
        icon={<Settings className="text-foreground" size={16} />}
        isDark={isDark}
        moduleSlug="uns"
        editPanel={
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm font-body">Create a new data channel:</p>
            <input
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="Channel name..."
              className="w-full bg-muted border-border text-foreground border rounded-lg px-3 py-2.5 font-body text-sm focus:outline-none transition-colors placeholder:text-muted-foreground"
            />
            <select className="w-full bg-muted border-border text-foreground border rounded-lg px-3 py-2.5 font-body text-sm focus:outline-none transition-colors">
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
            <h4 className="text-foreground font-body text-sm font-semibold">Active Channels</h4>
            <p className="text-muted-foreground text-sm font-body leading-relaxed">
              Each channel is a UNS endpoint with its own canonical address. Data flowing through channels is tracked as UOR observables.
            </p>
            <p className="text-sm font-body text-muted-foreground italic">No channels created yet.</p>
          </div>
        }
      >
        <div className="space-y-3">
          {[
            { icon: Plus, label: "Create Channels" },
            { icon: Settings, label: "Manage Streams" },
          ].map((item) => (
            <button key={item.label} className="w-full text-left p-3.5 border border-border hover:border-primary/30 rounded-lg transition-colors group cursor-pointer">
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground text-sm font-body font-medium">{item.label}</span>
              </div>
            </button>
          ))}
        </div>
      </SpaceCard>
    ),
    privacy: (
      <SpaceCard
        title="Privacy"
        icon={<ShieldCheck className="text-foreground" size={16} />}
        isDark={isDark}
        moduleSlug="privacy"
      >
        <PrivacySettingsPanel isDark={isDark} />
      </SpaceCard>
    ),
    marketplace: (
      <SpaceCard
        title="Marketplace"
        icon={<Star className="text-foreground" size={16} />}
        isDark={isDark}
        status="coming-soon"
        moduleSlug="registry"
        votes={votes["registry"] || 0}
        onVote={() => onVote("registry")}
      >
        <div className="space-y-3">
          <p className="text-muted-foreground text-sm font-body">
            Discover verified protocols to enhance your digital sovereignty.
          </p>
        </div>
      </SpaceCard>
    ),
    databank: (
      <SpaceCard
        title="Data Bank"
        icon={<DatabaseZap className="text-foreground" size={16} />}
        isDark={isDark}
        moduleSlug="data-bank"
      >
        <DataBankPanel isDark={isDark} />
      </SpaceCard>
    ),
    interop: (
      <SpaceCard
        title="Interoperability"
        icon={<Globe className="text-foreground" size={16} />}
        isDark={isDark}
        moduleSlug="hologram"
        expandedContent={
          <div className="space-y-2">
            <h4 className="text-foreground font-body text-sm font-semibold">About Projections</h4>
            <p className="text-muted-foreground text-sm font-body leading-relaxed">
              A projection is a pure, deterministic function that transforms your canonical identity into any protocol's native format. 
              The same 256-bit hash becomes a DID, an IPFS CID, a Bitcoin address, a Python module path, or an OpenQASM circuit ID — 
              all mathematically derived, all verifiable, all reversible where the standard allows.
            </p>
          </div>
        }
      >
        <InteroperabilityPanel isDark={isDark} />
      </SpaceCard>
    ),
  };

  return (
    <div>
      <h2 className="text-foreground font-body text-xl font-semibold mb-6">Control Your Experience</h2>
      <SortableSection
        initialOrder={["operations", "privacy", "databank", "interop", "marketplace"]}
        cards={cards}
        storageKey="uor-space-control-order"
      />
    </div>
  );
};
