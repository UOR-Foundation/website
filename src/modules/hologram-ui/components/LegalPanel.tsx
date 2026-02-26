/**
 * LegalPanel — Graceful bottom-reveal legal content canvas.
 *
 * Inspired by Hedosophia's elegant minimalism. The panel rises from the
 * bottom of the viewport with a smooth spring-like transition, pushing
 * the main content up and dimming the background. Fully scrollable
 * for long-form legal text. Collapse by clicking the close bar or
 * pressing Escape.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

type LegalTab = "privacy" | "terms";

interface LegalPanelProps {
  open: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
  bgMode?: "dark" | "white";
}

// ── Palette ────────────────────────────────────────────────────────────────

const palette = (isDark: boolean) => ({
  bg: isDark ? "hsl(0, 0%, 5%)" : "hsl(38, 20%, 97%)",
  text: isDark ? "hsl(38, 12%, 78%)" : "hsl(30, 8%, 30%)",
  textMuted: isDark ? "hsl(30, 8%, 50%)" : "hsl(30, 8%, 55%)",
  heading: isDark ? "hsl(38, 15%, 90%)" : "hsl(30, 10%, 18%)",
  border: isDark ? "hsla(38, 12%, 30%, 0.2)" : "hsla(30, 10%, 70%, 0.25)",
  tab: isDark ? "hsla(38, 12%, 80%, 0.6)" : "hsla(30, 8%, 40%, 0.6)",
  tabActive: isDark ? "hsl(38, 40%, 65%)" : "hsl(30, 30%, 35%)",
  handleBar: isDark ? "hsla(0, 0%, 100%, 0.12)" : "hsla(0, 0%, 0%, 0.1)",
});

// ── Component ──────────────────────────────────────────────────────────────

export default function LegalPanel({ open, initialTab = "privacy", onClose, bgMode = "dark" }: LegalPanelProps) {
  const [tab, setTab] = useState<LegalTab>(initialTab);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDark = bgMode === "dark";
  const P = palette(isDark);

  // Reset tab on open
  useEffect(() => {
    if (open) {
      setTab(initialTab);
      scrollRef.current?.scrollTo({ top: 0 });
    }
  }, [open, initialTab]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const font = "'DM Sans', system-ui, sans-serif";
  const fontDisplay = "'Playfair Display', serif";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — subtle dim */}
          <motion.div
            className="fixed inset-0 z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ background: isDark ? "hsla(0, 0%, 0%, 0.5)" : "hsla(0, 0%, 0%, 0.2)" }}
            onClick={onClose}
          />

          {/* Panel — rises from bottom */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[61] flex flex-col"
            style={{
              maxHeight: "85vh",
              background: P.bg,
              borderTop: `1px solid ${P.border}`,
              borderRadius: "20px 20px 0 0",
              fontFamily: font,
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
          >
            {/* Handle bar + close icon */}
            <div className="flex items-center justify-between px-6 pt-4 pb-3">
              <div className="w-7" />
              <button
                onClick={onClose}
                className="cursor-pointer group"
                aria-label="Close"
              >
                <div
                  className="w-10 h-[3px] rounded-full transition-all duration-300 group-hover:w-14"
                  style={{ background: P.handleBar }}
                />
              </button>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-full transition-all duration-300 hover:scale-110"
                style={{
                  background: isDark ? "hsla(0, 0%, 100%, 0.05)" : "hsla(0, 0%, 0%, 0.04)",
                  color: P.textMuted,
                }}
                aria-label="Collapse"
              >
                <ChevronDown size={14} strokeWidth={1.5} />
              </button>
            </div>

            {/* Tab switcher */}
            <div
              className="flex items-center justify-center gap-8 pb-4"
              style={{ borderBottom: `1px solid ${P.border}` }}
            >
              {(["privacy", "terms"] as LegalTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTab(t);
                    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="relative pb-2 transition-colors duration-300"
                  style={{
                    fontFamily: font,
                    fontSize: "11px",
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: tab === t ? P.tabActive : P.tab,
                    fontWeight: tab === t ? 600 : 400,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {t === "privacy" ? "Privacy Policy" : "Terms of Use"}
                  {/* Active indicator line */}
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-[1px]"
                    style={{ background: P.tabActive }}
                    initial={false}
                    animate={{ scaleX: tab === t ? 1 : 0, opacity: tab === t ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </button>
              ))}
            </div>

            {/* Scrollable content */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto overscroll-contain"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: `${P.border} transparent`,
              }}
            >
              <div className="max-w-2xl mx-auto px-8 py-10 pb-16">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                  >
                    {tab === "privacy" ? (
                      <PrivacyContent P={P} fontDisplay={fontDisplay} />
                    ) : (
                      <TermsContent P={P} fontDisplay={fontDisplay} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────

const Section = ({ title, children, P, fontDisplay }: { title: string; children: React.ReactNode; P: ReturnType<typeof palette>; fontDisplay: string }) => (
  <section className="mb-10">
    <h2
      className="text-base font-light tracking-wide mb-4"
      style={{ fontFamily: fontDisplay, color: P.heading }}
    >
      {title}
    </h2>
    <div
      className="space-y-3 text-[14px] leading-[1.9]"
      style={{ color: P.text }}
    >
      {children}
    </div>
  </section>
);

// ── Privacy Policy (template) ──────────────────────────────────────────────

function PrivacyContent({ P, fontDisplay }: { P: ReturnType<typeof palette>; fontDisplay: string }) {
  return (
    <article>
      <h1
        className="text-xl font-light tracking-wide mb-2"
        style={{ fontFamily: fontDisplay, color: P.heading }}
      >
        Privacy Policy
      </h1>
      <p className="text-[12px] tracking-wider uppercase mb-10" style={{ color: P.textMuted }}>
        Last updated: February 2026
      </p>

      <Section title="1. Information We Collect" P={P} fontDisplay={fontDisplay}>
        <p>
          We collect information you provide directly, such as when you create an account,
          use our services, or communicate with us. This may include your name, email address,
          and usage data.
        </p>
        <p>
          We also collect certain information automatically when you use our platform,
          including device information, log data, and interaction patterns to improve
          your experience.
        </p>
      </Section>

      <Section title="2. How We Use Your Information" P={P} fontDisplay={fontDisplay}>
        <p>
          Your information helps us provide, maintain, and improve our services. We use it to
          personalise your experience, communicate with you, and ensure the security of our platform.
        </p>
        <p>
          We do not sell your personal information. We may share aggregated, anonymised data
          for research and analytical purposes.
        </p>
      </Section>

      <Section title="3. Data Security" P={P} fontDisplay={fontDisplay}>
        <p>
          We implement appropriate technical and organisational measures to protect your
          personal data against unauthorised access, alteration, disclosure, or destruction.
        </p>
      </Section>

      <Section title="4. Your Rights" P={P} fontDisplay={fontDisplay}>
        <p>
          You have the right to access, correct, or delete your personal data at any time.
          You may also request a copy of the data we hold about you or withdraw your consent
          to processing.
        </p>
      </Section>

      <Section title="5. Contact" P={P} fontDisplay={fontDisplay}>
        <p>
          If you have questions about this Privacy Policy, please reach out through our
          community channels or contact us directly.
        </p>
      </Section>
    </article>
  );
}

// ── Terms of Use (template) ────────────────────────────────────────────────

function TermsContent({ P, fontDisplay }: { P: ReturnType<typeof palette>; fontDisplay: string }) {
  return (
    <article>
      <h1
        className="text-xl font-light tracking-wide mb-2"
        style={{ fontFamily: fontDisplay, color: P.heading }}
      >
        Terms of Use
      </h1>
      <p className="text-[12px] tracking-wider uppercase mb-10" style={{ color: P.textMuted }}>
        Last updated: February 2026
      </p>

      <Section title="1. Acceptance of Terms" P={P} fontDisplay={fontDisplay}>
        <p>
          By accessing or using the UOR Foundation platform, you agree to be bound by these
          Terms of Use. If you do not agree to these terms, please do not use our services.
        </p>
      </Section>

      <Section title="2. Use of Services" P={P} fontDisplay={fontDisplay}>
        <p>
          You agree to use our services in accordance with all applicable laws and regulations.
          You are responsible for maintaining the confidentiality of your account credentials
          and for all activities that occur under your account.
        </p>
      </Section>

      <Section title="3. Intellectual Property" P={P} fontDisplay={fontDisplay}>
        <p>
          The UOR Framework is open source and governed by its respective licence. All other
          content, trademarks, and materials on this platform are the property of the
          UOR Foundation unless otherwise stated.
        </p>
      </Section>

      <Section title="4. Limitation of Liability" P={P} fontDisplay={fontDisplay}>
        <p>
          Our services are provided on an &ldquo;as is&rdquo; basis. We make no warranties,
          express or implied, regarding the reliability, availability, or suitability of the
          platform for any particular purpose.
        </p>
      </Section>

      <Section title="5. Changes to Terms" P={P} fontDisplay={fontDisplay}>
        <p>
          We reserve the right to modify these terms at any time. Continued use of the platform
          after changes constitutes acceptance of the updated terms.
        </p>
      </Section>

      <Section title="6. Governing Law" P={P} fontDisplay={fontDisplay}>
        <p>
          These terms shall be governed by and construed in accordance with applicable law,
          without regard to conflict of law principles.
        </p>
      </Section>
    </article>
  );
}
