import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 7610,
    strictPort: true,
    allowedHosts: true,
  },
});
