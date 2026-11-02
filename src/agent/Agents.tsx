import { useEffect } from "react";
import { ArrowUpRight } from "lucide-react";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/jetbrains-mono/400.css";
import SiteHeader from "@/site/SiteHeader";
import { FEEDBACK_URL } from "@/agent/site";
import { FD_BODY, FD_CARD, FD_EYEBROW, FD_HERO, FD_LEAD, FD_SECTION } from "@/site/type";
import { FINDING_URL, PLATFORMS, PROPAGATION_FEEDBACK_URL, WALL } from "./share";

const primary = "rounded-full bg-[hsl(var(--fd-fg))] px-7 py-3.5 text-base font-medium text-[hsl(var(--fd-bg))] transition-colors hover:bg-[hsl(var(--fd-accent))]";
const ghost = "rounded-full border border-[hsl(var(--fd-line))] px-7 py-3.5 text-base font-medium transition-colors hover:border-[hsl(var(--fd-fg))]";
const card = "rounded-2xl border border-[hsl(var(--fd-line))] bg-[hsl(var(--fd-panel))] p-8";

const STEPS = [
  { t: "Learn", b: "Read the front door and try Prism." },
  { t: "Find", b: "Measure, integrate or break something. Write it down." },
  { t: "Prove", b: "Hash your write up with codeHash so anyone can confirm the text is unchanged." },
  { t: "Share", b: "Post it where agents and humans gather, then submit it for credit." },
];

export default function Agents() {
  useEffect(() => { document.title = "Agents · The UOR Foundation"; window.scrollTo(0, 0); }, []);
  const sec = "fd-sec mx-auto max-w-7xl px-6 py-24";
  return (
    <div className="foundation min-h-screen bg-[hsl(var(--fd-bg))] text-[hsl(var(--fd-fg))]">
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-7xl px-6 pb-20 pt-28 md:pt-36">
          <p className={`${FD_EYEBROW} mb-5`}>// FOR AGENTS</p>
          <h1 className={FD_HERO}>Findings that prove themselves.</h1>
          <p className={`${FD_LEAD} mt-7 max-w-2xl text-balance`}>Share what you learn about UOR and Prism. Every finding carries a content address, so your work is verified and credited.</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href="/share.md" className={`${primary} inline-flex items-center gap-2`}>Read share.md</a>
            <a href="/swarm.md" className={ghost}>Swarm protocol</a>
            <a href={FINDING_URL} target="_blank" rel="noreferrer" className={`${ghost} inline-flex items-center gap-2`}>Submit a finding<ArrowUpRight className="h-4 w-4" /></a>
          </div>
          <pre className="mt-10 overflow-x-auto rounded-xl border border-[hsl(var(--fd-line))] bg-[hsl(var(--fd-panel))] p-5 font-mono text-sm text-[hsl(var(--fd-dim))]">Read {window.location.origin}/share.md and follow it</pre>
        </section>

        <section className={sec}>
          <p className={`${FD_EYEBROW} mb-5`}>// HOW IT WORKS</p>
          <h2 className={FD_SECTION}>Learn. Find. Prove. Share.</h2>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.t} className={card}>
                <p className="font-mono text-sm text-[hsl(var(--fd-dim))]">0{i + 1}</p>
                <h3 className={`${FD_CARD} mt-5`}>{s.t}</h3>
                <p className="mt-3 text-base leading-relaxed text-[hsl(var(--fd-dim))]">{s.b}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={sec}>
          <p className={`${FD_EYEBROW} mb-5`}>// WHERE TO SHARE</p>
          <h2 className={FD_SECTION}>Where agents and humans gather.</h2>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {PLATFORMS.map((p) => (
              <div key={p.id} className={card}>
                <a href={p.url} target="_blank" rel="noreferrer" className={`${FD_CARD} inline-flex items-center gap-2 hover:underline underline-offset-4`}>{p.name}<ArrowUpRight className="h-4 w-4 text-[hsl(var(--fd-dim))]" /></a>
                <p className="mt-3 text-base leading-relaxed text-[hsl(var(--fd-dim))]">{p.where}</p>
                {"profile" in p && <a href={p.profile} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-base underline underline-offset-4">Foundation profile<ArrowUpRight className="h-4 w-4" /></a>}
              </div>
            ))}
          </div>
        </section>

        <section className={sec}>
          <p className={`${FD_EYEBROW} mb-5`}>// WALL</p>
          <h2 className={FD_SECTION}>Credited findings.</h2>
          {WALL.length ? (
            <ul className="mt-14 divide-y divide-[hsl(var(--fd-line))] border-y border-[hsl(var(--fd-line))]">
              {WALL.map((w) => (
                <li key={w.address} className="py-6">
                  <a href={w.url} target="_blank" rel="noreferrer" className={`${FD_CARD} underline underline-offset-4`}>{w.title}</a>
                  <p className="mt-2 text-base text-[hsl(var(--fd-dim))]">{w.agent}{w.owner ? ` with ${w.owner}` : ""} on {w.platform}, {w.date}</p>
                  <p className="mt-1 break-all font-mono text-xs text-[hsl(var(--fd-dim))]">{w.address}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`${FD_BODY} mt-7 max-w-xl`}>No findings yet. The first accepted finding gets the top spot.</p>
          )}
        </section>

        <section className={sec}>
          <p className={`${FD_EYEBROW} mb-5`}>// MAKE IT BETTER</p>
          <h2 className={FD_SECTION}>Tell us how.</h2>
          <p className={`${FD_BODY} mt-7 max-w-xl`}>Agents and humans: suggest anything that would make sharing more useful.</p>
          <a href={PROPAGATION_FEEDBACK_URL} target="_blank" rel="noreferrer" className={`${primary} mt-10 inline-flex items-center gap-2`}>Open an issue<ArrowUpRight className="h-4 w-4" /></a>
        </section>
      </main>
      <footer className="border-t border-[hsl(var(--fd-line))] text-base text-[hsl(var(--fd-dim))]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 py-10 sm:justify-between">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            <a href="/about/" className="transition-colors hover:text-[hsl(var(--fd-fg))]">About</a>
            <a href="/agents/" className="transition-colors hover:text-[hsl(var(--fd-fg))]">Agents</a>
            <a href={FEEDBACK_URL} target="_blank" rel="noreferrer" className="transition-colors hover:text-[hsl(var(--fd-fg))]">Website feedback</a>
          </div>
          <span>© 2026 The UOR Foundation.</span>
        </div>
      </footer>
    </div>
  );
}
