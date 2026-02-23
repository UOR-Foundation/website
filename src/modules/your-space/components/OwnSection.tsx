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
import { Shield, User, Wallet, GripVertical, Edit, Eye, EyeOff, CornerDownLeft } from "lucide-react";

interface OwnSectionProps {
  isDark: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const OwnSection = ({ isDark, searchQuery, setSearchQuery }: OwnSectionProps) => {
  const [hideNumbers, setHideNumbers] = useState(false);

  const card = isDark
    ? "bg-gradient-to-br from-gray-900/40 to-gray-800/40 border-gray-700/50"
    : "bg-white border-gray-200 shadow-sm";
  const text = isDark ? "text-white" : "text-gray-900";
  const textMuted = isDark ? "text-gray-400" : "text-gray-500";
  const btnBg = isDark
    ? "bg-white/5 border-gray-600/50 hover:bg-white/10 hover:border-gray-500/50"
    : "bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300";
  const iconMuted = isDark ? "text-gray-400 hover:text-white" : "text-gray-400 hover:text-gray-700";

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
        {/* SECURITY — Post-quantum crypto aligned with UNS crypto stack */}
        <div className={`${card} border rounded-lg p-6 backdrop-blur-sm hover:border-opacity-80 transition-all duration-300 flex flex-col`}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <Shield className={text} size={16} />
              <h3 className={`${text} font-mono text-sm tracking-wide`}>SECURITY</h3>
            </div>
            <div className="flex items-center gap-2">
              <GripVertical size={14} className={`${iconMuted} cursor-move transition-colors`} />
              <Edit size={14} className={`${iconMuted} cursor-pointer transition-colors`} />
            </div>
          </div>
          <div className="space-y-4 flex-1">
            {[
              ["Status", <span key="s" className="text-green-400 font-mono text-sm px-2 py-1 bg-green-400/10 border border-green-400/20 rounded">QUANTUM-SAFE</span>],
              ["Encryption", "KYBER-1024"],
              ["Signature", "DILITHIUM-3"],
              ["Key Exchange", "NTRU-HRSS"],
              ["Quantum Resistance", "NIST-L5"],
            ].map(([label, value]) => (
              <div key={label as string} className="flex items-center justify-between">
                <span className={`${textMuted} text-sm font-mono`}>{label}</span>
                {typeof value === "string" ? <span className={`${text} font-mono text-sm`}>{value}</span> : value}
              </div>
            ))}
          </div>
          <button className={`w-full mt-6 px-4 py-3 ${btnBg} ${text} text-sm font-mono rounded border transition-all duration-200`}>
            Configure
          </button>
        </div>

        {/* IDENTITY — UOR Universal Identity object */}
        <div className={`${card} border rounded-lg p-6 backdrop-blur-sm hover:border-opacity-80 transition-all duration-300 flex flex-col`}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <User className={text} size={16} />
              <h3 className={`${text} font-mono text-sm tracking-wide`}>IDENTITY</h3>
            </div>
            <div className="flex items-center gap-2">
              <GripVertical size={14} className={`${iconMuted} cursor-move transition-colors`} />
              <Edit size={14} className={`${iconMuted} cursor-pointer transition-colors`} />
            </div>
          </div>
          <div className="space-y-4 flex-1">
            {[
              ["Type", "HUMAN"],
              ["Location", "Denver, US"],
              ["Privacy", "MAXIMUM"],
              ["Mode", "Semi-Autonomous"],
              ["Agents Deployed", "111"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between">
                <span className={`${textMuted} text-sm font-mono`}>{label}</span>
                <span className={`${text} font-mono text-sm`}>{value}</span>
              </div>
            ))}
          </div>
          <button className={`w-full mt-6 px-4 py-3 ${btnBg} ${text} text-sm font-mono rounded border transition-all duration-200`}>
            Manage
          </button>
        </div>

        {/* ASSETS — UOR data objects, derivations, certificates */}
        <div className={`${card} border rounded-lg p-6 backdrop-blur-sm hover:border-opacity-80 transition-all duration-300 flex flex-col`}>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <Wallet className={text} size={16} />
              <h3 className={`${text} font-mono text-sm tracking-wide`}>ASSETS</h3>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setHideNumbers(!hideNumbers)} className={`${iconMuted} transition-colors`}>
                {hideNumbers ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <GripVertical size={14} className={`${iconMuted} cursor-move transition-colors`} />
              <Edit size={14} className={`${iconMuted} cursor-pointer transition-colors`} />
            </div>
          </div>
          <div className="space-y-3 flex-1">
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
          <button className={`w-full mt-6 px-4 py-3 ${btnBg} ${text} text-sm font-mono rounded border transition-all duration-200`}>
            Portfolio
          </button>
        </div>
      </div>
    </div>
  );
};
