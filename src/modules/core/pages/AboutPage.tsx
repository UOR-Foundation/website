import Layout from "@/modules/core/components/Layout";
import { governanceBoard } from "@/data/governance";
import { whatWeDoCards } from "@/data/about-cards";
import { BookOpen, Microscope, Rocket } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const cardIconMap: Record<string, LucideIcon> = { BookOpen, Microscope, Rocket };

const About = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient pt-[21px] md:pt-52 pb-16 md:pb-28">
        <div className="container max-w-3xl">
          <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground text-balance animate-fade-in-up">
            About the UOR Foundation
          </h1>
        </div>
      </section>

      <section className="py-12 md:py-28 bg-background">
        <div className="container max-w-3xl space-y-14">

          {/* Our Mission */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-5">Our Mission</h2>
            <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed">
              Give every piece of information one permanent address, based on what it{" "}
              <em className="not-italic text-foreground/70">is</em>, not where it{" "}
              <em className="not-italic text-foreground/70">lives</em>. Make that address verifiable by anyone, composable across systems, and open forever.
            </p>
          </div>

          <div className="rule" />

          {/* What We Do */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-5">What We Do</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {whatWeDoCards.map((item) => {
                const Icon = cardIconMap[item.iconKey];
                return (
                  <div
                    key={item.title}
                    className="rounded-xl border border-border/60 bg-card/50 p-5 flex flex-col gap-3"
                  >
                    {Icon && <Icon size={20} className="text-primary" />}
                    <h3 className="font-display text-base font-semibold text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground font-body leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rule" />

          {/* Our Governance */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.35s" }}>
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-5">Our Governance</h2>
            <p className="text-muted-foreground font-body text-base md:text-lg leading-relaxed mb-8">
              Five board members oversee the foundation's direction, ensuring transparency and accountability.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-5">
              {governanceBoard.map((member) => (
                <a
                  key={member.name}
                  href={member.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col items-center text-center gap-3"
                >
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-border/60 group-hover:border-primary/50 transition-colors">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <p className="font-display text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {member.name}
                    </p>
                    <p className="text-xs text-muted-foreground font-body mt-0.5 leading-snug">
                      {member.role}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
