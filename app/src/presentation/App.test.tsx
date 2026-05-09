/**
 * App コンポーネントのテスト。
 *
 * `<App />` は React 移行後のルートコンポーネントで、以下を担う：
 *
 * 1. 旧 index.html のボディマークアップ全体を JSX として描画する
 * 2. `useEffect` 内で `QuizApp` を 1 度だけ起動する
 *
 * 本テストは以下を検証する：
 *
 * - `<App />` がエラーなくレンダリングされる
 * - DOM 要素が揃った状態でマウントすると `QuizApp` が起動される
 * - StrictMode の二重マウントでも 1 度しか起動しない
 * - 既存コントローラ群（QuizApp 配下）が依存する主要 ID が描画される
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { kanjiCanvasMock } from "./quizApp.testHelpers";

// React 19 + jsdom + createRoot で `act()` を使うために必要な環境フラグ。
// 設定しないと "The current testing environment is not configured to support act(...)" が
// 警告として出力される（テストは pass するが標準エラーがノイズになる）。
// 参考: https://react.dev/reference/react/act#error-the-current-testing-environment-is-not-configured-to-support-act
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// QuizApp と IndexedDBProgressRepository をモックして、
// React 起動ライフサイクルだけを検証対象にする。
const quizAppCtor = vi.fn();
const indexedDbCtor = vi.fn();
vi.mock("./quizApp", () => ({
  QuizApp: class {
    constructor(...args: unknown[]) {
      quizAppCtor(...args);
    }
  },
}));
vi.mock("../infrastructure/indexedDBProgressRepository", () => ({
  IndexedDBProgressRepository: class {
    constructor() {
      indexedDbCtor();
    }
  },
}));

// モック宣言が hoist されるため、import は mock 宣言の後に動的読み込みする。
async function importApp(): Promise<typeof import("./App").App> {
  const mod = await import("./App");
  return mod.App;
}

describe("App コンポーネント", () => {
  let root: Root | null = null;
  let container: HTMLElement | null = null;

  beforeEach(() => {
    // App は完全なボディマークアップを描画するため、setupMinimalDom() は使わない。
    // 重複 ID が container 外に存在すると jsdom のスコープ querySelector が混乱する。
    document.body.innerHTML = "";
    quizAppCtor.mockClear();
    indexedDbCtor.mockClear();
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

  it("エラーなくレンダリングできる", async () => {
    const App = await importApp();
    expect(() => {
      act(() => {
        root = createRoot(container!);
        root.render(<App />);
      });
    }).not.toThrow();
  });

  it("マウント時に QuizApp を起動する", async () => {
    const App = await importApp();
    act(() => {
      root = createRoot(container!);
      root.render(<App />);
    });
    expect(quizAppCtor).toHaveBeenCalledTimes(1);
    expect(indexedDbCtor).toHaveBeenCalledTimes(1);
  });

  it("StrictMode の二重マウントでも QuizApp は 1 度しか起動しない", async () => {
    const App = await importApp();
    act(() => {
      root = createRoot(container!);
      root.render(
        <StrictMode>
          <App />
        </StrictMode>,
      );
    });
    expect(quizAppCtor).toHaveBeenCalledTimes(1);
  });

  // 既存コントローラ群（QuizApp 配下）が `getElementById` 経由で参照する
  // 主要 ID が必ず描画されていることを検証する。
  // ID が欠けると vanilla 実装が動作しないため、移行レグレッションを防ぐ。
  it("既存コントローラが依存する主要 ID をすべて描画する", async () => {
    const App = await importApp();
    act(() => {
      root = createRoot(container!);
      root.render(<App />);
    });
    const requiredIds = [
      // ヘッダー / ユーザー / アバター
      "supportBtn",
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
