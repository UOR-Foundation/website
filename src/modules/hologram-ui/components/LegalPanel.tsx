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
        Privacy Policy
      </h1>
      <p className="text-[13px] tracking-wider uppercase mb-5" style={{ color: P.textMuted }}>
        Last updated: February 2026
      </p>
      <p
        className="text-[16px] leading-[2] mb-12"
        style={{ color: P.text }}
      >
        Your privacy is not a feature we offer — it is the foundation Hologram is built on.
        This policy explains, in plain language, what information we collect, how we use it,
        and the rights you have over it.
      </p>

      <Section title="1. What We Collect" P={P} fontDisplay={fontDisplay}>
        <p>
          When you create an account, we collect the information you provide — such as your
          email address and display name. This is used solely to identify you and secure
          your account.
        </p>
        <p>
          As you use Hologram, we collect basic usage information — such as when you last
          signed in and which features you interact with. This helps us understand how the
          platform is being used so we can improve it.
        </p>
        <p>
          We do not collect information from third parties, and we do not build profiles
          about you based on your activity elsewhere on the internet.
        </p>
      </Section>

      <Section title="2. How We Use It" P={P} fontDisplay={fontDisplay}>
        <p>
          We use your information for three purposes:
        </p>
        <ul className="space-y-3 pl-1 mt-3" style={{ listStyle: "none" }}>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>To run the platform</strong> — authenticating your identity, storing your data, and keeping your space secure.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>To improve your experience</strong> — understanding which features are useful and which need work.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>To communicate with you</strong> — sending important updates about your account or the platform, never marketing.</span>
          </li>
        </ul>
      </Section>

      <Section title="3. What We Never Do" P={P} fontDisplay={fontDisplay}>
        <p>
          We do not sell your data. We do not share it with advertisers. We do not use
          third-party trackers. We do not build behavioural profiles. We do not monetise
          your personal information in any way.
        </p>
        <p>
          There is no advertising on Hologram, and there never will be.
        </p>
      </Section>

      <Section title="4. How We Protect It" P={P} fontDisplay={fontDisplay}>
        <p>
          Your data is protected using industry-standard encryption, both when it is stored
          and when it is transmitted. Access to our systems is tightly controlled and
          regularly audited.
        </p>
        <p>
          Your identity within Hologram is built on a unique, permanent address that only
          you control. This means even we cannot impersonate you or access your private space
          without your permission.
        </p>
      </Section>

      <Section title="5. Your Rights" P={P} fontDisplay={fontDisplay}>
        <p>
          You have the right to:
        </p>
        <ul className="space-y-3 pl-1 mt-3" style={{ listStyle: "none" }}>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>See your data</strong> — request a complete copy of everything we store about you.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>Correct your data</strong> — update or fix any information that is inaccurate.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>Delete your data</strong> — remove your account and all associated information permanently.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>Withdraw consent</strong> — stop any data processing at any time, with immediate effect.</span>
          </li>
        </ul>
      </Section>

      <Section title="6. Contact Us" P={P} fontDisplay={fontDisplay}>
        <p>
          If you have any questions about this policy or how your data is handled, please
          reach out through our community channels. We are committed to being transparent
          and responsive.
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
        Your Terms
      </h1>
      <p className="text-[13px] tracking-wider uppercase mb-5" style={{ color: P.textMuted }}>
        Last updated: February 2026
      </p>
      <p
        className="text-[16px] leading-[2] mb-12"
        style={{ color: P.text }}
      >
        Most platforms ask you to accept their terms. Hologram works differently.
        Here, you set the terms — and applications must agree to yours before they
        can access your data. This idea is inspired by a global privacy standard called{" "}
        <InlineLink href="https://myterms.info/" P={P}>MyTerms</InlineLink>{" "}
        (formally known as IEEE 7012), which puts individuals in control of how their
        personal information is shared.
      </p>

      <Section title="1. You Own Your Space" P={P} fontDisplay={fontDisplay}>
        <p>
          When you join Hologram, you get a private, personal space. Think of it as your
          digital home. Inside this space, you have complete control over three things:
        </p>
        <ul className="space-y-3 pl-1 mt-3" style={{ listStyle: "none" }}>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>Your identity</strong> — a unique, permanent address that belongs to you and only you. No company can take it away or pretend to be you.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>Your data</strong> — everything you create, save, or do within Hologram belongs to you. We never sell it, mine it, or use it for advertising.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>Your connections</strong> — the people, apps, and services you connect with are private by default. You decide who can see what.</span>
          </li>
        </ul>
      </Section>

      <Section title="2. You Set the Rules" P={P} fontDisplay={fontDisplay}>
        <p>
          On most platforms, you click "I agree" to a long legal document you probably
          did not read. That document protects the company, not you.
        </p>
        <p>
          Hologram reverses this. You write the rules. When an app or service wants to
          work with your data, it must agree to <em style={{ color: P.tabActive }}>your</em> terms
          first. If it cannot meet your conditions, it simply does not get access. This
          follows the principles of the{" "}
          <InlineLink href="https://myterms.info/ieee7012-standards/" P={P}>MyTerms standard</InlineLink>,
          which was designed to make personal data exchange transparent and fair.
        </p>
      </Section>

      <Section title="3. What You Decide" P={P} fontDisplay={fontDisplay}>
        <p>
          In your{" "}
          <InlineLink href="/your-space/preferences" P={P}>Preferences</InlineLink>,
          you can set clear boundaries around:
        </p>
        <ul className="space-y-3 pl-1 mt-3" style={{ listStyle: "none" }}>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>What you share</strong> — choose exactly which types of information apps can see. You can share as much or as little as you like.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>Who can contact you</strong> — decide whether services and agents are allowed to reach out to you, and under what conditions.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>How long data is kept</strong> — set time limits on how long anyone else can hold onto information you have shared with them.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>Taking it back</strong> — withdraw access at any time. When you do, every connected service is notified immediately.</span>
          </li>
        </ul>
      </Section>

      <Section title="4. No Tracking, Ever" P={P} fontDisplay={fontDisplay}>
        <p>
          Hologram does not track your behaviour. There are no hidden trackers watching
          what you click, no profiles being built about your habits, and no advertising
          identifiers following you around.
        </p>
        <p>
          This is not just a policy — it is built into the way the platform works. It
          cannot be quietly changed or reversed.
        </p>
      </Section>

      <Section title="5. Apps Must Earn Your Trust" P={P} fontDisplay={fontDisplay}>
        <p>
          Every application and experience within Hologram operates under a simple rule:
          it must respect your terms to participate. If an app cannot work within the
          boundaries you have set, it will not have access to your data. Full stop.
        </p>
        <p>
          This means trust is the default — not something buried in fine print.
        </p>
      </Section>

      <Section title="6. How It Works Behind the Scenes" P={P} fontDisplay={fontDisplay}>
        <p>
          Your terms are enforced automatically through three layers:
        </p>
        <ul className="space-y-3 pl-1 mt-3" style={{ listStyle: "none" }}>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>1</span>
            <span><strong style={{ color: P.heading }}>Your identity</strong> — your unique Hologram address acts as the master key. Every permission flows from it.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>2</span>
            <span><strong style={{ color: P.heading }}>Your terms</strong> — your preferences are converted into a secure, tamper-proof record that machines can read and enforce automatically.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>3</span>
            <span><strong style={{ color: P.heading }}>Enforcement</strong> — before any app or service can access your data, it must prove it has accepted your current terms. No exceptions.</span>
          </li>
        </ul>
      </Section>

      <Section title="7. Updating Your Preferences" P={P} fontDisplay={fontDisplay}>
        <p>
          You can review and change your terms whenever you like from your{" "}
          <InlineLink href="/your-space/preferences" P={P}>Preferences</InlineLink>{" "}
          page. Any changes take effect immediately across all connected applications
          and services — no waiting, no delays.
        </p>
      </Section>

      <Section title="8. Built on an Open Standard" P={P} fontDisplay={fontDisplay}>
        <p>
          The way Hologram handles your terms is based on{" "}
          <InlineLink href="https://myterms.info/" P={P}>MyTerms</InlineLink>,
          a published global standard for personal privacy. It is not proprietary
          technology — it is an open framework that anyone can adopt.
        </p>
        <p>
          We believe privacy should not be a feature you hope for. It should be something
          you can see, control, and trust.
        </p>
      </Section>
    </article>
  );
}