import { ArrowRight } from "lucide-react";
import { DISCORD_URL, GITHUB_ORG_URL, GITHUB_FRAMEWORK_DOCS_URL } from "@/data/external-links";



const CTASection = () => {
  return (
     <section className="relative py-section-lg bg-background overflow-hidden">
       <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] md:w-[900px] md:h-[500px] rounded-full bg-primary/[0.06] blur-[120px]" />
       </div>
       <div className="relative container max-w-[1600px] text-center">
          <div className="flex items-center justify-center gap-3 mb-golden-md">
            <span className="font-mono text-fluid-caption tracking-[0.05em] text-foreground/[0.12]">§17</span>
          </div>

          <h2 className="font-display font-bold text-foreground text-fluid-heading">
           Join the UOR Mission
          </h2>

        <div className="mt-golden-lg flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
          <a
            href={GITHUB_FRAMEWORK_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center gap-2"
          >
            Getting Started Guide
            <ArrowRight size={14} />
          </a>
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline inline-flex items-center gap-2"
          >
            Join Discord
          </a>
          <a
            href={GITHUB_ORG_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline inline-flex items-center gap-2"
          >
            GitHub Organization
          </a>
         </div>
       </div>
     </section>
  );
};

export default CTASection;
