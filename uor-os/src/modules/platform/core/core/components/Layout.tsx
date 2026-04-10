import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/modules/platform/core/components/Navbar";
import Footer from "@/modules/platform/core/components/Footer";
import ScrollProgress from "@/modules/platform/core/components/ScrollProgress";
import AgentBeacon from "@/modules/platform/core/components/AgentBeacon";
interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col font-body">
      <ScrollProgress />
      <Navbar />
      <AgentBeacon />
      <main className="flex-1 relative z-[1]">{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
