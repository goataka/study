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
import { __resetScreenStoreForTests, setCurrentScreen } from "./components/screenStore";

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
    __resetScreenStoreForTests();
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
    __resetScreenStoreForTests();
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
      "appLayout",
      "tabsUserRow",
      "subjectTabs",
      "tabsUserArea",
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
      // カテゴリパネル
      "subjectContent",
      "categoryPanel",
      "startQuizPanel",
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
      "selectedUnitInfo",
      // ノート外下部行
      "githubBtn",
      "environmentSwitch",
      "fontSizeBtns",
      // クイズ画面
      "quizScreen",
      "quizLayout",
      "quizNotesColumn",
      "progressFill",
      "questionNumber",
      "topicName",
      "questionText",
      "choicesContainer",
      "answerFeedback",
      "feedbackResult",
      "feedbackExplanation",
      "prevBtn",
      "nextBtn",
      "submitBtn",
      // ノートパネル
      "notesMemoContent",
      "notesMetaAppName",
      "notesMetaSubject",
      "notesMetaDate",
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

  it("レイアウト余白とユーザー名左線の指定クラスが反映されている", () => {
    act(() => {
      root = createRoot(container!);
      root.render(<App bootApp={bootApp} />);
    });

    const startScreen = container!.querySelector("#startScreen");
    const appLayout = container!.querySelector("#appLayout");
    const startHeader = container!.querySelector("#startScreen > header");
    const subjectTabs = container!.querySelector(".subject-tabs");
    const tabsUserArea = container!.querySelector(".tabs-user-area");
    const appFooter = container!.querySelector(".app-footer");
    const fontSizeButtons = container!.querySelectorAll<HTMLButtonElement>(".font-size-btn");

    expect(startScreen?.className).toContain("px-2");
    expect(appLayout?.className).toContain("px-10");
    expect(startScreen?.className).toContain("pt-0");
    expect(startHeader?.className).toContain("pt-2");
    expect(subjectTabs?.className).toContain("px-4");
    // app-footer はフッター削除により存在しない
    expect(appFooter).toBeNull();
    expect(tabsUserArea?.className).not.toContain("border-l");
    expect(Array.from(fontSizeButtons).every((btn) => btn.className.includes("px-2 py-1"))).toBe(true);
  });

  it("タブ行に小中高学習アプリ名を表示する", () => {
    act(() => {
      root = createRoot(container!);
      root.render(<App bootApp={bootApp} />);
    });
    expect(container?.querySelector(".app-name-text")?.textContent).toContain("Open Study Text 小中高");
  });

  it("環境切り替えは現在環境を太字・非リンクで表示する", () => {
    act(() => {
      root = createRoot(container!);
      root.render(<App bootApp={bootApp} />);
    });

    const switcher = container!.querySelector("#environmentSwitch");
    expect(switcher?.querySelector("strong")?.textContent).toBe("v1");
    expect(
      Array.from(switcher?.querySelectorAll("a") ?? []).some(
        (anchor) => anchor.textContent === "rc" && anchor.getAttribute("href")?.includes("/rc") === true,
      ),
    ).toBe(true);
  });

  it("クイズ画面ではアプリ名エリアが表示され、教科名と日付エリアが教科タブ位置に表示される", () => {
    act(() => {
      root = createRoot(container!);
      root.render(<App bootApp={bootApp} />);
    });
    act(() => {
      setCurrentScreen("quiz", { history: "none" });
    });
    // アプリ名エリアが表示される
    const appNameArea = container!.querySelector(".app-name-area");
    expect(appNameArea?.classList.contains("hidden")).toBe(false);
    // 教科タブ位置に教科名と日付エリアが表示される
    const quizTabInfo = container!.querySelector(".quiz-tab-info");
    expect(quizTabInfo).not.toBeNull();
    expect(quizTabInfo?.classList.contains("hidden")).toBe(false);
    // 教科名スパンが存在する
    expect(container!.querySelector(".quiz-tab-subject")).not.toBeNull();
    // 日付エリアが存在する
    expect(container!.querySelector("#quizTabDate")).not.toBeNull();
  });

  it("screenStore の状態に応じて画面の hidden クラスが切り替わる", () => {
    act(() => {
      root = createRoot(container!);
      root.render(<App bootApp={bootApp} />);
    });

    const startScreen = container!.querySelector("#startScreen");
    const quizScreen = container!.querySelector("#quizScreen");
    const resultScreen = container!.querySelector("#resultScreen");

    expect(startScreen?.classList.contains("hidden")).toBe(false);
    expect(quizScreen?.classList.contains("hidden")).toBe(true);
    expect(resultScreen?.classList.contains("hidden")).toBe(true);

    act(() => {
      setCurrentScreen("quiz", { history: "none" });
    });
    expect(startScreen?.classList.contains("hidden")).toBe(true);
    expect(quizScreen?.classList.contains("hidden")).toBe(false);
    expect(resultScreen?.classList.contains("hidden")).toBe(true);
  });
});
