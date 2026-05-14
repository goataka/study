import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { When, Then } = createBdd();

When("URL フラグメント {string} に移動する", async ({ page }, hash: string) => {
  // URLフラグメントをセットして hashchange イベントを発火させる
  await page.evaluate((h: string) => {
    window.location.hash = h.startsWith("#") ? h.slice(1) : h;
  }, hash);
});

Then("{string} タブがアクティブになっている", async ({ page }, tabText: string) => {
  const tab = page.locator(".subject-tab").filter({ hasText: tabText });
  await expect(tab).toHaveClass(/active/);
});
