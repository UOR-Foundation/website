import ProjectDetailLayout from "../components/ProjectDetailLayout";
import heroImg from "@/assets/project-uor-certificate.jpg";

const ProjectCertificate = () => (
  <ProjectDetailLayout
    name="UOR Certificate"
    slug="uor-certificate"
    category="Core Infrastructure"
    tagline="A self-verifying receipt for any digital object. Proves authenticity through mathematics, not authorities. Anyone can verify, anywhere, with no special access required."
    heroImage={heroImg}
    repoUrl="https://github.com/UOR-Foundation"
    agentInstructions={[
      { action: "Understand the concept", detail: "A UOR Certificate is a mathematical proof that content is authentic. It works like a receipt: it records what the content IS, not where it came from." },
      { action: "Generate a certificate", detail: "Import generateCertificate from the module, pass any object, and receive a complete self-verifying certificate." },
      { action: "Verify authenticity", detail: "Import verifyCertificate, pass any certificate, and the module re-hashes the content to confirm the fingerprint matches." },
      { action: "Decode for display", detail: "Import decodeCertificate to extract the triword, coordinates, fingerprint, and all human-readable fields." },
    ]}
    sections={[
      {
        heading: "The problem",
        content: (
          <>
            <p>
              Proving that digital content is authentic requires trusting someone else: a certificate authority, a platform, a database, or a signature service. If that authority is compromised, unavailable, or goes out of business, verification breaks.
            </p>
            <p>
              Documents can be backdated, images can be swapped, and metadata can be altered, with no way for a recipient to independently confirm what they received is what was originally created.
            </p>
          </>
        ),
      },
      {
        heading: "What it does",
        content: (
          <>
            <p>
              A UOR Certificate is a digital receipt that proves content is authentic. Unlike traditional certificates issued by authorities, a UOR Certificate is derived directly from the content itself, making it self-verifying and impossible to forge.
            </p>
            <p>
              Every certificate includes a three-word identity (like "Meadow · Steep · Keep") that makes the mathematical fingerprint memorable and human-friendly, plus the full payload needed to independently re-verify the certificate at any time.
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
            <ol className="space-y-4 mt-4 list-none">
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">1</span>
                <span><strong className="text-foreground">Canonicalize.</strong> The content is serialized into a standard form so that identical content always produces identical bytes.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">2</span>
                <span><strong className="text-foreground">Hash.</strong> The canonical bytes are hashed with SHA-256, producing a unique 256-bit fingerprint. Any change produces a completely different fingerprint.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">3</span>
                <span><strong className="text-foreground">Derive.</strong> From the hash, four identity forms are computed: a content identifier, a derivation ID, a visual address, and a routable IPv6 address.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold shrink-0">4</span>
                <span><strong className="text-foreground">Verify.</strong> To check authenticity, re-hash the stored payload and compare. If the fingerprints match, the content is untampered.</span>
              </li>
            </ol>
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
              <span><strong className="text-foreground">Document authenticity.</strong> Issue tamper-evident certificates for contracts, research papers, or any document where integrity matters.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Data exchange.</strong> When sharing data between organizations, each record carries its own proof of authenticity.</span>
            </li>
          </ul>
        ),
      },
    ]}
  />
);

export default ProjectCertificate;
