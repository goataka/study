import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "./",
  // Tailwind CSS v4 は CSS-first 設定で、`app/css/quiz.css` 内の
  // `@import "tailwindcss";` を起点にユーティリティを生成する。
  // content の指定は不要（プラグインが自動でテンプレートを走査する）。
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
