/**
 * GenesisPopover — Your connection to Hologram
 * ═══════════════════════════════════════════════
 *
 * Appears when clicking the genesis dot in the sidebar.
 * Shows an intuitive, human-centric summary of the living system
 * and the trust connection status (TEE).
 *
 * TEE trust is NOT auto-triggered for visitors.
 * It is established during:
 *   1. Identity creation (founding ceremony) — TEE.attest()
 *   2. Returning login — TEE.assert()
 */

import { useEffect, useState } from "react";
import { X, Wifi } from "lucide-react";
import { bootSync as boot, type QKernelBoot } from "@/hologram/kernel/init/q-boot";
import { TEEBridge, type TEECapabilities } from "@/hologram/kernel/security/tee-bridge";

interface GenesisPopoverProps {
  open: boolean;
  onClose: () => void;
  bgMode?: "image" | "white" | "dark";
}

type TrustLevel = "hardware" | "available" | "software";

function useTrustStatus() {
  const [trust, setTrust] = useState<{
    level: TrustLevel;
    label: string;
    caps: TEECapabilities | null;
  }>({ level: "software", label: "Checking…", caps: null });

  useEffect(() => {
    const bridge = new TEEBridge();
    bridge.detect().then(caps => {
      if (caps.hardwareAttestation && bridge.hasCredential) {
        setTrust({ level: "hardware", label: getHumanLabel(caps), caps });
      } else if (caps.hardwareAttestation) {
        setTrust({ level: "available", label: "Available — activates during sign-in", caps });
      } else {
        setTrust({ level: "software", label: "Protected by mathematical proofs", caps });
      }
    }).catch(() => {
      setTrust({ level: "software", label: "Protected by mathematical proofs", caps: null });
    });

    // Listen for live updates from ceremony/login
    const handler = (e: Event) => {
      const trusted = (e as CustomEvent).detail?.trusted;
      if (trusted) {
        bridge.detect().then(caps => {
          setTrust({ level: "hardware", label: getHumanLabel(caps), caps });
        });
      }
    };
    window.addEventListener("hologram:tee-update", handler);
    return () => window.removeEventListener("hologram:tee-update", handler);
  }, []);

  return trust;
}

function getHumanLabel(caps: TEECapabilities): string {
  const name = caps.providerName.toLowerCase();
  if (name.includes("secure enclave") || name.includes("apple")) return "Secure Enclave";
  if (name.includes("trustzone") || name.includes("arm")) return "TrustZone";
  if (name.includes("tpm") || name.includes("platform")) return "Security Chip";
  if (name.includes("security key") || name.includes("roaming")) return "Security Key";
  return "Device Security";
}

export default function GenesisPopover({ open, onClose, bgMode = "image" }: GenesisPopoverProps) {
  const [kernel, setKernel] = useState<QKernelBoot | null>(null);
  const trust = useTrustStatus();

  useEffect(() => {
    if (open && !kernel) {
      try { setKernel(boot()); } catch { /* graceful */ }
    }
  }, [open, kernel]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const isLight = bgMode === "white";
  const bg = isLight ? "hsl(30, 12%, 97%)" : "hsl(25, 8%, 8%)";
  const border = isLight ? "hsla(30, 15%, 80%, 0.3)" : "hsla(38, 15%, 30%, 0.2)";
  const text = isLight ? "hsl(25, 8%, 20%)" : "hsl(30, 12%, 88%)";
  const textMuted = isLight ? "hsl(25, 8%, 50%)" : "hsl(30, 10%, 55%)";
  const gold = isLight ? "hsl(32, 40%, 45%)" : "hsl(38, 50%, 60%)";
  const dotColor = isLight ? "hsl(32, 40%, 50%)" : "hsla(38, 50%, 60%, 0.85)";
  const cardBg = isLight ? "hsla(30, 10%, 94%, 0.7)" : "hsla(38, 10%, 12%, 0.5)";
  const cardBorder = isLight ? "hsla(30, 15%, 80%, 0.2)" : "hsla(38, 15%, 30%, 0.12)";
  const greenDot = "hsl(142, 55%, 50%)";

  const stage = kernel?.stage ?? "off";
  const isRunning = stage === "running";
  const bootMs = kernel?.bootTimeMs ? kernel.bootTimeMs.toFixed(1) : "—";
  const checks = kernel?.post.checks ?? [];
  const passedCount = checks.filter(c => c.passed).length;

  const isHardwareTrusted = trust.level === "hardware";
  const isAvailable = trust.level === "available";

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9800,
          background: isLight ? "hsla(0,0%,100%,0.3)" : "hsla(0,0%,0%,0.25)",
        }}
      />

      {/* Popover */}
      <div
        style={{
          position: "fixed",
          bottom: "80px",
          left: "80px",
          zIndex: 9900,
          width: "340px",
          maxHeight: "70vh",
          overflowY: "auto",
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: "16px",
          boxShadow: isLight
            ? "0 8px 40px hsla(25, 15%, 20%, 0.1)"
            : "0 8px 40px hsla(25, 10%, 0%, 0.4)",
          fontFamily: "'DM Sans', system-ui, sans-serif",
          color: text,
          padding: "20px",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="rounded-full"
              style={{
                width: "8px",
                height: "8px",
                background: isHardwareTrusted ? greenDot : dotColor,
                boxShadow: isHardwareTrusted
                  ? `0 0 10px hsla(142, 55%, 50%, 0.5)`
                  : `0 0 calc(6px + 10px * var(--h-score, 0.5)) ${dotColor}`,
                animation: isHardwareTrusted
                  ? "none"
                  : "heartbeat-love calc(1.8s + 1.2s * (1 - var(--h-score, 0.5))) ease-in-out infinite",
              }}
            />
            <span
              className="text-[13px] font-medium tracking-[0.15em] uppercase"
              style={{ color: gold }}
            >
              Genesis
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
            style={{ color: textMuted }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Trusted Connection Status ── */}
        <div
          className="rounded-xl px-3.5 py-3 mb-3"
          style={{
            background: isHardwareTrusted
              ? (isLight ? "hsla(142, 40%, 94%, 0.7)" : "hsla(142, 30%, 12%, 0.4)")
              : cardBg,
            border: `1px solid ${isHardwareTrusted
              ? (isLight ? "hsla(142, 40%, 70%, 0.2)" : "hsla(142, 30%, 30%, 0.15)")
              : cardBorder}`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            {/* Signal bars */}
            <div className="flex items-center gap-1">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="rounded-sm"
                  style={{
                    width: "3px",
                    height: `${8 + i * 3}px`,
                    background: isHardwareTrusted
                      ? `hsla(142, 55%, ${55 - i * 5}%, ${0.9 - i * 0.1})`
                      : isAvailable
                        ? `hsla(38, 40%, 55%, ${0.5 - i * 0.1})`
                        : `hsla(38, 40%, 55%, ${0.3 - i * 0.05})`,
                    transition: "background 600ms ease",
                  }}
                />
              ))}
            </div>
            <span className="text-[11px] uppercase tracking-[0.12em] font-medium" style={{
              color: isHardwareTrusted ? (isLight ? "hsl(142, 40%, 35%)" : "hsl(142, 40%, 60%)") : textMuted,
            }}>
              {isHardwareTrusted ? "Trusted connection" : "Connection status"}
            </span>
          </div>

          {/* Why · How · What — context-sensitive */}
          {isHardwareTrusted ? (
            <>
              <p className="text-[12px] leading-relaxed" style={{ color: text }}>
                <strong>Connected</strong> through your device's {trust.label}.
                Your identity is hardware-bound — like a private, encrypted channel between
                you and Hologram that only this device can open.
              </p>
              <p className="text-[10px] mt-2 leading-relaxed" style={{ color: textMuted }}>
                <strong>Why:</strong> Complete data sovereignty — your data never leaves this trusted space.<br />
                <strong>How:</strong> Your device's secure enclave holds the cryptographic key.<br />
                <strong>What:</strong> Every session is verified on-device before any data flows.
              </p>
            </>
          ) : isAvailable ? (
            <>
              <p className="text-[12px] leading-relaxed" style={{ color: text }}>
                Your device has a hardware security vault ready.
                It will activate automatically when you create your identity or sign in — 
                binding your Hologram to this device like tuning into a private signal.
              </p>
              <p className="text-[10px] mt-2 leading-relaxed" style={{ color: textMuted }}>
                No action needed now. The trusted connection establishes naturally
                during your first ceremony or next sign-in.
              </p>
            </>
          ) : (
            <>
              <p className="text-[12px] leading-relaxed" style={{ color: text }}>
                Your session is protected using mathematical proofs.
                Everything you do here is verified and tamper-proof,
                even without dedicated hardware security.
              </p>
              <p className="text-[10px] mt-2 leading-relaxed" style={{ color: textMuted }}>
                Think of it as a lock made of math instead of metal — 
                different mechanism, same guarantee: only you hold the key.
              </p>
            </>
          )}
        </div>

        {/* Why — the soul */}
        <p className="text-[13px] leading-relaxed mb-4" style={{ color: textMuted }}>
          This system is alive. Every time it wakes up, it runs a self-check,
          like a heartbeat, to make sure everything is genuine and nothing has been
          tampered with.
        </p>

        {/* Status */}
        <div
          className="rounded-xl px-3.5 py-3 mb-3 flex items-center justify-between"
          style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: isRunning ? greenDot : "hsl(0, 65%, 55%)",
                boxShadow: isRunning ? `0 0 8px hsla(142, 55%, 50%, 0.4)` : "none",
              }}
            />
            <span className="text-[12px] font-medium" style={{ color: text }}>
              {isRunning ? "System Healthy" : stage === "panic" ? "Integrity Alert" : "Starting…"}
            </span>
          </div>
          <span className="text-[11px]" style={{ color: textMuted }}>
            {bootMs}ms
          </span>
        </div>

        {/* Self-checks */}
        <div className="mb-3">
          <span className="text-[11px] uppercase tracking-[0.12em] font-medium" style={{ color: textMuted }}>
            Self-checks: {passedCount}/{checks.length} verified
          </span>
          <div className="mt-2 space-y-1.5">
            {checks.map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: c.passed ? greenDot : "hsl(0, 65%, 55%)" }}
                />
                <span className="text-[12px]" style={{ color: text }}>{c.name}</span>
                <span className="text-[10px] ml-auto" style={{ color: textMuted }}>
                  {c.passed ? "✓" : "✗"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* What & How */}
        <div
          className="rounded-xl px-3.5 py-3 mb-3"
          style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
        >
          <span className="text-[11px] uppercase tracking-[0.12em] font-medium block mb-2" style={{ color: textMuted }}>
            What this means
          </span>
          <p className="text-[12px] leading-relaxed" style={{ color: text }}>
            Every piece of data in this system has a unique fingerprint. When the kernel boots,
            it verifies that the math behind those fingerprints is correct. If
            even one rule fails, the system refuses to start. This is how you know what
            you see is real.
          </p>
        </div>

        {/* Topology snapshot */}
        {kernel?.hardware && (
          <div
            className="rounded-xl px-3.5 py-3"
            style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
          >
            <span className="text-[11px] uppercase tracking-[0.12em] font-medium block mb-2" style={{ color: textMuted }}>
              Structure
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Vertices", value: kernel.hardware.vertexCount },
                { label: "Mirrors", value: kernel.hardware.mirrorPairs },
                { label: "Algebras", value: kernel.firmware.levels },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-[16px] font-medium" style={{ color: gold }}>{s.value}</div>
                  <div className="text-[10px]" style={{ color: textMuted }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
