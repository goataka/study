/**
 * QuizApp テストスイート全体で共有する DOM セットアップ・モック・ユーティリティ。
 */

// @vitest-environment jsdom

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { __resetConfirmDialogStoreForTests } from "../components/confirmDialogStore";
import { QuizPanel } from "../components/startScreen/QuizPanel";
import { OverallSummaryPanel } from "../components/startScreen/OverallSummaryPanel";
import { ProgressDetailPanel } from "../components/startScreen/ProgressDetailPanel";
import { __resetPanelTabsStoreForTests } from "../components/startScreen/panelTabsStore";
import { __resetScreenStoreForTests, getScreenSnapshot, subscribeScreenStore } from "../components/screenStore";
import { configureQuizAppDefaultDependencies } from "../quizApp";
import { LocalStorageProgressRepository } from "../../infrastructure/localStorageProgressRepository";
import { RemoteQuestionRepository } from "../../infrastructure/remoteQuestionRepository";
import { subjectTabsContentStore } from "../components/subjectTabsContentStore";
import { categoryControlsContentStore } from "../components/categoryControlsContentStore";
import { categoryListContentStore } from "../components/categoryListContentStore";
import { selectedUnitInfoContentStore } from "../components/selectedUnitInfoContentStore";
import { choicesContentStore } from "../components/choicesContentStore";

configureQuizAppDefaultDependencies(() => ({
  progressRepo: new LocalStorageProgressRepository(),
  questionRepo: new RemoteQuestionRepository("questions"),
}));

/**
 * テスト中に作成された React ルートを追跡する。
 * DOM を置換する前にアンマウントして、孤立したサブスクリプションを防ぐ。
 */
const mountedRoots: Root[] = [];

/** 追跡している全 React ルートをアンマウントしてサブスクリプションを解放する。 */
function unmountAllTrackedRoots(): void {
  while (mountedRoots.length > 0) {
    const root = mountedRoots.pop()!;
    try {
      flushSync(() => root.unmount());
    } catch {
      // 既にデタッチされたルートのエラーを無視する
    }
  }
}

/**
 * テスト用 DOM に確認ダイアログを React マウントするヘルパー。
 * `setupMinimalDom` / `setupTabDom` から呼ばれる。
 *
 * `<ConfirmDialog>` は `useSyncExternalStore` 経由で `confirmDialogStore` を
 * 購読しているため、テスト DOM にも実際の React コンポーネントをマウントする。
 */
function mountConfirmDialog(): void {
  __resetConfirmDialogStoreForTests();
  const root = document.createElement("div");
  root.id = "confirmDialogRoot";
  document.body.appendChild(root);
  const reactRoot = createRoot(root);
  mountedRoots.push(reactRoot);
  flushSync(() => reactRoot.render(<ConfirmDialog />));
}

/**
 * テスト用 DOM にスタート画面の主要パネル群を React マウントするヘルパー。
 *
 * `<QuizPanel>` / `<OverallSummaryPanel>` / `<ProgressDetailPanel>` は
 * `panelTabsStore` やコンテンツストアを購読しているため、テスト DOM にも実際の
 * React コンポーネントをマウントする。
 */
function mountStartScreenPanels(): void {
  __resetPanelTabsStoreForTests();
  const quizMount = document.getElementById("quizPanelMount");
  if (quizMount) {
    const root = createRoot(quizMount);
    mountedRoots.push(root);
    flushSync(() => root.render(<QuizPanel />));
  }
  const overallMount = document.getElementById("overallSummaryPanelMount");
  if (overallMount) {
    const root = createRoot(overallMount);
    mountedRoots.push(root);
    flushSync(() => root.render(<OverallSummaryPanel />));
  }
  const progressMount = document.getElementById("progressDetailPanelMount");
  if (progressMount) {
    const root = createRoot(progressMount);
    mountedRoots.push(root);
    flushSync(() => root.render(<ProgressDetailPanel />));
  }
}

function mountScreenStoreDomBridge(): void {
  __resetScreenStoreForTests();
  // QuizApp 単体テストは React ツリーをマウントしないケースが多いため、
  // screenStore の状態変化を最小DOMへ反映するテスト専用ブリッジを用意する。
  const sync = (): void => {
    const current = getScreenSnapshot();
    const screens = [
      { id: "startScreen", name: "start" },
      { id: "quizScreen", name: "quiz" },
      { id: "resultScreen", name: "result" },
    ] as const;
    screens.forEach(({ id, name }) => {
      document.getElementById(id)?.classList.toggle("hidden", current !== name);
    });
    document.querySelector<HTMLElement>(".subject-tabs")?.classList.toggle("hidden", current !== "start");
    document.querySelector<HTMLElement>(".tabs-links-area")?.classList.toggle("hidden", current !== "start");
  };
  subscribeScreenStore(sync);
  sync();
}

/**
 * テスト専用ブリッジコンポーネント。
 *
 * `StartScreen` / `CategoryPanel` / `QuizScreen` / `TabsUserRow` が
 * テスト DOM でマウントされていない場合に、各コンテンツストアを購読して
 * React Portal 経由で対応 DOM 要素に描画する。
 * これにより、テストで DOM 操作（クリック等）が正しく機能する。
 */
function TestContentBridge(): React.JSX.Element {
  const subjectTabsNode = useSyncExternalStore(
    subjectTabsContentStore.subscribe,
    subjectTabsContentStore.get,
    subjectTabsContentStore.get,
  );
  const categoryControlsNode = useSyncExternalStore(
    categoryControlsContentStore.subscribe,
    categoryControlsContentStore.get,
    categoryControlsContentStore.get,
  );
  const categoryListNode = useSyncExternalStore(
    categoryListContentStore.subscribe,
    categoryListContentStore.get,
    categoryListContentStore.get,
  );
  const selectedUnitInfoNode = useSyncExternalStore(
    selectedUnitInfoContentStore.subscribe,
    selectedUnitInfoContentStore.get,
    selectedUnitInfoContentStore.get,
  );
  const choicesNode = useSyncExternalStore(
    choicesContentStore.subscribe,
    choicesContentStore.get,
    choicesContentStore.get,
  );

  const tabsEl = document.querySelector<HTMLElement>(".subject-tabs");
  const controlsEl = document.getElementById("categoryControls");
  const listEl = document.getElementById("categoryList");
  const unitInfoEl = document.getElementById("selectedUnitInfo");
  const choicesEl = document.getElementById("choicesContainer");

  return (
    <>
      {tabsEl && subjectTabsNode ? createPortal(subjectTabsNode, tabsEl) : null}
      {controlsEl && categoryControlsNode ? createPortal(categoryControlsNode, controlsEl) : null}
      {listEl && categoryListNode ? createPortal(categoryListNode, listEl) : null}
      {unitInfoEl && selectedUnitInfoNode ? createPortal(selectedUnitInfoNode, unitInfoEl) : null}
      {choicesEl && choicesNode ? createPortal(choicesNode, choicesEl) : null}
    </>
  );
}

/**
 * テスト DOM にコンテンツブリッジをマウントするヘルパー。
 * `setupMinimalDom` / `setupTabDom` から呼ばれる。
 *
 * エクスポートしてあるため、独自セットアップを行うテストファイル（adminPanel.test.tsx 等）
 * からも個別に呼び出せる。
 */
export function mountTestContentBridge(): void {
  const bridgeRoot = document.createElement("div");
  bridgeRoot.id = "testContentBridgeRoot";
  document.body.appendChild(bridgeRoot);
  const root = createRoot(bridgeRoot);
  mountedRoots.push(root);
  flushSync(() => root.render(<TestContentBridge />));
}

// KanjiCanvas グローバルのモック（jsdom 環境では kanji-canvas.min.js がロードされないため）
export const kanjiCanvasMock = {
  init: vi.fn(),
  erase: vi.fn(),
  deleteLast: vi.fn(),
  recognize: vi.fn().mockReturnValue(""),
  strokeColors: ["#bf0000", "#bf5600"],
};
(globalThis as unknown as Record<string, unknown>).KanjiCanvas = kanjiCanvasMock;

// SpeechSynthesisUtterance のモック（jsdom 環境では Web Speech API が存在しないため）
(globalThis as unknown as Record<string, unknown>).SpeechSynthesisUtterance = class SpeechSynthesisUtterance {
  text: string;
  lang: string = "";
  volume: number = 1;
  rate: number = 1;
  pitch: number = 1;
  voice: SpeechSynthesisVoice | null = null;
  constructor(text: string) {
    this.text = text;
  }
};

/**
 * 非同期処理の完了を条件ベースで待機するユーティリティ。
 * setTimeout(10ms) のような時間依存待機の代替として使用する。
 */
export async function waitForCondition(
  condition: () => boolean,
  { timeout = 500, interval = 5 }: { timeout?: number; interval?: number } = {},
): Promise<void> {
  const deadline = Date.now() + timeout;
  while (!condition()) {
    if (Date.now() >= deadline) throw new Error("waitForCondition: タイムアウト");
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

// ─── DOM スタブのセットアップ ────────────────────────────────────────────────

/** テストに必要な最小限のHTML要素を生成する */
export function setupMinimalDom(): void {
  unmountAllTrackedRoots();
  window.history.replaceState({}, "", "/");
  document.body.innerHTML = `
    <h1 id="titleBtn" class="title-btn" role="button" tabindex="0">学習アプリ</h1>
    <div id="fontSizeBtns" class="font-size-btns" role="group" aria-label="文字サイズ">
      <button class="font-size-btn active" data-size="small" aria-pressed="true">小</button>
      <button class="font-size-btn" data-size="medium" aria-pressed="false">中</button>
      <button class="font-size-btn" data-size="large" aria-pressed="false">大</button>
    </div>
    <span id="headerUserName"></span>
    <div id="startScreen" class="screen active">
      <select id="subjectFilter"><option value="all">すべての教科</option></select>
      <select id="categoryFilter"><option value="all">すべてのカテゴリ</option></select>
      <div id="statsInfo"></div>
      <input type="radio" name="questionCount" value="5">
      <input type="radio" name="questionCount" value="10" checked>
      <input type="radio" name="questionCount" value="20">
      <button id="startRandomBtn">ランダム</button>
      <button id="startRetryBtn" disabled>間違えた問題</button>
    </div>
    <div id="quizScreen" class="screen">
      <div id="questionNumber"></div>
      <div id="topicName"></div>
      <div id="progressFill" style="width:0%"></div>
      <div id="questionText"></div>
      <button id="speakBtn" class="speak-btn hidden" type="button">🔊</button>
      <div id="choicesContainer"></div>
      <div id="answerFeedback" class="answer-feedback hidden">
        <div id="feedbackResult" class="feedback-result"></div>
        <div id="feedbackExplanation" class="feedback-explanation"></div>
      </div>
      <button id="prevBtn" disabled>前へ</button>
      <button id="nextBtn">次へ</button>
      <button id="submitBtn" disabled>提出</button>
    </div>
    <div id="resultScreen" class="screen">
      <div id="resultScore"></div>
      <div id="resultDetails"></div>
      <button id="retryAllBtn">もう一度</button>
      <button id="retryWrongBtn">間違えた問題</button>
      <button id="backToStartBtn">スタート画面に戻る</button>
    </div>
  `;
  mountScreenStoreDomBridge();
  mountConfirmDialog();
  mountTestContentBridge();
}
/** タブUIを含むフルレイアウトのDOM */
export function setupTabDom(): void {
  unmountAllTrackedRoots();
  window.history.replaceState({}, "", "/");
  document.body.innerHTML = `
    <h1 id="titleBtn" class="title-btn" role="button" tabindex="0">学習アプリ</h1>
    <div id="fontSizeBtns" class="font-size-btns" role="group" aria-label="文字サイズ">
      <button class="font-size-btn active" data-size="small" aria-pressed="true">小</button>
      <button class="font-size-btn" data-size="medium" aria-pressed="false">中</button>
      <button class="font-size-btn" data-size="large" aria-pressed="false">大</button>
    </div>
    <span id="headerUserName"></span>
    <div id="startScreen" class="screen active">
      <div class="subject-tabs" role="tablist"></div>
      <div class="tabs-links-area"></div>
      <div id="subjectContent">
        <button id="filterStatusAll" class="category-status-filter-btn active" type="button" aria-pressed="true">すべて</button>
        <button id="filterStatusUnlearned" class="category-status-filter-btn" type="button" aria-pressed="false">未学習</button>
        <button id="filterStatusStudying" class="category-status-filter-btn" type="button" aria-pressed="false">学習中</button>
        <button id="filterStatusLearned" class="category-status-filter-btn" type="button" aria-pressed="false">学習済</button>
        <span id="allSubjectPanelTitle" class="hidden">📌 おすすめ単元</span>
        <div id="overallDateNav" class="hidden">
          <span id="activityDateDisplay" class="activity-date-display"></span>
        </div>
        <div id="categoryControls" class="category-controls"></div>
        <div id="categoryList" class="category-list"></div>
        <div id="selectedUnitInfo" class="selected-unit-info hidden"></div>
        <div id="quizPanelMount"></div>
        <div id="overallSummaryPanelMount"></div>
        <div id="progressDetailPanelMount"></div>
        <div id="adminContent" class="hidden admin-content-panel" role="region" aria-label="管理"></div>
      </div>
    </div>
    <div id="quizScreen" class="screen">
      <div id="questionNumber"></div>
      <div id="topicName"></div>
      <div id="progressFill" style="width:0%"></div>
      <div id="questionText"></div>
      <button id="speakBtn" class="speak-btn hidden" type="button">🔊</button>
      <div id="choicesContainer"></div>
      <button id="prevBtn" disabled>前へ</button>
      <button id="nextBtn">次へ</button>
      <button id="submitBtn" disabled>提出</button>
    </div>
    <div id="resultScreen" class="screen">
      <div id="resultUnitName" class="result-unit-name hidden"></div>
      <div id="resultScore"></div>
      <div id="resultDetails"></div>
      <button id="retryAllBtn">もう一度</button>
      <button id="retryWrongBtn">間違えた問題</button>
      <button id="backToStartBtn">スタート画面に戻る</button>
    </div>
  `;
  mountScreenStoreDomBridge();
  mountConfirmDialog();
  mountStartScreenPanels();
  mountTestContentBridge();
}

export const mockManifest = {
  version: "2.0.0",
  subjects: { english: { name: "英語" } },
  questionFiles: ["english/phonics-1.json"],
};

export const mockQuestionFile = {
  subject: "english",
  subjectName: "英語",
  category: "phonics-1",
  categoryName: "フォニックス（1文字）",
  questions: Array.from({ length: 5 }, (_, i) => ({
    id: `q${i + 1}`,
    question: `問題 ${i + 1}`,
    choices: ["ア", "イ", "ウ", "エ"],
    correct: 0,
    explanation: `解説 ${i + 1}`,
  })),
};

/** parentCategory 付き問題ファイル（文法・発音の階層付き） */
export const mockManifestWithParent = {
  version: "2.0.0",
  subjects: { english: { name: "英語" } },
  questionFiles: ["english/grammar.json", "english/phonics.json"],
};

export const mockGrammarFile = {
  subject: "english",
  subjectName: "英語",
  category: "tenses-past",
  categoryName: "過去形",
  parentCategory: "grammar",
  parentCategoryName: "文法",
  questions: Array.from({ length: 3 }, (_, i) => ({
    id: `g${i + 1}`,
    question: `文法問題 ${i + 1}`,
    choices: ["A", "B", "C", "D"],
    correct: 0,
    explanation: `解説 ${i + 1}`,
  })),
};

export const mockPhonicsFile = {
  subject: "english",
  subjectName: "英語",
  category: "phonics-1",
  categoryName: "フォニックス（1文字）",
  parentCategory: "phonics",
  parentCategoryName: "発音",
  questions: Array.from({ length: 4 }, (_, i) => ({
    id: `p${i + 1}`,
    question: `発音問題 ${i + 1}`,
    choices: ["ア", "イ", "ウ", "エ"],
    correct: 0,
    explanation: `解説 ${i + 1}`,
  })),
};

export function setupFetchMock(): void {
  global.fetch = vi.fn((url: string) => {
    const urlStr = String(url);
    if (urlStr.includes("index.json")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockManifest),
      } as Response);
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockQuestionFile),
    } as Response);
  });
}

export function setupFetchMockWithParent(): void {
  global.fetch = vi.fn((url: string) => {
    const urlStr = String(url);
    if (urlStr.includes("index.json")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockManifestWithParent),
      } as Response);
    }
    if (urlStr.includes("grammar.json")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockGrammarFile),
      } as Response);
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockPhonicsFile),
    } as Response);
  });
}

/** 3階層構造のモックデータ（トップカテゴリ付き） */
export const mockManifestWith3Levels = {
  version: "2.0.0",
  subjects: { english: { name: "英語" } },
  questionFiles: ["english/tenses.json", "english/assimilation.json"],
};

export const mockTensesFile = {
  subject: "english",
  subjectName: "英語",
  category: "tenses-past",
  categoryName: "過去形",
  topCategory: "grammar",
  topCategoryName: "文法",
  parentCategory: "verb",
  parentCategoryName: "動詞",
  questions: Array.from({ length: 3 }, (_, i) => ({
    id: `t${i + 1}`,
    question: `時制問題 ${i + 1}`,
    choices: ["A", "B", "C", "D"],
    correct: 0,
    explanation: `解説 ${i + 1}`,
  })),
};

export const mockAssimilationFile = {
  subject: "english",
  subjectName: "英語",
  category: "assimilation",
  categoryName: "アシミレーション",
  topCategory: "pronunciation",
  topCategoryName: "発音",
  parentCategory: "sound-changes",
  parentCategoryName: "音声変化",
  questions: Array.from({ length: 4 }, (_, i) => ({
    id: `a${i + 1}`,
    question: `音声変化問題 ${i + 1}`,
    choices: ["ア", "イ", "ウ", "エ"],
    correct: 0,
    explanation: `解説 ${i + 1}`,
  })),
};

export function setupFetchMockWith3Levels(): void {
  global.fetch = vi.fn((url: string) => {
    const urlStr = String(url);
    if (urlStr.includes("index.json")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockManifestWith3Levels),
      } as Response);
    }
    if (urlStr.includes("tenses.json")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockTensesFile),
      } as Response);
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockAssimilationFile),
    } as Response);
  });
}
