import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { Then } = createBdd();

const STATS_LOAD_TIMEOUT = 10_000;

// スタート画面のスクリーンショット比較
// statsInfo（問題数）はデータ依存のため除外する
Then("the start screen matches the snapshot", async ({ page }) => {
  await expect(page.locator("#statsInfo")).toContainText(/全\d+問/, {
    timeout: STATS_LOAD_TIMEOUT,
  });
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
