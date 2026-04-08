/**
 * QrPortalPanel — Animated QR code panel for cross-device session transfer.
 * Shows a QR code with a glowing border, countdown timer, and status states.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, RotateCcw, X, Smartphone } from "lucide-react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";

interface QrPortalPanelProps {
  open: boolean;
  onClose: () => void;
  targetUrl: string;
  targetLens: string;
  immersive?: boolean;
}

const PORTAL_TTL = 5 * 60; // 5 minutes in seconds

const QrPortalPanel: React.FC<QrPortalPanelProps> = ({
  open,
  onClose,
  targetUrl,
  targetLens,
  immersive = true,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(PORTAL_TTL);
  const [expired, setExpired] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const generateToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    setExpired(false);
    setSecondsLeft(PORTAL_TTL);
    setQrDataUrl(null);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        setError("Sign in to use Portal");
        setLoading(false);
        return;
      }

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/portal-transfer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            target_url: targetUrl,
            target_lens: targetLens,
          }),
        }
      );

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "Failed to create portal");
      }

      const { token } = await res.json();

      // Build the QR URL pointing to the app
      const appOrigin = window.location.origin;
      const portalUrl = `${appOrigin}/search?portal=${token}`;

      const dataUrl = await QRCode.toDataURL(portalUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: "#ffffff",
          light: "#00000000", // transparent background
        },
        errorCorrectionLevel: "M",
      });

      setQrDataUrl(dataUrl);

      // Start countdown
      if (timerRef.current) clearInterval(timerRef.current);
      const start = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - start) / 1000);
        const remaining = PORTAL_TTL - elapsed;
        if (remaining <= 0) {
          setExpired(true);
          setSecondsLeft(0);
          if (timerRef.current) clearInterval(timerRef.current);
        } else {
          setSecondsLeft(remaining);
        }
      }, 1000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [targetUrl, targetLens]);

  // Generate on open
  useEffect(() => {
    if (open) {
      generateToken();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open, generateToken]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = secondsLeft / PORTAL_TTL; // 1 → 0

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="absolute right-0 top-full mt-2 z-50 rounded-2xl overflow-hidden"
          style={{
            width: "min(320px, 90vw)",
            background: immersive
              ? "rgba(8, 12, 16, 0.94)"
              : "hsl(var(--background) / 0.96)",
            border: immersive
              ? "1px solid rgba(255,255,255,0.1)"
              : "1px solid hsl(var(--border) / 0.15)",
            backdropFilter: "blur(32px)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{
              borderColor: immersive
                ? "rgba(255,255,255,0.06)"
                : "hsl(var(--border) / 0.1)",
            }}
          >
            <div className="flex items-center gap-2">
              <Smartphone
                className={`w-4 h-4 ${
                  immersive ? "text-white/60" : "text-foreground/60"
                }`}
              />
              <span
                className={`text-[13px] font-semibold ${
                  immersive ? "text-white/80" : "text-foreground/80"
                }`}
              >
                Portal
              </span>
            </div>
            <button
              onClick={onClose}
              className={`p-1 rounded-lg transition-colors ${
                immersive
                  ? "text-white/30 hover:text-white/60 hover:bg-white/[0.06]"
                  : "text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-muted/10"
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-col items-center px-4 py-5 gap-4">
            {loading && (
              <div className="flex flex-col items-center gap-3 py-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="w-8 h-8 rounded-full border-2 border-t-transparent"
                  style={{
                    borderColor: immersive
                      ? "rgba(255,255,255,0.15)"
                      : "hsl(var(--border) / 0.2)",
                    borderTopColor: "transparent",
                  }}
                />
                <span
                  className={`text-xs ${
                    immersive ? "text-white/40" : "text-muted-foreground/40"
                  }`}
                >
                  Opening portal…
                </span>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center gap-3 py-4">
                <span
                  className={`text-sm text-center ${
                    immersive ? "text-white/60" : "text-foreground/60"
                  }`}
                >
                  {error}
                </span>
                <button
                  onClick={generateToken}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    immersive
                      ? "bg-white/[0.08] text-white/70 hover:bg-white/[0.12]"
                      : "bg-muted/15 text-foreground/70 hover:bg-muted/25"
                  }`}
                >
                  <RotateCcw className="w-3 h-3" />
                  Try again
                </button>
              </div>
            )}

            {qrDataUrl && !loading && !error && (
              <>
                {/* QR with animated glow border */}
                <div className="relative">
                  {/* Animated glow ring */}
                  {!expired && (
                    <motion.div
                      className="absolute -inset-2 rounded-2xl"
                      style={{
                        background: `conic-gradient(from 0deg, transparent, rgba(99,210,255,0.3), rgba(139,92,246,0.3), transparent)`,
                        filter: "blur(8px)",
                      }}
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 4,
                        ease: "linear",
                      }}
                    />
                  )}

                  {/* Progress arc (SVG ring) */}
                  <svg
                    className="absolute -inset-1.5"
                    viewBox="0 0 108 108"
                    style={{ transform: "rotate(-90deg)" }}
                  >
                    <circle
                      cx="54"
                      cy="54"
                      r="52"
                      fill="none"
                      stroke={
                        immersive
                          ? "rgba(255,255,255,0.06)"
                          : "hsl(var(--border) / 0.08)"
                      }
                      strokeWidth="2"
                    />
                    <circle
                      cx="54"
                      cy="54"
                      r="52"
                      fill="none"
                      stroke={
                        expired
                          ? "rgba(239,68,68,0.5)"
                          : "rgba(99,210,255,0.6)"
                      }
                      strokeWidth="2"
                      strokeDasharray={`${2 * Math.PI * 52}`}
                      strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress)}`}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dashoffset 1s linear" }}
                    />
                  </svg>

                  {/* QR image */}
                  <div
                    className="relative rounded-xl overflow-hidden p-3"
                    style={{
                      background: immersive
                        ? "rgba(255,255,255,0.04)"
                        : "hsl(var(--muted) / 0.08)",
                    }}
                  >
                    <img
                      src={qrDataUrl}
                      alt="QR Code"
                      className="w-[200px] h-[200px]"
                      style={{
                        opacity: expired ? 0.25 : 1,
                        transition: "opacity 0.3s",
                      }}
                    />
                    {expired && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <span
                          className={`text-sm font-medium ${
                            immersive ? "text-white/70" : "text-foreground/70"
                          }`}
                        >
                          Expired
                        </span>
                        <button
                          onClick={generateToken}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            immersive
                              ? "bg-white/[0.1] text-white/80 hover:bg-white/[0.15]"
                              : "bg-primary/10 text-primary hover:bg-primary/15"
                          }`}
                        >
                          <RotateCcw className="w-3 h-3" />
                          Regenerate
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Label */}
                <span
                  className={`text-[13px] font-medium text-center ${
                    immersive ? "text-white/60" : "text-foreground/60"
                  }`}
                >
                  Scan to continue on mobile
                </span>

                {/* Timer */}
                <span
                  className={`text-[11px] tabular-nums ${
                    expired
                      ? "text-red-400/70"
                      : secondsLeft < 60
                        ? "text-amber-400/70"
                        : immersive
                          ? "text-white/30"
                          : "text-muted-foreground/30"
                  }`}
                >
                  {expired ? "Token expired" : `Expires in ${formatTime(secondsLeft)}`}
                </span>

                {/* Security badge */}
                <div className="flex items-center gap-1.5 mt-1">
                  <Lock
                    className={`w-3 h-3 ${
                      immersive
                        ? "text-emerald-400/50"
                        : "text-emerald-500/50"
                    }`}
                  />
                  <span
                    className={`text-[10px] ${
                      immersive ? "text-white/25" : "text-muted-foreground/25"
                    }`}
                  >
                    Encrypted one-time session transfer
                  </span>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default QrPortalPanel;
