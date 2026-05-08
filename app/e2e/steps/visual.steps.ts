import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";
import { waitForStatsInfoLoaded } from "../helpers/statsInfo";

const { Before, Then } = createBdd();

// VR テストの再現性を保つために Math.random をシードする
// page.addInitScript はページロード前に実行されるため、
// pickRandom での問題選択が毎回同じ結果になる
Before({ tags: "@vr" }, async ({ page }) => {
  await page.addInitScript(() => {
    let seed = 42;
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
  });
});

// スタート画面のスクリーンショット比較
// statsInfo（問題数）はデータ依存のため除外する
Then("the start screen matches the snapshot", async ({ page }) => {
  await waitForStatsInfoLoaded(page);
  await expect(page).toHaveScreenshot("start-screen.png", {
    mask: [page.locator("#statsInfo")],
  });
});

// クイズ画面のレイアウトのスクリーンショット比較
// 問題文・選択肢・トピック名など動的コンテンツはマスクして構造のみ確認する
Then("the quiz screen layout matches the snapshot", async ({ page }) => {
  await expect(page.locator("#quizScreen")).toBeVisible();
  await expect(page).toHaveScreenshot("quiz-screen.png", {
    mask: [
      page.locator("#questionText"),
      page.locator("#choicesContainer"),
      page.locator("#topicName"),
      page.locator("#questionNumber"),
      page.locator("#quizUserName"),
    ],
  });
});

// 結果画面のレイアウトのスクリーンショット比較
// スコアや詳細など動的コンテンツはマスクして構造のみ確認する
Then("the result screen layout matches the snapshot", async ({ page }) => {
  await expect(page.locator("#resultScreen")).toBeVisible();
  await expect(page).toHaveScreenshot("result-screen.png", {
    mask: [page.locator("#scoreDisplay"), page.locator("#resultDetails")],
  });
});
