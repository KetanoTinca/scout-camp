/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// During dev the API/WS live on the Fastify server (default :3000). Proxy them so the
// app talks to same-origin paths in dev and prod alike.
const SERVER_TARGET = process.env.SERVER_URL ?? "http://localhost:3000";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Precache the app shell so the PWA boots with no network once installed.
      workbox: {
        navigateFallback: "index.html",
        // Auth/API/WS must always hit the network, never a cached shell.
        navigateFallbackDenylist: [/^\/api/, /^\/auth/, /^\/ws/, /^\/healthz/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
      manifest: {
        name: "Orion's Cookbook",
        short_name: "Cookbook",
        description: "Scout camp meal planning & logistics",
        theme_color: "#1f2937",
        background_color: "#111827",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": SERVER_TARGET,
      "/auth": SERVER_TARGET,
      "/healthz": SERVER_TARGET,
      "/ws": { target: SERVER_TARGET, ws: true },
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
  },
});
