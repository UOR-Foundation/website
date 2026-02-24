import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/modules/core/ui/toaster";
import { Toaster as Sonner } from "@/modules/core/ui/sonner";
import { TooltipProvider } from "@/modules/core/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { initializeRegistry } from "@/lib/uor-registry";
import { initializeContentRegistry } from "@/lib/uor-content-registry";
import { initTriwordGenesis } from "@/lib/uor-triword";

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
const AuditPage = lazy(() => import("@/modules/verify/pages/AuditPage"));
const DashboardPage = lazy(() => import("@/modules/dashboard/pages/DashboardPage"));
const SessionsPage = lazy(() => import("@/modules/state/pages/SessionsPage"));
const VerifyPage = lazy(() => import("@/modules/verify/pages/VerifyPage"));
const EpistemicPage = lazy(() => import("@/modules/epistemic/pages/EpistemicPage"));
const CertificatesPage = lazy(() => import("@/modules/certificate/pages/CertificatesPage"));
const SparqlPage = lazy(() => import("@/modules/sparql/pages/SparqlPage"));
const ToolRegistryPage = lazy(() => import("@/modules/agent-tools/pages/ToolRegistryPage"));
const PrismPipelinePage = lazy(() => import("@/modules/projects/pages/PrismPipelinePage"));
const ShaclIndexPage = lazy(() => import("@/modules/shacl/pages/ShaclIndexPage"));
const FormatsPage = lazy(() => import("@/modules/shacl/pages/FormatsPage"));
const ProjectUorMcp = lazy(() => import("@/modules/projects/pages/ProjectUorMcp"));
const DatumPage = lazy(() => import("@/modules/datum/pages/DatumPage"));
const ProjectUns = lazy(() => import("@/modules/projects/pages/ProjectUns"));
const ProjectQrCartridge = lazy(() => import("@/modules/projects/pages/ProjectQrCartridge"));
const ProjectHologramSdk = lazy(() => import("@/modules/projects/pages/ProjectHologramSdk"));
const ProjectUorIdentity = lazy(() => import("@/modules/identity/pages/ProjectUorIdentity"));
const ProjectUorPrivacy = lazy(() => import("@/modules/uor-terms/pages/ProjectUorTerms"));
const ProjectCertificate = lazy(() => import("@/modules/projects/pages/ProjectCertificate"));
const TrustScorePreview = lazy(() => import("@/modules/mcp/pages/TrustScorePreview"));
const BulkPinPage = lazy(() => import("@/modules/bulk-pin/pages/BulkPinPage"));
const OraclePage = lazy(() => import("@/modules/oracle/pages/OraclePage"));
const UnsPage = lazy(() => import("@/modules/uns/pages/UnsPage"));
const ConsoleLayout = lazy(() => import("@/modules/console/components/ConsoleLayout"));
const ConsoleOverview = lazy(() => import("@/modules/console/pages/ConsoleOverview"));
const ConsoleDns = lazy(() => import("@/modules/console/pages/ConsoleDns"));
const ConsoleShield = lazy(() => import("@/modules/console/pages/ConsoleShield"));
const ConsoleCompute = lazy(() => import("@/modules/console/pages/ConsoleCompute"));
const ConsoleStore = lazy(() => import("@/modules/console/pages/ConsoleStore"));
const ConsoleTrust = lazy(() => import("@/modules/console/pages/ConsoleTrust"));
const ConsoleAgents = lazy(() => import("@/modules/console/pages/ConsoleAgents"));
const AppConsoleOverview = lazy(() => import("@/modules/console/pages/AppConsoleOverview"));
const AppConsoleApps = lazy(() => import("@/modules/console/pages/AppConsoleApps"));
const AppConsoleDetail = lazy(() => import("@/modules/console/pages/AppConsoleDetail"));
const AppConsoleDiscovery = lazy(() => import("@/modules/console/pages/AppConsoleDiscovery"));
const ConsoleYourSpace = lazy(() => import("@/modules/console/pages/ConsoleYourSpace"));
const AppConsoleRunner = lazy(() => import("@/modules/console/pages/AppConsoleRunner"));
const DevelopersPage = lazy(() => import("@/modules/developers/pages/DevelopersPage"));
const DnsDocPage = lazy(() => import("@/modules/developers/pages/DnsDocPage"));
const ComputeDocPage = lazy(() => import("@/modules/developers/pages/ComputeDocPage"));
const StoreDocPage = lazy(() => import("@/modules/developers/pages/StoreDocPage"));
const KvDocPage = lazy(() => import("@/modules/developers/pages/KvDocPage"));
const LedgerDocPage = lazy(() => import("@/modules/developers/pages/LedgerDocPage"));
const ShieldDocPage = lazy(() => import("@/modules/developers/pages/ShieldDocPage"));
const TrustDocPage = lazy(() => import("@/modules/developers/pages/TrustDocPage"));
const AgentsDocPage = lazy(() => import("@/modules/developers/pages/AgentsDocPage"));
const SdkDocPage = lazy(() => import("@/modules/developers/pages/SdkDocPage"));
const GettingStartedDocPage = lazy(() => import("@/modules/developers/pages/GettingStartedDocPage"));
const ConceptsDocPage = lazy(() => import("@/modules/developers/pages/ConceptsDocPage"));
const FundamentalsDocPage = lazy(() => import("@/modules/developers/pages/FundamentalsDocPage"));
const DirectoryPage = lazy(() => import("@/modules/developers/pages/DirectoryPage"));
const CartridgePage = lazy(() => import("@/modules/qr-cartridge/pages/CartridgePage"));
const YourSpacePage = lazy(() => import("@/modules/your-space/pages/YourSpacePage"));
const SandboxPage = lazy(() => import("@/modules/projects/pages/SandboxPage"));
const ClaimIdentityPage = lazy(() => import("@/modules/identity/pages/ClaimIdentityPage"));
const BitcoinScriptPage = lazy(() => import("@/modules/bitcoin/pages/BitcoinScriptPage"));
const TimestampPage = lazy(() => import("@/modules/bitcoin/pages/TimestampPage"));
const BitcoinDemoPage = lazy(() => import("@/modules/bitcoin/pages/DemoPage"));
const ZcashDualityPage = lazy(() => import("@/modules/bitcoin/pages/ZcashDualityPage"));
const AgentStackPage = lazy(() => import("@/modules/bitcoin/pages/AgentStackPage"));
const CoherenceGatePage = lazy(() => import("@/modules/bitcoin/pages/CoherenceGatePage"));
const UnifiedCardPage = lazy(() => import("@/modules/bitcoin/pages/UnifiedCardPage"));
const OpportunityExplorerPage = lazy(() => import("@/modules/opportunities/pages/OpportunityExplorerPage"));
const RuliadPage = lazy(() => import("@/modules/ruliad/pages/RuliadPage"));
const RulialMotionPage = lazy(() => import("@/modules/ruliad/pages/RulialMotionPage"));
const RuliadPaperPage = lazy(() => import("@/modules/ruliad/pages/RuliadPaperPage"));
const ConsciousnessPage = lazy(() => import("@/modules/consciousness/pages/ConsciousnessPage"));
const GodConjecturePage = lazy(() => import("@/modules/consciousness/pages/GodConjecturePage"));
const TrustGraphPage = lazy(() => import("@/modules/trust-graph/pages/TrustGraphPage"));
const HologramUiPage = lazy(() => import("@/modules/hologram-ui/pages/HologramUiPage"));
const CodeKgPage = lazy(() => import("@/modules/code-kg/pages/CodeKgPage"));
const MetaObserverPage = lazy(() => import("@/modules/observable/pages/MetaObserverPage"));
const MultiScalePage = lazy(() => import("@/modules/observable/pages/MultiScalePage"));
const StreamProjectionPage = lazy(() => import("@/modules/observable/pages/StreamProjectionPage"));
const ObserverHubPage = lazy(() => import("@/modules/observable/pages/ObserverHubPage"));
const ConsoleFpp = lazy(() => import("@/modules/console/pages/ConsoleFpp"));
const ConsolePqBridge = lazy(() => import("@/modules/console/pages/ConsolePqBridge"));
const ConsoleEthereum = lazy(() => import("@/modules/console/pages/ConsoleEthereum"));
const InteroperabilityPage = lazy(() => import("@/modules/interoperability/pages/InteroperabilityPage"));

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const init = () => {
      initializeRegistry().catch(console.error);
      initializeContentRegistry(true).catch(console.error);
      initTriwordGenesis().catch(console.error);
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
            <Route path="/projects/uns" element={<ProjectUns />} />
            <Route path="/projects/qr-cartridge" element={<ProjectQrCartridge />} />
            <Route path="/projects/hologram-sdk" element={<ProjectHologramSdk />} />
            <Route path="/projects/uor-identity" element={<ProjectUorIdentity />} />
            <Route path="/projects/uor-privacy" element={<ProjectUorPrivacy />} />
            <Route path="/projects/uor-certificate" element={<ProjectCertificate />} />
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
            <Route path="/u/:iri" element={<DatumPage />} />
            <Route path="/trust-score-preview" element={<TrustScorePreview />} />
            <Route path="/bulk-pin" element={<BulkPinPage />} />
            <Route path="/oracle" element={<OraclePage />} />
            <Route path="/uns" element={<UnsPage />} />
            <Route path="/console" element={<ConsoleLayout />}>
              <Route index element={<AppConsoleApps />} />
              <Route path="overview" element={<ConsoleOverview />} />
              <Route path="dns" element={<ConsoleDns />} />
              <Route path="shield" element={<ConsoleShield />} />
              <Route path="compute" element={<ConsoleCompute />} />
              <Route path="store" element={<ConsoleStore />} />
              <Route path="trust" element={<ConsoleTrust />} />
              <Route path="agents" element={<ConsoleAgents />} />
              <Route path="apps" element={<AppConsoleApps />} />
              <Route path="app-detail/:canonicalId" element={<AppConsoleDetail />} />
              <Route path="run/:canonicalId" element={<AppConsoleRunner />} />
              <Route path="discovery" element={<AppConsoleDiscovery />} />
              <Route path="your-space" element={<ConsoleYourSpace />} />
              <Route path="fpp" element={<ConsoleFpp />} />
              <Route path="pq-bridge" element={<ConsolePqBridge />} />
              <Route path="ethereum" element={<ConsoleEthereum />} />
            </Route>
            <Route path="/developers" element={<DevelopersPage />} />
            <Route path="/developers/directory" element={<DirectoryPage />} />
            <Route path="/developers/getting-started" element={<GettingStartedDocPage />} />
            <Route path="/developers/fundamentals" element={<FundamentalsDocPage />} />
            <Route path="/developers/concepts" element={<ConceptsDocPage />} />
            <Route path="/developers/dns" element={<DnsDocPage />} />
            <Route path="/developers/compute" element={<ComputeDocPage />} />
            <Route path="/developers/store" element={<StoreDocPage />} />
            <Route path="/developers/kv" element={<KvDocPage />} />
            <Route path="/developers/ledger" element={<LedgerDocPage />} />
            <Route path="/developers/shield" element={<ShieldDocPage />} />
            <Route path="/developers/trust" element={<TrustDocPage />} />
            <Route path="/developers/agents" element={<AgentsDocPage />} />
            <Route path="/developers/sdk" element={<SdkDocPage />} />
            <Route path="/cartridge" element={<CartridgePage />} />
            <Route path="/your-space" element={<YourSpacePage />} />
            <Route path="/sandbox" element={<SandboxPage />} />
            <Route path="/claim-identity" element={<ClaimIdentityPage />} />
            <Route path="/bitcoin" element={<BitcoinScriptPage />} />
            <Route path="/bitcoin/timestamp" element={<TimestampPage />} />
            <Route path="/bitcoin/demo" element={<BitcoinDemoPage />} />
            <Route path="/bitcoin/zcash" element={<ZcashDualityPage />} />
            <Route path="/bitcoin/agents" element={<AgentStackPage />} />
            <Route path="/bitcoin/coherence" element={<CoherenceGatePage />} />
            <Route path="/bitcoin/unified-card" element={<UnifiedCardPage />} />
            <Route path="/opportunities" element={<OpportunityExplorerPage />} />
            <Route path="/ruliad" element={<RuliadPage />} />
            <Route path="/ruliad/motion" element={<RulialMotionPage />} />
            <Route path="/ruliad/paper" element={<RuliadPaperPage />} />
            <Route path="/consciousness" element={<ConsciousnessPage />} />
            <Route path="/consciousness/god-conjecture" element={<GodConjecturePage />} />
            <Route path="/trust-graph" element={<TrustGraphPage />} />
            <Route path="/hologram-ui" element={<HologramUiPage />} />
            <Route path="/code-kg" element={<CodeKgPage />} />
            <Route path="/meta-observer" element={<MetaObserverPage />} />
            <Route path="/multi-scale" element={<MultiScalePage />} />
            <Route path="/stream-projection" element={<StreamProjectionPage />} />
            <Route path="/console/observer" element={<ObserverHubPage />} />
            <Route path="/interoperability" element={<InteroperabilityPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
