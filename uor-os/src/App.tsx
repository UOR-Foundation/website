import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/modules/platform/core/ui/toaster";
import { Toaster as Sonner } from "@/modules/platform/core/ui/sonner";
import { TooltipProvider } from "@/modules/platform/core/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/use-auth";
import { AuthPromptProvider } from "@/modules/platform/auth/useAuthPrompt";
import { PrivyWalletProvider } from "@/modules/platform/auth/PrivyWalletProvider";

// ── Sovereign Bus ─────────────────────────────────────────────────────
import { sovereignBoot } from "@/modules/platform/boot";

// The OS shell is the root — loaded eagerly for instant render
const DesktopShell = lazy(() => import("@/modules/platform/desktop/DesktopShell"));

// OS pages — code-split
const OraclePage = lazy(() => import("@/modules/intelligence/oracle/pages/OraclePage"));
const ResolvePage = lazy(() => import("@/modules/intelligence/oracle/pages/ResolvePage"));
const MessengerPage = lazy(() => import("@/modules/intelligence/messenger/pages/MessengerPage"));
const LibraryPage = lazy(() => import("@/modules/intelligence/oracle/pages/LibraryPage"));
const AppStorePage = lazy(() => import("@/modules/platform/app-store/pages/AppStorePage"));
const ComplianceDashboardPage = lazy(() => import("@/modules/research/canonical-compliance/pages/ComplianceDashboardPage"));
const DownloadPage = lazy(() => import("@/modules/platform/landing/pages/DownloadPage"));

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
  useEffect(() => {
    sovereignBoot().catch(() => {});
    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(() => {
        import("@/modules/platform/bus/modules");
      });
    } else {
      setTimeout(() => { import("@/modules/platform/bus/modules"); }, 100);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PrivyWalletProvider>
          <AuthPromptProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Suspense fallback={null}>
                  <Routes>
                    {/* The OS IS the homepage */}
                    <Route path="/" element={<DesktopShell />} />
                    <Route path="/oracle" element={<OraclePage />} />
                    <Route path="/resolve" element={<ResolvePage />} />
                    <Route path="/messenger" element={<MessengerPage />} />
                    <Route path="/library" element={<LibraryPage />} />
                    <Route path="/app-store" element={<AppStorePage />} />
                    <Route path="/compliance" element={<ComplianceDashboardPage />} />
                    <Route path="/download" element={<DownloadPage />} />

                    {/* Legacy redirects */}
                    <Route path="/os" element={<Navigate to="/" replace />} />
                    <Route path="/desktop" element={<Navigate to="/" replace />} />
                    <Route path="/search" element={<Navigate to="/" replace />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </AuthPromptProvider>
        </PrivyWalletProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
