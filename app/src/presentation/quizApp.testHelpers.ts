/**
 * QuizApp テストで共有する DOM スタブ・モック・ユーティリティ。
 *
 * `quizApp.test.ts` から肥大化していたセットアップを切り出したもの。
 */

// @vitest-environment jsdom

import { vi } from "vitest";

// KanjiCanvas グローバルのモック（jsdom環境では kanji-canvas.min.js がロードされないため）
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
    <div id="confirmDialog" class="confirm-dialog-overlay hidden">
      <div class="confirm-dialog">
        <p id="confirmDialogMessage"></p>
        <div class="confirm-dialog-buttons">
          <button id="confirmDialogOk">OK</button>
          <button id="confirmDialogCancel">キャンセル</button>
        </div>
      </div>
    </div>
  `;
}
/** タブUIを含むフルレイアウトのDOM */
export function setupTabDom(): void {
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
        <div class="panel-tabs" role="tablist">
          <button class="panel-tab" id="panelTab-guide" data-panel="guide" role="tab" type="button" aria-selected="false" aria-controls="guideContent" tabindex="-1">📖 解説</button>
          <button class="panel-tab" id="panelTab-questions" data-panel="questions" role="tab" type="button" aria-selected="false" aria-controls="questionListContent" tabindex="-1">📋 問題</button>
          <button class="panel-tab active" id="panelTab-quiz" data-panel="quiz" role="tab" type="button" aria-selected="true" aria-controls="quizModePanel" tabindex="0">✅ 確認</button>
          <button class="panel-tab" id="panelTab-history" data-panel="history" role="tab" type="button" aria-selected="false" aria-controls="historyContent" tabindex="-1">📊 履歴</button>
        </div>
        <div id="quizModePanel" role="tabpanel" aria-labelledby="panelTab-quiz">
          <div id="statsInfo"></div>
          <input type="radio" name="questionCount" value="5">
          <input type="radio" name="questionCount" value="10" checked>
          <input type="radio" name="questionCount" value="20">
          <button id="startRandomBtn">ランダム</button>
          <button id="startRetryBtn" disabled>間違えた問題</button>
          <button id="markLearnedBtn" disabled>学習済みにする</button>
          <input type="radio" name="quizOrder" value="straight">
          <input type="radio" name="quizOrder" value="random" checked>
          <input type="radio" name="quizLearned" value="exclude" checked>
          <input type="radio" name="quizLearned" value="include">
        </div>
        <div id="guideContent" class="hidden" role="tabpanel" aria-labelledby="panelTab-guide">
          <div id="guidePanelFrame" title="解説"></div>
          <p id="guideNoContent" class="hidden">このカテゴリには解説がありません。</p>
        </div>
        <div id="historyContent" class="hidden" role="tabpanel" aria-labelledby="panelTab-history">
          <div id="historyList"></div>
        </div>
        <div id="questionListContent" class="hidden" role="tabpanel" aria-labelledby="panelTab-questions">
          <button id="questionListFilterAll" class="question-list-filter-btn" type="button">すべて</button>
          <button id="questionListFilterUnlearned" class="question-list-filter-btn active" type="button">未学習</button>
          <button id="questionListFilterLearned" class="question-list-filter-btn" type="button">学習済み</button>
          <span id="questionListFilterCount" class="question-list-filter-count"></span>
          <div id="questionListBody"></div>
        </div>
        <div id="overallSummaryPanel" class="hidden">
          <div class="overall-panel-tabs" role="tablist">
            <button class="panel-tab active" id="overallTab-learned" data-overall-panel="learned" role="tab" type="button" aria-selected="true">🎓 学習状況</button>
            <button class="panel-tab" id="overallTab-share" data-overall-panel="share" role="tab" type="button" aria-selected="false">📤 シェア</button>
          </div>
          <div id="overallLearnedPanel" class="overall-activity-panel">
            <div class="overall-activity-date-row">
              <span id="overallActivityDateLabel" class="overall-activity-date"></span>
            </div>
            <div id="overallSubjectStatusSummary" class="overall-subject-status-summary"></div>
            <div id="todayActivityContent"></div>
          </div>
          <div id="overallSharePanel" class="overall-activity-panel hidden">
            <div id="shareSummaryText"></div>
            <div class="share-actions-row">
              <button id="copySummaryBtn" type="button">📋 コピー</button>
              <button id="openShareUrlBtn" class="hidden" type="button">📤 共有</button>
              <div class="share-url-inline">
                <button id="shareUrlDisplayBtn" type="button">URLを設定</button>
                <div id="shareUrlEditArea" class="hidden">
                  <input type="url" id="shareUrlInput">
                  <button id="saveShareUrlBtn" type="button" aria-label="保存">✓</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div id="progressDetailPanel" class="hidden">
          <div class="panel-tabs progress-detail-tabs" role="tablist">
            <button class="panel-tab active" id="progressDetailTab-matrix" data-progress-detail-panel="matrix" role="tab" type="button" aria-selected="true" aria-controls="progressDetailContent" tabindex="0">📊 マトリクス</button>
            <button class="panel-tab" id="progressDetailTab-grade" data-progress-detail-panel="grade" role="tab" type="button" aria-selected="false" aria-controls="progressDetailContent" tabindex="-1">🎓 学年別</button>
            <button class="panel-tab" id="progressDetailTab-category" data-progress-detail-panel="category" role="tab" type="button" aria-selected="false" aria-controls="progressDetailContent" tabindex="-1">📁 カテゴリ別</button>
          </div>
          <div id="progressDetailContent" class="progress-detail-content" role="tabpanel" aria-labelledby="progressDetailTab-matrix"></div>
        </div>
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
    <div id="confirmDialog" class="confirm-dialog-overlay hidden">
      <div class="confirm-dialog">
        <p id="confirmDialogMessage"></p>
        <div class="confirm-dialog-buttons">
          <button id="confirmDialogOk">OK</button>
          <button id="confirmDialogCancel">キャンセル</button>
        </div>
      </div>
    </div>
  `;
}

// ─── fetch モック（問題JSONの読み込みを回避） ─────────────────────────────

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
