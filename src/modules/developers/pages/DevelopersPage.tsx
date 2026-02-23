import Layout from "@/modules/core/components/Layout";
import { docCategories } from "../data/doc-categories";
import DocCategoryCard from "../components/DocCategoryCard";
import { Search } from "lucide-react";

const DevelopersPage = () => (
  <Layout>
    {/* Hero */}
    <section className="pt-36 pb-16 md:pt-44 md:pb-20">
      <div className="container max-w-5xl text-center">
        <p className="text-sm font-medium text-primary tracking-wide uppercase mb-4">
          Developer Documentation
        </p>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight text-foreground mb-6">
          Build on UOR
        </h1>
        <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Everything you need to build with the UOR Name Service — from content-addressed
          storage to post-quantum authentication. One SDK, every service.
        </p>

        {/* Search placeholder */}
        <div className="relative max-w-lg mx-auto">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documentation…"
            disabled
            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-border bg-card text-sm text-muted-foreground placeholder:text-muted-foreground/60 cursor-not-allowed"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/50">
            Coming soon
          </span>
        </div>
      </div>
    </section>

    {/* Category Grid */}
    <section className="pb-24">
      <div className="container max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {docCategories.map((cat) => (
            <DocCategoryCard key={cat.id} category={cat} />
          ))}
        </div>
      </div>
    </section>

    {/* SDK Quick Start placeholder */}
    <section className="pb-24">
      <div className="container max-w-3xl">
        <div className="rounded-2xl border border-border bg-card p-8 md:p-10">
          <h2 className="text-xl font-display font-semibold mb-4 text-card-foreground">
            Quick Start
          </h2>
          <div className="rounded-xl bg-muted/50 border border-border p-5 font-mono text-sm text-foreground leading-relaxed">
            <div className="text-muted-foreground mb-2">{"// Install the SDK"}</div>
            <div className="mb-4">npm install @uns/sdk</div>
            <div className="text-muted-foreground mb-2">{"// Initialize"}</div>
            <div>{"import { UnsClient, generateKeypair } from '@uns/sdk';"}</div>
            <div className="mt-1">{"const keypair = await generateKeypair();"}</div>
            <div>{"const client = new UnsClient({"}</div>
            <div className="pl-4">{"nodeUrl: 'https://node.uor.foundation',"}</div>
            <div className="pl-4">{"identity: keypair,"}</div>
            <div>{"});"}</div>
            <div className="mt-3 text-muted-foreground">{"// Derive a canonical ID"}</div>
            <div>{"const id = await client.computeCanonicalId({ hello: 'world' });"}</div>
          </div>
        </div>
      </div>
    </section>
  </Layout>
);

export default DevelopersPage;
