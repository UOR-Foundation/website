/**
 * /interoperability — Universal Interoperability Map
 *
 * 356+ projections across 10 canonical categories.
 * One hash. Every standard.
 */

import Layout from "@/modules/core/components/Layout";
import { InteroperabilityMap } from "../components/InteroperabilityMap";

export default function InteroperabilityPage() {
  return (
    <Layout>
      <div className="min-h-screen">
        {/* Hero — minimal, high-impact */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-40 md:pt-52 pb-14 sm:pb-18">
            <div className="max-w-2xl">
              <span className="inline-block px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-mono font-medium mb-4">
                One Hash · Every Standard
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Universal Interoperability Map
              </h1>
              <p className="mt-3 text-base text-muted-foreground leading-relaxed">
                Every external standard is a deterministic projection of a single UOR identity.
                Explore how they compose into cross-protocol synergy chains.
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
