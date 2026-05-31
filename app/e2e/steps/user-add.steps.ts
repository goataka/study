import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { When, Then } = createBdd();

Then("ヘッダーにユーザー追加ボタンが表示される", async ({ page }) => {
  await expect(page.locator("#headerAddUserBtn")).toBeVisible();
});

When("ヘッダーのユーザー追加ボタンをクリックする", async ({ page }) => {
  await page.locator("#headerAddUserBtn").click();
});

Then("ユーザー名入力欄が表示される", async ({ page }) => {
  await expect(page.locator("#headerAddUserEdit")).toBeVisible();
  await expect(page.locator("#headerAddUserInput")).toBeVisible();
});

Then("ユーザー追加ボタンが非表示になる", async ({ page }) => {
  await expect(page.locator("#headerAddUserBtn")).toBeHidden();
});

When("ユーザー名入力欄でEscapeキーを押す", async ({ page }) => {
  await page.locator("#headerAddUserInput").press("Escape");
});

Then("ユーザー追加ボタンが表示される", async ({ page }) => {
  await expect(page.locator("#headerAddUserBtn")).toBeVisible();
});

Then("ユーザー名入力欄が非表示になる", async ({ page }) => {
  await expect(page.locator("#headerAddUserEdit")).toBeHidden();
});

When("ユーザー名入力欄に {string} を入力する", async ({ page }, name: string) => {
  await page.locator("#headerAddUserInput").fill(name);
});

When("ユーザー追加の保存ボタンをクリックする", async ({ page }) => {
  await page.locator("#headerAddUserSaveBtn").click();
});

Then("ページがリロードされる", async ({ page }) => {
  // ページリロード後にスタート画面が再表示されることを確認
  await expect(page.locator("#startScreen")).toBeVisible({ timeout: 10000 });
});
