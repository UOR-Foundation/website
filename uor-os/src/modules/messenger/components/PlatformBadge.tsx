/**
 * PlatformBadge — Small icon+color badge showing message source platform.
 */

import type { BridgePlatform } from "../lib/types";

interface Props {
  platform: BridgePlatform | "matrix" | "native";
  size?: "sm" | "md";
  showLabel?: boolean;
}

const PLATFORM_CONFIG: Record<
  string,
  { label: string; emoji: string; color: string; bg: string }
> = {
  whatsapp: { label: "WhatsApp", emoji: "💬", color: "text-green-400", bg: "bg-green-500/15" },
  telegram: { label: "Telegram", emoji: "✈️", color: "text-blue-400", bg: "bg-blue-500/15" },
  signal: { label: "Signal", emoji: "🔐", color: "text-blue-300", bg: "bg-blue-400/15" },
  discord: { label: "Discord", emoji: "🎮", color: "text-indigo-400", bg: "bg-indigo-500/15" },
  slack: { label: "Slack", emoji: "💼", color: "text-purple-400", bg: "bg-purple-500/15" },
  email: { label: "Email", emoji: "✉️", color: "text-white/50", bg: "bg-white/[0.06]" },
  linkedin: { label: "LinkedIn", emoji: "💼", color: "text-blue-400", bg: "bg-blue-600/15" },
  twitter: { label: "X", emoji: "𝕏", color: "text-white/60", bg: "bg-white/[0.08]" },
  instagram: { label: "Instagram", emoji: "📸", color: "text-pink-400", bg: "bg-pink-500/15" },
  sms: { label: "SMS", emoji: "📱", color: "text-green-300", bg: "bg-green-400/15" },
  matrix: { label: "Matrix", emoji: "🟢", color: "text-teal-400", bg: "bg-teal-500/15" },
  native: { label: "Sovereign", emoji: "🛡️", color: "text-teal-400", bg: "bg-teal-500/15" },
};

export default function PlatformBadge({ platform, size = "sm", showLabel = false }: Props) {
  const config = PLATFORM_CONFIG[platform] ?? PLATFORM_CONFIG.native;
  const sizeClasses = size === "sm" ? "text-[10px] px-1 py-0.5" : "text-xs px-1.5 py-0.5";

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full ${config.bg} ${config.color} ${sizeClasses} font-medium`}
      title={config.label}
    >
      <span className={size === "sm" ? "text-[10px]" : "text-xs"}>{config.emoji}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
