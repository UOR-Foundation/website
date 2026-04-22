import ArticleLayout from "@/modules/core/components/ArticleLayout";
import coverImage from "@/assets/blog-uor-framework-launch.png";
import blogKnowledgeGraph from "@/assets/blog-knowledge-graph.png";
import blogGoldenSeed from "@/assets/blog-golden-seed-vector.png";
import { blogPosts } from "@/data/blog-posts";
import { GITHUB_FRAMEWORK_URL } from "@/data/external-links";
import { Globe, ShieldCheck, Bot, Microscope, Layers, Rocket } from "lucide-react";
import TldrAside from "../components/TldrAside";

const SLUG = "/blog/uor-framework-launch";

const coverMap: Record<string, string> = {
  knowledgeGraph: blogKnowledgeGraph,
  goldenSeed: blogGoldenSeed,
  frameworkLaunch: coverImage,
};

const APPLICATIONS = [
  { icon: Globe, title: "Semantic Web", desc: "Give every piece of data a meaning machines can understand, making the web truly interoperable." },
  { icon: ShieldCheck, title: "Proof-Based Computation", desc: "Verified AI where outputs reduce to compact proofs anchored to deterministic coordinates." },
  { icon: Bot, title: "Agentic AI", desc: "Enable autonomous agents to reason, verify, and act across all data sources within one unified space." },
  { icon: Microscope, title: "Open Science", desc: "Make research data findable, reproducible, and composable across institutions and fields." },
  { icon: Layers, title: "Cross-Domain Unification", desc: "Bridge ideas across disciplines with a shared coordinate system that preserves meaning." },
  { icon: Rocket, title: "Frontier Technologies", desc: "A foundational layer for emerging fields like topological quantum computing and neuro-symbolic AI." },
];

const LAYERS = [
  { title: "The Foundation", desc: "Everything starts here. Four core principles guarantee that any object can be broken into its simplest parts and perfectly reassembled. No information is ever lost. This is the bedrock." },
  { title: "Identity", desc: "Every object gets one address, derived from its content. Same content, same address. Always. Everywhere. No central authority required." },
  { title: "Structure", desc: "Combine objects into larger wholes. Pull them apart again. The composition is lossless. Complex systems become navigable, auditable, and fully transparent." },
  { title: "Resolution", desc: "Find what you need by describing it, not by knowing where it is stored. Content-based discovery that works across every system." },
  { title: "Verification", desc: "Every operation comes with proof. You can verify integrity, trace history, and audit transformations. Trust is built into the system, not bolted on after the fact." },
  { title: "Transformation", desc: "Change format, change system, change representation. The meaning and identity of your data travel with it. Nothing is lost in translation." },
];

const BlogPost3 = () => {
  const related = blogPosts
    .filter((p) => p.href !== SLUG)
    .slice(0, 3)
    .map((p) => ({
      title: p.title,
      href: p.href,
      meta: `${p.tag} · ${p.date}`,
      image: coverMap[p.coverKey],
    }));

  return (
    <ArticleLayout
      kicker="Open Research"
      date="February 19, 2026"
      title="What If Every Piece of Data Had One Permanent Address?"
      heroImage={coverImage}
      backHref="/research#blog"
      backLabel="Back to Research"
      sourceUrl={GITHUB_FRAMEWORK_URL}
      sourceLabel="github.com/UOR-Foundation/UOR-Framework"
      related={related}
    >
      <TldrAside>
        <p>
          The open specification is live. Browse the full framework, review the architecture, and start building.
        </p>
      </TldrAside>

      <p>
        Every file you have ever shared, every dataset you have ever published, every piece of research you have ever cited, lives at an address that someone else controls. Move it, and the link breaks. Copy it, and you lose track of which version is real. Send it to another system, and half the meaning disappears.
      </p>
      <p>We built UOR to end that.</p>

      <section>
        <h2>One Address. Derived from Content. Permanent.</h2>
        <p>
          The UOR Framework gives every piece of information a single address based on what it <em>is</em>, not where it happens to be stored. The same content always resolves to the same address — on any platform, in any format, at any point in time. No central registry. No intermediary. No single point of failure.
        </p>
        <p>
          Think of it as GPS for data. GPS does not care which map app you use. The coordinates are the coordinates. UOR works the same way for information. One address per object, everywhere, forever.
        </p>
      </section>

      <section>
        <h2>What This Unlocks</h2>
        <p>
          Until now, every system that stores or processes data has been its own island. Getting data between islands means building bridges, and every bridge is different, fragile, and expensive to maintain.
        </p>
        <p>
          UOR replaces the bridges with a shared foundation. When your data has a permanent, verifiable address, everything changes.
        </p>
        <ul>
          <li><strong>You can verify anything.</strong> Did this dataset change since it was published? Was this research actually produced by the person who claims it? You do not need to trust the source. The math tells you.</li>
          <li><strong>You can find anything.</strong> Search by what data contains, not by where someone decided to put it. Discovery works across every system that speaks UOR.</li>
          <li><strong>You can move anything.</strong> Change formats, move between platforms, transform representations. The identity and meaning of your data survive the journey intact.</li>
          <li><strong>You can compose anything.</strong> Build complex structures from simple parts. Take them apart again. Nothing is lost.</li>
        </ul>
      </section>

      <section>
        <h2>Six Layers. One Foundation.</h2>
        <p>
          The framework is built in layers, each one adding a new capability on top of the last. Together, they form a complete system for working with data the way it should have always worked.
        </p>
        <div className="mt-6 space-y-5 not-prose">
          {LAYERS.map((layer) => (
            <div key={layer.title} className="pl-5 border-l-2 border-primary/30">
              <h3 className="font-display text-lg font-semibold text-foreground mb-1">{layer.title}</h3>
              <p className="text-base text-muted-foreground leading-[1.65]">{layer.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Who This Is For</h2>
        <p>If you work with data, this is for you.</p>
        <ul>
          <li><strong>Researchers</strong> who want datasets that can be independently verified and precisely cited, no matter where they are hosted.</li>
          <li><strong>Developers</strong> who want a data layer that guarantees integrity and interoperability without building custom integrations for every service.</li>
          <li><strong>AI builders</strong> who need verifiable data provenance so their systems can reason with confidence instead of guessing.</li>
          <li><strong>Organizations</strong> tired of spending engineering hours gluing incompatible systems together.</li>
        </ul>
      </section>

      <section>
        <h2>Where It Applies</h2>
        <p>A single foundation opens the door to breakthroughs across disciplines.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 not-prose">
          {APPLICATIONS.map((item) => (
            <div key={item.title} className="rounded-xl border border-border bg-card p-5">
              <item.icon size={20} className="text-primary mb-3" />
              <h3 className="font-display text-base font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>See for Yourself</h2>
        <p>
          The full specification, source code, and documentation are open, right now. Read it. Challenge it. Build on it at{" "}
          <a href={GITHUB_FRAMEWORK_URL} target="_blank" rel="noopener noreferrer">github.com/UOR-Foundation/UOR-Framework</a>.
        </p>
        <p>
          This is not a finished product. It is a foundation, and it is designed to grow through real-world use, honest critique, and open collaboration. Your perspective — especially where you see gaps — is exactly what makes this better.
        </p>
      </section>
    </ArticleLayout>
  );
};

export default BlogPost3;
