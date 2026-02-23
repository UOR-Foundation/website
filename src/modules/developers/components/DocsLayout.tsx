import { Link, useLocation } from "react-router-dom";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { DocIcon } from "./DocIcon";
import { DocSidebarSection, docSidebars } from "../data/doc-sidebars";

interface DocsLayoutProps {
  sidebar: DocSidebarSection;
  breadcrumbs: { label: string; href?: string }[];
  tocItems?: { label: string; id: string }[];
  children: React.ReactNode;
}

const DocsLayout = ({ sidebar, breadcrumbs, tocItems, children }: DocsLayoutProps) => {
  const { pathname, hash } = useLocation();
  const currentPath = pathname + hash;

  return (
    <div className="dark bg-section-dark text-section-dark-foreground min-h-screen pt-36 md:pt-44">
      <div className="flex max-w-[1400px] mx-auto">
        {/* ── Left sidebar ──────────────────────────────────── */}
        <aside className="hidden lg:block w-64 shrink-0 border-r border-border/30 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto">
          <div className="p-5 pb-3">
            <div className="flex items-center gap-2.5 mb-5">
              <DocIcon name={sidebar.icon} size={18} className="text-primary" />
              <span className="text-sm font-semibold text-foreground font-body">
                {sidebar.title}
              </span>
            </div>
            <nav className="space-y-0.5">
              {sidebar.items.map((item) => {
                const isActive =
                  currentPath === item.href ||
                  (item.href === pathname && !hash);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`block px-3 py-2 rounded-md text-[13px] transition-colors ${
                      isActive
                        ? "text-primary font-medium bg-primary/8"
                        : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                    }`}
                  >
                    {item.label}
                    {item.badge && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* ── Main content ──────────────────────────────────── */}
        <main className="flex-1 min-w-0 px-6 md:px-10 lg:px-12 py-8 max-w-3xl">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
            <Link to="/developers" className="hover:text-foreground transition-colors">
              Docs
            </Link>
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <ChevronRight size={12} className="text-muted-foreground/50" />
                {crumb.href ? (
                  <Link to={crumb.href} className="hover:text-foreground transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>

          {children}

          {/* Cross-section navigation */}
          <div className="mt-16 pt-8 border-t border-border/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 font-body">
              Explore other sections
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.values(docSidebars)
                .filter((s) => s.serviceId !== sidebar.serviceId)
                .map((s) => (
                  <Link
                    key={s.serviceId}
                    to={s.items[0]?.href ?? `/developers/${s.serviceId}`}
                    className="group flex items-center gap-2 rounded-lg border border-border/30 px-3 py-2.5 hover:border-primary/30 hover:bg-card/30 transition-all"
                  >
                    <DocIcon name={s.icon} size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors truncate">
                      {s.title}
                    </span>
                  </Link>
                ))}
            </div>
          </div>

          {/* Back to docs */}
          <div className="mt-6 pb-2">
            <Link
              to="/developers"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <ChevronLeft size={14} />
              Back to Developer Docs
            </Link>
          </div>
        </main>

        {/* ── Right TOC ─────────────────────────────────────── */}
        {tocItems && tocItems.length > 0 && (
          <aside className="hidden xl:block w-52 shrink-0 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto">
            <div className="p-5">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 font-body">
                On this page
              </p>
              <nav className="space-y-1">
                {tocItems.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default DocsLayout;
