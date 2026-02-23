/**
 * Project Detail Page — QR Cartridge
 */

import ProjectDetailLayout from "@/modules/projects/components/ProjectDetailLayout";
import projectImg from "@/assets/project-qr-cartridge.jpg";
import { Link } from "react-router-dom";

const ProjectQrCartridge = () => (
  <ProjectDetailLayout
    name="QR Cartridge"
    slug="qr-cartridge"
    category="Developer Tools"
    tagline="Turn any content into a scannable QR code that carries its own verified identity."
    heroImage={projectImg}
    repoUrl="https://github.com/UOR-Foundation"
    sections={[
      {
        heading: "What it does",
        content: "QR Cartridge encodes a UOR content-addressed identity directly into a standard QR code. When scanned, the QR resolves to the content — whether it's a movie, an application, a song, or a website. The identity is derived from the content itself via the Single Proof Hashing Standard (URDNA2015 → SHA-256), so the same content always produces the same QR code, everywhere.",
      },
      {
        heading: "How it works",
        content: (
          <>
            Every cartridge carries a dual-layer payload: an HTTP fallback URL that any phone can scan,
            plus a SHA-256 hash fragment that UOR-aware clients use for full 256-bit verification. The QR code
            is ISO/IEC 18004 compliant — no custom extensions, no proprietary formats.{" "}
            <Link to="/cartridge" className="text-primary hover:underline">Try the generator →</Link>
          </>
        ),
      },
      {
        heading: "The Cartridge metaphor",
        content: "Think of each QR code as a cartridge — like the game cartridges of the retro era. Insert (scan) the cartridge to load the content. The cartridge doesn't contain the content itself; it contains the content's verified identity. Any resolver on the network can serve the content, and any client can verify it matches the identity in the cartridge.",
      },
      {
        heading: "Key properties",
        content: "• Deterministic: same content → same QR, always. • Self-verifying: the hash IS the identity. • Media-agnostic: movies, apps, music, websites, data. • Standards-compliant: ISO/IEC 18004 QR + W3C JSON-LD. • Multi-resolver: HTTP, IPFS, and IPv6 endpoints.",
      },
    ]}
    agentInstructions={[
      { action: "Generate", detail: "POST any JSON-LD object to build a cartridge with canonical identity." },
      { action: "Scan", detail: "Decode any QR URL with #sha256= fragment to recover the full UOR identity." },
      { action: "Verify", detail: "Re-derive the identity from content and compare u:canonicalId for tamper detection." },
    ]}
  />
);

export default ProjectQrCartridge;
