/**
 * App コンポーネントのテスト。
 *
 * `<App />` は React 移行後のルートコンポーネントで、以下を担う：
 *
 * 1. 旧 index.html のボディマークアップ全体を JSX として描画する
 * 2. `useEffect` 内で props で受け取った `bootApp` コールバックを 1 度だけ呼ぶ
 *
 * 本テストは以下を検証する：
 *
 * - `<App />` がエラーなくレンダリングされる
 * - DOM 要素が揃った状態でマウントすると `bootApp` が呼ばれる
 * - StrictMode の二重マウントでも 1 度しか呼ばれない
 * - 既存コントローラ群（QuizApp 配下）が依存する主要 ID が描画される
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { kanjiCanvasMock } from "./quizApp/testHelpers";
import { App } from "./App";

// React 19 + jsdom + createRoot で `act()` を使うために必要な環境フラグ。
// 設定しないと "The current testing environment is not configured to support act(...)" が
// 警告として出力される（テストは pass するが標準エラーがノイズになる）。
// 参考: https://react.dev/reference/react/act#error-the-current-testing-environment-is-not-configured-to-support-act
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("App コンポーネント", () => {
  let root: Root | null = null;
  let container: HTMLElement | null = null;
  let bootApp: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // App は完全なボディマークアップを描画するため、setupMinimalDom() は使わない。
    // 重複 ID が container 外に存在すると jsdom のスコープ querySelector が混乱する。
    document.body.innerHTML = "";
    bootApp = vi.fn();
    kanjiCanvasMock.init.mockClear();
    container = document.createElement("div");
    container.id = "react-test-root";
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container?.remove();
  });

  it("エラーなくレンダリングできる", () => {
    expect(() => {
      act(() => {
        root = createRoot(container!);
        root.render(<App bootApp={bootApp} />);
      });
    }).not.toThrow();
  });

  it("マウント時に bootApp が呼ばれる", () => {
    act(() => {
      root = createRoot(container!);
      root.render(<App bootApp={bootApp} />);
    });
    expect(bootApp).toHaveBeenCalledTimes(1);
  });

  it("StrictMode の二重マウントでも bootApp は 1 度しか呼ばれない", () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <StrictMode>
          <App bootApp={bootApp} />
        </StrictMode>,
      );
    });
    expect(bootApp).toHaveBeenCalledTimes(1);
  });

  // 既存コントローラ群（QuizApp 配下）が `getElementById` 経由で参照する
  // 主要 ID が必ず描画されていることを検証する。
  // ID が欠けると vanilla 実装が動作しないため、移行レグレッションを防ぐ。
  it("既存コントローラが依存する主要 ID をすべて描画する", () => {
    act(() => {
      root = createRoot(container!);
      root.render(<App bootApp={bootApp} />);
    });
    const requiredIds = [
      // ヘッダー / ユーザー / アバター
      // supportBtn は tabsBuilder が動的に描画するため静的 ID リストから除外
      "headerUserName",
      "headerUserEdit",
      "headerUserNameInput",
      "headerUserNameSaveBtn",
      "headerUserAvatar",
      "headerUserAvatarImg",
      "headerUserAvatarPlaceholder",
      "avatarCropDialog",
      "avatarCropPreview",
      "avatarCropPreviewWrap",
      "avatarCropPreviewPlaceholder",
      "avatarCropZoom",
      "avatarCropConfirmBtn",
      "avatarCropCancelBtn",
      "headerUserAvatarInput",
      // スタート画面ヘッダー
      "startScreen",
      "titleBtn",
      "headerTodayDate",
      "reloadBtn",
      "adminMenuBtn",
      // カテゴリパネル
      "subjectContent",
      "categoryListTitle",
      "filterStatusAll",
      "filterStatusUnlearned",
      "filterStatusStudying",
      "filterStatusLearned",
      "allSubjectPanelTitle",
      "overallDateNav",
      "activityDateDisplay",
      "categoryControls",
      "categoryList",
      // インナータブ
      "panelTab-guide",
      "panelTab-quiz",
      "panelTab-questions",
      "panelTab-history",
      // クイズモードパネル
      "quizModePanel",
      "statsInfo",
      "startRandomBtn",
      "markLearnedBtn",
      // 解説 / 履歴 / 問題一覧パネル
      "guideContent",
      "guidePanelFrame",
      "guideNoContent",
      "historyContent",
      "historyList",
      "questionListContent",
      "questionListFilterAll",
      "questionListFilterUnlearned",
      "questionListFilterLearned",
      "questionListFilterCount",
      "questionListBody",
      // 進度詳細パネル
      "progressDetailPanel",
      "progressDetailCloseBtn",
      "progressDetailTab-grade",
      "progressDetailTab-category",
      "progressDetailTab-matrix",
      "progressStatusAllBtn",
      "progressStatusUnlearnedBtn",
      "progressStatusStudyingBtn",
      "progressStatusLearnedBtn",
      "progressDetailContent",
      // 総合タブサマリ
      "overallSummaryPanel",
      "overallTab-learned",
      "overallTab-share",
      "overallLearnedPanel",
      "overallActivityDateLabel",
      "overallSubjectStatusSummary",
      "todayActivityContent",
      "overallSharePanel",
      "shareSummaryText",
      "copySummaryBtn",
      "openShareUrlBtn",
      "shareUrlDisplayBtn",
      "shareUrlEditArea",
      "shareUrlInput",
      "saveShareUrlBtn",
      // 管理タブ
      "adminContent",
      "mobileBackBtn",
      "selectedUnitInfo",
      // ノート外下部行
      "githubBtn",
      "fontSizeBtns",
      // クイズ画面
      "quizScreen",
      "progressFill",
      "questionNumber",
      "topicName",
      "questionText",
      "speakBtn",
      "choicesContainer",
      "answerFeedback",
      "feedbackResult",
      "feedbackExplanation",
      "prevBtn",
      "nextBtn",
      "submitBtn",
      // ノートパネル
      "notesMemoContent",
      "notesTitle",
      "clearNotesBtn",
      "eraserBtn",
      "penSizeSelect",
      "penColorSelect",
      "cancelQuizBtn",
      "notesCanvas",
      // 漢字入力エリア
      "kanjiInputArea",
      "kanjiInputBody",
      "kanjiCanvas",
      "kanjiDeleteLastBtn",
      "kanjiEraseBtn",
      "kanjiToggleBtn",
      "kanjiCandidateList",
      // 結果画面
      "resultScreen",
      "resultUnitName",
      "resultMessage",
      "scoreDisplay",
      "retryAllBtn",
      "backToStartBtn",
      "resultDetails",
      // 確認ダイアログ
      "confirmDialog",
      "confirmDialogMessage",
      "confirmDialogOk",
      "confirmDialogCancel",
    ];
    const missing = requiredIds.filter((id) => container!.querySelector(`#${id}`) === null);
    expect(missing).toEqual([]);
  });
});
