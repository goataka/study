import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

// シナリオ検証の連続E2Eだけを対象に、軽量な動画を記録するための設定。
// 動画を軽くするため、ビューポート・録画サイズを小さめに設定する。
const testDir = defineBddConfig({
  features: "e2e/features/scenario-validation.feature",
  steps: "e2e/steps/**/*.ts",
});

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4173";
const isExternalUrl = baseURL.startsWith("https://");

const videoSize = { width: 960, height: 540 };

export default defineConfig({
  testDir,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  // 動画は test-results 配下に保存される。生成後にスクリプトでリポジトリへコピーする。
  outputDir: "test-results/scenario-video",
  reporter: [["list"]],
  use: {
    baseURL,
    headless: true,
    serviceWorkers: "block",
    viewport: videoSize,
    video: { mode: "on", size: videoSize },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: videoSize } }],
  webServer: isExternalUrl
    ? undefined
    : {
        command: "pnpm run preview",
        url: "http://localhost:4173",
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
});
