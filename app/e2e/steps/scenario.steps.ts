import { createBdd } from "playwright-bdd";
import { expect, type Page } from "@playwright/test";

const { When, Then } = createBdd();

// メイン画面（スタート / クイズ / 結果）の表示名と要素IDの対応
const SCREEN_IDS: Record<string, string> = {
  スタート: "startScreen",
  クイズ: "quizScreen",
  結果: "resultScreen",
};

// 問題番号テキスト（例: "問題 1 / 10"）から現在問題番号と総問題数を取得する
async function readQuestionProgress(page: Page): Promise<{ current: number; total: number }> {
  const text = await page.locator("#questionNumber").textContent();
  if (text === null) {
    throw new Error("問題番号要素 (#questionNumber) が見つかりません");
  }
  const match = text.match(/問題\s*(\d+)\s*\/\s*(\d+)/);
  if (!match) {
    throw new Error(`問題番号テキストを解析できません: "${text}"`);
  }
  return { current: Number(match[1]), total: Number(match[2]) };
}

Then("問題 {int} が表示される", async ({ page }, n: number) => {
  await expect(page.locator("#questionNumber")).toHaveText(new RegExp(`問題\\s*${n}\\s*/`));
});

Then("プログレスバーが表示されている", async ({ page }) => {
  await expect(page.locator("#quizScreen .progress-bar")).toBeVisible();
});

// 問題番号 N/M と プログレスバーの塗りつぶし幅 (N/M*100%) が一致していることを検証する
Then("プログレスバーの進捗が問題番号と一致している", async ({ page }) => {
  const { current, total } = await readQuestionProgress(page);
  const expectedPercent = (current / total) * 100;
  const width = await page.locator("#progressFill").evaluate((el) => parseFloat((el as HTMLElement).style.width));
  if (Number.isNaN(width)) {
    throw new Error("プログレスバー (#progressFill) の width が数値として取得できません");
  }
  expect(width).toBeCloseTo(expectedPercent, 1);
});

When("次の問題へ進む", async ({ page }) => {
  await page.locator("#nextBtn").click();
});

// スタート / クイズ / 結果のうち、指定した画面だけが表示されていることを検証する
Then("表示されている画面が {string} のみである", async ({ page }, screen: string) => {
  const targetId = SCREEN_IDS[screen];
  if (!targetId) {
    throw new Error(`未知の画面名です: "${screen}"`);
  }
  for (const [name, id] of Object.entries(SCREEN_IDS)) {
    const locator = page.locator(`#${id}`);
    if (name === screen) {
      await expect(locator).toBeVisible();
    } else {
      await expect(locator).toBeHidden();
    }
  }
});
