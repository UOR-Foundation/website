// The first thing on the homepage: describe the app, pick the agent you already use, Build.
// The box never sends anything anywhere. It composes the one sentence and hands it to the
// agent in the best way that agent allows (a command to copy, a prompt link, an MCP install
// link), and always shows the sentence itself, which works with any agent.
import { useEffect, useState } from "react";
import { ArrowRight, Check, Copy } from "lucide-react";
import { AGENTS, DEFAULT_AGENT, SETUP_COMMAND, SETUP_PUBLISHED, agentById, prismLink, sentence } from "./build";
import { HERO } from "./copy";

const KEY = "uor.build.agent";
/** How long the page waits after a holo:// click before concluding no handler took it. */
const HANDLER_WAIT_MS = 1500;

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard?.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
      aria-label={label}
      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[hsl(var(--fd-line))] px-3 py-1.5 text-sm text-[hsl(var(--fd-dim))] transition-colors hover:border-[hsl(var(--fd-fg))] hover:text-[hsl(var(--fd-fg))]"
    >
      {done ? <Check className="h-4 w-4 text-[hsl(var(--fd-accent))]" /> : <Copy className="h-4 w-4" />}
      {done ? "Copied" : "Copy"}
    </button>
  );
}

export default function BuildBox() {
  const [description, setDescription] = useState("");
  const [agentId, setAgentId] = useState(DEFAULT_AGENT);
  const [built, setBuilt] = useState<string | null>(null);
  const [noHandler, setNoHandler] = useState(false);

  // A holo:// link that no handler takes does nothing visible. The page cannot ask the OS,
  // so it watches for the one thing a handler does: take focus away. If the page is still
  // focused and visible after the wait, say so and point at the setup and the copy.
  const openWithHandler = (href: string) => {
    setNoHandler(false);
    let taken = false;
    const took = () => { taken = true; };
    window.addEventListener("blur", took, { once: true });
    document.addEventListener("visibilitychange", took, { once: true });
    window.location.href = href;
    setTimeout(() => {
      window.removeEventListener("blur", took);
      document.removeEventListener("visibilitychange", took);
      if (!taken && document.visibilityState === "visible") setNoHandler(true);
    }, HANDLER_WAIT_MS);
  };

  useEffect(() => {
    try { const saved = localStorage.getItem(KEY); if (saved && AGENTS.some((a) => a.id === saved)) setAgentId(saved); } catch { /* private mode */ }
  }, []);
  const chooseAgent = (id: string) => { setAgentId(id); try { localStorage.setItem(KEY, id); } catch { /* private mode */ } };

  const agent = agentById(agentId);
  const text = sentence(description || HERO.build.placeholder);
  const handoff = built ? agent.handoff(built) : null;

  return (
    <div className="mx-auto mt-[clamp(24px,5vh,48px)] w-full max-w-2xl text-left">
      <p className="mb-3 text-center text-base text-[hsl(var(--fd-dim))]">{HERO.build.lead}</p>
      <form
        className="fd-spectrum block w-full"
        onSubmit={(e) => { e.preventDefault(); setBuilt(text); }}
      >
        <div className="relative z-10 rounded-2xl border border-[hsl(var(--fd-line))] bg-[hsl(var(--fd-panel))] p-3 sm:p-4">
          <label htmlFor="fd-build-input" className="sr-only">{HERO.build.label}</label>
          <div className="flex items-baseline gap-2 px-2 pt-1 text-base sm:text-lg">
            <span className="shrink-0 text-[hsl(var(--fd-dim))]">{HERO.build.prefix}</span>
            <input
              id="fd-build-input"
              value={description}
              onChange={(e) => { setDescription(e.target.value); setBuilt(null); }}
              placeholder={HERO.build.placeholder}
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent py-2 text-[hsl(var(--fd-fg))] placeholder:text-[hsl(var(--fd-dim))]/70 focus:outline-none"
            />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[hsl(var(--fd-line))] pt-3">
            <label className="flex items-center gap-2 text-sm text-[hsl(var(--fd-dim))]">
              <span className="hidden sm:inline">{HERO.build.agentLabel}</span>
              <select
                value={agentId}
                onChange={(e) => { chooseAgent(e.target.value); setBuilt(null); }}
                aria-label={HERO.build.agentLabel}
                className="rounded-full border border-[hsl(var(--fd-line))] bg-transparent px-3 py-1.5 text-sm text-[hsl(var(--fd-fg))] focus:outline-none"
              >
                {AGENTS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
            <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--fd-fg))] px-5 py-2 text-base font-medium text-[hsl(var(--fd-bg))] transition-colors hover:bg-[hsl(var(--fd-accent))]">
              {HERO.build.cta} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>

      {handoff && built && (
        <div className="fd-build-result mt-4 rounded-2xl border border-[hsl(var(--fd-line))] p-4 text-sm sm:text-base" aria-live="polite">
          {handoff.kind === "command" && SETUP_PUBLISHED && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => openWithHandler(prismLink(agent.id, built))}
                  className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--fd-fg))] px-5 py-2 font-medium text-[hsl(var(--fd-bg))] transition-colors hover:bg-[hsl(var(--fd-accent))]"
                >
                  {HERO.build.openIn} {agent.name} <ArrowRight className="h-4 w-4" />
                </button>
                <span className="text-[hsl(var(--fd-dim))]">{HERO.build.orRun}</span>
              </div>
              {noHandler && (
                <p className="mt-3 text-[hsl(var(--fd-accent))]" role="status">{HERO.build.nothingOpened}</p>
              )}
              <div className="mt-3 flex items-start gap-3">
                <code className="fd-mono min-w-0 flex-1 break-words">{handoff.command}</code>
                <CopyButton text={handoff.command} label={`Copy the ${agent.name} command`} />
              </div>
              <p className="mt-3 text-sm text-[hsl(var(--fd-dim))]">
                {HERO.build.setupOnce} <code className="fd-mono">{SETUP_COMMAND}</code>
              </p>
            </>
          )}
          {handoff.kind === "command" && !SETUP_PUBLISHED && (
            <>
              <p className="mb-2 text-[hsl(var(--fd-dim))]">{HERO.build.runThis} {agent.name}:</p>
              <div className="flex items-start gap-3">
                <code className="fd-mono min-w-0 flex-1 break-words">{handoff.command}</code>
                <CopyButton text={handoff.command} label={`Copy the ${agent.name} command`} />
              </div>
            </>
          )}
          {handoff.kind !== "command" && (
            <>
              {agent.setup && <p className="mb-3 text-[hsl(var(--fd-dim))]">{agent.setup}</p>}
              <div className="flex flex-wrap items-center gap-3">
                <a href={handoff.href} className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--fd-fg))] px-5 py-2 font-medium text-[hsl(var(--fd-bg))] transition-colors hover:bg-[hsl(var(--fd-accent))]">
                  {handoff.label} <ArrowRight className="h-4 w-4" />
                </a>
                <span className="text-[hsl(var(--fd-dim))]">{HERO.build.thenPaste}</span>
              </div>
              <div className="mt-3 flex items-start gap-3">
                <code className="fd-mono min-w-0 flex-1 break-words">{handoff.then}</code>
                <CopyButton text={handoff.then} label="Copy the sentence" />
              </div>
            </>
          )}
          <p className="mt-3 text-sm text-[hsl(var(--fd-dim))]">{HERO.build.anyAgent}</p>
        </div>
      )}
    </div>
  );
}
