import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";
import { DISCORD_URL, GITHUB_ORG_URL } from "./links";
import { DiscordMark, GithubMark } from "./BrandIcons";

type Item = { label: string; href: string };

/** Phone only menu: full screen graphite sheet with staggered items. */
export default function MobileMenu({ items }: { items: Item[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", k); };
  }, [open]);

  return (
    <>
      <button aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)} className="fd-press -mr-2 p-2 text-[hsl(var(--fd-fg))] md:hidden">
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>
      {createPortal(<div className={`fd-sheet md:hidden ${open ? "fd-sheet-open" : ""}`} aria-hidden={!open} onClick={() => setOpen(false)}>
        <nav className="flex flex-col gap-2 px-6 pt-36">
          {items.map((n, i) => (
            <a key={n.label} href={n.href} style={{ transitionDelay: open ? `${80 + i * 60}ms` : "0ms" }} className="fd-sheet-item fd-head fd-press border-b border-[hsl(var(--fd-line))] py-5 text-3xl font-bold">
              {n.label}
            </a>
          ))}
          <div style={{ transitionDelay: open ? `${80 + items.length * 60}ms` : "0ms" }} className="fd-sheet-item mt-8 flex gap-6 text-[hsl(var(--fd-dim))]">
            <a href={GITHUB_ORG_URL} target="_blank" rel="noreferrer" aria-label="GitHub" className="fd-press"><GithubMark className="h-7 w-7" /></a>
            <a href={DISCORD_URL} target="_blank" rel="noreferrer" aria-label="Discord" className="fd-press"><DiscordMark className="h-7 w-7" /></a>
          </div>
        </nav>
      </div>, document.querySelector(".foundation") ?? document.body)}
    </>
  );
}
