import { lazy, Suspense } from "react";
import FoundationHome from "@/site/FoundationHome";
import { DISCORD_URL } from "@/site/links";

const Docs = lazy(() => import("@/docs/Docs"));
const Blog = lazy(() => import("@/blog/Blog"));
const Playground = lazy(() => import("@/playground/Playground"));
const About = lazy(() => import("@/about/About"));
const Agents = lazy(() => import("@/agent/Agents"));
const Framework = lazy(() => import("@/framework/Framework"));
const Discord = lazy(() => import("@/agent/DiscordPosting"));

export default function App() {
  if (window.location.pathname === "/discord" || window.location.pathname === "/discord/") {
    window.location.replace(DISCORD_URL);
    return null;
  }
  if (window.location.pathname === "/agents/discord" || window.location.pathname === "/agents/discord/") return <Suspense fallback={<div className="foundation min-h-screen" />}><Discord /></Suspense>;
  if (window.location.pathname === "/playground") {
    window.location.replace(`/playground/${window.location.search}${window.location.hash}`);
    return null;
  }
  if (window.location.pathname.startsWith("/playground/")) return <Suspense fallback={<div className="foundation pg-loading-page">Loading Playground…</div>}><Playground /></Suspense>;
  if (window.location.pathname === "/docs") {
    window.location.replace(`/docs/${window.location.search}${window.location.hash}`);
    return null;
  }
  if (window.location.pathname.startsWith("/docs/")) return <Suspense fallback={<div className="foundation dc-root" />}><Docs /></Suspense>;
  if (window.location.pathname === "/blog" || /^\/blog\/[a-z0-9-]+$/.test(window.location.pathname)) {
    window.location.replace(`${window.location.pathname}/${window.location.search}${window.location.hash}`);
    return null;
  }
  if (window.location.pathname.startsWith("/blog/")) return <Suspense fallback={<div className="foundation min-h-screen" />}><Blog /></Suspense>;
  if (window.location.pathname === "/about") {
    window.location.replace(`/about/${window.location.search}${window.location.hash}`);
    return null;
  }
  if (window.location.pathname === "/about/") return <Suspense fallback={<div className="foundation min-h-screen" />}><About /></Suspense>;
  if (window.location.pathname === "/framework") {
    window.location.replace(`/framework/${window.location.search}${window.location.hash}`);
    return null;
  }
  if (window.location.pathname === "/framework/") return <Suspense fallback={<div className="foundation min-h-screen" />}><Framework /></Suspense>;
  if (window.location.pathname === "/agents") {
    window.location.replace(`/agents/${window.location.search}${window.location.hash}`);
    return null;
  }
  if (window.location.pathname === "/agents/") return <Suspense fallback={<div className="foundation min-h-screen" />}><Agents /></Suspense>;
  return <FoundationHome />;
}
