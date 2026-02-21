import { Toaster } from "@/modules/core/ui/toaster";
import { Toaster as Sonner } from "@/modules/core/ui/sonner";
import { TooltipProvider } from "@/modules/core/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Module imports — each module exposes its pages through its barrel export
import { IndexPage } from "@/modules/landing";
import { AboutPage, NotFoundPage } from "@/modules/core";
import { ResearchPage, BlogPost1, BlogPost2, BlogPost3, ResearchPaperAtlasEmbeddings } from "@/modules/community";
import { ProjectsPage } from "@/modules/projects";
import { StandardPage } from "@/modules/framework";
import { DonatePage } from "@/modules/donate";
import { ApiPage } from "@/modules/api-explorer";

const queryClient = new QueryClient();

const App = () => (
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
          <Route path="/standard" element={<StandardPage />} />
          <Route path="/donate" element={<DonatePage />} />
          <Route path="/blog/building-the-internets-knowledge-graph" element={<BlogPost1 />} />
          <Route path="/blog/universal-mathematical-language" element={<BlogPost2 />} />
          <Route path="/blog/uor-framework-launch" element={<BlogPost3 />} />
          <Route path="/research/atlas-embeddings" element={<ResearchPaperAtlasEmbeddings />} />
          <Route path="/api" element={<ApiPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
