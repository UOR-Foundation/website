import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { DocCategory } from "../data/doc-categories";
import { DocIcon } from "./DocIcon";

interface DocCategoryCardProps {
  category: DocCategory;
}

const DocCategoryCard = ({ category }: DocCategoryCardProps) => (
  <Link
    to={category.href}
    className="group flex items-start gap-4 rounded-xl border border-border/60 bg-card/50 p-5 transition-all duration-200 hover:border-primary/40 hover:bg-card"
  >
    <div className="shrink-0 mt-0.5 p-2 rounded-lg bg-primary/10 text-primary">
      <DocIcon name={category.icon} size={18} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-semibold text-card-foreground font-body">
          {category.title}
        </h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
        {category.description}
      </p>
    </div>
    <ChevronRight
      size={14}
      className="shrink-0 mt-1 text-muted-foreground/40 group-hover:text-primary transition-colors"
    />
  </Link>
);

export default DocCategoryCard;
