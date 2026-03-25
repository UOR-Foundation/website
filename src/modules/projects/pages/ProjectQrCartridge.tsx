import ProjectDetailLayout from "@/modules/projects/components/ProjectDetailLayout";
import projectImg from "@/assets/project-qr-cartridge.jpg";
import { Link } from "react-router-dom";

const ProjectQrCartridge = () => (
  <ProjectDetailLayout
    name="QR Cartridge"
    slug="qr-cartridge"
    category="Developer Tools"
    tagline="Turn any content into a scannable QR code that carries its own verified identity. One scan to load. No trust required."
    heroImage={projectImg}
    repoUrl="https://github.com/UOR-Foundation"
    agentInstructions={[
      { action: "Generate a cartridge", detail: "POST any JSON-LD object to build a cartridge with canonical identity." },
      { action: "Scan and decode", detail: "Decode any QR URL with #sha256= fragment to recover the full UOR identity." },
      { action: "Verify content", detail: "Re-derive the identity from content and compare for tamper detection." },
    ]}
    sections={[
      {
        heading: "The problem",
        content: (
          <>
            <p>
              QR codes today are just links. You scan one and hope it takes you where it says it will. There is no way to verify that the content behind the code is authentic, unmodified, or even what it claims to be.
            </p>
            <p>
              This makes QR codes a trust problem. You are scanning a black box and relying on whoever printed it to be honest.
            </p>
          </>
        ),
      },
      {
        heading: "What it does",
        content: (
          <>
            <p>
              QR Cartridge encodes a content-addressed identity directly into a standard QR code. When scanned, the QR resolves to the content, whether it's a movie, an application, a song, or a website. The identity is derived from the content itself, so the same content always produces the same QR code.
            </p>
            <p>
              Think of each QR code as a cartridge. Scan the cartridge to load the content. The cartridge doesn't contain the content itself; it contains the content's verified identity. Any resolver on the network can serve the content, and any client can verify it matches. <Link to="/cartridge" className="text-primary hover:underline">Try the generator.</Link>
            </p>
          </>
        ),
      },
      {
        heading: "How it works",
        content: (
          <>
            <p>
              Every cartridge carries a dual-layer payload: an HTTP fallback URL that any phone can scan, plus a SHA-256 hash fragment that UOR-aware clients use for full verification. The QR code is ISO/IEC 18004 compliant. No custom extensions, no proprietary formats.
            </p>
            <p>
              Same content always produces the same QR. The hash is the identity. Works with any media type: movies, apps, music, websites, data.
            </p>
          </>
        ),
      },
      {
        heading: "Where it applies",
        content: (
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Software distribution.</strong> Ship verifiable downloads via QR. The recipient can confirm the binary matches the source.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Media sharing.</strong> Share music, video, or documents with built-in proof of authenticity.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Physical-digital bridge.</strong> Print verified QR codes on packaging, posters, or hardware for instant content loading.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span><strong className="text-foreground">Supply chain verification.</strong> Embed product authenticity proofs directly in scannable labels.</span>
            </li>
          </ul>
        ),
      },
    ]}
  />
);

export default ProjectQrCartridge;
