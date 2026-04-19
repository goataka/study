import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const testDir = defineBddConfig({
  features: "e2e/features/**/*.feature",
  steps: "e2e/steps/**/*.ts",
});

// 本番E2E時は PLAYWRIGHT_BASE_URL 環境変数でURLを上書きできる
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4173";
const isExternalUrl = baseURL.startsWith("https://");

export default defineConfig({
  testDir,
  timeout: 60_000,
  // JSONレポーター: エビデンス生成スクリプトが読み込む
  reporter: [
    ["list"],
    ["json", { outputFile: "e2e-results.json" }],
  ],
  use: {
    baseURL,
    headless: true,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // 外部URLの場合はローカルサーバーを起動しない
  webServer: isExternalUrl
    ? undefined
    : {
        command: "npm run preview",
        url: "http://localhost:4173",
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
});
