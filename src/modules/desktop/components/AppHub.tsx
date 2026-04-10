/**
 * AppHub — Full catalog of desktop apps, grouped by OS taxonomy category.
 * Provides a single place to discover and launch all system capabilities.
 */

import { useMemo, useCallback } from "react";
import { DESKTOP_APPS, type DesktopApp } from "@/modules/desktop/lib/desktop-apps";
import { OS_TAXONOMY, getUserFacingCategories } from "@/modules/desktop/lib/os-taxonomy";
import { motion } from "framer-motion";

/** Featured app IDs shown prominently at the top. */
const FEATURED_IDS = ["oracle", "messenger", "graph-explorer"];

function AppCard({ app, featured }: { app: DesktopApp; featured?: boolean }) {
  const Icon = app.icon;

  const launch = useCallback(() => {
    window.dispatchEvent(new CustomEvent("uor:open-app", { detail: app.id }));
  }, [app.id]);

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={launch}
      className={`group flex ${featured ? "flex-row gap-4 p-4" : "flex-col items-center gap-2.5 p-4"} rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] transition-colors text-left cursor-default`}
    >
      <div
        className={`${featured ? "w-11 h-11" : "w-10 h-10"} rounded-xl flex items-center justify-center shrink-0`}
        style={{ background: `${app.color.replace(")", " / 0.15)")}` }}
      >
        <Icon
          className={`${featured ? "w-5 h-5" : "w-4.5 h-4.5"}`}
          style={{ color: app.color }}
        />
      </div>
      <div className={`${featured ? "" : "text-center"} min-w-0`}>
        <p className="text-[13px] font-semibold text-foreground/90 truncate">{app.label}</p>
        <p className={`text-[11px] text-muted-foreground/50 ${featured ? "" : "line-clamp-2"} leading-relaxed mt-0.5`}>
          {app.description}
        </p>
      </div>
    </motion.button>
  );
}

export default function AppHub() {
  const categories = useMemo(() => getUserFacingCategories(), []);

  const featuredApps = useMemo(
    () => FEATURED_IDS.map(id => DESKTOP_APPS.find(a => a.id === id)).filter(Boolean) as DesktopApp[],
    [],
  );

  const groupedApps = useMemo(() => {
    const groups: { label: string; apps: DesktopApp[] }[] = [];
    for (const cat of categories) {
      const apps = DESKTOP_APPS.filter(
        a => a.category === cat.id && !a.hidden && !FEATURED_IDS.includes(a.id) && a.id !== "app-hub",
      );
      if (apps.length > 0) {
        groups.push({ label: cat.label, apps });
      }
    }
    return groups;
  }, [categories]);

  return (
    <div className="h-full overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
      {/* Featured */}
      <section>
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 mb-3">
          Featured
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {featuredApps.map(app => (
            <AppCard key={app.id} app={app} featured />
          ))}
        </div>
      </section>

      {/* Category groups */}
      {groupedApps.map(({ label, apps }) => (
        <section key={label}>
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 mb-3">
            {label}
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
            {apps.map(app => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
