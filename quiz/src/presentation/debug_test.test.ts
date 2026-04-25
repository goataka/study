// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuizApp } from './quizApp';

const mockManifest = {
  version: "2.0.0",
  subjects: { english: { name: "英語" } },
  questionFiles: ["english/alphabet.json"],
};

const mockFileWithGuide = {
  subject: "english",
  subjectName: "英語",
  category: "alphabet",
  categoryName: "アルファベット",
  guideUrl: "../english/pronunciation/01-alphabet/guide",
  questions: Array.from({ length: 5 }, (_, i) => ({
    id: `qa${i + 1}`,
    question: `問題 ${i + 1}`,
    choices: ["ア", "イ", "ウ", "エ"],
    correct: 0,
    explanation: `解説 ${i + 1}`,
  })),
};

describe("Debug guide URL test", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("debug: check filter.category after init", async () => {
    document.body.innerHTML = `
      <h1 id="titleBtn" class="title-btn" role="button" tabindex="0">学習クイズ</h1>
      <span id="headerUserName"></span>
      <div id="startScreen" class="screen active">
        <div class="subject-tabs" role="tablist"></div>
        <div id="subjectContent">
          <div id="categoryList" class="category-list"></div>
          <div id="statsInfo"></div>
          <input type="radio" name="questionCount" value="10" checked>
          <button id="startRandomBtn">ランダム</button>
          <button id="startRetryBtn" disabled>間違えた問題</button>
          <button id="markLearnedBtn">学習済み</button>
          <button id="hideLearnedBtn" aria-pressed="false">非表示</button>
          <button id="startPracticeBtn">練習</button>
          <div class="panel-tabs" role="tablist">
            <button class="panel-tab active" data-panel="quiz" aria-selected="true" tabindex="0">クイズ</button>
            <button class="panel-tab" data-panel="guide" aria-selected="false" tabindex="-1">解説</button>
            <button class="panel-tab" data-panel="history" aria-selected="false" tabindex="-1">記録</button>
            <button class="panel-tab" data-panel="questions" aria-selected="false" tabindex="-1">問題一覧</button>
          </div>
          <div id="quizModePanel"></div>
          <div id="guideContent" class="hidden">
            <iframe id="guidePanelFrame" class="hidden"></iframe>
            <p id="guideNoContent">コンテンツなし</p>
          </div>
          <div id="historyContent" class="hidden"></div>
          <div id="questionListContent" class="hidden"></div>
        </div>
      </div>
      <div id="quizScreen" class="screen">
        <div id="questionNumber"></div>
        <div id="topicName"></div>
        <div id="progressFill" style="width:0%"></div>
        <div id="questionText"></div>
        <div id="choicesContainer"></div>
        <div id="answerFeedback" class="answer-feedback hidden"></div>
        <button id="prevBtn" disabled>前へ</button>
        <button id="nextBtn">次へ</button>
        <button id="submitBtn" disabled>提出</button>
        <a id="guideLink" class="hidden" href="#">解説</a>
      </div>
      <div id="resultScreen" class="screen">
        <div id="scoreDisplay"></div>
        <div id="resultDetails"></div>
        <button id="retryAllBtn">もう一度</button>
        <button id="retryWrongBtn">間違えた問題</button>
        <button id="backToStartBtn">スタート画面に戻る</button>
      </div>
    `;

    global.fetch = vi.fn((url: string) => {
      console.log('[DEBUG] fetch called with:', url);
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifest) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockFileWithGuide) } as Response);
    });

    const app = new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    
    // Check state after init
    const categoryItems = document.querySelectorAll('.category-item');
    console.log('[DEBUG] category items count:', categoryItems.length);
    categoryItems.forEach(item => {
      console.log('[DEBUG] category item:', (item as HTMLElement).dataset.category, (item as HTMLElement).dataset.subject);
    });

    const guideTab = document.querySelector('.panel-tab[data-panel="guide"]') as HTMLElement;
    console.log('[DEBUG] guide tab found:', guideTab !== null);
    guideTab?.click();

    const guideFrame = document.getElementById("guidePanelFrame") as HTMLIFrameElement;
    console.log('[DEBUG] guideFrame.src:', guideFrame?.src);
    console.log('[DEBUG] guideFrame.getAttribute("src"):', guideFrame?.getAttribute('src'));
    
    expect(guideFrame?.src).toContain("guide");
  });
});
