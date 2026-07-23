import { defineConfig } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 4187);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.05,
    },
  },
  use: {
    baseURL,
    viewport: { width: 393, height: 860 },
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "ignore",
  },
});
