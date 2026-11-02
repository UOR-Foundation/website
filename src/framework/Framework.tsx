import { FEEDBACK_URL } from "@/agent/site";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Check, Copy, FileText, Github, Package } from "lucide-react";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/jetbrains-mono/400.css";
import uorIcon from "@/assets/uor-icon.svg";
import { DISCORD_URL } from "@/site/links";
import SiteHeader from "@/site/SiteHeader";
import { FD_BODY, FD_CARD, FD_CATEGORY, FD_COLUMN, FD_EYEBROW, FD_HERO, FD_LEAD, FD_SECTION } from "@/site/type";
import { CLOSE, GLOSSARY, HERO, HOW, PROBLEM, TOC, WHAT, WHO, frameworkMarkdown } from "./content";

const primary = "rounded-full bg-[hsl(var(--fd-fg))] px-7 py-3.5 text-base font-medium text-[hsl(var(--fd-bg))] transition-colors hover:bg-[hsl(var(--fd-accent))]";
const ghost = "rounded-full border border-[hsl(var(--fd-line))] px-7 py-3.5 text-base font-medium transition-colors hover:border-[hsl(var(--fd-fg))]";
const panel = "rounded-2xl border border-[hsl(var(--fd-line))] bg-[hsl(var(--fd-panel))]";
const mono = "font-mono text-xs uppercase tracking-[0.2em] text-[hsl(var(--fd-dim))]";
const chip = "rounded-full border border-[hsl(var(--fd-line))] bg-[hsl(var(--fd-bg))] px-4 py-2 text-center font-mono text-sm";

const LINKS = [
  { t: "Read the docs", href: "https://uor-foundation.github.io/UOR-Framework/", Icon: BookOpen },
  { t: "View on GitHub", href: "https://github.com/UOR-Foundation/UOR-Framework", Icon: Github },
  { t: "crates.io", href: "https://crates.io/crates/uor-foundation", Icon: Package },
];

function Label({ children }: { children: string }) {
  return <p className={`${FD_EYEBROW} mb-5`}>// {children.toUpperCase()}</p>;
}

const CODE = `import { canonicalize, codeHash, differs } from "prism-code";

const id = codeHash("const answer = 42;\\n");
canonicalize("const answer = 42;  \\r\\n");      // same form
differs("const answer = 42;", "const answer = 43;"); // true`;

export default function Framework() {
  const [copied, setCopied] = useState(false);
  useEffect(() => { document.title = "UOR Framework · The UOR Foundation"; if (!window.location.hash) window.scrollTo(0, 0); }, []);
  const sec = "fd-sec mx-auto max-w-7xl scroll-mt-20 px-6 py-24";
  const copyPage = () => { navigator.clipboard.writeText(frameworkMarkdown()); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div className="foundation min-h-screen bg-[hsl(var(--fd-bg))] text-[hsl(var(--fd-fg))]">
      <SiteHeader />
      <main>
        <section className="mx-auto max-w-7xl px-6 pb-16 pt-28 md:pt-36">
          <Label>{HERO.label}</Label>
          <h1 className={`${FD_HERO} max-w-4xl text-balance`}>{HERO.title}</h1>
          <p className={`${FD_LEAD} mt-7 max-w-2xl text-balance`}>{HERO.line}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            {LINKS.map(({ t, href, Icon }) => (
              <a key={t} href={href} target="_blank" rel="noreferrer" className={`${ghost} inline-flex items-center gap-2`}><Icon className="h-4 w-4" />{t}</a>
            ))}
          </div>
          <nav aria-label="On this page" className="mt-16 flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-[hsl(var(--fd-line))] py-5">
            <span className={mono}>On this page</span>
            {TOC.map((t) => <a key={t.id} href={`#${t.id}`} className="text-sm text-[hsl(var(--fd-dim))] transition-colors hover:text-[hsl(var(--fd-fg))]">{t.t}</a>)}
            <span className="ml-auto flex gap-2">
              <button onClick={copyPage} className="inline-flex items-center gap-1.5 text-sm text-[hsl(var(--fd-dim))] hover:text-[hsl(var(--fd-fg))]">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}Copy page</button>
              <a href="/framework.md" className="inline-flex items-center gap-1.5 pl-3 text-sm text-[hsl(var(--fd-dim))] hover:text-[hsl(var(--fd-fg))]"><FileText className="h-3.5 w-3.5" />Markdown</a>
            </span>
          </nav>
        </section>

        <section id="problem" className={sec}>
          <Label>{PROBLEM.label}</Label>
          <h2 className={FD_SECTION}>{PROBLEM.title}</h2>
          <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="space-y-5">{PROBLEM.body.map((p) => <p key={p} className={FD_BODY}>{p}</p>)}</div>
            <div className={`${panel} p-8`}>
              <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto_1fr]">
                <div className="grid grid-cols-2 gap-2">{PROBLEM.labels.map((x) => <span key={x} className={chip}>{x}</span>)}</div>
                <ArrowRight className="mx-auto h-5 w-5 rotate-90 text-[hsl(var(--fd-dim))] sm:rotate-0" />
                <div className="grid gap-2">{PROBLEM.outcomes.map((x) => <span key={x} className="rounded-lg border border-dashed border-[hsl(var(--fd-line))] px-3 py-2 text-center font-mono text-sm text-[hsl(var(--fd-dim))]">{x}</span>)}</div>
              </div>
              <div className="mt-6 hidden grid-cols-[1fr_auto_1fr] gap-6 text-center sm:grid"><span className={mono}>Same data, many labels</span><span /><span className={mono}>Host decides</span></div>
              <div className="my-8 border-t border-[hsl(var(--fd-line))]" />
              <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto_auto]">
                <div className="grid grid-cols-3 gap-2">{PROBLEM.systems.map((x) => <span key={x} className="rounded-lg border border-[hsl(var(--fd-line))] px-1 py-2 text-center text-[11px] leading-tight sm:text-xs">{x}</span>)}</div>
                <ArrowRight className="mx-auto h-5 w-5 rotate-90 text-[hsl(var(--fd-dim))] sm:rotate-0" />
                <div className="text-center"><p className="fd-head text-3xl font-bold tracking-[0.3em]">UOR</p><p className={`${mono} mt-2`}>One shared<br />system</p></div>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className={sec}>
          <Label>{HOW.label}</Label>
          <h2 className={FD_SECTION}>{HOW.title}</h2>
          <div className={`${panel} mt-14 flex flex-col items-center gap-3 p-8 sm:flex-row sm:justify-center`}>
            {HOW.pipeline.map((p, i) => (
              <span key={p} className="flex flex-col items-center gap-3 sm:flex-row">
                <span className={chip}>{p}</span>
                {i < HOW.pipeline.length - 1 && <ArrowRight className="h-4 w-4 rotate-90 text-[hsl(var(--fd-dim))] sm:rotate-0" />}
              </span>
            ))}
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {HOW.steps.map((s, i) => (
              <div key={s.t} className={`${panel} p-8`}>
                <p className={FD_CATEGORY}>0{i + 1}</p>
                <h3 className={`${FD_COLUMN} mt-5`}>{s.t}</h3>
                <p className="mt-3 text-base leading-relaxed">{s.plain}</p>
                <p className="mt-4 border-t border-[hsl(var(--fd-line))] pt-4 text-sm leading-relaxed text-[hsl(var(--fd-dim))]">{s.tech}</p>
              </div>
            ))}
          </div>
          <p className="fd-head mt-14 text-center text-2xl font-medium md:text-3xl">{HOW.promise}</p>
          <p className={`${mono} mt-5 text-center`}>{HOW.pillars.join("  ·  ")}</p>
        </section>

        <section id="what" className={sec}>
          <Label>{WHAT.label}</Label>
          <h2 className={FD_SECTION}>{WHAT.title}</h2>
          <p className={`${FD_BODY} mt-7 max-w-2xl`}>{WHAT.line}</p>
          <div className="mt-14 grid gap-5 lg:grid-cols-2">
            <pre className={`${panel} overflow-x-auto p-8 font-mono text-sm leading-7`}><code>{CODE}</code></pre>
            <div className="grid gap-5 sm:grid-cols-2">
              {WHAT.outputs.map((o) => (
                <div key={o.t} className={`${panel} p-6`}>
                  <h3 className={FD_CARD}>{o.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[hsl(var(--fd-dim))]">{o.b}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="who" className={sec}>
          <Label>{WHO.label}</Label>
          <h2 className={FD_SECTION}>{WHO.title}</h2>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {WHO.items.map((w) => (
              <div key={w.t} className={`${panel} p-8`}>
                <h3 className={FD_COLUMN}>{w.t}</h3>
                <p className="mt-3 text-base leading-relaxed text-[hsl(var(--fd-dim))]">{w.b}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="glossary" className={sec}>
          <Label>{GLOSSARY.label}</Label>
          <h2 className={FD_SECTION}>{GLOSSARY.title}</h2>
          <dl className="mt-14 border-t border-[hsl(var(--fd-line))]">
            {GLOSSARY.items.map((g) => (
              <div key={g.t} className="grid gap-2 border-b border-[hsl(var(--fd-line))] py-6 md:grid-cols-[16rem_1fr]">
                <dt className="fd-head text-xl font-medium">{g.t}</dt>
                <dd className="text-base text-[hsl(var(--fd-dim))]">{g.b}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={`${sec} text-center`}>
          <h2 className={FD_SECTION}>{CLOSE.title}</h2>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a href="/docs/" className={primary}>{CLOSE.docs}</a>
            <span className="fd-spectrum fd-spectrum-lift">
              <a href={DISCORD_URL} target="_blank" rel="noreferrer" className={`${primary} relative z-10`}>{CLOSE.discord}</a>
            </span>
          </div>
        </section>
      </main>

      <footer className="pt-8">
        <div className="fd-wordmark-wrap fd-wm-solid mx-auto max-w-7xl px-6">
          <div className="fd-wordmark-row"><div className="fd-wm-row-inner">
            <span aria-hidden="true" className="fd-wm-mask" style={{ ["--wm-icon" as string]: `url(${uorIcon})` }} />
            <span className="fd-wordmark" data-text="UOR Foundation">UOR Foundation</span>
          </div></div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 py-10 text-base text-[hsl(var(--fd-dim))] sm:justify-between">
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
