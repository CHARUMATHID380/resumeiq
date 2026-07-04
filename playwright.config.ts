import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for ResumeIQ Phase 2 editor flow.
 *
 * The dev server is assumed to already be running at http://localhost:8080
 * (Lovable sandbox runs it automatically). If you run locally, start it with
 * `bun dev` in another terminal before invoking `bunx playwright test`.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:8080",
    trace: "retain-on-failure",
    viewport: { width: 1280, height: 1800 },
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
