import { ArrowRight } from "lucide-react";
import { DISCORD_URL, GITHUB_ORG_URL, GITHUB_FRAMEWORK_DOCS_URL } from "@/data/external-links";

const CTASection = () => {
  return (
     <section className="relative py-32 md:py-40 bg-background overflow-hidden">
       {/* Radial glow */}
       <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] md:w-[900px] md:h-[500px] rounded-full bg-primary/[0.06] blur-[120px]" />
       </div>
       <div className="relative container max-w-6xl text-center">
         <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground">
          Ready to Build?
        </h2>
        <p className="mt-6 md:mt-8 text-base text-foreground/40 font-body leading-[1.68] max-w-2xl mx-auto" style={{ textTransform: 'none' }}>
          Verify your first address in five minutes, then join the community.
        </p>

        <div className="mt-10 md:mt-14 flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
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
       </div>
     </section>
  );
};

export default CTASection;
