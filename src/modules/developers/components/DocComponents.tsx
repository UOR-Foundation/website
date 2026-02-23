import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface DocFeatureCardProps {
  title: string;
  description: string;
  href: string;
  cta: string;
}

export const DocFeatureCard = ({ title, description, href, cta }: DocFeatureCardProps) => (
  <div className="py-6 first:pt-0 last:pb-0">
    <h3 className="text-lg font-display font-semibold text-foreground mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed mb-3 max-w-lg">{description}</p>
    <Link
      to={href}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border/50 text-sm font-medium text-foreground hover:border-primary/40 hover:text-primary transition-all"
    >
      {cta}
      <ArrowRight size={14} />
    </Link>
  </div>
);

interface DocRelatedProductProps {
  title: string;
  description: string;
  href: string;
}

export const DocRelatedProduct = ({ title, description, href }: DocRelatedProductProps) => (
  <Link
    to={href}
    className="block group"
  >
    <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors mb-1 font-body">
      {title}
    </h4>
    <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
  </Link>
);

interface DocCodeBlockProps {
  label?: string;
  method?: string;
  code: string;
}

export const DocCodeBlock = ({ label, method, code }: DocCodeBlockProps) => (
  <div className="rounded-xl border border-border/50 bg-section-dark overflow-hidden my-4">
    {label && (
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30 text-xs text-muted-foreground">
        {method && (
          <span className="px-2 py-0.5 rounded bg-primary/15 text-primary font-mono font-medium text-[10px]">
            {method}
          </span>
        )}
        <span className="font-mono">{label}</span>
      </div>
    )}
    <pre className="p-4 text-xs font-mono text-foreground/90 leading-relaxed overflow-x-auto">
      <code>{code}</code>
    </pre>
  </div>
);
