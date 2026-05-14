import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { When, Then } = createBdd();

When("I navigate to the hash {string}", async ({ page }, hash: string) => {
  // URLフラグメントをセットして hashchange イベントを発火させる
  await page.evaluate((h: string) => {
    window.location.hash = h.startsWith("#") ? h.slice(1) : h;
  }, hash);
});

Then("the {string} tab should be active", async ({ page }, tabText: string) => {
  const tab = page.locator(".subject-tab").filter({ hasText: tabText });
  await expect(tab).toHaveClass(/active/);
});
