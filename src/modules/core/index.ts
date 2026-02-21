// Core module barrel export — public API only
export { default as Layout } from "./components/Layout";
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
