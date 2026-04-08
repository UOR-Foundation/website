/**
 * QrPortalPanel — Clean QR code panel for cross-device session transfer.
 * Functional, scannable QR that links to the current session.
 * Uses React Portal to escape overflow-auto clipping in window containers.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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
  /** Ref to the trigger button for positioning */
  anchorRef?: React.RefObject<HTMLElement>;
}

const PORTAL_TTL = 5 * 60;

const QrPortalPanel: React.FC<QrPortalPanelProps> = ({
  open,
  onClose,
  targetUrl,
  targetLens,
  immersive = true,
  anchorRef,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(PORTAL_TTL);
  const [expired, setExpired] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [anchorPos, setAnchorPos] = useState<{ top: number; right: number } | null>(null);

  // Compute position from anchor ref
  useEffect(() => {
    if (!open || !anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setAnchorPos({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
  }, [open, anchorRef]);

  const generateToken = useCallback(async () => {
    setLoading(true);
    setError(null);
    setExpired(false);
    setSecondsLeft(PORTAL_TTL);
    setQrDataUrl(null);
    setIsGuest(false);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      // Always use the published domain for QR codes so they work when scanned
      const PUBLISHED_ORIGIN = "https://univeral-coordinate-hub.lovable.app";
      const appOrigin = PUBLISHED_ORIGIN;
      let portalUrl: string;

      if (!accessToken) {
        setIsGuest(true);
        const params = new URLSearchParams({ lens: targetLens });
        portalUrl = `${appOrigin}${targetUrl}?${params.toString()}`;
      } else {
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
        portalUrl = `${appOrigin}/search?portal=${token}`;
      }

      // Generate a high-quality, scannable QR code
      const dataUrl = await QRCode.toDataURL(portalUrl, {
        width: 280,
        margin: 3,
        color: {
          dark: "#ffffff",
          light: "#00000000",
        },
        errorCorrectionLevel: "H", // Highest error correction for reliable scanning
      });

      setQrDataUrl(dataUrl);

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

  const panelContent = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="fixed z-[9999] rounded-2xl overflow-hidden"
          style={{
            width: "min(340px, 90vw)",
            top: anchorPos ? `${anchorPos.top}px` : "60px",
            right: anchorPos ? `${anchorPos.right}px` : "16px",
            background: immersive
              ? "rgba(10, 14, 20, 0.96)"
              : "hsl(var(--background) / 0.97)",
            border: immersive
              ? "1px solid rgba(255,255,255,0.08)"
              : "1px solid hsl(var(--border) / 0.12)",
            backdropFilter: "blur(32px)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-3.5 border-b"
            style={{
              borderColor: immersive
                ? "rgba(255,255,255,0.06)"
                : "hsl(var(--border) / 0.1)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <Smartphone
                className={`w-4 h-4 ${
                  immersive ? "text-white/50" : "text-foreground/50"
                }`}
              />
              <span
                className={`text-sm font-semibold tracking-tight ${
                  immersive ? "text-white/85" : "text-foreground/85"
                }`}
              >
                Portal
              </span>
            </div>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ${
                immersive
                  ? "text-white/25 hover:text-white/50 hover:bg-white/[0.06]"
                  : "text-muted-foreground/25 hover:text-muted-foreground/50 hover:bg-muted/10"
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-col items-center px-5 py-6 gap-4">
            {loading && (
              <div className="flex flex-col items-center gap-3 py-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="w-7 h-7 rounded-full border-2 border-t-transparent"
                  style={{
                    borderColor: immersive
                      ? "rgba(255,255,255,0.12)"
                      : "hsl(var(--border) / 0.15)",
                    borderTopColor: "transparent",
                  }}
                />
                <span
                  className={`text-xs ${
                    immersive ? "text-white/35" : "text-muted-foreground/35"
                  }`}
                >
                  Generating link…
                </span>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center gap-3 py-6">
                <span
                  className={`text-sm text-center ${
                    immersive ? "text-white/55" : "text-foreground/55"
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
                {/* QR code — clean, no animation */}
                <div
                  className="relative rounded-2xl overflow-hidden p-4"
                  style={{
                    background: immersive
                      ? "rgba(255,255,255,0.03)"
                      : "hsl(var(--muted) / 0.06)",
                    border: immersive
                      ? "1px solid rgba(255,255,255,0.06)"
                      : "1px solid hsl(var(--border) / 0.08)",
                  }}
                >
                  <img
                    src={qrDataUrl}
                    alt="Scan to continue on mobile"
                    className="w-[220px] h-[220px]"
                    style={{
                      opacity: expired ? 0.2 : 1,
                      transition: "opacity 0.3s",
                      imageRendering: "pixelated",
                    }}
                  />
                  {expired && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
                      <span
                        className={`text-sm font-medium ${
                          immersive ? "text-white/70" : "text-foreground/70"
                        }`}
                      >
                        Expired
                      </span>
                      <button
                        onClick={generateToken}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-colors ${
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

                {/* Label */}
                <span
                  className={`text-[13px] font-medium text-center ${
                    immersive ? "text-white/55" : "text-foreground/55"
                  }`}
                >
                  Scan to continue on mobile
                </span>

                {/* Timer */}
                <span
                  className={`text-[11px] tabular-nums ${
                    expired
                      ? "text-red-400/60"
                      : secondsLeft < 60
                        ? "text-amber-400/60"
                        : immersive
                          ? "text-white/25"
                          : "text-muted-foreground/25"
                  }`}
                >
                  {expired ? "Token expired" : `Expires in ${formatTime(secondsLeft)}`}
                </span>

                {/* Security badge */}
                <div className="flex items-center gap-1.5">
                  <Lock
                    className={`w-3 h-3 ${
                      isGuest
                        ? "text-amber-400/40"
                        : "text-emerald-400/40"
                    }`}
                  />
                  <span
                    className={`text-[10px] ${
                      immersive ? "text-white/20" : "text-muted-foreground/20"
                    }`}
                  >
                    {isGuest
                      ? "Direct link — sign in for encrypted transfer"
                      : "Encrypted one-time session transfer"}
                  </span>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render via portal to escape overflow-auto clipping
  return createPortal(panelContent, document.body);
};

export default QrPortalPanel;
