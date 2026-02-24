import ProjectDetailLayout from "../components/ProjectDetailLayout";
import heroImg from "@/assets/project-uor-certificate.jpg";

const ProjectCertificate = () => (
  <ProjectDetailLayout
    name="UOR Certificate"
    slug="uor-certificate"
    category="Core Infrastructure"
    tagline="A self-verifying receipt for any digital object. No certificate authority, no external service, no trust required — just mathematics."
    heroImage={heroImg}
    repoUrl="https://github.com/UOR-Foundation"
    agentInstructions={[
      { action: "Understand the concept", detail: "A UOR Certificate is a mathematical proof that content is authentic. It works like a receipt: it records what the content IS, not where it came from. Anyone can re-check it independently." },
      { action: "Generate a certificate", detail: "Import generateCertificate from the module, pass any object, and receive a complete self-verifying certificate with a human-readable triword identity." },
      { action: "Verify authenticity", detail: "Import verifyCertificate, pass any certificate, and the module re-hashes the content to confirm the fingerprint matches. No network, no authority, no trust needed." },
      { action: "Decode for display", detail: "Import decodeCertificate to extract the triword, coordinates, fingerprint, and all human-readable fields from a raw certificate." },
    ]}
    sections={[
      {
        heading: "What it is",
        content: (
          <>
            <p>
              A UOR Certificate is a digital receipt that proves a piece of content is authentic. Unlike traditional certificates issued by authorities, a UOR Certificate is derived directly from the content itself — making it self-verifying and impossible to forge.
            </p>
            <p>
              Every certificate includes a three-word identity (like "Meadow · Steep · Keep") that makes the mathematical fingerprint memorable and human-friendly, plus the full canonical payload needed to independently re-verify the certificate at any time.
            </p>
          </>
        ),
      },
      {
        heading: "The problem it solves",
        content: (
          <>
            <p>
              Today, proving that digital content is authentic requires trusting someone else: a certificate authority, a platform, a database, or a signature service. If that authority is compromised, unavailable, or simply goes out of business, verification breaks.
            </p>
            <p>
              This creates a fragile trust chain where authenticity depends on institutions rather than evidence. Documents can be backdated, images can be swapped, and metadata can be altered — with no way for a recipient to independently confirm what they received is what was originally created.
            </p>
          </>
        ),
      },
      {
        heading: "How it works",
        content: (
          <>
            <p>
              The certificate module follows a four-step pipeline that anyone can reproduce independently:
            </p>
            <ul className="space-y-3 mt-4">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Canonicalize.</strong> The content is serialized into a standard form (URDNA2015 N-Quads) so that identical content always produces identical bytes — regardless of key ordering or formatting differences.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Hash.</strong> The canonical bytes are hashed with SHA-256, producing a unique 256-bit fingerprint. Any change to the content — even a single character — produces a completely different fingerprint.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Derive.</strong> From the single hash, four identity forms are computed: a CID (content identifier), a derivation ID, a Braille visual address, and a routable IPv6 address. Plus a three-word human-readable label.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><strong className="text-foreground">Verify.</strong> To check authenticity, re-hash the stored payload and compare. If the fingerprints match, the content is untampered. No authority needed — pure mathematics.</span>
              </li>
            </ul>
          </>
        ),
      },
      {
        heading: "Where it applies",
        content: (
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Software supply chain.</strong> Verify that deployed code matches the original source without trusting a registry or build system.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">AI model provenance.</strong> Certify training data, model weights, and inference outputs so that every AI result carries a verifiable chain of evidence.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Document authenticity.</strong> Issue tamper-evident certificates for contracts, research papers, medical records, or any document where integrity matters.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Data exchange.</strong> When sharing data between organizations, each record carries its own proof of authenticity — no shared database or API trust required.</span>
            </li>
          </ul>
        ),
      },
      {
        heading: "Module architecture",
        content: (
          <>
            <p>
              The certificate module is fully self-contained with a clean, minimal API:
            </p>
            <ul className="space-y-3 mt-4">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">generateCertificate(subject, data)</code> — Create a certificate for any object</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">verifyCertificate(cert)</code> — Re-hash and confirm authenticity</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">decodeCertificate(cert)</code> — Extract human-readable fields</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span><code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">certificateToTriword(cert)</code> — Get the three-word identity</span>
              </li>
            </ul>
          </>
        ),
      },
    ]}
  />
);

export default ProjectCertificate;
