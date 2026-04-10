import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import { VitePWA } from "vite-plugin-pwa";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  base: mode === "tauri" ? "./" : "/",
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "credentialless",
    },
  },
  plugins: [
    wasm(),
    topLevelAwait(),
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "custom-sw.ts",
      registerType: "autoUpdate",
      injectRegister: "auto",
      devOptions: { enabled: false },
      includeAssets: ["favicon.png", "pwa-icon-192.png", "pwa-icon-512.png"],
      injectManifest: {
        globIgnores: ["**/*.wasm", "**/modules/uns/build/**"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        rollupFormat: "iife",
      },
      manifest: {
        name: "UOR OS",
        short_name: "UOR OS",
        description: "Sovereign Virtual Operating System — your universal coordinate system for information.",
        theme_color: "#0b1420",
        background_color: "#0b1420",
        display: "standalone",
        orientation: "any",
        scope: "/",
        start_url: "/",
        id: "/",
        categories: ["productivity", "utilities", "developer-tools"],
        icons: [
          { src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
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
