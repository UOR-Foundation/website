/**
 * WhatsAppWidget — Desktop icon for Lumen WhatsApp integration
 * ═══════════════════════════════════════════════════════════════
 *
 * A compact desktop icon that opens an inline WhatsApp connection
 * dialog. Once connected, shows a subtle active indicator.
 *
 * @module hologram-ui/components/widgets/WhatsAppWidget
 */

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { DesktopMode } from "@/modules/hologram-os/projection-engine";
import { useDraggablePosition } from "../../hooks/useDraggablePosition";

interface WhatsAppWidgetProps {
  bgMode: DesktopMode;
}

export default function WhatsAppWidget({ bgMode }: WhatsAppWidgetProps) {
  const { style: dragStyle, handlers, wasDragged } = useDraggablePosition({
    storageKey: "hologram-pos:whatsapp",
    defaultPos: { x: 24, y: window.innerHeight - 120 },
    snapSize: { width: 52, height: 72 },
    mode: "absolute",
  });
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [error, setError] = useState("");

  // Check existing connection
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("whatsapp_connections")
          .select("id, phone_number")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();
        if (data) {
          setConnected(true);
          setPhone(data.phone_number);
        }
      } catch {}
    })();
  }, []);

  const handleConnect = useCallback(async () => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length < 7) { setError("Please enter a valid phone number"); return; }
    setLoading(true);
    setError("");
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) { setError("Please sign in first"); setLoading(false); return; }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: "initiate_onboarding", phoneNumber: cleaned }),
        },
      );
      const data = await resp.json();
      if (data.connection_id) {
        setConnected(true);
        setGreeting(data.message || "");
      } else {
        setError(data.error || "Connection failed");
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [phone]);

  const isLight = bgMode === "white";
  const iconColor = isLight ? "hsla(152, 55%, 35%, 0.9)" : "hsla(152, 60%, 50%, 0.85)";
  const iconBg = isLight ? "hsla(152, 40%, 96%, 0.9)" : "hsla(152, 30%, 15%, 0.85)";
  const textColor = isLight ? "hsla(0, 0%, 10%, 0.85)" : "hsla(0, 0%, 92%, 0.85)";
  const mutedColor = isLight ? "hsla(0, 0%, 10%, 0.5)" : "hsla(0, 0%, 92%, 0.5)";
  const cardBg = isLight ? "hsla(0, 0%, 100%, 0.95)" : "hsla(0, 0%, 8%, 0.95)";
  const cardBorder = isLight ? "hsla(0, 0%, 0%, 0.08)" : "hsla(0, 0%, 100%, 0.08)";
  const inputBg = isLight ? "hsla(0, 0%, 96%, 0.9)" : "hsla(0, 0%, 14%, 0.9)";

  return (
    <div className="fixed z-[400]" style={dragStyle}>
      {/* Desktop icon */}
      <button
        {...handlers}
        onClick={() => { if (!wasDragged()) setOpen(!open); }}
        className="relative flex flex-col items-center gap-1.5 group"
        style={{ background: "none", border: "none", cursor: "pointer" }}
        aria-label="Lumen on WhatsApp"
      >
        <div
          className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-105"
          style={{
            background: iconBg,
            boxShadow: `0 4px 16px hsla(152, 40%, 30%, 0.12)`,
            backdropFilter: "blur(12px)",
          }}
        >
          <MessageCircle className="w-6 h-6" style={{ color: iconColor }} />
          {/* Active indicator */}
          {connected && (
            <div
              className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full"
              style={{
                background: "hsl(152, 68%, 42%)",
                boxShadow: "0 0 8px hsla(152, 68%, 42%, 0.5)",
                border: `2px solid ${bgMode === "white" ? "hsl(0, 0%, 100%)" : "hsl(0, 0%, 5%)"}`,
              }}
            />
          )}
        </div>
        <span
          className="text-[10px] tracking-wide"
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            color: mutedColor,
            textShadow: bgMode === "image" ? "0 1px 4px hsla(0, 0%, 0%, 0.5)" : "none",
          }}
        >
          WhatsApp
        </span>
      </button>

      {/* Connection dialog */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-[300px] rounded-2xl p-5 z-[600]"
            style={{
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              boxShadow: "0 20px 60px hsla(0, 0%, 0%, 0.2), 0 4px 16px hsla(0, 0%, 0%, 0.1)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 p-1 rounded-full hover:opacity-70 transition-opacity"
              style={{ color: mutedColor }}
            >
              <X className="w-4 h-4" />
            </button>

            {connected && greeting ? (
              /* Success state */
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "hsla(152, 60%, 40%, 0.15)" }}
                  >
                    <Check className="w-4 h-4" style={{ color: "hsl(152, 60%, 42%)" }} />
                  </div>
                  <p
                    className="text-sm font-medium"
                    style={{ fontFamily: "'Playfair Display', serif", color: textColor }}
                  >
                    Lumen is on the way
                  </p>
                </div>
                <div
                  className="rounded-xl px-4 py-3"
                  style={{ background: "hsla(152, 58%, 88%, 0.3)", border: "1px solid hsla(152, 40%, 60%, 0.15)" }}
                >
                  <p
                    className="text-[13px] leading-relaxed"
                    style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: textColor }}
                  >
                    {greeting}
                  </p>
                </div>
                <p
                  className="text-[11px] text-center"
                  style={{ color: mutedColor, fontFamily: "'DM Sans', system-ui, sans-serif" }}
                >
                  Check your WhatsApp. Lumen is waiting.
                </p>
              </motion.div>
            ) : connected ? (
              /* Already connected */
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "hsla(152, 60%, 40%, 0.15)" }}
                  >
                    <Check className="w-4 h-4" style={{ color: "hsl(152, 60%, 42%)" }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ fontFamily: "'Playfair Display', serif", color: textColor }}>
                      Connected
                    </p>
                    <p className="text-[11px]" style={{ color: mutedColor, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                      Lumen is available on WhatsApp
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Setup state */
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <p
                    className="text-[15px] font-medium"
                    style={{ fontFamily: "'Playfair Display', serif", color: textColor }}
                  >
                    Lumen on WhatsApp
                  </p>
                  <p
                    className="text-[12px] leading-relaxed"
                    style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: mutedColor }}
                  >
                    Enter your number. Lumen will reach out with a personal greeting.
                  </p>
                </div>

                <div
                  className="flex items-center gap-2 px-3.5 py-3 rounded-xl"
                  style={{ background: inputBg, border: `1px solid ${cardBorder}` }}
                >
                  <span style={{ fontSize: "16px" }}>📱</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setError(""); }}
                    placeholder="+1 (555) 123-4567"
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                      color: textColor,
                      caretColor: iconColor,
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleConnect(); }}
                  />
                </div>

                {error && (
                  <p className="text-[11px]" style={{ color: "hsl(0, 60%, 55%)", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
                    {error}
                  </p>
                )}

                <button
                  onClick={handleConnect}
                  disabled={loading || phone.replace(/\D/g, "").length < 7}
                  className="w-full py-3 rounded-xl text-[13px] font-medium transition-all active:scale-[0.98]"
                  style={{
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    background: phone.replace(/\D/g, "").length >= 7
                      ? "linear-gradient(135deg, hsl(152, 68%, 35%), hsl(152, 55%, 42%))"
                      : inputBg,
                    color: phone.replace(/\D/g, "").length >= 7 ? "white" : mutedColor,
                    boxShadow: phone.replace(/\D/g, "").length >= 7 ? "0 6px 20px hsla(152, 60%, 30%, 0.2)" : "none",
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Reaching out...
                    </span>
                  ) : "Send Lumen to WhatsApp"}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
