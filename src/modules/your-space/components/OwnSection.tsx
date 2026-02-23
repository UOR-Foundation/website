/**
 * Your Space — "Own Your Data" Section
 *
 * Three cards: SECURITY, IDENTITY, ASSETS
 * All tied to UOR framework primitives:
 * - Security: Post-quantum crypto stack (Dilithium-3, Kyber-1024)
 * - Identity: UOR Universal Identity (content-addressed via singleProofHash)
 * - Assets: UOR derivations, certificates, and data objects
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
  const btnBg = isDark
    ? "bg-white/5 border-gray-600/50 hover:bg-white/10 hover:border-gray-500/50"
    : "bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300";
  const inputCls = isDark
    ? "bg-gray-800/60 border-gray-700/50 text-white focus:border-gray-500"
    : "bg-white border-gray-200 text-gray-900 focus:border-gray-400";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`${text} font-mono text-xl tracking-wide`}>Own Your Data</h2>
        <div className="relative w-[28rem]">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isDark ? "text-white/60" : "text-gray-400"}>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Discover new protocols for your space"
            className={`w-full ${isDark ? "bg-gray-900/60 border-gray-700/50 text-white placeholder-gray-400 focus:border-gray-500/50 focus:bg-gray-800/60" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:bg-white"} border rounded-lg py-3 pl-10 pr-12 font-mono text-sm focus:outline-none transition-all duration-200 backdrop-blur-sm`}
          />
          <button
            className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-7 h-7 rounded-full border ${isDark ? "border-gray-600/50" : "border-gray-300"} flex items-center justify-center transition-all duration-200 ${searchQuery.trim() ? `${isDark ? "bg-gray-700/50 text-white" : "bg-gray-200 text-gray-700"} cursor-pointer` : `bg-transparent ${isDark ? "text-gray-500" : "text-gray-300"} cursor-default`}`}
          >
            <CornerDownLeft className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* SECURITY */}
        <SpaceCard
          title="Security"
          icon={<Shield className={text} size={16} />}
          isDark={isDark}
          moduleSlug="shield"
          uorDescription="Post-quantum cryptographic primitives protect your identity and data. All keys are content-addressed through the UOR pipeline."
          editPanel={
            <div className="space-y-3">
              <p className={`${textMuted} text-xs font-mono mb-3`}>Configure your cryptographic preferences:</p>
              {[
                { label: "Encryption", key: "encryption" as const, options: ["KYBER-1024", "KYBER-768", "AES-256-GCM"] },
                { label: "Signature", key: "signature" as const, options: ["DILITHIUM-3", "DILITHIUM-2", "ED25519"] },
                { label: "Key Exchange", key: "keyExchange" as const, options: ["NTRU-HRSS", "X25519", "SIKE"] },
              ].map((field) => (
                <div key={field.key}>
                  <label className={`${textMuted} text-xs font-mono block mb-1`}>{field.label}</label>
                  <select
                    value={securityEditing[field.key]}
                    onChange={(e) => setSecurityEditing(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className={`w-full ${inputCls} border rounded px-3 py-2 font-mono text-sm focus:outline-none transition-colors`}
                  >
                    {field.options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              ))}
              <button className={`w-full mt-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-mono rounded transition-all duration-200`}>
                Apply Changes
              </button>
            </div>
          }
          expandedContent={
            <div className="space-y-3">
              <h4 className={`${text} font-mono text-sm font-medium`}>Full Security Audit</h4>
              <p className={`${textMuted} text-xs font-mono leading-relaxed`}>
                Your security configuration is content-addressed via UOR. Any change to your crypto settings produces a new canonical hash, ensuring a verifiable audit trail of your security posture over time.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Key Rotations", value: "0" },
                  { label: "Threat Level", value: "LOW" },
                  { label: "Last Audit", value: "Today" },
                  { label: "Compliance", value: "NIST-L5" },
                ].map((item) => (
                  <div key={item.label} className={`p-2.5 rounded border ${isDark ? "border-gray-700/30 bg-gray-800/30" : "border-gray-200 bg-gray-50"}`}>
                    <p className={`${textMuted} text-[10px] font-mono`}>{item.label}</p>
                    <p className={`${text} text-sm font-mono font-medium`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            {[
              ["Status", <span key="s" className="text-green-400 font-mono text-sm px-2 py-1 bg-green-400/10 border border-green-400/20 rounded">QUANTUM-SAFE</span>],
              ["Encryption", securityEditing.encryption],
              ["Signature", securityEditing.signature],
              ["Key Exchange", securityEditing.keyExchange],
              ["Quantum Resistance", "NIST-L5"],
            ].map(([label, value]) => (
              <div key={label as string} className="flex items-center justify-between">
                <span className={`${textMuted} text-sm font-mono`}>{label}</span>
                {typeof value === "string" ? <span className={`${text} font-mono text-sm`}>{value}</span> : value}
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
          uorDescription="Your canonical identity is derived from your attributes, not assigned by a server. One identity, everywhere."
          expandedContent={
            <div className="space-y-3">
              <h4 className={`${text} font-mono text-sm font-medium`}>Identity Graph</h4>
              <p className={`${textMuted} text-xs font-mono leading-relaxed`}>
                Your identity is a living graph of relationships — every connection to a person, app, or dataset is a content-addressed triple. The more verified interactions you have, the stronger your trust score becomes.
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
          uorDescription="Every asset is a content-addressed UOR object — derivations, certificates, and data entries with verifiable provenance."
          editPanel={
            <div className="space-y-3">
              <p className={`${textMuted} text-xs font-mono mb-2`}>Configure portfolio display:</p>
              <label className={`flex items-center gap-2 ${textMuted} text-xs font-mono cursor-pointer`}>
                <input type="checkbox" checked={hideNumbers} onChange={() => setHideNumbers(!hideNumbers)} className="rounded" />
                Hide all values
              </label>
              <div className="space-y-2">
                {["Fiat", "Digital", "Physical"].map((type) => (
                  <label key={type} className={`flex items-center gap-2 ${textMuted} text-xs font-mono cursor-pointer`}>
                    <input type="checkbox" defaultChecked className="rounded" />
                    Show {type}
                  </label>
                ))}
              </div>
              <button className="w-full mt-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-mono rounded transition-all duration-200">
                Save Preferences
              </button>
            </div>
          }
          expandedContent={
            <div className="space-y-3">
              <h4 className={`${text} font-mono text-sm font-medium`}>Asset Provenance</h4>
              <p className={`${textMuted} text-xs font-mono leading-relaxed`}>
                Every asset in your portfolio has a verifiable provenance chain. Because assets are UOR objects, you can trace every transfer, derivation, and certification back to its origin — with mathematical proof.
              </p>
            </div>
          }
        >
          <div className="space-y-3">
            <div className="flex justify-end mb-1">
              <button onClick={() => setHideNumbers(!hideNumbers)} className={`${isDark ? "text-gray-400 hover:text-white" : "text-gray-400 hover:text-gray-700"} transition-colors`}>
                {hideNumbers ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <div className={`grid grid-cols-5 gap-2 text-xs font-mono ${textMuted} pb-2 border-b ${isDark ? "border-gray-700/50" : "border-gray-200"}`}>
              <span>TYPE</span>
              <span className="text-center">USD</span>
              <span className="text-center">BTC</span>
              <span className="text-center">GPU</span>
              <span className="text-right">1M</span>
            </div>
            {[
              { type: "Fiat", usd: "47,250", btc: "0.73", gpu: "31,833h", change: "+2.3%", positive: true },
              { type: "Digital", usd: "12,835", btc: "0.20", gpu: "8,651h", change: "-5.7%", positive: false },
              { type: "Physical", usd: "23,470", btc: "0.36", gpu: "15,813h", change: "+1.2%", positive: true },
            ].map((row) => (
              <div key={row.type} className="grid grid-cols-5 gap-2 items-center text-sm font-mono">
                <span className={textMuted}>{row.type}</span>
                <span className={`${text} text-center`}>{hideNumbers ? "•••••" : row.usd}</span>
                <span className={`${text} text-center`}>{hideNumbers ? "••••" : row.btc}</span>
                <span className={`${text} text-center`}>{hideNumbers ? "•••••" : row.gpu}</span>
                <span className={`${row.positive ? "text-green-400" : "text-red-400"} text-right`}>
                  {hideNumbers ? "••••" : row.change}
                </span>
              </div>
            ))}
            <div className={`grid grid-cols-5 gap-2 items-center text-sm font-mono pt-2 border-t ${isDark ? "border-gray-700/50" : "border-gray-200"}`}>
              <span className={text}>Total</span>
              <span className={`${text} font-semibold text-center`}>{hideNumbers ? "•••••" : "83,555"}</span>
              <span className={`${text} font-semibold text-center`}>{hideNumbers ? "••••" : "1.29"}</span>
              <span className={`${text} font-semibold text-center`}>{hideNumbers ? "•••••" : "56,297h"}</span>
              <span className="text-green-400 text-right">{hideNumbers ? "••••" : "+1.1%"}</span>
            </div>
          </div>
        </SpaceCard>
      </div>
    </div>
  );
};
