import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "static",
  base: "/procurement-mission-control/",
  publicDir: "../public",
  build: {
    outDir: "../dist-static",
    emptyOutDir: true,
  },
});
