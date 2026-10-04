import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  expect: { timeout: 7000 },
  fullyParallel: true,
  workers: 2,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.RECEIPTLAB_BASE_URL ?? "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  ...(process.env.RECEIPTLAB_BASE_URL
    ? {}
    : {
        webServer: {
          command: "npm run dev",
          url: "http://127.0.0.1:4173",
          reuseExistingServer: !process.env.CI,
        },
      }),
});
