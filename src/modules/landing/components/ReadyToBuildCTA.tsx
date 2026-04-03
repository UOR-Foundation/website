import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const ReadyToBuildCTA = () => {
  return (
    <section className="py-section-md bg-section-dark section-depth">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
        <div className="relative text-center pt-golden-lg border-t border-foreground/8">
          <h2 className="font-display font-bold text-foreground text-fluid-heading">
            Ready to Build?
          </h2>
          <p className="mt-golden-sm text-foreground/60 font-body text-fluid-lead max-w-xl mx-auto leading-relaxed">
            Submit your project for Sandbox review. Our technical committee reviews every submission within 3 weeks.
          </p>
          <div className="mt-golden-lg">
            <Link
              to="/projects#submit"
              className="btn-primary inline-flex items-center gap-2"
            >
              Submit Your Project
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ReadyToBuildCTA;
