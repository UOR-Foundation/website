/**
 * Your Space — "Own" Section
 * Clean, readable cards: Security, Identity, Assets
 */

import { useState } from "react";
import { Shield, User, Wallet, Eye, EyeOff, CornerDownLeft } from "lucide-react";
import { SpaceCard } from "./SpaceCard";
import { IdentitySecurityRoadmap } from "./IdentitySecurityRoadmap";

interface OwnSectionProps {
  isDark: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  votes: Record<string, number>;
  onVote: (slug: string) => void;
}

export const OwnSection = ({ isDark, searchQuery, setSearchQuery, votes, onVote }: OwnSectionProps) => {
  const [hideNumbers, setHideNumbers] = useState(false);
  const [securityEditing, setSecurityEditing] = useState({
    encryption: "KYBER-1024",
    signature: "DILITHIUM-3",
    keyExchange: "NTRU-HRSS",
  });

  const text = isDark ? "text-white" : "text-gray-900";
  const textMuted = isDark ? "text-gray-400" : "text-gray-500";
  const inputCls = isDark
    ? "bg-white/5 border-white/10 text-white focus:border-white/30"
    : "bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-400";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`${text} font-body text-xl font-semibold`}>Own Your Data</h2>
        <div className="relative w-80">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={textMuted}>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Discover new protocols"
            className={`w-full ${inputCls} border rounded-lg py-2.5 pl-10 pr-10 font-body text-sm focus:outline-none transition-all`}
          />
          {searchQuery.trim() && (
            <button className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${textMuted}`}>
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* SECURITY */}
        <SpaceCard
          title="Security"
          icon={<Shield className={text} size={16} />}
          isDark={isDark}
          moduleSlug="shield"
          editPanel={
            <div className="space-y-3">
              <p className={`${textMuted} text-sm font-body`}>Configure your cryptographic preferences:</p>
              {[
                { label: "Encryption", key: "encryption" as const, options: ["KYBER-1024", "KYBER-768", "AES-256-GCM"] },
                { label: "Signature", key: "signature" as const, options: ["DILITHIUM-3", "DILITHIUM-2", "ED25519"] },
                { label: "Key Exchange", key: "keyExchange" as const, options: ["NTRU-HRSS", "X25519", "SIKE"] },
              ].map((field) => (
                <div key={field.key}>
                  <label className={`${textMuted} text-sm font-body block mb-1`}>{field.label}</label>
                  <select
                    value={securityEditing[field.key]}
                    onChange={(e) => setSecurityEditing(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className={`w-full ${inputCls} border rounded-lg px-3 py-2 font-body text-sm focus:outline-none transition-colors`}
                  >
                    {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              ))}
              <button className="w-full mt-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-body font-medium rounded-lg transition-all">
                Apply Changes
              </button>
            </div>
          }
          expandedContent={
            <div className="space-y-3">
              <h4 className={`${text} font-body text-sm font-semibold`}>Security Audit</h4>
              <p className={`${textMuted} text-sm font-body leading-relaxed`}>
                Your security settings are content-addressed through UOR. Any change produces a new verifiable hash, creating a permanent audit trail.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Key Rotations", value: "0" },
                  { label: "Threat Level", value: "LOW" },
                  { label: "Last Audit", value: "Today" },
                  { label: "Compliance", value: "NIST-L5" },
                ].map((item) => (
                  <div key={item.label} className={`p-3 rounded-lg border ${isDark ? "border-white/5 bg-white/[0.02]" : "border-gray-100 bg-gray-50"}`}>
                    <p className={`${textMuted} text-xs font-body`}>{item.label}</p>
                    <p className={`${text} text-base font-body font-semibold`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          }
        >
          <div className="space-y-3.5">
            {[
              ["Status", <span key="s" className="text-emerald-600 dark:text-emerald-400 font-body text-sm px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">QUANTUM-SAFE</span>],
              ["Encryption", securityEditing.encryption],
              ["Signature", securityEditing.signature],
              ["Key Exchange", securityEditing.keyExchange],
            ].map(([label, value]) => (
              <div key={label as string} className="flex items-center justify-between">
                <span className={`${textMuted} text-sm font-body`}>{label}</span>
                {typeof value === "string" ? <span className={`${text} font-body text-sm font-medium`}>{value}</span> : value}
              </div>
            ))}
          </div>
        </SpaceCard>

        {/* IDENTITY */}
        <SpaceCard
          title="Identity"
          icon={<User className={text} size={16} />}
          isDark={isDark}
          moduleSlug="identity"
          expandedContent={
            <div className="space-y-3">
              <h4 className={`${text} font-body text-sm font-semibold`}>Identity Graph</h4>
              <p className={`${textMuted} text-sm font-body leading-relaxed`}>
                Your identity is built from verified interactions — not assigned by a server. The more connections you verify, the stronger your trust score.
              </p>
            </div>
          }
        >
          <IdentitySecurityRoadmap isDark={isDark} />
        </SpaceCard>

        {/* ASSETS */}
        <SpaceCard
          title="Assets"
          icon={<Wallet className={text} size={16} />}
          isDark={isDark}
          moduleSlug="store"
          editPanel={
            <div className="space-y-3">
              <p className={`${textMuted} text-sm font-body`}>Portfolio display settings:</p>
              <label className={`flex items-center gap-2 ${textMuted} text-sm font-body cursor-pointer`}>
                <input type="checkbox" checked={hideNumbers} onChange={() => setHideNumbers(!hideNumbers)} className="rounded" />
                Hide all values
              </label>
              <button className="w-full mt-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-body font-medium rounded-lg transition-all">
                Save Preferences
              </button>
            </div>
          }
          expandedContent={
            <div className="space-y-3">
              <h4 className={`${text} font-body text-sm font-semibold`}>Asset Provenance</h4>
              <p className={`${textMuted} text-sm font-body leading-relaxed`}>
                Every asset has a verifiable provenance chain. As UOR objects, you can trace every transfer back to its origin with mathematical proof.
              </p>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={() => setHideNumbers(!hideNumbers)} className={`${textMuted} hover:${text} transition-colors`}>
                {hideNumbers ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <div className={`grid grid-cols-4 gap-2 text-xs font-body font-medium ${textMuted} pb-2 border-b ${isDark ? "border-white/10" : "border-gray-200"}`}>
              <span>TYPE</span>
              <span className="text-right">USD</span>
              <span className="text-right">BTC</span>
              <span className="text-right">CHANGE</span>
            </div>
            {[
              { type: "Fiat", usd: "47,250", btc: "0.73", change: "+2.3%", positive: true },
              { type: "Digital", usd: "12,835", btc: "0.20", change: "-5.7%", positive: false },
              { type: "Physical", usd: "23,470", btc: "0.36", change: "+1.2%", positive: true },
            ].map((row) => (
              <div key={row.type} className="grid grid-cols-4 gap-2 items-center font-body text-sm">
                <span className={textMuted}>{row.type}</span>
                <span className={`${text} text-right font-medium`}>{hideNumbers ? "•••••" : row.usd}</span>
                <span className={`${text} text-right`}>{hideNumbers ? "••••" : row.btc}</span>
                <span className={`${row.positive ? "text-emerald-600" : "text-red-500"} text-right font-medium`}>
                  {hideNumbers ? "••••" : row.change}
                </span>
              </div>
            ))}
            <div className={`grid grid-cols-4 gap-2 items-center font-body text-sm pt-2 border-t ${isDark ? "border-white/10" : "border-gray-200"}`}>
              <span className={`${text} font-semibold`}>Total</span>
              <span className={`${text} font-bold text-right`}>{hideNumbers ? "•••••" : "83,555"}</span>
              <span className={`${text} font-bold text-right`}>{hideNumbers ? "••••" : "1.29"}</span>
              <span className="text-emerald-600 text-right font-bold">{hideNumbers ? "••••" : "+1.1%"}</span>
            </div>
          </div>
        </SpaceCard>
      </div>
    </div>
  );
};
