import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { Given, When, Then } = createBdd();

const STATS_LOAD_TIMEOUT = 10_000;

Given("the quiz application is loaded", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("#statsInfo", { state: "visible", timeout: STATS_LOAD_TIMEOUT });
  // 問題データが読み込まれ、統計情報が表示されたことを確認
  await expect(page.locator("#statsInfo")).toHaveText(/全\d+問/, { timeout: STATS_LOAD_TIMEOUT });
});

Then("the start screen should be visible", async ({ page }) => {
  await expect(page.locator("#startScreen")).toBeVisible();
});

Then("the quiz title should be {string}", async ({ page }, title: string) => {
  await expect(page.locator("h1")).toHaveText(title);
});

When("I scroll the category tree", async ({ page }) => {
  // カテゴリツリーが表示されていることを確認
  const subjectTree = page.locator(".subject-tree");
  await expect(subjectTree).toBeVisible();

  // 英語・数学ノードを展開してツリーを長くする（未展開の場合のみ）
  const englishNode = subjectTree.locator('.tree-item[data-subject="english"] > .tree-node-header').first();
  if (await englishNode.isVisible()) {
    const isExpanded = await englishNode.getAttribute("aria-expanded");
    if (isExpanded !== "true") {
      await englishNode.click();
    }
  }
  const mathNode = subjectTree.locator('.tree-item[data-subject="math"] > .tree-node-header').first();
  if (await mathNode.isVisible()) {
    const isExpanded = await mathNode.getAttribute("aria-expanded");
    if (isExpanded !== "true") {
      await mathNode.click();
    }
  }

  // ノード展開後にスクロール可能になるまで待つ
  await expect
    .poll(
      async () =>
        await subjectTree.evaluate((el) => el.scrollHeight > el.clientHeight),
      { timeout: STATS_LOAD_TIMEOUT }
    )
    .toBe(true);

  const initialScrollTop = await subjectTree.evaluate((el) => el.scrollTop);

  // カテゴリツリーをスクロール
  await subjectTree.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });

  // 実際にスクロール位置が進んだことを確認
  await expect
    .poll(
      async () => await subjectTree.evaluate((el) => el.scrollTop),
      { timeout: STATS_LOAD_TIMEOUT }
    )
    .toBeGreaterThan(initialScrollTop);
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
