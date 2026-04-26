import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { Given, Then } = createBdd();

// ビューポートサイズを指定サイズに変更する
Given("the viewport is {int}x{int}", async ({ page }, width: number, height: number) => {
  await page.setViewportSize({ width, height });
});

// ページコンテンツが縦方向にビューポートに収まっていることを確認（スクロール不要）
Then("the page content should fit within the viewport height", async ({ page }) => {
  const viewportHeight = page.viewportSize()!.height;
  // CSS zoom 適用後の body の視覚的な高さがビューポートを超えないことを確認
  const bodyHeight = await page.evaluate(
    () => document.body.getBoundingClientRect().height,
  );
  expect(bodyHeight).toBeLessThanOrEqual(viewportHeight);
});
