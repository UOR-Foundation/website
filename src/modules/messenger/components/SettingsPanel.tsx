import { ArrowLeft, User, Bell, Lock, Palette, Info, ShieldCheck, Plug } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  onBack: () => void;
  onOpenBridges?: () => void;
}

export default function SettingsPanel({ onBack, onOpenBridges }: Props) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [sounds, setSounds] = useState(true);

  const sections = [
    {
      title: "Account",
      items: [
        {
          icon: User,
          label: user?.user_metadata?.display_name ?? user?.email?.split("@")[0] ?? "User",
          subtitle: user?.email ?? "Set up your profile",
        },
      ],
    },
    {
      title: "Settings",
      items: [
        {
          icon: Bell, label: "Notifications", toggle: true, value: notifications,
          onToggle: () => setNotifications(!notifications),
        },
        {
          icon: Bell, label: "Message Sounds", toggle: true, value: sounds,
          onToggle: () => setSounds(!sounds),
        },
        {
          icon: Lock, label: "Privacy & Security", subtitle: "Last seen, profile photo, forwarding",
          action: () => toast.info("Privacy & Security — coming soon"),
        },
        {
          icon: Palette, label: "Chat Settings", subtitle: "Background, font size, bubbles",
          action: () => toast.info("Chat Settings — coming soon"),
        },
      ],
    },
    {
      title: "Connections",
      items: [
        {
          icon: Plug, label: "Bridge Connections", subtitle: "WhatsApp, Telegram, Signal, etc.",
          action: onOpenBridges,
        },
      ],
    },
    {
      title: "About",
      items: [
        { icon: ShieldCheck, label: "Encryption", subtitle: "Kyber-1024 + AES-256-GCM · Post-quantum" },
        { icon: Info, label: "Version", subtitle: "Sovereign Messenger v1.0" },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950/80 touch-manipulation">
      <div className="h-[60px] flex items-center gap-3 px-4 border-b border-white/[0.04] flex-shrink-0">
        <button onClick={onBack} className="text-white/50 hover:text-white/80 active:scale-[0.92] transition-all duration-100">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg text-white/90 font-semibold">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title} className="mb-2">
            <div className="px-4 py-2 text-[11px] font-semibold text-teal-400/50 uppercase">
              {section.title}
            </div>
            {section.items.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={i}
                  onClick={'action' in item ? (item as any).action : undefined}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] active:bg-white/[0.05] active:scale-[0.99] transition-all duration-100 select-none"
                >
                  <div className="w-9 h-9 rounded-full bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                    <Icon size={18} className="text-white/40" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[14px] text-white/85">{item.label}</p>
                    {'subtitle' in item && item.subtitle && (
                      <p className="text-[12px] text-white/30 truncate">{item.subtitle}</p>
                    )}
                  </div>
                  {'toggle' in item && item.toggle && (
                    <div
                      onClick={(e) => { e.stopPropagation(); (item as any).onToggle?.(); }}
                      className={`w-10 h-6 rounded-full transition-colors duration-150 cursor-pointer flex items-center px-0.5 ${
                        (item as any).value ? "bg-teal-500/60" : "bg-white/10"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform duration-150 ${
                        (item as any).value ? "translate-x-4" : "translate-x-0"
                      }`} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
