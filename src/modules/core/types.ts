import type { RouteObject } from "react-router-dom";

/**
 * Machine-readable module manifest anchored to the UOR Framework.
 * Each module declares what it provides and what it needs.
 */
export interface ModuleManifest {
  "@context": string;
  "@type": string;
  name: string;
  version: string;
  description: string;
  "uor:specification": string;
  "uor:namespaces": string[];
  exports: string[];
  dependencies: Record<string, string>;
  routes: string[];
  assets: string[];
}

/**
 * Navigation item contract used by Navbar and any module
 * that needs to register routes in the shell.
 */
export interface NavItem {
  label: string;
  href: string;
}

/**
 * Route configuration exported by each module.
 * App.tsx composes all module routes dynamically.
 */
export interface ModuleRouteConfig {
  routes: RouteObject[];
}

/**
 * Layout props contract.
 */
export interface LayoutProps {
  children: React.ReactNode;
}
