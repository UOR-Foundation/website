import { ChevronDown, ChevronUp, CheckCircle } from "lucide-react";

export interface OpportunityDetail {
  label: string;
  value: string;
  meta?: string;
  tag?: string;
}

export interface OpportunityData {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  borderColor: string;
  stat: string;
  status: string;
  details: OpportunityDetail[];
}

interface Props {
  opportunity: OpportunityData;
  expanded: boolean;
  onToggle: () => void;
}

export function OpportunityCard({ opportunity: opp, expanded, onToggle }: Props) {
  return (
    <div
      className={`
        bg-card border rounded-xl overflow-hidden transition-all duration-300
        ${expanded ? "md:col-span-2 lg:col-span-3 border-primary/40 shadow-lg" : "border-border hover:border-primary/20 hover:shadow-md"}
      `}
    >
      {/* Card Header */}
      <button
        onClick={onToggle}
        className="w-full text-left p-4 flex items-start gap-3 group"
      >
        <span className="text-2xl mt-0.5 select-none" aria-hidden>
          {opp.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-foreground text-sm sm:text-base leading-tight">
              {opp.id}. {opp.title}
            </h3>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              <CheckCircle className="w-3 h-3" />
              {opp.status}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {opp.subtitle}
          </p>
          <div className="mt-2 text-xs font-mono text-primary/80">{opp.stat}</div>
        </div>
        <div className="text-muted-foreground group-hover:text-foreground transition-colors mt-1">
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {/* Expanded Detail Panel */}
      {expanded && (
        <div className="border-t border-border bg-secondary/30 px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {opp.details.length} entries — identity hash threads every row
          </div>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {opp.details.map((d, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-lg px-3 py-2 flex flex-col sm:flex-row sm:items-start gap-1.5"
              >
                <div className="flex items-center gap-2 shrink-0 sm:w-48">
                  {d.tag && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary whitespace-nowrap">
                      {d.tag}
                    </span>
                  )}
                  <span className="text-xs font-semibold text-foreground truncate">
                    {d.label}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[11px] text-muted-foreground break-all leading-relaxed">
                    {d.value.length > 100 ? `${d.value.slice(0, 100)}…` : d.value}
                  </div>
                  {d.meta && (
                    <div className="text-[10px] text-muted-foreground/70 mt-0.5 italic leading-relaxed">
                      {d.meta.length > 150 ? `${d.meta.slice(0, 150)}…` : d.meta}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
