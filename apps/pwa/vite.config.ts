import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";

export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@openvisionmatrix/core": fileURLToPath(new URL("../../packages/core/src", import.meta.url)),
      "@openvisionmatrix/renderer": fileURLToPath(new URL("../../packages/renderer/src", import.meta.url))
    }
  }
});
