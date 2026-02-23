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
    className={`group block rounded-2xl border border-border bg-card p-6 transition-all duration-200 hover:border-primary/30 hover:shadow-lg ${
      category.status === "coming-soon" ? "opacity-75 pointer-events-none" : ""
    }`}
  >
    <div className="flex items-start justify-between mb-4">
      <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
        <DocIcon name={category.icon} size={22} />
      </div>
      {category.status === "coming-soon" && (
        <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
          Coming soon
        </span>
      )}
    </div>
    <h3 className="text-lg font-semibold font-display mb-2 text-card-foreground">
      {category.title}
    </h3>
    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
      {category.description}
    </p>
    <span className="inline-flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
      Explore docs <ChevronRight size={14} className="ml-1" />
    </span>
  </Link>
);

export default DocCategoryCard;
