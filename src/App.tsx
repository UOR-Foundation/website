import { useEffect } from "react";
import { Toaster } from "@/modules/core/ui/toaster";
import { Toaster as Sonner } from "@/modules/core/ui/sonner";
import { TooltipProvider } from "@/modules/core/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { initializeRegistry } from "@/lib/uor-registry";
import { initializeContentRegistry } from "@/lib/uor-content-registry";

// Module imports — each module exposes its pages through its barrel export
import { IndexPage } from "@/modules/landing";
import { AboutPage, NotFoundPage } from "@/modules/core";
import { ResearchPage, BlogPost1, BlogPost2, BlogPost3, ResearchPaperAtlasEmbeddings } from "@/modules/community";
import { ProjectsPage, ProjectHologram, ProjectAtlasEmbeddings, ProjectAtomicLang, ProjectPrism } from "@/modules/projects";
import { StandardPage } from "@/modules/framework";
import { DonatePage } from "@/modules/donate";
import { ApiPage } from "@/modules/api-explorer";
import { RingExplorerPage } from "@/modules/ring-core";
import { DerivationLabPage } from "@/modules/derivation";
import { KnowledgeGraphPage } from "@/modules/kg-store";
import { SparqlEditorPage } from "@/modules/sparql";
import { ConformancePage } from "@/modules/shacl";
import { CodeKnowledgeGraphPage } from "@/modules/code-kg";
import { AgentConsolePage } from "@/modules/agent-tools";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    initializeRegistry().catch(console.error);
    initializeContentRegistry().catch(console.error);
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<IndexPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/research" element={<ResearchPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/hologram" element={<ProjectHologram />} />
          <Route path="/projects/atlas-embeddings" element={<ProjectAtlasEmbeddings />} />
          <Route path="/projects/atomic-language-model" element={<ProjectAtomicLang />} />
          <Route path="/projects/prism" element={<ProjectPrism />} />
          <Route path="/standard" element={<StandardPage />} />
          <Route path="/donate" element={<DonatePage />} />
          <Route path="/blog/building-the-internets-knowledge-graph" element={<BlogPost1 />} />
          <Route path="/blog/universal-mathematical-language" element={<BlogPost2 />} />
          <Route path="/blog/uor-framework-launch" element={<BlogPost3 />} />
          <Route path="/research/atlas-embeddings" element={<ResearchPaperAtlasEmbeddings />} />
          <Route path="/api" element={<ApiPage />} />
          <Route path="/ring-explorer" element={<RingExplorerPage />} />
          <Route path="/derivation-lab" element={<DerivationLabPage />} />
          <Route path="/knowledge-graph" element={<KnowledgeGraphPage />} />
          <Route path="/sparql-editor" element={<SparqlEditorPage />} />
          <Route path="/conformance" element={<ConformancePage />} />
          <Route path="/code-knowledge-graph" element={<CodeKnowledgeGraphPage />} />
          <Route path="/agent-console" element={<AgentConsolePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
