// Vitest 専用の設定ファイル。
// Vite のビルド設定（vite.config.ts）からテスト設定を分離している。
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
});
