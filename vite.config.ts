import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === "tauri" ? "./" : "/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "credentialless",
    },
    proxy: {
      // First-party canonical mirror for the UOR REST API (dev only).
      // In production, callers go directly to the Supabase edge function;
      // the /api/v1 path here lets local dev match the documented base URL.
      "/api/v1": {
        target:
          "https://erwfuxphwcvynxhfbvql.supabase.co/functions/v1/uor-api",
        changeOrigin: true,
        secure: true,
        rewrite: (p: string) => p.replace(/^\/api\/v1/, ""),
      },
    },
  },
  plugins: [
    wasm(),
    topLevelAwait(),
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  optimizeDeps: {
    exclude: ["@grafeo-db/web", "@grafeo-db/wasm"],
  },
  build: {
    rollupOptions: {
      external: [
        "@grafeo-db/wasm",
        "@tauri-apps/plugin-clipboard-manager",
        "@tauri-apps/plugin-notification",
        "@tauri-apps/plugin-deep-link",
        "@tauri-apps/plugin-store",
        "@tauri-apps/plugin-sql",
        "@tauri-apps/plugin-stronghold",
        "@tauri-apps/api",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
}));
