import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/receipt-core/test/**/*.test.ts"],
    environment: "node",
    testTimeout: 8000,
  },
});
