import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { Given, When, Then } = createBdd();

const STATS_LOAD_TIMEOUT = 10_000;

Given("the quiz application is loaded", async ({ page }) => {
  await page.goto(".");
  // 問題ロード完了（JS初期化完了）を示すテキストが表示されるまで待つ
  await expect(page.locator("#statsInfo")).toContainText(/全\d+問/, {
    timeout: STATS_LOAD_TIMEOUT,
  });
});

Then("the start screen should be visible", async ({ page }) => {
  await expect(page.locator("#startScreen")).toBeVisible();
});

Then("the quiz title should be {string}", async ({ page }, title: string) => {
  await expect(page.locator("h1")).toHaveText(title);
});

When("I click the {string} tab", async ({ page }, tabText: string) => {
  // タブボタンをクリック
  const tab = page.locator(".subject-tab").filter({ hasText: tabText });
  await tab.click();
  // タブがアクティブになるまで待つ
  await expect(tab).toHaveClass(/active/);
});

Then("the header should remain visible", async ({ page }) => {
  // ヘッダーが表示されていることを確認
  const header = page.locator("header");
  await expect(header).toBeVisible();

  // ヘッダーがビューポート内に完全に収まっていることを確認
  const viewportSize = page.viewportSize();
  const headerBox = await header.boundingBox();
  expect(headerBox).not.toBeNull();
  expect(headerBox!.y).toBeGreaterThanOrEqual(0);
  expect(headerBox!.y + headerBox!.height).toBeLessThanOrEqual(viewportSize!.height);
});

Then("the quiz panel should remain visible", async ({ page }) => {
  // クイズパネルが表示されていることを確認
  const quizPanel = page.locator(".quiz-panel");
  await expect(quizPanel).toBeVisible();

  // クイズパネルがビューポート内に完全に収まっていることを確認
  const viewportSize = page.viewportSize();
  const panelBox = await quizPanel.boundingBox();
  expect(panelBox).not.toBeNull();
  expect(panelBox!.y).toBeGreaterThanOrEqual(0);
  expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(viewportSize!.height);
});

Then("the category list should be visible", async ({ page }) => {
  // カテゴリリストが表示されていることを確認
  const categoryList = page.locator("#categoryList");
  await expect(categoryList).toBeVisible();
});

Then("the quiz panel should be visible", async ({ page }) => {
  // クイズパネルが表示されていることを確認
  const quizPanel = page.locator(".quiz-panel");
  await expect(quizPanel).toBeVisible();
});

When("I click the first category item", async ({ page }) => {
  // 最初のカテゴリアイテムをクリックする
  const firstItem = page.locator(".category-item").first();
  await firstItem.click();
});

When("I click the {string} button", async ({ page }, buttonText: string) => {
  await page.getByRole("button", { name: buttonText }).click();
});

Then("the quiz screen should be visible", async ({ page }) => {
  await expect(page.locator("#quizScreen")).toBeVisible();
});

Then("I should see question 1", async ({ page }) => {
  await expect(page.locator("#questionNumber")).toHaveText(/問題 1 \//);
});

When("I select the first choice", async ({ page }) => {
  await page.locator(".choice-label").first().click();
});

Then("the {string} button should be enabled", async ({ page }, buttonText: string) => {
  const button = page.getByRole("button", { name: buttonText });
  await expect(button).toBeEnabled();
});

When("I answer all questions", async ({ page }) => {
  // 全問題に回答する（最大20問）
  let hasNext = true;
  while (hasNext) {
    // 最初の選択肢を選ぶ
    await page.locator(".choice-label").first().click();

    // 「次へ」ボタンが表示されていれば次の問題へ
    const nextBtn = page.locator("#nextBtn");
    const submitBtn = page.locator("#submitBtn");

    const isSubmitVisible = await submitBtn.isVisible();
    if (isSubmitVisible) {
      hasNext = false;
    } else {
      await nextBtn.click();
    }
  }
});

Then("I should see the {string} button", async ({ page }, buttonText: string) => {
  const button = page.locator("#submitBtn");
  await expect(button).toBeVisible();
  await expect(button).toHaveText(buttonText);
});

Then("the result screen should be visible", async ({ page }) => {
  await expect(page.locator("#resultScreen")).toBeVisible();
});

Then("I should see the score", async ({ page }) => {
  await expect(page.locator("#scoreDisplay")).toBeVisible();
});
