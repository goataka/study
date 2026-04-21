#!/usr/bin/env node
/**
 * テスト結果をPRコメント用のMarkdownとして生成するスクリプト
 *
 * 使用方法:
 *   node scripts/generate-pr-comment.mjs --unit  # 単体テスト結果
 *   node scripts/generate-pr-comment.mjs --e2e   # E2Eテスト結果
 *
 * 前提:
 *   --unit: vitest run --reporter=json --outputFile=test-results.json が実行済み
 *   --e2e:  playwright test が実行済みで e2e-results.json が存在する
 *
 * 出力:
 *   pr-comment.md（CIがPRコメントとして投稿するMarkdown）
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

const args = process.argv.slice(2);
const mode = args.includes("--e2e") ? "e2e" : "unit";

const resultsFile = path.join(rootDir, "test-results.json");
const e2eResultsFile = path.join(rootDir, "e2e-results.json");
const outputFile = path.join(rootDir, "pr-comment.md");

// ─── Git 情報取得 ────────────────────────────────────────────────────────────

function tryExec(cmd) {
  try {
    return execSync(cmd, { encoding: "utf-8", cwd: rootDir }).trim();
  } catch {
    return "unknown";
  }
}

const commitHash = tryExec("git rev-parse --short HEAD");

// ─── タイムスタンプ（JST） ───────────────────────────────────────────────────

const timestamp =
  new Intl.DateTimeFormat("ja-JP", {
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

// ─── Markdown 生成 ───────────────────────────────────────────────────────────

const lines = [];

if (mode === "unit") {
  // ── 単体テスト結果 ──────────────────────────────────────────────────────────
  if (!fs.existsSync(resultsFile)) {
    console.error(`Error: ${resultsFile} が見つかりません。`);
    console.error("先に npm run test:report を実行してください。");
    process.exit(1);
  }

  const results = JSON.parse(fs.readFileSync(resultsFile, "utf-8"));
  const unitStatus = results.success ? "✅ PASSED" : "❌ FAILED";
  const durationMs = results.testResults.reduce((sum, suite) => {
    return sum + Math.max(0, (suite.endTime ?? 0) - (suite.startTime ?? 0));
  }, 0);
  const durationSec = (durationMs / 1000).toFixed(2);

  lines.push(
    "<!-- quiz-unit-test-results -->",
    "## 🧪 単体テスト結果",
    "",
    "| 項目 | 値 |",
    "|------|------|",
    `| **ステータス** | ${unitStatus} |`,
    `| **テストケース** | ${results.numPassedTests} / ${results.numTotalTests} 合格 |`,
    `| **実行時間** | ${durationSec}s |`,
    `| **コミット** | \`${commitHash}\` |`,
    `| **更新日時** | ${timestamp} |`,
    "",
  );

  if (!results.success) {
    lines.push("### ❌ 失敗したテスト", "");
    for (const suite of results.testResults) {
      if (suite.status !== "passed") {
        const suiteName = path.relative(rootDir, suite.name).replace(/\\/g, "/");
        lines.push(`**${suiteName}**`, "");
        for (const test of suite.assertionResults) {
          if (test.status !== "passed") {
            const ctx =
              test.ancestorTitles.length > 0
                ? test.ancestorTitles.join(" > ") + " > "
                : "";
            lines.push(`- ❌ ${ctx}${test.title}`);
          }
        }
        lines.push("");
      }
    }
  }

  fs.writeFileSync(outputFile, lines.join("\n"), "utf-8");
  console.log(
    `✅ PRコメント（単体テスト）を生成しました: pr-comment.md` +
      ` (${results.numPassedTests}/${results.numTotalTests} 合格)`,
  );
} else {
  // ── E2Eテスト結果 ───────────────────────────────────────────────────────────
  if (!fs.existsSync(e2eResultsFile)) {
    // E2Eテストが実行される前にジョブが失敗した場合（bddgen失敗など）
    lines.push(
      "<!-- quiz-e2e-test-results -->",
      "## 🎭 E2Eテスト結果（Playwright + Gherkin）",
      "",
      "| 項目 | 値 |",
      "|------|------|",
      "| **ステータス** | ⚠️ 結果ファイルなし |",
      `| **コミット** | \`${commitHash}\` |`,
      `| **更新日時** | ${timestamp} |`,
      "",
      "> ⚠️ `e2e-results.json` が見つかりません。E2Eテストが実行前に失敗した可能性があります。",
      "",
    );
    fs.writeFileSync(outputFile, lines.join("\n"), "utf-8");
    console.warn("⚠️ e2e-results.json が見つかりません。スキップします。");
    process.exit(0);
  }

  const e2eResults = JSON.parse(fs.readFileSync(e2eResultsFile, "utf-8"));

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

  const e2eStats = calcE2eStats(e2eResults);
  const e2eStatus = e2eStats.failed === 0 ? "✅ PASSED" : "❌ FAILED";

  lines.push(
    "<!-- quiz-e2e-test-results -->",
    "## 🎭 E2Eテスト結果（Playwright + Gherkin）",
    "",
    "| 項目 | 値 |",
    "|------|------|",
    `| **ステータス** | ${e2eStatus} |`,
    `| **シナリオ** | ${e2eStats.passed} / ${e2eStats.total} 合格 |`,
  );

  if (e2eResults?.duration) {
    lines.push(`| **実行時間** | ${(e2eResults.duration / 1000).toFixed(2)}s |`);
  }

  lines.push(
    `| **コミット** | \`${commitHash}\` |`,
    `| **更新日時** | ${timestamp} |`,
    "",
  );

  if (e2eStats.failed > 0) {
    lines.push("### ❌ 失敗したシナリオ", "");
    function renderFailures(suites) {
      for (const suite of suites) {
        for (const spec of suite.specs ?? []) {
          const allResults = spec.tests?.flatMap((t) => t.results ?? []);
          const ok =
            allResults &&
            allResults.length > 0 &&
            allResults.every((r) => r.status === "passed");
          if (!ok) {
            lines.push(`- ❌ ${spec.title}`);
          }
        }
        if (suite.suites) renderFailures(suite.suites);
      }
    }
    if (e2eResults?.suites) renderFailures(e2eResults.suites);
    lines.push("");
  }

  fs.writeFileSync(outputFile, lines.join("\n"), "utf-8");
  console.log(
    `✅ PRコメント（E2E）を生成しました: pr-comment.md` +
      ` (${e2eStats.passed}/${e2eStats.total} 合格)`,
  );
}
