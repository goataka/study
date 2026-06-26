import { createBdd } from "playwright-bdd";
import { expect, type Page, type TestInfo } from "@playwright/test";
import { waitForStatsInfoLoaded } from "../helpers/statsInfo";

const { Before, After, Then } = createBdd();

const COMMON_MASK_SELECTORS = ["#statsInfo", "#headerTodayDate", "#shareSummaryText"];

function createCommonMasks(page: Page) {
  return COMMON_MASK_SELECTORS.map((selector) => page.locator(selector));
}

// VR テストの再現性を保つために Math.random をシードする
// page.addInitScript はページロード前に実行されるため、
// pickRandom での問題選択が毎回同じ結果になる
Before(async ({ page }, testInfo: TestInfo) => {
  if (!testInfo.config.configFile?.includes("playwright.vr.config")) {
    return;
  }
  await page.addInitScript(() => {
    let seed = 42;
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x100000000;
    };

    const fixedNow = Date.UTC(2026, 0, 1, 0, 0, 0);
    const OriginalDate = Date;
    class FixedDate extends OriginalDate {
      constructor(...args: ConstructorParameters<typeof Date>) {
        if (args.length === 0) {
          super(fixedNow);
          return;
        }
        super(...args);
      }
      static now() {
        return fixedNow;
      }
    }
    (globalThis as { Date: typeof Date }).Date = FixedDate;
  });
});

Then("検証スナップショット {string} が一致する", async ({ page }, snapshotName: string) => {
  await expect(page).toHaveScreenshot(`${snapshotName}.png`, {
    mask: createCommonMasks(page),
  });
});

After(async ({ page }, testInfo: TestInfo) => {
  if (!testInfo.config.configFile?.includes("playwright.vr.config")) {
    return;
  }
  await expect(page).toHaveScreenshot({
    mask: createCommonMasks(page),
  });
});

// スタート画面のスクリーンショット比較
// statsInfo（問題数）はデータ依存のため除外する
Then("スタート画面のスナップショットが一致する", async ({ page }) => {
  await waitForStatsInfoLoaded(page);
  await expect(page).toHaveScreenshot("start-screen.png", {
    mask: createCommonMasks(page),
  });
});

// クイズ画面のレイアウトのスクリーンショット比較
// 問題文・選択肢・トピック名など動的コンテンツはマスクして構造のみ確認する
Then("クイズ画面のレイアウトがスナップショットと一致する", async ({ page }) => {
  await expect(page.locator("#quizScreen")).toBeVisible();
  await expect(page).toHaveScreenshot("quiz-screen.png", {
    mask: [
      ...createCommonMasks(page),
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
Then("結果画面のレイアウトがスナップショットと一致する", async ({ page }) => {
  await expect(page.locator("#resultScreen")).toBeVisible();
  await expect(page).toHaveScreenshot("result-screen.png", {
    mask: [...createCommonMasks(page), page.locator("#scoreDisplay"), page.locator("#resultDetails")],
  });
});
