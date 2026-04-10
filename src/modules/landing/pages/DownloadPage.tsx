/**
 * DownloadPage — Premium installer-style download experience for UOR OS.
 * Accessed from /os shell, not the main landing page.
 * Auto-detects OS, shows module inventory, correct Tauri artifact names.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { usePlatform } from "@/modules/desktop/hooks/usePlatform";
import ModuleChecklist from "@/modules/desktop/components/ModuleChecklist";
import {
  Download, Monitor, Terminal, ChevronRight,
  Shield, Cpu, HardDrive, ArrowLeft, ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ── Types ── */
type OSKey = "macos" | "windows" | "linux";

interface OSInfo {
  key: OSKey;
  label: string;
  icon: React.ReactNode;
  file: string;
  format: string;
  size: string;
  installSteps: string[];
}

/* ── GitHub Releases base URL ── */
const RELEASE_BASE = "https://github.com/UOR-Foundation/uor-os/releases/latest/download";
const VERSION = "2.0.0";

const OS_DATA: OSInfo[] = [
  {
    key: "windows",
    label: "Windows",
    icon: <Monitor size={20} />,
    file: `UOR-OS_${VERSION}_x64-setup.exe`,
    format: ".exe (NSIS Installer)",
    size: "~95 MB",
    installSteps: [
      "Run UOR-OS_2.0.0_x64-setup.exe",
      "Follow the installer prompts",
      "UOR OS launches automatically — your sovereign twin is live",
    ],
  },
  {
    key: "macos",
    label: "macOS",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    ),
    file: `UOR-OS_${VERSION}_universal.dmg`,
    format: ".dmg (Universal)",
    size: "~85 MB",
    installSteps: [
      "Open the downloaded .dmg file",
      "Drag UOR OS to your Applications folder",
      "Double-click to launch — if prompted, right-click → Open",
    ],
  },
  {
    key: "linux",
    label: "Linux",
    icon: <Terminal size={20} />,
    file: `UOR-OS_${VERSION}_amd64.AppImage`,
    format: ".AppImage",
    size: "~80 MB",
    installSteps: [
      "chmod +x UOR-OS_2.0.0_amd64.AppImage",
      "Run: ./UOR-OS_2.0.0_amd64.AppImage",
      "Optional: integrate with desktop via AppImageLauncher",
    ],
  },
];

const SYSTEM_REQS = [
  { icon: <Cpu size={14} />, label: "64-bit processor (x86_64 or ARM64)" },
  { icon: <HardDrive size={14} />, label: "500 MB disk space" },
  { icon: <Shield size={14} />, label: "4 GB RAM" },
];

/* ── Animation variants ── */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

export default function DownloadPage() {
  const { platform, isMac } = usePlatform();
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);

  const detectedOS: OSKey =
    platform === "macos" || platform === "ios" ? "macos" :
    platform === "windows" ? "windows" : "linux";

  const primaryOS = OS_DATA.find(o => o.key === detectedOS) ?? OS_DATA[0];
  const otherOS = OS_DATA.filter(o => o.key !== detectedOS);
  const borderRadius = isMac ? "16px" : "10px";
  const btnRadius = isMac ? "9999px" : "10px";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "hsl(220 18% 6%)" }}
    >
      {/* Back nav */}
      <motion.header
        className="flex items-center gap-3 px-6 py-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <button
          onClick={() => navigate("/os")}
          className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest transition-colors hover:opacity-80"
          style={{ color: "hsl(0 0% 50%)" }}
        >
          <ArrowLeft size={14} />
          Back to OS
        </button>
      </motion.header>

      <motion.main
        className="flex-1 flex flex-col items-center px-6 pb-20"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* Hero */}
        <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto mb-12">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{
              color: "hsl(210 100% 72%)",
              background: "hsl(210 100% 72% / 0.08)",
              border: "1px solid hsl(210 100% 72% / 0.15)",
              borderRadius: btnRadius,
            }}
          >
            <Shield size={12} />
            Sovereign · Local-First · Your Machine
          </div>

          <h1
            className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
            style={{
              color: "hsl(0 0% 95%)",
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
          >
            Download UOR OS
          </h1>

          <p
            className="text-base md:text-lg leading-relaxed max-w-lg mx-auto"
            style={{ color: "hsl(0 0% 50%)" }}
          >
            Same experience. Same data. Now running entirely on your machine.
            <br />
            <span style={{ color: "hsl(0 0% 40%)" }}>Your data never leaves.</span>
          </p>
        </motion.div>

        {/* Primary download card */}
        <motion.div
          variants={fadeUp}
          className="w-full max-w-xl mb-8"
        >
          <div
            className="relative overflow-hidden"
            style={{
              borderRadius,
              background: "linear-gradient(135deg, hsl(220 20% 10%), hsl(220 15% 12%))",
              border: "1px solid hsl(210 100% 72% / 0.2)",
              boxShadow: "0 20px 60px -15px hsl(210 100% 40% / 0.15)",
            }}
          >
            {/* Subtle glow */}
            <div
              className="absolute -top-20 -right-20 w-60 h-60 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, hsl(210 100% 72% / 0.06) 0%, transparent 70%)" }}
            />

            <div className="relative p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span style={{ color: "hsl(0 0% 70%)" }}>{primaryOS.icon}</span>
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: "hsl(0 0% 93%)" }}>
                      UOR OS for {primaryOS.label}
                    </h2>
                    <p className="text-xs" style={{ color: "hsl(0 0% 45%)" }}>
                      v{VERSION} · {primaryOS.size} · Tauri 2.0 Native
                    </p>
                  </div>
                </div>

                <span
                  className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-1"
                  style={{
                    color: "hsl(150 70% 55%)",
                    background: "hsl(150 70% 55% / 0.1)",
                    borderRadius: "6px",
                    border: "1px solid hsl(150 70% 55% / 0.15)",
                  }}
                >
                  Detected
                </span>
              </div>

              {/* Download button */}
              <a
                href={`${RELEASE_BASE}/${primaryOS.file}`}
                className="flex items-center justify-center gap-3 w-full py-3.5 text-sm font-semibold transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
                style={{
                  borderRadius: btnRadius,
                  background: "linear-gradient(135deg, hsl(210 100% 60%), hsl(220 90% 55%))",
                  color: "hsl(0 0% 100%)",
                  boxShadow: "0 4px 16px -4px hsl(210 100% 50% / 0.4)",
                }}
              >
                <Download size={16} />
                Download {primaryOS.format}
              </a>

              {/* Install steps */}
              <div className="mt-6 pt-5" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.06)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] mb-3" style={{ color: "hsl(0 0% 40%)" }}>
                  Installation
                </p>
                <ol className="space-y-2">
                  {primaryOS.installSteps.map((step, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <span
                        className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-[10px] font-bold mt-0.5"
                        style={{
                          color: "hsl(210 100% 72%)",
                          background: "hsl(210 100% 72% / 0.1)",
                          borderRadius: "6px",
                        }}
                      >
                        {j + 1}
                      </span>
                      <span className="text-xs leading-relaxed" style={{ color: "hsl(0 0% 60%)" }}>
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Module Inventory */}
        <motion.div variants={fadeUp} className="w-full max-w-xl mb-8">
          <ModuleChecklist />
        </motion.div>

        {/* Other platforms */}
        <motion.div variants={fadeUp} className="w-full max-w-xl mb-10">
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest transition-colors hover:opacity-80 mb-4"
            style={{ color: "hsl(0 0% 45%)" }}
          >
            Other platforms
            <ChevronRight
              size={12}
              className="transition-transform duration-200"
              style={{ transform: showAll ? "rotate(90deg)" : "rotate(0)" }}
            />
          </button>

          {showAll && (
            <motion.div
              className="grid sm:grid-cols-2 gap-3"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.3 }}
            >
              {otherOS.map(os => (
                <a
                  key={os.key}
                  href={`${RELEASE_BASE}/${os.file}`}
                  className="flex items-center gap-3 p-4 transition-all duration-200 hover:brightness-110"
                  style={{
                    borderRadius,
                    background: "hsl(220 15% 10%)",
                    border: "1px solid hsl(0 0% 100% / 0.06)",
                  }}
                >
                  <span style={{ color: "hsl(0 0% 55%)" }}>{os.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "hsl(0 0% 85%)" }}>
                      {os.label}
                    </p>
                    <p className="text-[10px]" style={{ color: "hsl(0 0% 40%)" }}>
                      {os.format} · {os.size}
                    </p>
                  </div>
                  <Download size={14} style={{ color: "hsl(0 0% 40%)" }} />
                </a>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* System requirements */}
        <motion.div
          variants={fadeUp}
          className="w-full max-w-xl mb-10"
          style={{
            borderRadius,
            background: "hsl(220 15% 8% / 0.6)",
            border: "1px solid hsl(0 0% 100% / 0.04)",
            padding: "20px",
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-3" style={{ color: "hsl(0 0% 40%)" }}>
            System Requirements
          </p>
          <div className="flex flex-wrap gap-5">
            {SYSTEM_REQS.map((req, i) => (
              <div key={i} className="flex items-center gap-2 text-xs" style={{ color: "hsl(0 0% 55%)" }}>
                <span style={{ color: "hsl(0 0% 40%)" }}>{req.icon}</span>
                {req.label}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Browser fallback */}
        <motion.div variants={fadeUp} className="text-center">
          <p className="text-xs mb-3" style={{ color: "hsl(0 0% 40%)" }}>
            Prefer the browser?
          </p>
          <button
            onClick={() => navigate("/os")}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-medium transition-all duration-200 hover:opacity-80"
            style={{
              color: "hsl(0 0% 55%)",
              border: "1px solid hsl(0 0% 100% / 0.08)",
              borderRadius: btnRadius,
            }}
          >
            Continue in browser
            <ExternalLink size={11} />
          </button>
        </motion.div>
      </motion.main>
    </div>
  );
}
