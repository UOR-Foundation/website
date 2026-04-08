/**
 * MobileSearchMenu — full-screen hamburger overlay with editorial navigation.
 */

import { motion, AnimatePresence } from "framer-motion";
import { X, Home, Compass, Sparkles, Clock, Shield, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onAiMode: () => void;
  onIdentity: () => void;
}

const NAV_ITEMS = [
  { label: "Home", icon: Home, path: "/" },
  { label: "Discover", icon: Compass, path: "/discover" },
  { label: "AI Oracle", icon: Sparkles, action: "ai" },
  { label: "History", icon: Clock, path: "/os" },
];

export default function MobileSearchMenu({ open, onClose, onAiMode, onIdentity }: Props) {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const handleNav = (item: typeof NAV_ITEMS[0]) => {
    if (item.action === "ai") {
      onAiMode();
    } else if (item.path) {
      navigate(item.path);
    }
    onClose();
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] bg-background flex flex-col"
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-[env(safe-area-inset-top,16px)] pb-4">
            <span className="text-sm font-bold tracking-[0.15em] text-foreground/70 uppercase">UOR</span>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-muted-foreground/50 hover:text-foreground/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 flex flex-col justify-center px-8 -mt-16">
            {NAV_ITEMS.map((item, i) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + i * 0.04, type: "spring", damping: 20 }}
                onClick={() => handleNav(item)}
                className="flex items-center gap-4 py-4 text-left group"
              >
                <item.icon className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
                <span className="text-[28px] font-display font-semibold text-foreground/80 group-hover:text-foreground tracking-wide transition-colors">
                  {item.label}
                </span>
              </motion.button>
            ))}
          </nav>

          {/* Separator */}
          <div className="mx-8 border-t border-white/[0.06]" />

          {/* Bottom section */}
          <div className="px-8 py-6 pb-[env(safe-area-inset-bottom,24px)] space-y-3">
            {user ? (
              <>
                <button
                  onClick={() => { onIdentity(); onClose(); }}
                  className="flex items-center gap-3 w-full py-2.5 text-left"
                >
                  <Shield className="w-4 h-4 text-muted-foreground/40" />
                  <span className="text-base text-foreground/70">
                    {profile?.displayName ?? "My Identity"}
                  </span>
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full py-2.5 text-left"
                >
                  <LogOut className="w-4 h-4 text-muted-foreground/30" />
                  <span className="text-base text-muted-foreground/50">Sign Out</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => { onIdentity(); onClose(); }}
                className="w-full py-3 rounded-xl border border-white/[0.1] bg-white/[0.04] text-base font-medium text-foreground/80 hover:bg-white/[0.08] transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
