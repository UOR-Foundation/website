import { lazy, Suspense } from "react";
import { Toaster } from "@/modules/core/ui/toaster";
import { Toaster as Sonner } from "@/modules/core/ui/sonner";
import { TooltipProvider } from "@/modules/core/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Eager. homepage renders instantly
import { IndexPage } from "@/modules/landing";

// Lazy. each page code-splits into its own chunk
const AboutPage = lazy(() => import("@/modules/core/pages/AboutPage"));
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
const ProjectUorMcp = lazy(() => import("@/modules/projects/pages/ProjectUorMcp"));
const ProjectUns = lazy(() => import("@/modules/projects/pages/ProjectUns"));
const ProjectQrCartridge = lazy(() => import("@/modules/projects/pages/ProjectQrCartridge"));
const ProjectHologramSdk = lazy(() => import("@/modules/projects/pages/ProjectHologramSdk"));
const ProjectUorIdentity = lazy(() => import("@/modules/identity/pages/ProjectUorIdentity"));
const OraclePage = lazy(() => import("@/modules/oracle/pages/OraclePage"));
const SearchPage = lazy(() => import("@/modules/oracle/pages/ResolvePage"));
const ProjectUorPrivacy = lazy(() => import("@/modules/uor-terms/pages/ProjectUorTerms"));
const ProjectCertificate = lazy(() => import("@/modules/projects/pages/ProjectCertificate"));
const StandardPage = lazy(() => import("@/modules/framework/pages/StandardPage"));
const SemanticWebPage = lazy(() => import("@/modules/framework/pages/SemanticWebPage"));
const UnsExplainer = lazy(() => import("@/pages/UnsExplainer"));
const DonatePage = lazy(() => import("@/modules/donate/pages/DonatePage"));
const MessengerPage = lazy(() => import("@/modules/messenger/pages/MessengerPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={null}>
            <Routes>
              {/* Core pages */}
              <Route path="/" element={<IndexPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/framework" element={<StandardPage />} />
              <Route path="/docs" element={<Navigate to="/framework" replace />} />
              <Route path="/standard" element={<Navigate to="/framework" replace />} />
              <Route path="/semantic-web" element={<SemanticWebPage />} />
              <Route path="/community" element={<ResearchPage />} />
              <Route path="/research" element={<Navigate to="/community" replace />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/donate" element={<DonatePage />} />
              <Route path="/oracle" element={<OraclePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/resolve" element={<SearchPage />} />
              <Route path="/uns" element={<UnsExplainer />} />
              <Route path="/messenger" element={<MessengerPage />} />

              {/* Blog & Research */}
              <Route path="/blog/building-the-internets-knowledge-graph" element={<BlogPost1 />} />
              <Route path="/blog/universal-mathematical-language" element={<BlogPost2 />} />
              <Route path="/blog/uor-framework-launch" element={<BlogPost3 />} />
              <Route path="/research/atlas-embeddings" element={<ResearchPaperAtlasEmbeddings />} />

              {/* Project detail pages */}
              <Route path="/projects/hologram" element={<ProjectHologram />} />
              <Route path="/projects/atlas-embeddings" element={<ProjectAtlasEmbeddings />} />
              <Route path="/projects/atomic-language-model" element={<ProjectAtomicLang />} />
              <Route path="/projects/prism" element={<ProjectPrism />} />
              <Route path="/projects/uor-mcp" element={<ProjectUorMcp />} />
              <Route path="/projects/uns" element={<ProjectUns />} />
              <Route path="/projects/qr-cartridge" element={<ProjectQrCartridge />} />
              <Route path="/projects/hologram-sdk" element={<ProjectHologramSdk />} />
              <Route path="/projects/uor-identity" element={<ProjectUorIdentity />} />
              <Route path="/projects/uor-privacy" element={<ProjectUorPrivacy />} />
              <Route path="/projects/uor-certificate" element={<ProjectCertificate />} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
