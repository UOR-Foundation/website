import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import {
  Bookmark, Users, Megaphone, UserRound, Phone,
  Settings, Moon, Sun, X, Wallet, ShieldCheck
} from "lucide-react";
import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSavedMessages?: () => void;
  onNewGroup?: () => void;
  onContacts?: () => void;
  onCalls?: () => void;
  onSettings?: () => void;
}

export default function SidebarMenu({ open, onClose, onSavedMessages, onNewGroup, onContacts, onCalls, onSettings }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(true);

  const menuItems = [
    { icon: Bookmark, label: "Saved Messages", action: () => { onSavedMessages?.(); onClose(); } },
    { icon: UserRound, label: "Contacts", action: () => { onContacts?.(); onClose(); } },
    { icon: Phone, label: "Calls", action: () => { onCalls?.(); onClose(); } },
    { divider: true },
    { icon: Users, label: "New Group", action: () => { onNewGroup?.(); onClose(); } },
    { icon: Megaphone, label: "New Channel", action: () => onClose() },
    { divider: true },
    { icon: Wallet, label: "Wallet", action: () => { navigate("/identity"); onClose(); } },
    { icon: Settings, label: "Settings", action: () => { onSettings?.(); onClose(); } },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 z-[200]"
            onClick={onClose}
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed left-0 top-0 bottom-0 w-[280px] bg-slate-950 border-r border-white/[0.06] z-[201] flex flex-col"
          >
            {/* Profile header */}
            <div className="p-4 pb-3 bg-gradient-to-br from-teal-500/10 to-indigo-500/10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-500/30 to-indigo-500/30 border border-white/10 flex items-center justify-center text-xl font-medium text-white/70">
                  {user?.email?.charAt(0)?.toUpperCase() ?? "U"}
                </div>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/60 transition-colors"
                >
                  {darkMode ? <Moon size={18} /> : <Sun size={18} />}
                </button>
              </div>
              <p className="text-[15px] text-white/90 font-medium leading-tight">
                {user?.user_metadata?.display_name ?? user?.email?.split("@")[0] ?? "User"}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ShieldCheck size={11} className="text-teal-400/60" />
                <p className="text-[12px] text-white/35 truncate">
                  {user?.email ?? "Sovereign Identity"}
                </p>
              </div>
            </div>

            {/* Menu items */}
            <div className="flex-1 overflow-y-auto py-1">
              {menuItems.map((item, i) => {
                if ('divider' in item && item.divider) {
                  return <div key={i} className="h-px bg-white/[0.04] my-1" />;
                }
                const Icon = (item as any).icon;
                return (
                  <button
                    key={i}
                    onClick={(item as any).action}
                    className="w-full flex items-center gap-4 px-5 py-3 text-white/70 hover:bg-white/[0.04] transition-colors duration-100"
                  >
                    <Icon size={20} className="text-white/40" />
                    <span className="text-[15px]">{(item as any).label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
