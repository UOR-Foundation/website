import { ArrowUpRight, BookOpen, Binary, Network } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  CRATE_URL,
  GITHUB_UOR_ADDR_URL,
  GITHUB_KAPPA_REGISTRY_URL,
} from "@/data/external-links";

interface Resource {
  icon: LucideIcon;
  name: string;
  role: string;
  description: string;
  href: string;
  hrefLabel: string;
}

const resources: Resource[] = [
  {
    icon: BookOpen,
    name: "Ontology",
    role: "Why it works",
    description:
      "The shared vocabulary. It defines what a thing is, so two systems that have never met still agree on the meaning of the same data.",
    href: CRATE_URL,
    hrefLabel: "crates.io/crates/uor-foundation",
  },
  {
    icon: Binary,
    name: "Encoder",
    role: "How it works",
    description:
      "Turns any piece of content into one stable address. Same content, same address, every time. Change one character and the address changes.",
    href: GITHUB_UOR_ADDR_URL,
    hrefLabel: "github.com/UOR-Foundation/uor-addr",
  },
  {
    icon: Network,
    name: "Registry",
    role: "What you get",
    description:
      "Look up an address and get the thing back, with proof it was not altered. No account, no gatekeeper, no guessing where it lives.",
    href: GITHUB_KAPPA_REGISTRY_URL,
    hrefLabel: "github.com/UOR-Foundation/kappa-registry",
  },
];

const ResourcesSection = () => {
  return (
    <section id="start-here" className="py-section-md bg-background scroll-mt-16">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
        <p className="font-body font-semibold tracking-[0.2em] uppercase text-primary/70 text-fluid-lead mb-golden-md">
          Start Here
        </p>
        <div className="rule-prime" />
        <p className="py-golden-lg text-foreground/70 font-body leading-[1.75] max-w-3xl text-fluid-lead">
          Three open-source pieces. Together they let anything be named, verified, and found.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          {resources.map((r, idx) => {
            const Icon = r.icon;
            return (
              <a
                key={r.name}
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-8 md:p-10 border-t border-foreground/8 md:border-l md:first:border-l-0 flex flex-col gap-golden-sm panel-active animate-fade-in-up opacity-0"
                style={{ animationDelay: `${0.1 + idx * 0.07}s` }}
              >
                <div className="flex items-center justify-between">
                  <Icon size={24} strokeWidth={1.5} className="text-primary/60 transition-colors duration-300 group-hover:text-primary" />
                  <ArrowUpRight size={18} className="text-foreground/25 transition-colors duration-300 group-hover:text-primary" />
                </div>
                <p className="font-mono uppercase tracking-[0.18em] text-fluid-label text-foreground/40">
                  {r.role}
                </p>
                <h3 className="font-display font-semibold text-foreground leading-tight text-fluid-card-title">
                  {r.name}
                </h3>
                <p className="text-foreground/65 font-body leading-[1.7] text-fluid-lead">
                  {r.description}
                </p>
                <span className="mt-auto pt-golden-sm font-mono text-fluid-label text-primary/60 group-hover:text-primary transition-colors duration-300 break-all">
                  {r.hrefLabel}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ResourcesSection;
