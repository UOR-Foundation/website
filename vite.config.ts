import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "pwa-icon-192.png", "pwa-icon-512.png"],
      workbox: {
        // Exclude large WASM files (ONNX runtime ~22 MB) from precache
        globIgnores: ["**/ort-wasm-*.wasm", "**/*.wasm"],
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 50 MB — safety net; WASM excluded via globIgnores
        // Never cache OAuth redirects
        navigateFallbackDenylist: [/^\/~oauth/],
        // Cache strategies for a crisp, fast experience
        runtimeCaching: [
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // Cache images
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Cache JS/CSS bundles
            urlPattern: /\.(?:js|css)$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-resources",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            // Cache API calls with network-first for freshness
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
      manifest: {
        name: "Hologram OS",
        short_name: "Hologram",
        description: "Your universal operating system — content-addressed, sovereign, and private.",
        theme_color: "#0b1420",
        background_color: "#0b1420",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone"],
        orientation: "any",
        scope: "/",
        start_url: "/hologram-os",
        id: "/hologram-os",
        categories: ["productivity", "utilities", "developer tools"],
        launch_handler: {
          client_mode: "focus-existing",
        },
        shortcuts: [
          {
            name: "Open Lumen",
            short_name: "Lumen",
            description: "Talk to your intelligent companion",
            url: "/hologram-os?open=lumen",
            icons: [{ src: "/pwa-icon-192.png", sizes: "192x192" }],
          },
          {
            name: "Convergence Dashboard",
            short_name: "Convergence",
            description: "View the Quantum-AI phase dashboard",
            url: "/hologram-os?open=convergence",
            icons: [{ src: "/pwa-icon-192.png", sizes: "192x192" }],
          },
        ],
        icons: [
          {
            src: "/pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
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
