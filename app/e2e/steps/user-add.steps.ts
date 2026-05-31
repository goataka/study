import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { When, Then } = createBdd();

When("ヘッダーのユーザー名をクリックする", async ({ page }) => {
  await page.locator("#headerUserName").click();
});

When("ヘッダーのアバター画像をクリックする", async ({ page }) => {
  await page.locator("#headerUserAvatar").click();
});

Then("プロフィールダイアログが表示される", async ({ page }) => {
  await expect(page.locator("#userProfileDialog")).toBeVisible();
});

Then("プロフィールダイアログが非表示になる", async ({ page }) => {
  await expect(page.locator("#userProfileDialog")).toBeHidden();
});

When("プロフィールダイアログの閉じるボタンをクリックする", async ({ page }) => {
  await page.locator("#userProfileDialog button[aria-label='閉じる']").click();
});

When("プロフィールダイアログでEscapeキーを押す", async ({ page }) => {
  await page.keyboard.press("Escape");
});

When("プロフィールダイアログの表示名をクリックする", async ({ page }) => {
  await page.locator("#userProfileDialog button:has-text('✏️')").click();
});

When("表示名入力欄に {string} を入力する", async ({ page }, name: string) => {
  await page.locator("#userProfileDialog input[placeholder='名前を入力']").fill(name);
});

When("表示名の保存ボタンをクリックする", async ({ page }) => {
  await page.locator("#userProfileDialog button:has-text('保存')").click();
});

Then("ヘッダーのユーザー名が {string} になる", async ({ page }, name: string) => {
  await expect(page.locator("#headerUserName")).toHaveText(name);
});

When("プロフィールダイアログの新しいユーザー追加ボタンをクリックする", async ({ page }) => {
  await page.locator("#userProfileDialog button:has-text('新しいユーザーを追加')").click();
});

When("新しいユーザー名入力欄に {string} を入力する", async ({ page }, name: string) => {
  await page.locator("#userProfileDialog input[placeholder='新しいユーザー名']").fill(name);
});

When("ユーザー追加の追加ボタンをクリックする", async ({ page }) => {
  await page.locator("#userProfileDialog button:has-text('追加')").click();
});

Then("ページがリロードされる", async ({ page }) => {
  // ページリロード後にスタート画面が再表示されることを確認
  await expect(page.locator("#startScreen")).toBeVisible({ timeout: 10000 });
});
