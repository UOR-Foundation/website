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
              top: "clamp(80px, 12vh, 140px)",
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

const InlineLink = ({ href, children, P }: { href: string; children: React.ReactNode; P: ReturnType<typeof palette> }) => (
  <a
    href={href}
    target={href.startsWith("http") ? "_blank" : undefined}
    rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
    style={{
      color: P.tabActive,
      textDecoration: "none",
      borderBottom: `1px solid ${P.tabActive}44`,
      transition: "border-color 0.3s",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.borderColor = P.tabActive)}
    onMouseLeave={(e) => (e.currentTarget.style.borderColor = `${P.tabActive}44`)}
  >
    {children}
  </a>
);

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
        Your Terms
      </h1>
      <p className="text-[12px] tracking-wider uppercase mb-4" style={{ color: P.textMuted }}>
        Last updated: February 2026
      </p>
      <p
        className="text-[13px] leading-[1.9] mb-10 italic"
        style={{ color: P.textMuted }}
      >
        Hologram is built on a simple principle: you define the terms under which your data is
        shared — not us, not applications, not third parties. This approach is inspired by and
        aligned with the{" "}
        <InlineLink href="https://myterms.info/" P={P}>IEEE 7012-2025 standard (MyTerms)</InlineLink>,
        a global framework for machine-readable personal privacy terms.
      </p>

      <Section title="1. Your Space, Your Rules" P={P} fontDisplay={fontDisplay}>
        <p>
          Hologram provides you with a personal, private space. When you create an identity here,
          you gain complete ownership over three things:
        </p>
        <ul className="space-y-2 pl-1 mt-2" style={{ listStyle: "none" }}>
          <li className="flex gap-2 items-start">
            <span style={{ color: P.tabActive, fontSize: "8px", marginTop: "7px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>Your Identity</strong> — A cryptographically unique address derived from your credentials, belonging solely to you. No platform can revoke or reassign it.</span>
          </li>
          <li className="flex gap-2 items-start">
            <span style={{ color: P.tabActive, fontSize: "8px", marginTop: "7px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>Your Data</strong> — Everything you create, store, or generate within Hologram is yours. We do not mine, sell, or monetise your personal data.</span>
          </li>
          <li className="flex gap-2 items-start">
            <span style={{ color: P.tabActive, fontSize: "8px", marginTop: "7px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>Your Network</strong> — The relationships and connections you build are private by default. You choose who sees what, and under what conditions.</span>
          </li>
        </ul>
      </Section>

      <Section title="2. How Terms Work in Hologram" P={P} fontDisplay={fontDisplay}>
        <p>
          Unlike traditional platforms where you accept a company's terms, Hologram inverts this
          relationship. You define your own terms as structured, machine-readable objects —
          following the principles of the{" "}
          <InlineLink href="https://myterms.info/ieee7012-standards/" P={P}>IEEE 7012 standard</InlineLink>.
          These terms travel with your identity and govern every interaction.
        </p>
        <p>
          When an application, service, or agent wants to interact with you or access your data,
          it must first accept <em style={{ color: P.tabActive }}>your</em> terms — not the other way around.
          This creates a transparent, equitable exchange where you always know what is being
          shared, with whom, and why.
        </p>
      </Section>

      <Section title="3. What You Control" P={P} fontDisplay={fontDisplay}>
        <p>
          Through your{" "}
          <InlineLink href="/your-space/preferences" P={P}>personal preferences</InlineLink>,
          you can define:
        </p>
        <ul className="space-y-2 pl-1 mt-2" style={{ listStyle: "none" }}>
          <li className="flex gap-2 items-start">
            <span style={{ color: P.tabActive, fontSize: "8px", marginTop: "7px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>Data sharing boundaries</strong> — Which categories of personal data (if any) may be shared with applications and services.</span>
          </li>
          <li className="flex gap-2 items-start">
            <span style={{ color: P.tabActive, fontSize: "8px", marginTop: "7px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>Interaction permissions</strong> — Whether agents and services may contact you, and under what circumstances.</span>
          </li>
          <li className="flex gap-2 items-start">
            <span style={{ color: P.tabActive, fontSize: "8px", marginTop: "7px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>Retention policies</strong> — How long any shared data may be retained by third parties before it must be deleted.</span>
          </li>
          <li className="flex gap-2 items-start">
            <span style={{ color: P.tabActive, fontSize: "8px", marginTop: "7px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>Consent withdrawal</strong> — The ability to revoke access at any time, with immediate effect across all connected services.</span>
          </li>
        </ul>
        <p className="mt-3">
          These preferences are stored as content-addressed, cryptographically signed objects within
          the{" "}
          <InlineLink href="/standard" P={P}>UOR Framework</InlineLink>,
          ensuring they are tamper-proof and verifiable.
        </p>
      </Section>

      <Section title="4. No Surveillance" P={P} fontDisplay={fontDisplay}>
        <p>
          Hologram does not track you across sessions. There are no third-party trackers, no
          behavioural profiling, and no advertising identifiers. Your activity within your space
          is yours alone — visible only to you unless you explicitly choose to share it.
        </p>
        <p>
          This is not a policy choice that can be reversed. It is an architectural guarantee,
          built into the protocol layer of the platform.
        </p>
      </Section>

      <Section title="5. The Hologram Ecosystem" P={P} fontDisplay={fontDisplay}>
        <p>
          Applications and experiences within the Hologram ecosystem operate under a simple
          contract: they must respect your terms to participate. If an application cannot
          operate within your stated boundaries, it will not have access to your data.
        </p>
        <p>
          This creates an environment where trust is the default — not something extracted
          through lengthy legal documents that no one reads.
        </p>
      </Section>

      <Section title="6. Implementation" P={P} fontDisplay={fontDisplay}>
        <p>
          Your terms are implemented through three layers:
        </p>
        <ul className="space-y-2 pl-1 mt-2" style={{ listStyle: "none" }}>
          <li className="flex gap-2 items-start">
            <span style={{ color: P.tabActive, fontSize: "8px", marginTop: "7px" }}>1</span>
            <span><strong style={{ color: P.heading }}>Identity Layer</strong> — Your sovereign identity, derived from the UOR Framework, serves as the root of all permissions.</span>
          </li>
          <li className="flex gap-2 items-start">
            <span style={{ color: P.tabActive, fontSize: "8px", marginTop: "7px" }}>2</span>
            <span><strong style={{ color: P.heading }}>Terms Layer</strong> — Your preferences are canonicalised using URDNA2015 and hashed via SHA-256, creating an immutable, machine-readable terms object aligned with IEEE 7012.</span>
          </li>
          <li className="flex gap-2 items-start">
            <span style={{ color: P.tabActive, fontSize: "8px", marginTop: "7px" }}>3</span>
            <span><strong style={{ color: P.heading }}>Enforcement Layer</strong> — Every data exchange is gated by your terms object. Services must present a valid acceptance receipt before access is granted.</span>
          </li>
        </ul>
      </Section>

      <Section title="7. Your Preferences" P={P} fontDisplay={fontDisplay}>
        <p>
          You can review and update your personal terms at any time from your{" "}
          <InlineLink href="/your-space/preferences" P={P}>Preferences</InlineLink>{" "}
          section within Your Space. Changes take effect immediately across all connected
          applications and services.
        </p>
      </Section>

      <Section title="8. Open Standard" P={P} fontDisplay={fontDisplay}>
        <p>
          This approach is built on open standards. The privacy terms standard is
          documented at{" "}
          <InlineLink href="https://myterms.info/" P={P}>myterms.info</InlineLink>.
        </p>
        <p>
          We believe privacy should not be a feature — it should be the foundation.
        </p>
      </Section>
    </article>
  );
}