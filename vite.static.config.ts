import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: ".",
  base: "/procurement-mission-control/",
  publicDir: "public",
  build: {
    outDir: "dist-static",
    emptyOutDir: true,
    rollupOptions: {
      input: "static/index.html",
    },
  },
});
