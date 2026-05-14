import { createBdd } from "playwright-bdd";
import { expect } from "@playwright/test";
import { waitForStatsInfoLoaded } from "../helpers/statsInfo";

const { Before, Given, When, Then } = createBdd();

Given("クイズアプリが読み込まれている", async ({ page }) => {
  await page.goto(".");
  // 問題ロード完了（JS初期化完了）を示すテキストが表示されるまで待つ
  await waitForStatsInfoLoaded(page);
});

Then("スタート画面が表示される", async ({ page }) => {
  await expect(page.locator("#startScreen")).toBeVisible();
});

Then("クイズタイトルが {string} である", async ({ page }, title: string) => {
  await expect(page.locator("h1")).toHaveText(title);
});

Then("クイズタイトルに {string} が含まれる", async ({ page }, title: string) => {
  // アプリ名はタブ行の左側 .app-name-text に表示される
  await expect(page.locator(".app-name-text")).toContainText(title);
});

When("{string} タブをクリックする", async ({ page }, tabText: string) => {
  // タブボタンをクリック
  const tab = page.locator(".subject-tab").filter({ hasText: tabText });
  await tab.click();
  // タブがアクティブになるまで待つ
  await expect(tab).toHaveClass(/active/);
});

Then("ヘッダーが表示されている", async ({ page }) => {
  // スタート画面のヘッダーが表示されていることを確認（#startScreen にスコープを絞る）
  const header = page.locator("#startScreen header");
  await expect(header).toBeVisible();

  // ヘッダーがビューポート内に完全に収まっていることを確認
  const viewportSize = page.viewportSize();
  const headerBox = await header.boundingBox();
  expect(headerBox).not.toBeNull();
  expect(headerBox!.y).toBeGreaterThanOrEqual(0);
  expect(headerBox!.y + headerBox!.height).toBeLessThanOrEqual(viewportSize!.height);
});

Then("クイズパネルが表示されたまま", async ({ page }) => {
  // クイズパネルが表示されていることを確認（Shadow DOM piercing による重複を避けるため first() を使用）
  const quizPanel = page.locator(".quiz-panel").first();
  await expect(quizPanel).toBeVisible();

  // クイズパネルがビューポート内に完全に収まっていることを確認
  const viewportSize = page.viewportSize();
  const panelBox = await quizPanel.boundingBox();
  expect(panelBox).not.toBeNull();
  expect(panelBox!.y).toBeGreaterThanOrEqual(0);
  expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(viewportSize!.height);
});

Then("単元一覧が表示される", async ({ page }) => {
  // カテゴリリストが表示されていることを確認
  const categoryList = page.locator("#categoryList");
  await expect(categoryList).toBeVisible();
});

Then("教科概要アイテムが表示される", async ({ page }) => {
  // 総合タブの教科概要アイテムが表示されていることを確認
  const overviewItems = page.locator(".subject-overview-item");
  await expect(overviewItems.first()).toBeVisible();
});

Then("クイズパネルが表示される", async ({ page }) => {
  // クイズパネルが表示されていることを確認（Shadow DOM piercing による重複を避けるため first() を使用）
  const quizPanel = page.locator(".quiz-panel").first();
  await expect(quizPanel).toBeVisible();
});

When("最初の単元をクリックする", async ({ page }) => {
  // 最初のカテゴリアイテムをクリックする
  const firstItem = page.locator(".category-item").first();
  await firstItem.click();
});

Given("クイズの単元を選択済みである", async ({ page }) => {
  // 「英語」タブを選択してカテゴリを1つ選択し、確認タブをクリックしてquizModePanelを表示する
  const tab = page.locator(".subject-tab").filter({ hasText: "英語" });
  await tab.click();
  await expect(tab).toHaveClass(/active/);
  const firstItem = page.locator(".category-item[data-category]").first();
  await firstItem.click();
  // 履歴がない場合は解説タブが表示されるため、確認タブを明示的にクリックする
  // Shadow DOM を piercing して重複 ID が出る場合があるため first() で絞り込む
  await page.locator("#panelTab-quiz").first().click();
  await expect(page.locator("#quizModePanel").first()).toBeVisible();
});

When("{string} ボタンをクリックする", async ({ page }, buttonText: string) => {
  await page.getByRole("button", { name: buttonText, exact: true }).click();
});

When("ダイアログを確認する", async ({ page }) => {
  await page.locator("#confirmDialogOk").click();
  await expect(page.locator("#confirmDialog")).toBeHidden();
});

Then("クイズ画面が表示される", async ({ page }) => {
  await expect(page.locator("#quizScreen")).toBeVisible();
});

Then("問題1が表示される", async ({ page }) => {
  await expect(page.locator("#questionNumber")).toHaveText(/問題 1 \//);
});

When("最初の選択肢を選ぶ", async ({ page }) => {
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

Then("{string} ボタンが有効になっている", async ({ page }, buttonText: string) => {
  const button = page.getByRole("button", { name: buttonText });
  await expect(button).toBeEnabled();
});

When("全問題に回答する", async ({ page }) => {
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

Then("{string} ボタンが表示される", async ({ page }, buttonText: string) => {
  const button = page.locator("#submitBtn");
  await expect(button).toBeVisible();
  await expect(button).toHaveText(buttonText);
});

Then("結果画面が表示される", async ({ page }) => {
  await expect(page.locator("#resultScreen")).toBeVisible();
});

Then("スコアが表示される", async ({ page }) => {
  await expect(page.locator("#scoreDisplay")).toBeVisible();
});

When("解説パネルタブを開く", async ({ page }) => {
  // 解説パネルタブをクリック
  await page.locator("#panelTab-guide").click();
  // 解説パネルが表示されるまで待つ
  // overflow-hidden 等の部分一致を避けるため文字列で完全一致チェック
  await expect(page.locator("#guideContent")).not.toHaveClass("hidden");
});

Then("解説コンテンツ div がアタッチされている", async ({ page }) => {
  // 解説コンテンツdivが解説パネルにアタッチされていることを確認（Shadow DOMからの直接DOM挿入方式に変更済み）
  const guideContent = page.locator("#guidePanelFrame .guide-content");
  await expect(guideContent).toBeAttached({ timeout: 15_000 });
});

When("実施記録パネルを開く", async ({ page }) => {
  await page.locator("#panelTab-history").click();
  await page.locator("#historyList").waitFor({ state: "visible" });
});

Then("手動記録のスコアが {string} と表示される", async ({ page }, expected: string) => {
  const scoreEl = page.locator(".history-score").first();
  await expect(scoreEl).toHaveText(expected);
});

Then("手動記録にトグル矢印がない", async ({ page }) => {
  await expect(page.locator(".history-toggle").first()).not.toBeAttached();
});

Then("手動記録のヘッダーをクリックしても詳細が展開しない", async ({ page }) => {
  const header = page.locator(".history-item-header").first();
  const detail = page.locator(".history-detail").first();
  await header.click();
  await expect(detail).toBeHidden();
});

Then("クイズ画面に practice-mode クラスが付与される", async ({ page }) => {
  await expect(page.locator("#quizScreen")).toHaveClass(/practice-mode/);
});

Then("クイズ画面に practice-mode クラスが付与されない", async ({ page }) => {
  await expect(page.locator("#quizScreen")).not.toHaveClass(/practice-mode/);
});

When("{string} フォントサイズボタンをクリックする", async ({ page }, size: string) => {
  // Shadow DOM piercing による重複を避けるため first() を使用
  await page.locator(`.font-size-btn`).filter({ hasText: size }).first().click();
});

Then("body に {string} クラスが付与されている", async ({ page }, className: string) => {
  await expect(page.locator("body")).toHaveClass(new RegExp(className));
});

Then("body から {string} クラスが除去されている", async ({ page }, className: string) => {
  await expect(page.locator("body")).not.toHaveClass(new RegExp(className));
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

Given("ひらがなのテキスト入力問題に遷移済みである", async ({ page }) => {
  await page.goto(".");
  await waitForStatsInfoLoaded(page);
  // 国語タブ → 漢字（ひらがな正解の読み問題）
  const japaneseTab = page.locator(".subject-tab").filter({ hasText: "国語" });
  await japaneseTab.click();
  await expect(japaneseTab).toHaveClass(/active/);
  // 「漢字 - 小学1年 - 読み」カテゴリを選択（ひらがな正解の text-input 問題）
  const kanjiItem = page.locator(".category-item[data-category='kanji-grade1']");
  await kanjiItem.click();
  await page.locator("#panelTab-quiz").first().click();
  await expect(page.locator("#quizModePanel").first()).toBeVisible();
  await page.getByRole("button", { name: "スタート", exact: true }).click();
  await expect(page.locator("#quizScreen")).toBeVisible();
  // text-input 問題が表示され KanjiCanvas 入力エリアが可視状態であることを確認
  await expect(page.locator("#kanjiInputArea")).not.toHaveClass(/hidden/);
});

When("KanjiCanvas が {string} を認識しキャンバスにストロークを描く", async ({ page }, result: string) => {
  // recognize の戻り値をスタブ経由でセット
  await page.evaluate((r: string) => {
    (window as Window & { __kanjiRecognizeResult?: string }).__kanjiRecognizeResult = r;
  }, result);
  // mouseup をディスパッチしてストローク完了をシミュレート
  await page.locator("#kanjiCanvas").dispatchEvent("mouseup");
  // 候補ボタンが描画されるまで少し待つ
  await page.waitForTimeout(200);
});

Then("候補一覧にひらがな候補のみが表示される", async ({ page }) => {
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

Then("ひらがな以外の候補が候補一覧に表示されない", async ({ page }) => {
  const candidateList = page.locator("#kanjiCandidateList");
  // 認識結果に含まれていた漢字候補（山・川）がボタンとして表示されていないこと
  await expect(candidateList.locator(".kanji-candidate-btn", { hasText: "山" })).toHaveCount(0);
  await expect(candidateList.locator(".kanji-candidate-btn", { hasText: "川" })).toHaveCount(0);
});

When("{string} カテゴリグループのトグルボタンをクリックする", async ({ page }, parentCatId: string) => {
  // 指定した親カテゴリの三角ボタンをクリックして折りたたみを切り替える
  await page.locator(`.category-group-header[data-parent-category="${parentCatId}"] .category-group-toggle`).click();
});

When("{string} カテゴリグループのトグルボタンを再度クリックする", async ({ page }, parentCatId: string) => {
  // 指定した親カテゴリの三角ボタンを再度クリックして折りたたみを戻す
  await page.locator(`.category-group-header[data-parent-category="${parentCatId}"] .category-group-toggle`).click();
});

Then("{string} カテゴリグループが折りたたまれている", async ({ page }, parentCatId: string) => {
  // 指定した親カテゴリのグループが折りたたまれていること
  await expect(page.locator(`.category-group[data-parent-category="${parentCatId}"]`)).toHaveClass(/collapsed/);
});

Then("{string} カテゴリグループが展開されている", async ({ page }, parentCatId: string) => {
  // 指定した親カテゴリのグループが展開されていること
  await expect(page.locator(`.category-group[data-parent-category="${parentCatId}"]`)).not.toHaveClass(/collapsed/);
});

// ─── 単元一覧の改善 (#501, #494, #495) ────────────────────────────────────────

Then("解説タブがアクティブになっている", async ({ page }) => {
  // 解説タブが有効になっていること（panelTab-guide が active クラスを持つ）
  await expect(page.locator("#panelTab-guide").first()).toHaveClass(/active/);
});

Then("いずれかのパネルタブがアクティブになっている", async ({ page }) => {
  // いずれかのパネルタブがアクティブになっていること（タブ引き継ぎ仕様）
  const activeTab = page.locator(".panel-tab.active").first();
  await expect(activeTab).toBeVisible();
});

Then("単元詳細情報が表示される", async ({ page }) => {
  // 単元詳細情報エリアが表示されていること
  const unitInfo = page.locator("#selectedUnitInfo").first();
  await expect(unitInfo).not.toHaveClass(/hidden/);
});

Then("学年フィルターボタンが表示される", async ({ page }) => {
  // 学年フィルターボタンが表示されていること
  await expect(page.locator(".grade-filter-btn").first()).toBeVisible();
});

When("{string} 学年フィルターボタンをクリックする", async ({ page }, grade: string) => {
  // 指定した学年のフィルターボタンをクリックする
  await page.locator(".grade-filter-btn", { hasText: grade }).click();
});

Then("{string} 学年のみのカテゴリが表示される", async ({ page }, gradePrefix: string) => {
  // 表示されているカテゴリアイテムの学年バッジがすべて非空かつ指定のプレフィックスで始まること
  const visibleItems = page.locator(".category-item:visible");
  const count = await visibleItems.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const gradeEl = visibleItems.nth(i).locator(".category-grade");
    const gradeText = await gradeEl.textContent();
    expect(gradeText).not.toBeNull();
    const trimmedGradeText = gradeText?.trim() ?? "";
    expect(trimmedGradeText).not.toBe("");
    expect(trimmedGradeText).toMatch(new RegExp(`^${gradePrefix}`));
  }
});

Then("{string} 学年フィルターボタンが無効状態になっている", async ({ page }, grade: string) => {
  // 指定した学年のフィルターボタンが aria-pressed="false" であること
  await expect(page.locator(".grade-filter-btn", { hasText: grade })).toHaveAttribute("aria-pressed", "false");
});

Then("カテゴリビュー切替ボタンが表示される", async ({ page }) => {
  // ビューモード切替ボタンが表示されていること
  await expect(page.locator(".category-view-toggle")).toBeVisible();
});

When("ビューモード切替ボタンをクリックする", async ({ page }) => {
  // ビューモード切替ボタンをクリックする
  await page.locator(".category-view-toggle").click();
});

Then("学年グループが単元一覧に表示される", async ({ page }) => {
  // 学年グループ（category-grade-group）が表示されていること
  await expect(page.locator(".category-grade-group").first()).toBeVisible();
});

When("最初の学年グループヘッダーをクリックする", async ({ page }) => {
  await page.locator(".category-grade-group-header").first().click();
});

Then("the generated guide page should be visible", async ({ page }) => {
  await expect(page.locator("#guidePanelFrame")).toHaveAttribute("data-loaded-url", /inline:/);
  await expect(page.locator("#guidePanelFrame")).toContainText("の解説");
});

Then("総合サマリパネルが表示される", async ({ page }) => {
  // 総合タブの活動サマリパネルが表示されていること
  await expect(page.locator("#overallSummaryPanel")).toBeVisible();
});

Then("シェアサマリテキストに {string} が含まれる", async ({ page }, text: string) => {
  // 活動サマリテキストに指定のテキストが含まれていること
  await expect(page.locator("#shareSummaryText")).toContainText(text);
});

Then("ヘッダーにサポートボタンが表示される", async ({ page }) => {
  // サポートボタン（?）がヘッダーに表示されていること
  await expect(page.locator("#supportBtn")).toBeVisible();
});

Then("サポートボタンがサポートパネルにコンテンツを表示する", async ({ page }) => {
  // サポートボタン（?）をクリックするとサポート専用パネルが表示されること
  const supportBtn = page.locator("#supportBtn");
  await supportBtn.click();
  // 解説タブではなくサポートコンテンツパネルが表示される
  await expect(page.locator("#supportContent")).toBeVisible();
  // 左列: サポートメニューリストが表示される（3項目: はじめに / マニュアル / コンテンツ）
  await expect(page.locator("nav[aria-label='サポートメニュー']")).toBeVisible();
  const menuButtons = page.locator("nav[aria-label='サポートメニュー'] button");
  await expect(menuButtons).toHaveCount(3);
  await expect(menuButtons.nth(0)).toContainText("はじめに");
  await expect(menuButtons.nth(1)).toContainText("使い方");
  await expect(menuButtons.nth(2)).toContainText("コンテンツ");
  // マニュアルをクリックするとサブタブが表示される
  await menuButtons.nth(1).click();
  const subTabs = page.locator(".support-subtab");
  await expect(subTabs.first()).toBeVisible();
  await expect(subTabs.filter({ hasText: "スタートアップガイド" })).toBeVisible();
  await expect(subTabs.filter({ hasText: "トラブルシューティング" })).toBeVisible();
});

When("{string} クイズ順を選択する", async ({ page }, order: string) => {
  // シャドウDOM内の重複を避けるため #quizModePanel にスコープを絞る
  await page.locator(`#quizModePanel input[name="quizOrder"][value="${order}"]`).check();
});

When("{string} の単元をクリックする", async ({ page }, categoryId: string) => {
  // 指定した data-category 属性を持つカテゴリアイテムをクリックする
  await page.locator(`.category-item[data-category="${categoryId}"]`).click();
});

When("確認タブをクリックする", async ({ page }) => {
  // 確認タブ（quizモード）をクリックする（Shadow DOM piercing 回避のため first() を使用）
  await page.locator("#panelTab-quiz").first().click();
});

Then("クイズモードパネルが表示される", async ({ page }) => {
  await expect(page.locator("#quizModePanel").first()).toBeVisible();
});

When("{string} 学習状態フィルターを適用する", async ({ page }, filter: string) => {
  const btnId = `filterStatus${filter.charAt(0).toUpperCase()}${filter.slice(1)}`;
  await page.locator(`#${btnId}`).click();
});

Then("学習済みの単元が単元一覧に表示される", async ({ page }) => {
  // 学習済み（.learned クラス付き）のカテゴリアイテムが少なくとも1つ表示されていること
  const learnedItems = page.locator(".category-item.learned");
  await expect(learnedItems.first()).toBeVisible();
});

When("管理メニューボタンをクリックする", async ({ page }) => {
  // 管理メニューの「更改」ボタンをクリックしてデータ管理セクションを開く
  await page.locator(".panel-menu-btn").filter({ hasText: "更改" }).click();
});

Then("管理タブコンテンツがデフォルトで表示される", async ({ page }) => {
  // 管理タブを開いた直後に更改タブバー（.admin-manage-tabs）が表示されていること（デフォルト表示）
  await expect(page.locator(".admin-manage-tabs")).toBeVisible();
});

Then("管理の初期化パネルが表示される", async ({ page }) => {
  // 「🗑️ 初期化」タブをクリックして初期化コンテンツを表示する
  await page.locator(".admin-manage-tab").filter({ hasText: "初期化" }).click();
  await expect(page.locator(".admin-reset-btn")).toBeVisible();
});

When("管理の初期化タブをクリックする", async ({ page }) => {
  // 「🗑️ 初期化」タブをクリックする
  await page.locator(".admin-manage-tab").filter({ hasText: "初期化" }).click();
});

Then("管理の初期化ボタンが表示される", async ({ page }) => {
  // 初期化タブをクリックして初期化ボタンが表示されていること
  await page.locator(".admin-manage-tab").filter({ hasText: "初期化" }).click();
  await expect(page.locator(".admin-reset-btn")).toBeVisible();
});

Then("管理のエクスポートパネルが表示される", async ({ page }) => {
  // 「📤 エクスポート」タブをクリックしてエクスポートコンテンツを表示する
  await page.locator(".admin-manage-tab").filter({ hasText: "エクスポート" }).click();
  await expect(page.locator(".admin-import-apply-btn")).toBeVisible();
});

When("管理のエクスポートタブをクリックする", async ({ page }) => {
  // 「📤 エクスポート」タブをクリックする
  await page.locator(".admin-manage-tab").filter({ hasText: "エクスポート" }).click();
});

Then("クイズのノートカラムにスタートヘッダーが表示される", async ({ page }) => {
  // クイズ画面（#quizScreen）の上部に StartHeader（header 要素）が表示されていること
  // ※ StartHeader は #quizLayout 外（全幅）に配置されている
  const quizScreen = page.locator("#quizScreen");
  const header = quizScreen.locator("header").first();
  await expect(header).toBeVisible();
  // StartHeader の教科名テキストが表示されていること
  await expect(header.locator(".header-active-subject-name")).toBeVisible();
  // 日付エリアが表示されていること
  await expect(header.locator("#headerTodayDate")).toBeVisible();
});

Then("管理の JSON ファイルダウンロードがトリガーされる", async ({ page }) => {
  // エクスポートタブをクリックしてボタンをクリックするとJSONファイルがダウンロードされること
  await page.locator(".admin-manage-tab").filter({ hasText: "エクスポート" }).click();
  const exportBtn = page.locator(".admin-import-apply-btn");
  await expect(exportBtn).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent("download"), exportBtn.click()]);
  expect(download.suggestedFilename()).toMatch(/^study-data-\d{4}-\d{2}-\d{2}\.json$/);
});
