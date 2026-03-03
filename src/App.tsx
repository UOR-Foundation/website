import { lazy, Suspense, useEffect } from "react";
import DevGate from "@/components/DevGate";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/modules/core/ui/toaster";
import { Toaster as Sonner } from "@/modules/core/ui/sonner";
import { TooltipProvider } from "@/modules/core/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { initializeRegistry } from "@/lib/uor-registry";
import { preseedSmolLM2 } from "@/modules/hologram-compute/model-preseeder";

import { ScreenContextProvider } from "@/modules/hologram-ui/hooks/useScreenContext";
import FocusVignette from "@/modules/hologram-ui/components/FocusVignette";
import { FocusJournalProvider } from "@/modules/hologram-ui/hooks/useFocusJournal";
import FocusJournalOverlay from "@/modules/hologram-ui/components/FocusJournalOverlay";
import AttentionToggle from "@/modules/hologram-ui/components/AttentionToggle";
import { initializeContentRegistry } from "@/lib/uor-content-registry";

import GlobalFloatingWidgets from "@/modules/hologram-ui/components/GlobalFloatingWidgets";
import GlobalLumenOverlay from "@/modules/hologram-ui/components/GlobalLumenOverlay";
import HologramSearch from "@/modules/hologram-ui/components/HologramSearch";
import { initTriwordGenesis } from "@/lib/uor-triword";
import { useReferralTracking } from "@/hooks/useReferralTracking";

/** Runs inside BrowserRouter so useSearchParams works */
function ReferralTracker() {
  useReferralTracking();
  return null;
}

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
const AppStorePage = lazy(() => import("@/modules/console/pages/AppStorePage"));
const AppConsoleDetail = lazy(() => import("@/modules/console/pages/AppConsoleDetail"));
const AppConsoleDiscovery = lazy(() => import("@/modules/console/pages/AppConsoleDiscovery"));
const ConsoleYourSpace = lazy(() => import("@/modules/console/pages/ConsoleYourSpace"));
const AppConsoleRunner = lazy(() => import("@/modules/console/pages/AppConsoleRunner"));
const PrimeHubPage = lazy(() => import("@/modules/hologram-ui/pages/PrimeHubPage"));
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
const HologramOsPage = lazy(() => import("@/modules/hologram-ui/pages/HologramOsPage"));
const HologramConsolePage = lazy(() => import("@/modules/hologram-ui/pages/HologramConsolePage"));
const CodeKgPage = lazy(() => import("@/modules/code-kg/pages/CodeKgPage"));
const ConvergencePage = lazy(() => import("@/modules/hologram-ui/pages/ConvergencePage"));
const MetaObserverPage = lazy(() => import("@/modules/observable/pages/MetaObserverPage"));
const MultiScalePage = lazy(() => import("@/modules/observable/pages/MultiScalePage"));
const StreamProjectionPage = lazy(() => import("@/modules/observable/pages/StreamProjectionPage"));
const ObserverHubPage = lazy(() => import("@/modules/observable/pages/ObserverHubPage"));
const ConsoleFpp = lazy(() => import("@/modules/console/pages/ConsoleFpp"));
const ConsolePqBridge = lazy(() => import("@/modules/console/pages/ConsolePqBridge"));
const ConsoleEthereum = lazy(() => import("@/modules/console/pages/ConsoleEthereum"));
const InteroperabilityPage = lazy(() => import("@/modules/interoperability/pages/InteroperabilityPage"));
const ContinuityPage = lazy(() => import("@/modules/continuity/pages/ContinuityPage"));
const LensInspectorPage = lazy(() => import("@/modules/lens-inspector/pages/LensInspectorPage"));
const SchemaOrgExplorerPage = lazy(() => import("@/modules/schema-org/pages/SchemaOrgExplorerPage"));
const CodeNexusPage = lazy(() => import("@/modules/code-nexus/pages/CodeNexusPage"));
const AtlasVisualizationPage = lazy(() => import("@/modules/atlas/pages/AtlasVisualizationPage"));
const QuantumDashboardPage = lazy(() => import("@/modules/quantum/pages/QuantumDashboardPage"));
const QShellPage = lazy(() => import("@/hologram/usr/bin/QShellPage"));
const CeremonyPage = lazy(() => import("@/hologram/usr/bin/CeremonyPage"));
const ReferralLeaderboardPage = lazy(() => import("@/pages/ReferralLeaderboardPage"));
const GenesisBootPage = lazy(() => import("@/pages/GenesisBootPage"));
const ArtifactInspectorPage = lazy(() => import("@/pages/ArtifactInspectorPage"));
const KernelGraphPage = lazy(() => import("@/pages/KernelGraphPage"));
const TriwordLookupPage = lazy(() => import("@/pages/TriwordLookupPage"));
const AtlasProjectionLab = lazy(() => import("@/pages/AtlasProjectionLab"));

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const init = () => {
      initializeRegistry().catch(console.error);
      initializeContentRegistry(true).catch(console.error);
      initTriwordGenesis().catch(console.error);
      preseedSmolLM2().catch(console.error);
    };
    if ("requestIdleCallback" in window) {
      (window as Window).requestIdleCallback(init);
    } else {
      setTimeout(init, 100);
    }
  }, []);

  return (
  <AuthProvider>
  <QueryClientProvider client={queryClient}>
    
    <FocusJournalProvider>
    <FocusVignette />
    <FocusJournalOverlay />
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ReferralTracker />
        <ScreenContextProvider>
        
        <GlobalFloatingWidgets />
        <GlobalLumenOverlay />
        <HologramSearch />
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
            <Route path="/api" element={<DevGate><ApiPage /></DevGate>} />
            <Route path="/ring-explorer" element={<DevGate><RingExplorerPage /></DevGate>} />
            <Route path="/derivation-lab" element={<DevGate><DerivationLabPage /></DevGate>} />
            <Route path="/knowledge-graph" element={<DevGate><KnowledgeGraphPage /></DevGate>} />
            <Route path="/sparql-editor" element={<DevGate><SparqlEditorPage /></DevGate>} />
            <Route path="/conformance" element={<DevGate><ConformancePage /></DevGate>} />
            <Route path="/code-knowledge-graph" element={<DevGate><CodeKnowledgeGraphPage /></DevGate>} />
            <Route path="/agent-console" element={<DevGate><AgentConsolePage /></DevGate>} />
            <Route path="/audit" element={<DevGate><AuditPage /></DevGate>} />
            <Route path="/sessions" element={<DevGate><SessionsPage /></DevGate>} />
            <Route path="/verify" element={<DevGate><VerifyPage /></DevGate>} />
            <Route path="/epistemic" element={<DevGate><EpistemicPage /></DevGate>} />
            <Route path="/certificates" element={<DevGate><CertificatesPage /></DevGate>} />
            <Route path="/sparql" element={<DevGate><SparqlPage /></DevGate>} />
            <Route path="/tools" element={<DevGate><ToolRegistryPage /></DevGate>} />
            <Route path="/prism" element={<DevGate><PrismPipelinePage /></DevGate>} />
            <Route path="/shacl" element={<DevGate><ShaclIndexPage /></DevGate>} />
            <Route path="/formats" element={<DevGate><FormatsPage /></DevGate>} />
            <Route path="/u/:iri" element={<DevGate><DatumPage /></DevGate>} />
            <Route path="/trust-score-preview" element={<DevGate><TrustScorePreview /></DevGate>} />
            <Route path="/bulk-pin" element={<DevGate><BulkPinPage /></DevGate>} />
            <Route path="/oracle" element={<DevGate><OraclePage /></DevGate>} />
            <Route path="/uns" element={<DevGate><UnsPage /></DevGate>} />
            <Route path="/console" element={<DevGate><ConsoleLayout /></DevGate>}>
              <Route index element={<AppConsoleApps />} />
              <Route path="overview" element={<ConsoleOverview />} />
              <Route path="dns" element={<ConsoleDns />} />
              <Route path="shield" element={<ConsoleShield />} />
              <Route path="compute" element={<ConsoleCompute />} />
              <Route path="store" element={<ConsoleStore />} />
              <Route path="trust" element={<ConsoleTrust />} />
              <Route path="agents" element={<ConsoleAgents />} />
              <Route path="apps" element={<AppStorePage />} />
              <Route path="deploy" element={<AppConsoleApps />} />
              <Route path="app-detail/:canonicalId" element={<AppConsoleDetail />} />
              <Route path="run/:canonicalId" element={<AppConsoleRunner />} />
              <Route path="discovery" element={<AppConsoleDiscovery />} />
              <Route path="your-space" element={<ConsoleYourSpace />} />
              <Route path="fpp" element={<ConsoleFpp />} />
              <Route path="pq-bridge" element={<ConsolePqBridge />} />
              <Route path="ethereum" element={<ConsoleEthereum />} />
            </Route>
            <Route path="/developers" element={<DevGate><DevelopersPage /></DevGate>} />
            <Route path="/developers/directory" element={<DevGate><DirectoryPage /></DevGate>} />
            <Route path="/developers/getting-started" element={<DevGate><GettingStartedDocPage /></DevGate>} />
            <Route path="/developers/fundamentals" element={<DevGate><FundamentalsDocPage /></DevGate>} />
            <Route path="/developers/concepts" element={<DevGate><ConceptsDocPage /></DevGate>} />
            <Route path="/developers/dns" element={<DevGate><DnsDocPage /></DevGate>} />
            <Route path="/developers/compute" element={<DevGate><ComputeDocPage /></DevGate>} />
            <Route path="/developers/store" element={<DevGate><StoreDocPage /></DevGate>} />
            <Route path="/developers/kv" element={<DevGate><KvDocPage /></DevGate>} />
            <Route path="/developers/ledger" element={<DevGate><LedgerDocPage /></DevGate>} />
            <Route path="/developers/shield" element={<DevGate><ShieldDocPage /></DevGate>} />
            <Route path="/developers/trust" element={<DevGate><TrustDocPage /></DevGate>} />
            <Route path="/developers/agents" element={<DevGate><AgentsDocPage /></DevGate>} />
            <Route path="/developers/sdk" element={<DevGate><SdkDocPage /></DevGate>} />
            <Route path="/cartridge" element={<DevGate><CartridgePage /></DevGate>} />
            <Route path="/your-space" element={<YourSpacePage />} />
            <Route path="/sandbox" element={<DevGate><SandboxPage /></DevGate>} />
            <Route path="/claim-identity" element={<ClaimIdentityPage />} />
            <Route path="/ceremony" element={<CeremonyPage />} />
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
            <Route path="/hologram-os" element={<HologramOsPage />} />
            <Route path="/hologram" element={<DevGate><HologramConsolePage /></DevGate>} />
            <Route path="/code-kg" element={<DevGate><CodeKgPage /></DevGate>} />
            <Route path="/convergence" element={<DevGate><ConvergencePage /></DevGate>} />
            <Route path="/meta-observer" element={<DevGate><MetaObserverPage /></DevGate>} />
            <Route path="/multi-scale" element={<DevGate><MultiScalePage /></DevGate>} />
            <Route path="/stream-projection" element={<DevGate><StreamProjectionPage /></DevGate>} />
            <Route path="/console/observer" element={<DevGate><ObserverHubPage /></DevGate>} />
            <Route path="/interoperability" element={<DevGate><InteroperabilityPage /></DevGate>} />
            <Route path="/continuity" element={<DevGate><ContinuityPage /></DevGate>} />
            <Route path="/lens-inspector" element={<DevGate><LensInspectorPage /></DevGate>} />
            <Route path="/schema-org" element={<DevGate><SchemaOrgExplorerPage /></DevGate>} />
            <Route path="/leaderboard" element={<ReferralLeaderboardPage />} />
            <Route path="/genesis" element={<GenesisBootPage />} />
            <Route path="/artifact" element={<DevGate><ArtifactInspectorPage /></DevGate>} />
            <Route path="/kernel-graph" element={<DevGate><KernelGraphPage /></DevGate>} />
            <Route path="/triword" element={<DevGate><TriwordLookupPage /></DevGate>} />
            <Route path="/code-nexus" element={<DevGate><CodeNexusPage /></DevGate>} />
            <Route path="/atlas" element={<DevGate><AtlasVisualizationPage /></DevGate>} />
            <Route path="/quantum" element={<DevGate><QuantumDashboardPage /></DevGate>} />
            <Route path="/q-shell" element={<DevGate><QShellPage /></DevGate>} />
            <Route path="/projection-lab" element={<DevGate><AtlasProjectionLab /></DevGate>} />
            <Route path="/ai-lab" element={<DevGate><AtlasProjectionLab /></DevGate>} />
            {/* Debug routes removed — private */}
            <Route path="*" element={<Navigate to="/hologram-os" replace />} />
          </Routes>
        </Suspense>
        </ScreenContextProvider>
      </BrowserRouter>
    </TooltipProvider>
    </FocusJournalProvider>
    
  </QueryClientProvider>
  </AuthProvider>
  );
};

export default App;
