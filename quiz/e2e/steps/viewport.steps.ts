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
  // JavaScript zoom 適用後の body の視覚的な高さがビューポートを超えないことを確認
  const bodyHeight = await page.evaluate(
    () => document.body.getBoundingClientRect().height,
  );
  expect(bodyHeight).toBeLessThanOrEqual(viewportHeight);
});

// html 要素の zoom 値が期待値と一致することを確認（1920×1080 標準基準のスケーリング検証）
Then("the html zoom should be {float}", async ({ page }, expectedZoom: number) => {
  const zoom = await page.evaluate(
    () => parseFloat(document.documentElement.style.zoom) || 1,
  );
  expect(zoom).toBeCloseTo(expectedZoom, 4);
});

// html 要素の zoom 値が期待値に近い（許容誤差 0.01）ことを確認
Then("the html zoom should be approximately {float}", async ({ page }, expectedZoom: number) => {
  const zoom = await page.evaluate(
    () => parseFloat(document.documentElement.style.zoom) || 1,
  );
  expect(zoom).toBeCloseTo(expectedZoom, 2);
});
