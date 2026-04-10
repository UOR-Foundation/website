/**
 * DownloadPage — Dedicated download page with OS detection, install guides,
 * system requirements, and checksums.
 *
 * Actual binaries should be hosted in public/releases/ or on a CDN/GitHub Releases.
 */

import { useState } from "react";
import { usePlatform } from "@/modules/desktop/hooks/usePlatform";
import { Download, Apple, Monitor, Terminal, ChevronDown, ChevronUp, Shield, Cpu, HardDrive, ExternalLink } from "lucide-react";
import Layout from "@/modules/core/components/Layout";

type OSKey = "macos" | "windows" | "linux";

interface OSInfo {
  key: OSKey;
  label: string;
  icon: React.ReactNode;
  file: string;
  size: string;
  installSteps: string[];
  checksum: string;
}

const OS_DATA: OSInfo[] = [
  {
    key: "macos",
    label: "macOS",
    icon: <Apple size={28} />,
    file: "UOR-Desktop-darwin-x64.zip",
    size: "~85 MB",
    installSteps: [
      "Open the downloaded .zip file",
      "Drag UOR Desktop to your Applications folder",
      "Double-click to launch — if prompted, right-click → Open",
    ],
    checksum: "sha256:pending-release",
  },
  {
    key: "windows",
    label: "Windows",
    icon: <Monitor size={28} />,
    file: "UOR-Desktop-win32-x64.zip",
    size: "~95 MB",
    installSteps: [
      "Extract the downloaded .zip file",
      "Run UOR-Desktop-Setup.exe",
      "Follow the installer prompts — your twin launches automatically",
    ],
    checksum: "sha256:pending-release",
  },
  {
    key: "linux",
    label: "Linux",
    icon: <Terminal size={28} />,
    file: "UOR-Desktop-linux-x64.tar.gz",
    size: "~80 MB",
    installSteps: [
      "Extract: tar -xzf UOR-Desktop-linux-x64.tar.gz",
      "Run: ./uor-desktop   (or use the included AppImage)",
      "Optional: move to /opt or add to your PATH",
    ],
    checksum: "sha256:pending-release",
  },
];

const SYSTEM_REQS = [
  { icon: <Cpu size={16} />, label: "64-bit processor" },
  { icon: <HardDrive size={16} />, label: "500 MB free disk space" },
  { icon: <Shield size={16} />, label: "4 GB RAM minimum" },
];

export default function DownloadPage() {
  const { platform, isMac } = usePlatform();
  const [expanded, setExpanded] = useState<OSKey | null>(null);

  const detectedOS: OSKey =
    platform === "macos" || platform === "ios" ? "macos" :
    platform === "windows" ? "windows" : "linux";

  const rounded = isMac ? "rounded-2xl" : "rounded-xl";
  const btnRound = isMac ? "rounded-full" : "rounded-lg";

  return (
    <Layout>
      <div className="min-h-screen bg-background pt-24 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16 animate-fade-in-up opacity-0" style={{ animationDelay: "0.1s" }}>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Download UOR Desktop
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Your sovereign local twin — runs entirely on your machine.
              Your data never leaves.
            </p>
          </div>

          {/* OS Cards */}
          <div className="grid md:grid-cols-3 gap-5 mb-16">
            {OS_DATA.map((os, i) => {
              const isDetected = os.key === detectedOS;
              const isOpen = expanded === os.key;

              return (
                <div
                  key={os.key}
                  className={`
                    relative flex flex-col border transition-all duration-300
                    ${rounded} p-6
                    ${isDetected
                      ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10 ring-1 ring-primary/20"
                      : "border-border/50 bg-card/50 hover:border-border"
                    }
                    animate-fade-in-up opacity-0
                  `}
                  style={{ animationDelay: `${0.2 + i * 0.1}s` }}
                >
                  {isDetected && (
                    <span className={`absolute -top-3 left-6 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-primary text-primary-foreground ${btnRound}`}>
                      Detected
                    </span>
                  )}

                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-foreground/70">{os.icon}</span>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">{os.label}</h2>
                      <p className="text-xs text-muted-foreground">{os.size}</p>
                    </div>
                  </div>

                  <a
                    href={`/releases/${os.file}`}
                    className={`
                      inline-flex items-center justify-center gap-2 px-5 py-2.5
                      text-sm font-semibold transition-all duration-200
                      ${btnRound}
                      ${isDetected
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }
                    `}
                  >
                    <Download size={15} />
                    Download for {os.label}
                  </a>

                  {/* Install instructions toggle */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : os.key)}
                    className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Install guide
                    {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  {isOpen && (
                    <ol className="mt-3 space-y-2 text-sm text-foreground/70 animate-fade-in">
                      {os.installSteps.map((step, j) => (
                        <li key={j} className="flex gap-2">
                          <span className="text-primary font-bold text-xs mt-0.5">{j + 1}.</span>
                          <span className="font-mono text-xs leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  )}

                  {/* Checksum */}
                  <p className="mt-auto pt-4 text-[10px] text-muted-foreground/50 font-mono truncate">
                    {os.checksum}
                  </p>
                </div>
              );
            })}
          </div>

          {/* System Requirements */}
          <div className={`border border-border/40 ${rounded} p-6 mb-10 bg-card/30 animate-fade-in-up opacity-0`} style={{ animationDelay: "0.5s" }}>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
              System Requirements
            </h3>
            <div className="flex flex-wrap gap-6">
              {SYSTEM_REQS.map((req, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-foreground/70">
                  <span className="text-muted-foreground">{req.icon}</span>
                  {req.label}
                </div>
              ))}
            </div>
          </div>

          {/* Browser fallback */}
          <div className="text-center animate-fade-in-up opacity-0" style={{ animationDelay: "0.6s" }}>
            <p className="text-sm text-muted-foreground mb-3">
              Don't want to install anything?
            </p>
            <a
              href="/os"
              className={`
                inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium
                border border-border/50 text-foreground/70 hover:text-foreground
                hover:border-border transition-all duration-200 ${btnRound}
              `}
            >
              Try it in your browser
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
