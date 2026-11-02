import uorIcon from "@/assets/uor-icon.svg";
import { DISCORD_URL, GITHUB_ORG_URL } from "./links";
import { DiscordMark, GithubMark } from "./BrandIcons";
import MobileMenu from "./MobileMenu";

export const NAV = [
  { label: "UOR Framework", target: "about" },
  { label: "Prism SDK", target: "framework" },
  { label: "Community", target: "posts" },
];

/** Top menu shared by the inner pages; items jump to the home page sections. */
export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 bg-[hsl(var(--fd-bg)/0.8)] backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
        <a href="/" className="fd-head flex shrink-0 items-center gap-3 text-xl font-bold tracking-normal sm:text-2xl">
          <img src={uorIcon} alt="" aria-hidden="true" className="h-8 w-auto shrink-0" />
          <span>UOR Foundation</span>
        </a>
        <div className="flex items-center gap-4 text-lg text-[hsl(var(--fd-dim))] lg:gap-7">
          {NAV.map((n) => (
            <a key={n.label} href={`/#${n.target}`} className="hidden whitespace-nowrap hover:text-[hsl(var(--fd-fg))] md:inline">{n.label}</a>
          ))}
          <span aria-hidden className="hidden md:block h-6 w-px bg-[hsl(var(--fd-line-strong))]" />
          <div className="hidden items-center gap-4 md:flex">
            <a href={GITHUB_ORG_URL} target="_blank" rel="noreferrer" aria-label="GitHub" className="transition-colors hover:text-[hsl(var(--fd-fg))]"><GithubMark className="h-[24px] w-[24px]" /></a>
            <a href={DISCORD_URL} target="_blank" rel="noreferrer" aria-label="Discord" className="transition-colors hover:text-[hsl(var(--fd-fg))]"><DiscordMark className="h-[24px] w-[24px]" /></a>
          </div>
          <MobileMenu items={NAV.map((n) => ({ label: n.label, href: `/#${n.target}` }))} />
        </div>
      </nav>
      <span aria-hidden className="fd-header-line" />
    </header>
  );
}
