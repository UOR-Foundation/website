import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/modules/core/ui/toaster";
import { Toaster as Sonner } from "@/modules/core/ui/sonner";
import { TooltipProvider } from "@/modules/core/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { initializeRegistry } from "@/lib/uor-registry";
import { initializeContentRegistry } from "@/lib/uor-content-registry";

// Eager — homepage renders instantly
import { IndexPage } from "@/modules/landing";

// Lazy — each page code-splits into its own chunk
const AboutPage = lazy(() => import("@/modules/core/pages/AboutPage"));
const NotFoundPage = lazy(() => import("@/modules/core/pages/NotFound"));
const ResearchPage = lazy(() => import("@/modules/community/pages/ResearchPage"));
const BlogPost1 = lazy(() => import("@/modules/community/pages/BlogPost1"));
const BlogPost2 = lazy(() => import("@/modules/community/pages/BlogPost2"));
const BlogPost3 = lazy(() => import("@/modules/community/pages/BlogPost3"));
const ResearchPaperAtlasEmbeddings = lazy(() => import("@/modules/community/pages/ResearchPaperAtlasEmbeddings"));
const ProjectsPage = lazy(() => import("@/modules/projects/pages/ProjectsPage"));
const ProjectHologram = lazy(() => import("@/modules/projects/pages/ProjectHologram"));
const ProjectAtlasEmbeddings = lazy(() => import("@/modules/projects/pages/ProjectAtlasEmbeddings"));
const ProjectAtomicLang = lazy(() => import("@/modules/projects/pages/ProjectAtomicLang"));
const ProjectPrism = lazy(() => import("@/modules/projects/pages/ProjectPrism"));
const StandardPage = lazy(() => import("@/modules/framework/pages/StandardPage"));
const SemanticWebPage = lazy(() => import("@/modules/framework/pages/SemanticWebPage"));
const DonatePage = lazy(() => import("@/modules/donate/pages/DonatePage"));
const ApiPage = lazy(() => import("@/modules/api-explorer/pages/ApiPage"));
const RingExplorerPage = lazy(() => import("@/modules/ring-core/pages/RingExplorerPage"));
const DerivationLabPage = lazy(() => import("@/modules/derivation/pages/DerivationLabPage"));
const KnowledgeGraphPage = lazy(() => import("@/modules/kg-store/pages/KnowledgeGraphPage"));
const SparqlEditorPage = lazy(() => import("@/modules/sparql/pages/SparqlEditorPage"));
const ConformancePage = lazy(() => import("@/modules/shacl/pages/ConformancePage"));
const CodeKnowledgeGraphPage = lazy(() => import("@/modules/code-kg/pages/CodeKnowledgeGraphPage"));
const AgentConsolePage = lazy(() => import("@/modules/agent-tools/pages/AgentConsolePage"));
const AuditPage = lazy(() => import("@/modules/self-verify/pages/AuditPage"));
const DashboardPage = lazy(() => import("@/modules/dashboard/pages/DashboardPage"));
const SessionsPage = lazy(() => import("@/modules/state/pages/SessionsPage"));
const VerifyPage = lazy(() => import("@/modules/verify/pages/VerifyPage"));
const EpistemicPage = lazy(() => import("@/modules/epistemic/pages/EpistemicPage"));
const CertificatesPage = lazy(() => import("@/modules/certificates/pages/CertificatesPage"));
const SparqlPage = lazy(() => import("@/modules/sparql-ui/pages/SparqlPage"));
const ToolRegistryPage = lazy(() => import("@/modules/agent-tools/pages/ToolRegistryPage"));
const PrismPipelinePage = lazy(() => import("@/modules/projects/pages/PrismPipelinePage"));
const ShaclIndexPage = lazy(() => import("@/modules/shacl/pages/ShaclIndexPage"));
const FormatsPage = lazy(() => import("@/modules/shacl/pages/FormatsPage"));
const ProjectUorMcp = lazy(() => import("@/modules/projects/pages/ProjectUorMcp"));

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const init = () => {
      initializeRegistry().catch(console.error);
      initializeContentRegistry().catch(console.error);
    };
    if ("requestIdleCallback" in window) {
      (window as Window).requestIdleCallback(init);
    } else {
      setTimeout(init, 100);
    }
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<IndexPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/research" element={<ResearchPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/hologram" element={<ProjectHologram />} />
            <Route path="/projects/atlas-embeddings" element={<ProjectAtlasEmbeddings />} />
            <Route path="/projects/atomic-language-model" element={<ProjectAtomicLang />} />
            <Route path="/projects/prism" element={<ProjectPrism />} />
            <Route path="/projects/uor-mcp" element={<ProjectUorMcp />} />
            <Route path="/standard" element={<StandardPage />} />
            <Route path="/semantic-web" element={<SemanticWebPage />} />
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
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/epistemic" element={<EpistemicPage />} />
            <Route path="/certificates" element={<CertificatesPage />} />
            <Route path="/sparql" element={<SparqlPage />} />
            <Route path="/tools" element={<ToolRegistryPage />} />
            <Route path="/prism" element={<PrismPipelinePage />} />
            <Route path="/shacl" element={<ShaclIndexPage />} />
            <Route path="/formats" element={<FormatsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
