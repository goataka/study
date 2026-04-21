#!/usr/bin/env node
/**
 * テスト実行結果をエビデンスファイル (TEST_EVIDENCE.md) として生成するスクリプト
 *
 * 使用方法:
 *   node scripts/generate-evidence.mjs
 *
 * 前提:
 *   単体テスト: vitest run --reporter=json --outputFile=test-results.json が実行済み
 *   E2Eテスト（任意）: playwright test が実行済みで e2e-results.json が存在する場合は含める
 *
 * 改ざん防止:
 *   テスト結果JSONのSHA256ハッシュをエビデンスに記録する。
 *   ハッシュと結果JSONを照合することでエビデンスの真正性を検証できる。
 *
 * コンフリクト回避:
 *   エビデンスは TEST_EVIDENCE_LOG.md に追記され、TEST_EVIDENCE.md は最新エントリーへのシンボリックリンクとして機能する。
 *   複数のCIジョブが同時に実行されても、追記方式によりコンフリクトを回避できる。
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const resultsFile = path.join(rootDir, "test-results.json");
const e2eResultsFile = path.join(rootDir, "e2e-results.json");
const evidenceFile = path.join(rootDir, "TEST_EVIDENCE.md");
const evidenceLogFile = path.join(rootDir, "TEST_EVIDENCE_LOG.md");

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

// ─── 単体テスト結果読み込み ───────────────────────────────────────────────────

if (!fs.existsSync(resultsFile)) {
  console.error(`Error: ${resultsFile} が見つかりません。`);
  console.error("先に npm run test:report を実行してください。");
  process.exit(1);
}

const resultsRaw = fs.readFileSync(resultsFile, "utf-8");
const results = JSON.parse(resultsRaw);

// ─── E2Eテスト結果読み込み（任意） ───────────────────────────────────────────

const e2eResultsRaw = fs.existsSync(e2eResultsFile)
  ? fs.readFileSync(e2eResultsFile, "utf-8")
  : null;
const e2eResults = e2eResultsRaw ? JSON.parse(e2eResultsRaw) : null;

// ─── SHA256ハッシュ計算（改ざん防止） ────────────────────────────────────────

/** テスト結果JSONのSHA256ハッシュを計算する */
function sha256(content) {
  return crypto.createHash("sha256").update(content, "utf-8").digest("hex");
}

const unitHash = sha256(resultsRaw);
const e2eHash = e2eResultsRaw ? sha256(e2eResultsRaw) : null;

// ─── 実行時間計算（単体テスト） ───────────────────────────────────────────────

const durationMs = results.testResults.reduce((sum, suite) => {
  return sum + Math.max(0, (suite.endTime ?? 0) - (suite.startTime ?? 0));
}, 0);
const durationSec = (durationMs / 1000).toFixed(2);

// ─── E2E 統計計算 ─────────────────────────────────────────────────────────────

/** Playwright の JSON 出力から合格・失敗・合計数を算出する */
function calcE2eStats(e2e) {
  if (!e2e?.suites) return { passed: 0, failed: 0, total: 0 };
  let passed = 0;
  let failed = 0;

  function walkSuites(suites) {
    for (const suite of suites) {
      for (const spec of suite.specs ?? []) {
        for (const test of spec.tests ?? []) {
          const results = test.results;
          // results が空の場合は失敗扱い（実行されなかったケース）
          if (!results || results.length === 0) {
            failed++;
          } else if (results.every((r) => r.status === "passed")) {
            passed++;
          } else {
            failed++;
          }
        }
      }
      if (suite.suites) walkSuites(suite.suites);
    }
  }
  walkSuites(e2e.suites);
  return { passed, failed, total: passed + failed };
}

const e2eStats = e2eResults ? calcE2eStats(e2eResults) : null;

// ─── エビデンスMarkdown生成 ──────────────────────────────────────────────────

const unitStatus = results.success ? "✅ PASSED" : "❌ FAILED";
const e2eStatus = e2eStats
  ? e2eStats.failed === 0 ? "✅ PASSED" : "❌ FAILED"
  : "⏭ 未実行（CIで実行）";

const lines = [
  "# クイズ動作検証エビデンス",
  "",
  "<!-- このファイルはAIエージェントが自動生成します。手動編集不要です。 -->",
  "<!-- AIの作業時・CI実行時に必ず更新されます。 -->",
  "<!-- 改ざん検証: 各テスト結果JSONのSHA256ハッシュをこのファイルに記録しています。 -->",
  "",
  "## 概要",
  "",
  "| 項目 | 値 |",
  "|------|------|",
  `| **ステータス（単体テスト）** | ${unitStatus} |`,
  `| **ステータス（E2Eテスト）** | ${e2eStatus} |`,
  `| **最終更新** | ${timestamp} |`,
  `| **更新者** | ${runner} |`,
  `| **コミット** | \`${commitHash}\` |`,
  `| **コミットメッセージ** | ${commitMessage} |`,
  "",
  "## 改ざん防止チェックサム",
  "",
  "テスト結果JSONファイルのSHA256ハッシュです。",
  "`sha256sum test-results.json e2e-results.json` で検証できます。",
  "",
  "| ファイル | SHA256 |",
  "|------|------|",
  `| \`test-results.json\` | \`${unitHash}\` |`,
  e2eHash
    ? `| \`e2e-results.json\` | \`${e2eHash}\` |`
    : `| \`e2e-results.json\` | 未実行 |`,
  "",
  "## 単体テスト結果サマリー",
  "",
  "| 項目 | 結果 |",
  "|------|------|",
  `| テストスイート（合格 / 合計） | ${results.numPassedTestSuites} / ${results.numTotalTestSuites} |`,
  `| テストケース（合格 / 合計） | ${results.numPassedTests} / ${results.numTotalTests} |`,
  `| 失敗テスト | ${results.numFailedTests} |`,
  `| 実行時間 | ${durationSec}s |`,
  "",
];

// E2Eサマリー
if (e2eStats) {
  lines.push("## E2Eテスト結果サマリー（Playwright + Gherkin）", "");
  lines.push("| 項目 | 結果 |");
  lines.push("|------|------|");
  lines.push(`| シナリオ（合格 / 合計） | ${e2eStats.passed} / ${e2eStats.total} |`);
  lines.push(`| 失敗シナリオ | ${e2eStats.failed} |`);
  if (e2eResults?.duration) {
    lines.push(`| 実行時間 | ${(e2eResults.duration / 1000).toFixed(2)}s |`);
  }
  lines.push("");

  // E2Eシナリオ詳細
  lines.push("### E2Eシナリオ詳細", "");

  function renderSuites(suites, depth = 0) {
    for (const suite of suites) {
      const indent = "  ".repeat(depth);
      if (suite.title) {
        lines.push(`${indent}#### 📋 ${suite.title}`, "");
        lines.push(`${indent}| 結果 | シナリオ名 |`);
        lines.push(`${indent}|------|---------|`);
      }
      for (const spec of suite.specs ?? []) {
        const results = spec.tests?.flatMap((t) => t.results ?? []);
        const ok = results && results.length > 0 && results.every((r) => r.status === "passed");
        const icon = ok ? "✅" : "❌";
        lines.push(`${indent}| ${icon} | ${spec.title} |`);
      }
      if ((suite.specs ?? []).length > 0) lines.push("");
      if (suite.suites) renderSuites(suite.suites, depth + 1);
    }
  }

  if (e2eResults?.suites) renderSuites(e2eResults.suites);
} else {
  lines.push("## E2Eテスト結果サマリー（Playwright + Gherkin）", "");
  lines.push("> E2Eテストは CI の `e2e` ジョブで実行されます。");
  lines.push("> ローカルで実行する場合: `npm run build && npm run test:e2e`");
  lines.push("");
}

lines.push("## 単体テストスイート詳細", "");

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
lines.push("");
lines.push("[📜 エビデンス履歴を見る](TEST_EVIDENCE_LOG.md)");

// ─── エビデンスファイル書き込み（最新の結果） ────────────────────────────────

fs.writeFileSync(evidenceFile, lines.join("\n"), "utf-8");

// ─── エビデンスログファイルに追記（履歴保存） ────────────────────────────────

const logEntry = [
  "",
  "---",
  "",
  `## 実行記録: ${timestamp}`,
  "",
  `- **更新者**: ${runner}`,
  `- **コミット**: \`${commitHash}\``,
  `- **コミットメッセージ**: ${commitMessage}`,
  `- **単体テスト**: ${unitStatus} (${results.numPassedTests}/${results.numTotalTests} 合格)`,
  e2eStats
    ? `- **E2Eテスト**: ${e2eStatus} (${e2eStats.passed}/${e2eStats.total} 合格)`
    : `- **E2Eテスト**: ${e2eStatus}`,
  "",
].join("\n");

// ログファイルが存在しない場合はヘッダーを作成
if (!fs.existsSync(evidenceLogFile)) {
  const logHeader = [
    "# テストエビデンス実行履歴",
    "",
    "<!-- このファイルは各テスト実行時に自動追記されます -->",
    "<!-- 最新のエビデンス詳細は TEST_EVIDENCE.md を参照してください -->",
    "",
  ].join("\n");
  fs.writeFileSync(evidenceLogFile, logHeader, "utf-8");
}

// ログエントリーを追記
fs.appendFileSync(evidenceLogFile, logEntry, "utf-8");

console.log(
  `✅ エビデンスファイルを生成しました: TEST_EVIDENCE.md` +
    ` (単体テスト: ${results.numPassedTests}/${results.numTotalTests} 合格` +
    (e2eStats ? ` / E2E: ${e2eStats.passed}/${e2eStats.total} 合格)` : ")")
);
console.log(`📜 履歴を TEST_EVIDENCE_LOG.md に追記しました`);

if (!results.success) {
  console.error("❌ 単体テストが失敗しています。コードを修正してください。");
  process.exit(1);
}
if (e2eStats && e2eStats.failed > 0) {
  console.error("❌ E2Eテストが失敗しています。コードを修正してください。");
  process.exit(1);
}
