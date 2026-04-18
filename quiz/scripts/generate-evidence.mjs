#!/usr/bin/env node
/**
 * テスト実行結果をエビデンスファイル (TEST_EVIDENCE.md) として生成するスクリプト
 *
 * 使用方法:
 *   node scripts/generate-evidence.mjs
 *
 * 前提:
 *   vitest run --reporter=json --outputFile=test-results.json が実行済み
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const resultsFile = path.join(rootDir, "test-results.json");
const evidenceFile = path.join(rootDir, "TEST_EVIDENCE.md");

// ─── Git 情報取得 ────────────────────────────────────────────────────────────

function tryExec(cmd) {
  try {
    return execSync(cmd, { encoding: "utf-8", cwd: rootDir }).trim();
  } catch {
    return "unknown";
  }
}

const commitHash = tryExec("git rev-parse --short HEAD");
const commitMessage = tryExec("git log -1 --format=%s HEAD");

// ─── 実行環境情報 ─────────────────────────────────────────────────────────────

const isCI = process.env.CI === "true";
const runner = isCI
  ? `GitHub Actions (${process.env.GITHUB_WORKFLOW ?? "CI"})`
  : "Copilot AI Agent (local)";

// ─── タイムスタンプ（JST） ───────────────────────────────────────────────────

const timestamp = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
})
  .format(new Date())
  .replace(/\//g, "-") + " JST";

// ─── テスト結果読み込み ───────────────────────────────────────────────────────

if (!fs.existsSync(resultsFile)) {
  console.error(`Error: ${resultsFile} が見つかりません。`);
  console.error("先に npm run test:report を実行してください。");
  process.exit(1);
}

const results = JSON.parse(fs.readFileSync(resultsFile, "utf-8"));

// ─── 実行時間計算 ─────────────────────────────────────────────────────────────

const durationMs = results.testResults.reduce((sum, suite) => {
  return sum + Math.max(0, (suite.endTime ?? 0) - (suite.startTime ?? 0));
}, 0);
const durationSec = (durationMs / 1000).toFixed(2);

// ─── エビデンスMarkdown生成 ──────────────────────────────────────────────────

const statusBadge = results.success ? "✅ PASSED" : "❌ FAILED";

const lines = [
  "# クイズ動作検証エビデンス",
  "",
  "<!-- このファイルはAIエージェントが自動生成します。手動編集不要です。 -->",
  "<!-- AIの作業時・CI実行時に必ず更新されます。 -->",
  "",
  "## 概要",
  "",
  "| 項目 | 値 |",
  "|------|------|",
  `| **ステータス** | ${statusBadge} |`,
  `| **最終更新** | ${timestamp} |`,
  `| **更新者** | ${runner} |`,
  `| **コミット** | \`${commitHash}\` |`,
  `| **コミットメッセージ** | ${commitMessage} |`,
  "",
  "## テスト結果サマリー",
  "",
  "| 項目 | 結果 |",
  "|------|------|",
  `| テストスイート（合格 / 合計） | ${results.numPassedTestSuites} / ${results.numTotalTestSuites} |`,
  `| テストケース（合格 / 合計） | ${results.numPassedTests} / ${results.numTotalTests} |`,
  `| 失敗テスト | ${results.numFailedTests} |`,
  `| 実行時間 | ${durationSec}s |`,
  "",
  "## テストスイート詳細",
  "",
];

const MAX_ERROR_MESSAGE_LENGTH = 500;

for (const suite of results.testResults) {
  const suiteName = path.relative(rootDir, suite.name).replace(/\\/g, "/");
  const suiteStatus = suite.status === "passed" ? "✅" : "❌";
  const passCount = suite.assertionResults.filter((t) => t.status === "passed").length;
  const totalCount = suite.assertionResults.length;

  lines.push(`### ${suiteStatus} \`${suiteName}\` (${passCount}/${totalCount})`);
  lines.push("");
  lines.push("| 結果 | テスト名 |");
  lines.push("|------|---------|");

  for (const test of suite.assertionResults) {
    const icon = test.status === "passed" ? "✅" : "❌";
    const context =
      test.ancestorTitles.length > 0 ? `${test.ancestorTitles.join(" > ")} > ` : "";
    lines.push(`| ${icon} | ${context}${test.title} |`);
  }

  if (suite.status !== "passed" && suite.message) {
    lines.push("");
    lines.push("**エラー詳細:**");
    lines.push("```");
    lines.push(suite.message.slice(0, MAX_ERROR_MESSAGE_LENGTH));
    lines.push("```");
  }

  lines.push("");
}

lines.push("---");
lines.push("");
lines.push("> **ルール**: quizフォルダのコードを変更した後は必ず `npm run test:evidence` を実行して");
lines.push("> このファイルを更新し、コミットに含めること（AI・CI共通）。");

fs.writeFileSync(evidenceFile, lines.join("\n"), "utf-8");
console.log(
  `✅ エビデンスファイルを生成しました: TEST_EVIDENCE.md` +
    ` (${results.numPassedTests}/${results.numTotalTests} テスト合格)`
);

if (!results.success) {
  console.error("❌ テストが失敗しています。コードを修正してください。");
  process.exit(1);
}
