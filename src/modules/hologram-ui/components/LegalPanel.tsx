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
  <section className="mb-12">
    <h2
      className="text-lg font-light tracking-wide mb-5"
      style={{ fontFamily: fontDisplay, color: P.heading }}
    >
      {title}
    </h2>
    <div
      className="space-y-4 text-[16px] leading-[2]"
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
        className="text-2xl font-light tracking-wide mb-2"
        style={{ fontFamily: fontDisplay, color: P.heading }}
      >
        Privacy by Default
      </h1>
      <p className="text-[13px] tracking-wider uppercase mb-5" style={{ color: P.textMuted }}>
        Last updated: February 2026
      </p>
      <p
        className="text-[16px] leading-[2] mb-12"
        style={{ color: P.text }}
      >
        Most platforms write a privacy policy to protect themselves. Hologram is different — we give you the infrastructure and tools to create your own. Privacy is not a feature we bolt on. It is the architecture itself.
      </p>

      <Section title="1. Our Default: Store Nothing" P={P} fontDisplay={fontDisplay}>
        <p>
          By default, Hologram aims to store as little information about you as possible. Your identity is derived from your email handle, which we use only to verify you are you — we do not store it as personal data or use it to build a profile about you.
        </p>
        <p>
          There is no hidden data collection. No behavioural tracking. No advertising profiles. No third-party analytics. The platform is designed from the ground up to function without needing to know who you are beyond what you choose to share.
        </p>
      </Section>

      <Section title="2. Zero-Knowledge by Design" P={P} fontDisplay={fontDisplay}>
        <p>
          Hologram is built on zero-knowledge principles. This means you can prove things about yourself — that your identity is valid, that you meet a requirement, that you hold a credential — without disclosing the underlying information.
        </p>
        <p>
          Think of it like proving you are over 18 without showing your date of birth, or confirming you are a member without revealing your name. The platform's architecture makes this the default, not an option you have to enable.
        </p>
      </Section>

      <Section title="3. Selective Disclosure: You Choose What to Reveal" P={P} fontDisplay={fontDisplay}>
        <p>
          Your information is private by default. Sharing anything requires an active, deliberate choice on your part. Hologram uses a layered disclosure model:
        </p>
        <ul className="space-y-3 pl-1 mt-3" style={{ listStyle: "none" }}>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>Default: fully private</strong> — nothing is shared with anyone. No application, service, or user can see your information unless you grant access.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>Step-by-step opt out</strong> — revealing information is a graduated process. You choose what to share, with whom, and for how long. Each step requires your explicit action.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>Revocable at any time</strong> — any disclosure you make can be withdrawn. Access you have granted can be removed. You are always in control.</span>
          </li>
        </ul>
      </Section>

      <Section title="4. Your Privacy Policy, Not Ours" P={P} fontDisplay={fontDisplay}>
        <p>
          Hologram provides programmatic tools for you to define your own privacy policy. Rather than accepting a document written by a company to protect itself, you create rules that protect you.
        </p>
        <p>
          These tools allow you to specify what data you are willing to share, under what conditions, with which applications, and for how long. When an application wants to interact with your information, it must meet <em style={{ color: P.tabActive }}>your</em> terms — not the other way around.
        </p>
        <p>
          This is the foundation of Hologram's privacy architecture: you write the rules, and the system enforces them.
        </p>
      </Section>

      <Section title="5. What We Never Do" P={P} fontDisplay={fontDisplay}>
        <p>
          We do not sell your data. We do not share it with advertisers. We do not use third-party trackers. We do not build behavioural profiles. We do not monetise your personal information in any way. There is no advertising on Hologram, and there never will be.
        </p>
      </Section>

      <Section title="6. Contact" P={P} fontDisplay={fontDisplay}>
        <p>
          If you have questions about how privacy works on Hologram or need help configuring your privacy settings, reach out through our community channels. We are committed to transparency.
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
        className="text-2xl font-light tracking-wide mb-2"
        style={{ fontFamily: fontDisplay, color: P.heading }}
      >
        Terms of Use
      </h1>
      <p className="text-[13px] tracking-wider uppercase mb-5" style={{ color: P.textMuted }}>
        Last updated: February 2026
      </p>
      <p
        className="text-[16px] leading-[2] mb-12"
        style={{ color: P.text }}
      >
        Polygram is built on a simple premise: your information is yours. We do not
        write terms to protect ourselves from you. We build infrastructure that
        protects you — and gives you the tools to define your own terms for how
        applications interact with your data.
      </p>

      <Section title="1. Privacy Is the Default" P={P} fontDisplay={fontDisplay}>
        <p>
          When you use Polygram, privacy is not something you opt into — it is where
          you start. By default, we store the absolute minimum: your identity is
          anchored to your email handle, which we do not retain on our servers. No
          profiles are built, no behaviour is tracked, no data is mined.
        </p>
        <p>
          To share anything about yourself, you must actively choose to do so. Every
          piece of information you reveal is a deliberate, reversible decision — not
          a checkbox buried in a settings page.
        </p>
      </Section>

      <Section title="2. Zero-Knowledge Verification" P={P} fontDisplay={fontDisplay}>
        <p>
          Polygram enables you to prove things about yourself — your age, your
          credentials, your membership — without disclosing the underlying information.
          Applications can confirm what they need to know without ever seeing what
          they do not need to know.
        </p>
        <p>
          This means you can participate fully in digital experiences while revealing
          nothing more than what is strictly necessary. Verification without exposure.
        </p>
      </Section>

      <Section title="3. Selective Disclosure — You Choose" P={P} fontDisplay={fontDisplay}>
        <p>
          Traditional platforms operate on an all-or-nothing model: accept our terms
          or leave. Polygram reverses this entirely. You decide:
        </p>
        <ul className="space-y-3 pl-1 mt-3" style={{ listStyle: "none" }}>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>What to reveal</strong> — share specific attributes without exposing the full picture. An app can know you are over 18 without knowing your date of birth.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>To whom</strong> — each application or service must request access individually. No blanket permissions, no cascading consent.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>When and for how long</strong> — set time-limited disclosures that automatically expire. You can revoke access at any moment, and connected services are notified immediately.</span>
          </li>
        </ul>
      </Section>

      <Section title="4. Your Terms, Not Ours" P={P} fontDisplay={fontDisplay}>
        <p>
          Polygram gives you the programmatic tools to create your own machine-readable
          privacy policy. This is not a template you fill in — it is a real, enforceable
          set of rules that applications must accept before they can interact with your data.
        </p>
        <p>
          This approach is inspired by the{" "}
          <InlineLink href="https://myterms.info/" P={P}>MyTerms</InlineLink>{" "}
          standard (IEEE 7012), which was designed to put individuals — not corporations —
          in control of personal data exchange. When an app cannot meet your conditions,
          it simply does not get access.
        </p>
      </Section>

      <Section title="5. Opting Out of Privacy" P={P} fontDisplay={fontDisplay}>
        <p>
          Privacy on Polygram is not a setting you turn on. It is the foundation you
          would have to deliberately step away from. Revealing information requires
          explicit, incremental steps:
        </p>
        <ul className="space-y-3 pl-1 mt-3" style={{ listStyle: "none" }}>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>1</span>
            <span>You choose to share a specific piece of information.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>2</span>
            <span>You choose who receives it.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>3</span>
            <span>You choose how long they can keep it.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>4</span>
            <span>You can reverse any of these decisions at any time.</span>
          </li>
        </ul>
        <p className="mt-4">
          There is no "share everything" button. Every disclosure is a conscious act.
        </p>
      </Section>

      <Section title="6. What We Commit To" P={P} fontDisplay={fontDisplay}>
        <ul className="space-y-3 pl-1" style={{ listStyle: "none" }}>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span>We will never sell, trade, or monetise your personal information.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span>We will never build behavioural profiles or serve targeted advertising.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span>We will never use your data to train AI models without your explicit, informed, revocable consent.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span>We will continue to minimise our own data footprint — storing less, not more, over time.</span>
          </li>
        </ul>
      </Section>

      <Section title="7. Built on an Open Standard" P={P} fontDisplay={fontDisplay}>
        <p>
          The infrastructure behind your personal terms is based on{" "}
          <InlineLink href="https://myterms.info/" P={P}>MyTerms</InlineLink>{" "}
          (IEEE 7012), a published global standard for machine-readable personal privacy.
          It is not proprietary — it is open, auditable, and designed so that privacy
          is something you can see, control, and trust.
        </p>
      </Section>

      <Section title="8. Contact" P={P} fontDisplay={fontDisplay}>
        <p>
          Questions about these terms or your privacy? Reach us at{" "}
          <InlineLink href="mailto:privacy@polygram.me" P={P}>privacy@polygram.me</InlineLink>.
        </p>
      </Section>
    </article>
  );
}