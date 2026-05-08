// ESLint v9 フラット設定。
// `eslint.config.js` は `.gitignore` の `app/*.js` ルールに合致するため、`.mjs` で配置する。
// TypeScript の推奨ルールと Prettier との競合回避を組み合わせた最小構成。

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import prettierConfig from "eslint-config-prettier";

export default [
  {
    // ビルド成果物・依存・自動生成ファイル・TS から生成された .js は対象外。
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      ".features-gen/**",
      "src/**/*.js",
      "public/**",
      "vendor/**",
      "scripts/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        // KanjiCanvas は CDN から読み込まれるグローバル
        KanjiCanvas: "readonly",
      },
    },
    rules: {
      // 未使用変数の検知。`_` プレフィクス付きは許容（catch 句や意図的な引数）。
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // any は domain では避けたいが、テストや既存コードに散在するため warn にとどめる。
      "@typescript-eslint/no-explicit-any": "warn",
      // 空関数は意図的に許容するケースが多いため off。
      "@typescript-eslint/no-empty-function": "off",
    },
  },
  {
    // テストでは require/モックの都合で any や unused を許容する。
    files: ["**/*.test.ts", "e2e/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Prettier との競合ルールを無効化（必ず最後に置く）。
  prettierConfig,
];
