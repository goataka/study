import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";
import { waitForStatsInfoLoaded } from "../helpers/statsInfo";

const { Given, When, Then } = createBdd();

Given("教科タブで {string} を選択している", async ({ page }, subject: string) => {
  // URLハッシュで教科を指定してナビゲーション
  await page.goto(`./#subject=${subject}`);
  await waitForStatsInfoLoaded(page);
  // ハッシュが反映されていることを確認
  expect(page.url()).toContain(`#subject=${subject}`);
});

When("ヘッダーのアプリ名をクリックする", async ({ page }) => {
  await page.locator("#appNameLink").click();
  // スタート画面に遷移するまで待つ
  await expect(page.locator("#startScreen")).toBeVisible();
});

Then("URLにハッシュが含まれない", async ({ page }) => {
  // URL にフラグメント（#）が含まれないことを確認
  const url = page.url();
  const hash = new URL(url).hash;
  expect(hash).toBe("");
});

Then("ヘッダーにユーザー追加ボタンが表示されない", async ({ page }) => {
  // headerAddUserBtn が DOM に存在しないことを確認
  await expect(page.locator("#headerAddUserBtn")).toHaveCount(0);
});
