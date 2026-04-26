import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";

const { Before, Given, When, Then } = createBdd();

const STATS_LOAD_TIMEOUT = 10_000;

Given("the quiz application is loaded", async ({ page }) => {
  await page.goto(".");
  // 問題ロード完了（JS初期化完了）を示すテキストが表示されるまで待つ
  // [1-9] で先頭を非ゼロにし、\d* で2桁以上に対応（例: 全1問, 全108問）
  // 全0問はロード失敗を示すため、このパターンには一致しない
  await expect(page.locator("#statsInfo")).toContainText(/全[1-9]\d*問/, {
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

Then("the subject overview items should be visible", async ({ page }) => {
  // 総合タブの教科概要アイテムが表示されていることを確認
  const overviewItems = page.locator(".subject-overview-item");
  await expect(overviewItems.first()).toBeVisible();
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

Given("I have selected a quiz category", async ({ page }) => {
  // 「英語」タブを選択してカテゴリを1つ選択し、確認タブをクリックしてquizModePanelを表示する
  const tab = page.locator(".subject-tab").filter({ hasText: "英語" });
  await tab.click();
  await expect(tab).toHaveClass(/active/);
  const firstItem = page.locator(".category-item[data-category]").first();
  await firstItem.click();
  // 履歴がない場合は解説タブが表示されるため、確認タブを明示的にクリックする
  await page.locator("#panelTab-quiz").click();
  await expect(page.locator("#quizModePanel")).toBeVisible();
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
  // 選択肢またはテキスト入力が表示されるまで待つ
  await page.locator(".choice-label, .text-answer-input").first().waitFor({ state: "visible" });
  const isTextInput = await page.locator(".text-answer-input").isVisible();
  if (isTextInput) {
    await page.locator(".text-answer-input").fill("あ");
    await page.locator(".text-answer-submit-btn").click();
  } else {
    await page.locator(".choice-label").first().click();
  }
});

Then("the {string} button should be enabled", async ({ page }, buttonText: string) => {
  const button = page.getByRole("button", { name: buttonText });
  await expect(button).toBeEnabled();
});

When("I answer all questions", async ({ page }) => {
  // 全問題に回答する（最大20問）
  let hasNext = true;
  while (hasNext) {
    // 問題がレンダリングされるまで待つ（選択肢またはテキスト入力）
    await page.locator(".choice-label, .text-answer-input").first().waitFor({ state: "visible" });

    // テキスト入力問題か選択肢問題かで回答方法を切り替える
    const isTextInput = await page.locator(".text-answer-input").isVisible();
    if (isTextInput) {
      await page.locator(".text-answer-input").fill("あ");
      await page.locator(".text-answer-submit-btn").click();
    } else {
      await page.locator(".choice-label").first().click();
    }

    // 「次へ」ボタンが表示されていれば次の問題へ
    const submitBtn = page.locator("#submitBtn");

    const isSubmitVisible = await submitBtn.isVisible();
    if (isSubmitVisible) {
      hasNext = false;
    } else {
      await page.locator("#nextBtn").click();
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

When("I open the guide panel tab", async ({ page }) => {
  // 解説パネルタブをクリック
  await page.locator("#panelTab-guide").click();
  // 解説パネルが表示されるまで待つ
  await expect(page.locator("#guideContent")).not.toHaveClass(/hidden/);
});

Then("the guide iframe src should contain {string}", async ({ page }, text: string) => {
  // iframe の src に指定テキストが含まれていることを確認（embedded=1 クエリ付与の検証）
  const frame = page.locator("#guidePanelFrame");
  await expect(frame).not.toHaveAttribute("src", "about:blank");
  const src = await frame.getAttribute("src");
  expect(src).toContain(text);
});

When("I open the history panel", async ({ page }) => {
  await page.locator("#panelTab-history").click();
  await page.locator("#historyList").waitFor({ state: "visible" });
});

Then("the manual history record score should show {string}", async ({ page }, expected: string) => {
  const scoreEl = page.locator(".history-score").first();
  await expect(scoreEl).toHaveText(expected);
});

Then("the manual history record should have no toggle arrow", async ({ page }) => {
  await expect(page.locator(".history-toggle").first()).not.toBeAttached();
});

Then("clicking the manual history record header should not expand details", async ({ page }) => {
  const header = page.locator(".history-item-header").first();
  const detail = page.locator(".history-detail").first();
  await header.click();
  await expect(detail).toBeHidden();
});

Then("the quiz screen should have the practice-mode class", async ({ page }) => {
  await expect(page.locator("#quizScreen")).toHaveClass(/practice-mode/);
});

Then("the quiz screen should not have the practice-mode class", async ({ page }) => {
  await expect(page.locator("#quizScreen")).not.toHaveClass(/practice-mode/);
});

// ─── KanjiCanvas スタブを使ったひらがな候補フィルタの E2E 仕様 ──────────────

// @kanji-stub タグのシナリオ用: kanji-canvas.min.js をスタブに差し替えて
// window.__kanjiRecognizeResult 経由で recognize 結果を制御できるようにする。
Before({ tags: "@kanji-stub" }, async ({ page }) => {
  await page.route("**/vendor/kanji-canvas.min.js", (route) => {
    route.fulfill({
      contentType: "application/javascript",
      body: `
        window.KanjiCanvas = {
          init: function() {},
          erase: function() {},
          deleteLast: function() {},
          get strokeColors() { return this._strokeColors || []; },
          set strokeColors(v) { this._strokeColors = v; },
          recognize: function() { return window.__kanjiRecognizeResult || ''; }
        };
      `,
    });
  });
  // hiragana-patterns.js / ref-patterns.js も空スタブで返す（ロードエラー回避）
  await page.route("**/vendor/hiragana-patterns.js", (route) => {
    route.fulfill({ contentType: "application/javascript", body: "" });
  });
  await page.route("**/vendor/ref-patterns.js", (route) => {
    route.fulfill({ contentType: "application/javascript", body: "" });
  });
});

Given("I have navigated to a hiragana text-input question", async ({ page }) => {
  await page.goto(".");
  await expect(page.locator("#statsInfo")).toContainText(/全\d+問/, {
    timeout: STATS_LOAD_TIMEOUT,
  });
  // 国語タブ → 漢字（ひらがな正解の読み問題）
  const japaneseTab = page.locator(".subject-tab").filter({ hasText: "国語" });
  await japaneseTab.click();
  await expect(japaneseTab).toHaveClass(/active/);
  // 「漢字 - 小学1年 - 読み」カテゴリを選択（ひらがな正解の text-input 問題）
  const kanjiItem = page.locator(".category-item[data-category='kanji-grade1']");
  await kanjiItem.click();
  await page.locator("#panelTab-quiz").click();
  await expect(page.locator("#quizModePanel")).toBeVisible();
  await page.getByRole("button", { name: "本番" }).click();
  await expect(page.locator("#quizScreen")).toBeVisible();
  // text-input 問題が表示され KanjiCanvas 入力エリアが可視状態であることを確認
  await expect(page.locator("#kanjiInputArea")).not.toHaveClass(/hidden/);
});

When("KanjiCanvas recognizes {string} and I draw a stroke on the canvas", async ({ page }, result: string) => {
  // recognize の戻り値をスタブ経由でセット
  await page.evaluate((r: string) => {
    (window as Window & { __kanjiRecognizeResult?: string }).__kanjiRecognizeResult = r;
  }, result);
  // mouseup をディスパッチしてストローク完了をシミュレート
  await page.locator("#kanjiCanvas").dispatchEvent("mouseup");
  // 候補ボタンが描画されるまで少し待つ
  await page.waitForTimeout(200);
});

Then("only hiragana candidates should be visible in the candidate list", async ({ page }) => {
  const candidateList = page.locator("#kanjiCandidateList");
  await expect(candidateList).toBeVisible();
  // 候補ボタンが少なくとも1つ表示されている
  await expect(candidateList.locator(".kanji-candidate-btn").first()).toBeVisible();
  // 表示されているすべての候補がひらがなのみで構成されていること（\u3041-\u309F）
  const texts = await candidateList.locator(".kanji-candidate-btn").allTextContents();
  for (const text of texts) {
    expect(text).toMatch(/^[\u3041-\u309F]+$/);
  }
});

Then("non-hiragana candidates should not be visible in the candidate list", async ({ page }) => {
  const candidateList = page.locator("#kanjiCandidateList");
  // 認識結果に含まれていた漢字候補（山・川）がボタンとして表示されていないこと
  await expect(candidateList.locator(".kanji-candidate-btn", { hasText: "山" })).toHaveCount(0);
  await expect(candidateList.locator(".kanji-candidate-btn", { hasText: "川" })).toHaveCount(0);
});

When("I click the first category group header", async ({ page }) => {
  // 最初の親カテゴリグループヘッダーをクリックする
  await page.locator(".category-group-header").first().click();
});

When("I click the first category group header again", async ({ page }) => {
  // 最初の親カテゴリグループヘッダーを再度クリックする
  await page.locator(".category-group-header").first().click();
});

Then("the first category group should be collapsed", async ({ page }) => {
  // 最初のグループが折りたたまれていること
  await expect(page.locator(".category-group").first()).toHaveClass(/collapsed/);
});

Then("the first category group should be expanded", async ({ page }) => {
  // 最初のグループが展開されていること
  await expect(page.locator(".category-group").first()).not.toHaveClass(/collapsed/);
});
