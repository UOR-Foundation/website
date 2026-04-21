import ArticleLayout from "../components/ArticleLayout";
import coverImage from "@/assets/blog-uor-framework-launch.png";
import { GITHUB_FRAMEWORK_URL } from "@/data/external-links";

const BlogPost3 = () => {
  return (
    <ArticleLayout
      eyebrow="Open Research"
      title="Meet the UOR Framework"
      standfirst="The open specification is live. Browse the full framework, review the architecture, and start building."
      date="February 19, 2026"
      authors={["UOR Foundation Research"]}
      readTime="8 min read"
      heroImage={coverImage}
      heroAlt="The UOR Framework"
      heroCaption="One address per object — derived from content, permanent, verifiable anywhere."
    >
      <p className="lede">
        Your universal coordinate system for information.
      </p>
      <p>
        Every file you have ever shared, every dataset you have ever published, every piece of research you have ever cited, lives at an address that someone else controls. Move it, and the link breaks. Copy it, and you lose track of which version is real. Send it to another system, and half the meaning disappears.
      </p>
      <p>We built UOR to end that.</p>

      <h2>One address. Derived from content. Permanent.</h2>
      <p>
        The UOR Framework gives every piece of information a single address based on what it <em>is</em>, not where it happens to be stored. The same content always resolves to the same address, on any platform, in any format, at any point in time. No central registry. No intermediary. No single point of failure.
      </p>
      <p>
        Think of it as GPS for data. GPS does not care which map app you use — the coordinates are the coordinates. UOR works the same way for information. One address per object, everywhere, forever.
      </p>

      <h2>What this unlocks</h2>
      <p>
        Until now, every system that stores or processes data has been its own island. Getting data between islands means building bridges, and every bridge is different, fragile, and expensive to maintain.
      </p>
      <p>UOR replaces the bridges with a shared foundation. When your data has a permanent, verifiable address, everything changes.</p>
      <ul>
        <li><strong>You can verify anything.</strong> Did this dataset change since it was published? Was this research actually produced by the person who claims it? You do not need to trust the source. The math tells you.</li>
        <li><strong>You can find anything.</strong> Search by what data contains, not by where someone decided to put it. Discovery works across every system that speaks UOR.</li>
        <li><strong>You can move anything.</strong> Change formats, move between platforms, transform representations. The identity and meaning of your data survive the journey intact.</li>
        <li><strong>You can compose anything.</strong> Build complex structures from simple parts. Take them apart again. Nothing is lost.</li>
      </ul>

      <h2>Six layers. One foundation.</h2>
      <p>
        The framework is built in layers, each one adding a new capability on top of the last. Together, they form a complete system for working with data the way it should have always worked.
      </p>

      <h3>The Foundation</h3>
      <p>Everything starts here. Four core principles guarantee that any object can be broken into its simplest parts and perfectly reassembled. No information is ever lost. This is the bedrock.</p>

      <h3>Identity</h3>
      <p>Every object gets one address, derived from its content. Same content, same address. Always. Everywhere. No central authority required.</p>

      <h3>Structure</h3>
      <p>Combine objects into larger wholes. Pull them apart again. The composition is lossless. Complex systems become navigable, auditable, and fully transparent.</p>

      <h3>Resolution</h3>
      <p>Find what you need by describing it, not by knowing where it is stored. Content-based discovery that works across every system.</p>

      <h3>Verification</h3>
      <p>Every operation comes with proof. You can verify integrity, trace history, and audit transformations. Trust is built into the system, not bolted on after the fact.</p>

      <h3>Transformation</h3>
      <p>Change format, change system, change representation. The meaning and identity of your data travel with it. Nothing is lost in translation.</p>

      <h2>Who this is for</h2>
      <p>If you work with data, this is for you.</p>
      <ul>
        <li><strong>Researchers</strong> who want datasets that can be independently verified and precisely cited, no matter where they are hosted.</li>
        <li><strong>Developers</strong> who want a data layer that guarantees integrity and interoperability without building custom integrations for every service.</li>
        <li><strong>AI builders</strong> who need verifiable data provenance so their systems can reason with confidence instead of guessing.</li>
        <li><strong>Organizations</strong> tired of spending engineering hours gluing incompatible systems together.</li>
      </ul>

      <h2>Where it applies</h2>
      <p>A single foundation opens the door to breakthroughs across disciplines.</p>
      <ul>
        <li><strong>Semantic Web:</strong> Give every piece of data a meaning machines can understand, making the web truly interoperable.</li>
        <li><strong>Proof-Based Computation:</strong> Verified AI where outputs reduce to compact proofs anchored to deterministic coordinates.</li>
        <li><strong>Agentic AI:</strong> Enable autonomous agents to reason, verify, and act across all data sources within one unified space.</li>
        <li><strong>Open Science:</strong> Make research data findable, reproducible, and composable across institutions and fields.</li>
        <li><strong>Cross-Domain Unification:</strong> Bridge ideas across disciplines with a shared coordinate system that preserves meaning.</li>
        <li><strong>Frontier Technologies:</strong> A foundational layer for emerging fields like topological quantum computing and neuro-symbolic AI.</li>
      </ul>

      <h2>See for yourself</h2>
      <p>
        The full specification, source code, and documentation are open, right now. Read it. Challenge it. Build on it. → <a href={GITHUB_FRAMEWORK_URL} target="_blank" rel="noopener noreferrer">github.com/UOR-Foundation/UOR-Framework</a>
      </p>
      <p>
        This is not a finished product. It is a foundation, and it is designed to grow through real-world use, honest critique, and open collaboration. Your perspective — especially where you see gaps — is exactly what makes this better.
      </p>
    </ArticleLayout>
  );
};

export default BlogPost3;