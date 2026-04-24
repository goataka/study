import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const testDir = defineBddConfig({
  features: "e2e/features/quiz.feature",
  steps: ["e2e/steps/visual.steps.ts", "e2e/steps/quiz.steps.ts"],
  outputDir: ".features-gen/vr",
  tags: "@vr",
});

// 本番E2E時は PLAYWRIGHT_BASE_URL 環境変数でURLを上書きできる
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:4173"; // Viteのデフォルトpreviewポート
const isExternalUrl = baseURL.startsWith("https://");

export default defineConfig({
  testDir,
  timeout: 60_000,
  // スナップショットのパステンプレート（保存先とOS/ブラウザごとのファイル名を定義）
  snapshotPathTemplate: "e2e/snapshots/{arg}-{projectName}-{platform}{ext}",
  expect: {
    toHaveScreenshot: {
      // ピクセル差分の許容割合: フォントレンダリングの微細な差異（~2%）を許容する
      maxDiffPixelRatio: 0.02,
      // CSS アニメーションを無効化して安定したスクリーンショットを取得
      animations: "disabled",
    },
  },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "vr-report" }],
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
        timeout: 30_000, // previewサーバーの起動を最大30秒待つ
      },
});
