import { defineConfig } from "vite";

const previewHosts = ["grok-bot.taila8f6d4.ts.net", ".ts.net", "100.103.230.115"];

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: previewHosts,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: previewHosts,
  },
});
