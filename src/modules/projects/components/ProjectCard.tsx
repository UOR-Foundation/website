import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { type MaturityLevel } from "@/data/projects";

import projectHologramImg from "@/assets/project-hologram.jpg";
import projectAtlasImg from "@/assets/project-atlas.png";
import projectAtomicLangImg from "@/assets/project-atomic-lang.jpg";
import projectPrismImg from "@/assets/project-prism.png";
import projectUorMcpImg from "@/assets/project-uor-mcp.jpg";
import projectUnsImg from "@/assets/project-uns.jpg";
import projectQrCartridgeImg from "@/assets/project-qr-cartridge.jpg";
import projectHologramSdkImg from "@/assets/project-hologram-sdk.jpg";
import projectUorIdentityImg from "@/assets/project-uor-identity.jpg";
import projectUorPrivacyImg from "@/assets/project-uor-privacy.jpg";
import projectUorCertificateImg from "@/assets/project-uor-certificate.jpg";

export const projectImageMap: Record<string, string> = {
  hologram: projectHologramImg,
  atlas: projectAtlasImg,
  atomicLang: projectAtomicLangImg,
  prism: projectPrismImg,
  uorMcp: projectUorMcpImg,
  uns: projectUnsImg,
  qrCartridge: projectQrCartridgeImg,
  hologramSdk: projectHologramSdkImg,
  uorIdentity: projectUorIdentityImg,
  uorPrivacy: projectUorPrivacyImg,
  uorCertificate: projectUorCertificateImg,
};

const maturityChip: Record<MaturityLevel, string> = {
  Graduated: "bg-primary/15 text-primary border-primary/20",
  Incubating: "bg-accent/15 text-accent border-accent/20",
  Sandbox: "bg-muted text-muted-foreground border-border",
};

export interface ProjectCardData {
  name: string;
  slug: string;
  category: string;
  description: string;
  maturity: MaturityLevel;
  url?: string;
  imageKey?: string;
}

interface ProjectCardProps {
  project: ProjectCardData;
  variant?: "default" | "compact";
  className?: string;
  style?: React.CSSProperties;
}

const ProjectCard = ({ project, variant = "default", className = "", style }: ProjectCardProps) => {
  const image = project.imageKey ? projectImageMap[project.imageKey] : undefined;
  const monogram = project.name.trim().charAt(0).toUpperCase();
  const tileSize = variant === "compact"
    ? "w-20 h-20 md:w-24 md:h-24"
    : "w-24 h-24 md:w-32 md:h-32";

  return (
    <Link
      to={`/projects/${project.slug}`}
      style={style}
      className={`group relative flex items-start gap-4 md:gap-5 rounded-2xl border border-border bg-card p-5 md:p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-md ${className}`}
    >
      {/* Logo tile */}
      <div className={`shrink-0 ${tileSize} rounded-2xl overflow-hidden border border-border bg-muted/30 relative`}>
        {image ? (
          <img
            src={image}
            alt={project.name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 via-accent/10 to-primary/5">
            <span className="font-display text-3xl md:text-4xl font-bold text-primary/80">
              {monogram}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-lg md:text-xl font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
            {project.name}
          </h3>
          {project.url && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(project.url, "_blank", "noopener,noreferrer"); }}
              className="shrink-0 text-muted-foreground hover:text-primary transition-colors mt-1"
              aria-label={`Visit ${project.name} website`}
            >
              <ExternalLink size={14} />
            </span>
          )}
        </div>

        <p className="mt-1.5 text-foreground/65 font-body text-sm md:text-base leading-snug line-clamp-2">
          {project.description}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-body">
            {project.category}
          </span>
          <span className={`text-[11px] font-semibold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full border font-body ${maturityChip[project.maturity]}`}>
            {project.maturity}
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ProjectCard;
