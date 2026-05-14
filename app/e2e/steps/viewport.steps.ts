import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { Given, Then } = createBdd();

// ビューポートサイズを指定サイズに変更する
Given("ビューポートを {int}x{int} に設定する", async ({ page }, width: number, height: number) => {
  await page.setViewportSize({ width, height });
});

// ページコンテンツが縦方向にビューポートに収まっていることを確認（スクロール不要）
Then("ページコンテンツがビューポートの高さに収まっている", async ({ page }) => {
  const viewportHeight = page.viewportSize()!.height;
  // JavaScript zoom 適用後の body の視覚的な高さがビューポートを超えないことを確認
  const bodyHeight = await page.evaluate(() => document.body.getBoundingClientRect().height);
  expect(bodyHeight).toBeLessThanOrEqual(viewportHeight);
});

// html 要素の transform: scale 値が期待値と一致することを確認（1920×1080 標準基準のスケーリング検証）
Then("html の scale が {float} になっている", async ({ page }, expectedScale: number) => {
  const scale = await page.evaluate(() => {
    const transform = document.documentElement.style.transform;
    const match = transform.match(/scale\(([^)]+)\)/);
    const raw = match ? parseFloat(match[1]) : NaN;
    if (!Number.isFinite(raw))
      throw new Error(`scale が有効な数値ではありません: "${document.documentElement.style.transform}"`);
    return raw;
  });
  expect(scale).toBeCloseTo(expectedScale, 4);
});

// html 要素の transform: scale 値が期待値に近い（許容誤差 0.01）ことを確認
Then("html の scale が約 {float} になっている", async ({ page }, expectedScale: number) => {
  const scale = await page.evaluate(() => {
    const transform = document.documentElement.style.transform;
    const match = transform.match(/scale\(([^)]+)\)/);
    const raw = match ? parseFloat(match[1]) : NaN;
    if (!Number.isFinite(raw))
      throw new Error(`scale が有効な数値ではありません: "${document.documentElement.style.transform}"`);
    return raw;
  });
  expect(scale).toBeCloseTo(expectedScale, 2);
});

// html 要素に scale が適用されていないことを確認（モバイル対応の検証）
Then("html の scale が適用されていない", async ({ page }) => {
  const scaleValue = await page.evaluate(() => document.documentElement.style.transform);
  expect(scaleValue).toBe("");
});
