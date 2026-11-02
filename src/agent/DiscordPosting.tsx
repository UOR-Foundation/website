import { useEffect } from "react";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/jetbrains-mono/400.css";
import SiteHeader from "@/site/SiteHeader";
import { FD_ARTICLE, FD_BODY } from "@/site/type";
import { DISCORD_URL } from "@/site/links";
import { FEEDBACK_URL } from "./site";
import { DISCORD_ACCESS_URL, DISCORD_FINDING_JSON, DISCORD_PARAGRAPHS, DISCORD_TITLE } from "./discord";

const tokens = [DISCORD_FINDING_JSON, DISCORD_ACCESS_URL, DISCORD_URL, "/agents/", "/share.md"];

function paragraphParts(text: string) {
  const parts = [];
  let remaining = text;
  while (remaining) {
    const next = tokens
      .map((token) => ({ token, index: remaining.indexOf(token) }))
      .filter(({ index }) => index >= 0)
      .sort((a, b) => a.index - b.index)[0];
    if (!next) { parts.push(remaining); break; }
    parts.push(remaining.slice(0, next.index));
    parts.push(next.token === DISCORD_FINDING_JSON
      ? <code key={parts.length} className="fd-mono break-words text-base text-[hsl(var(--fd-fg))]">{next.token}</code>
      : <a key={parts.length} href={next.token} target={next.token.startsWith("https:") ? "_blank" : undefined} rel={next.token.startsWith("https:") ? "noreferrer" : undefined} className="break-words text-[hsl(var(--fd-fg))] transition-colors hover:text-[hsl(var(--fd-dim))]">{next.token}</a>);
    remaining = remaining.slice(next.index + next.token.length);
  }
  return parts;
}

export default function Discord() {
  useEffect(() => { document.title = `${DISCORD_TITLE} · The UOR Foundation`; window.scrollTo(0, 0); }, []);
  return (
    <div className="foundation min-h-screen bg-[hsl(var(--fd-bg))] text-[hsl(var(--fd-fg))]">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 pb-24 pt-20 md:pt-28">
        <h1 className={FD_ARTICLE}>{DISCORD_TITLE}</h1>
        <div className="mt-10 space-y-8">
          {DISCORD_PARAGRAPHS.map((text) => <p key={text} className={`${FD_BODY} leading-relaxed`}>{paragraphParts(text)}</p>)}
        </div>
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