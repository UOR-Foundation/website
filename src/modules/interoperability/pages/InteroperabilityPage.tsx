/**
 * /interoperability — Universal Interoperability Map
 *
 * Shows all 145+ hologram projections organized by ecosystem
 * with synergy chain connections and shared component clusters.
 */

import Layout from "@/modules/core/components/Layout";
import { InteroperabilityMap } from "../components/InteroperabilityMap";

export default function InteroperabilityPage() {
  return (
    <Layout>
      <div className="min-h-screen">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-mono font-medium">
                  One Hash · Every Standard
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Universal Interoperability Map
              </h1>
              <p className="mt-3 text-base text-muted-foreground leading-relaxed max-w-2xl">
                Every external standard is a deterministic projection of a single UOR canonical hash.
                This map reveals how 145+ projections across 15 ecosystems compose into
                functional synergy chains — proving that one identity bridges every protocol on earth.
              </p>
            </div>
          </div>
        </section>

        {/* Map */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <InteroperabilityMap />
        </section>
      </div>
    </Layout>
  );
}
