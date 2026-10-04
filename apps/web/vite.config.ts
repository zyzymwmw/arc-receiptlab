import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL("./", import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: {
      "@receiptlab/core/rpc": fileURLToPath(
        new URL("../../packages/receipt-core/src/rpc.ts", import.meta.url),
      ),
      "@receiptlab/core": fileURLToPath(
        new URL("../../packages/receipt-core/src/index.ts", import.meta.url),
      ),
    },
  },
  build: { outDir: "../../dist", emptyOutDir: true, target: "es2022" },
});
