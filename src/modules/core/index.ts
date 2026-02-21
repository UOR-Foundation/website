// Core module barrel export
export { default as Layout } from "./components/Layout";
export { default as Navbar } from "./components/Navbar";
export { default as Footer } from "./components/Footer";
export { default as ScrollProgress } from "./components/ScrollProgress";
export { NavLink } from "./components/NavLink";
export { default as AboutPage } from "./pages/AboutPage";
export { default as NotFoundPage } from "./pages/NotFound";

// UI primitives
export * from "./ui/dialog";
export * from "./ui/toast";
export { Toaster } from "./ui/toaster";
export { Toaster as Sonner } from "./ui/sonner";
export * from "./ui/tooltip";

// Hooks
export { useToast, toast } from "./hooks/use-toast";

// Utilities
export { cn } from "@/lib/utils";

// UOR verification components
export { default as UorVerification } from "./components/UorVerification";
export { default as UorMetadata } from "./components/UorMetadata";

// Types
export type { ModuleManifest, NavItem, ModuleRouteConfig, LayoutProps, ModuleIdentityFields, UorCertificateContract } from "./types";
