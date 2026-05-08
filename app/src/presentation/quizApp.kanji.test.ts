/**
 * QuizApp プレゼンテーション層 — KanjiCanvas（テキスト入力問題の漢字認識）仕様テスト
 *
 * 元々 quizApp.test.ts に同居していた describe ブロックを切り出したもの。
 */

// @vitest-environment jsdom

import { QuizApp } from "./quizApp";
import { kanjiCanvasMock, waitForCondition } from "./quizApp.testHelpers";

// ─── テキスト入力問題のタッチペン入力仕様 ──────────────────────────────────

const mockTextInputManifest = {
  version: "2.0.0",
  subjects: { english: { name: "英語" } },
  questionFiles: ["english/kanji.json"],
};

const mockTextInputFile = {
  subject: "english",
  subjectName: "英語",
  category: "text-practice",
  categoryName: "テキスト練習",
  questionType: "text-input",
  questions: [
    { id: "t1", question: "「やま」と入力してください", choices: ["やま"], correct: 0, explanation: "やま" },
    { id: "t2", question: "「かわ」と入力してください", choices: ["かわ"], correct: 0, explanation: "かわ" },
    { id: "t3", question: "「ひ」と入力してください", choices: ["ひ"], correct: 0, explanation: "ひ" },
    { id: "t4", question: "「つき」と入力してください", choices: ["つき"], correct: 0, explanation: "つき" },
    { id: "t5", question: "「ほし」と入力してください", choices: ["ほし"], correct: 0, explanation: "ほし" },
  ],
};

/** テキスト入力問題用のDOMセットアップ（メモエリアのnotesCanvas・KanjiCanvas含む） */
function setupTextInputDom(): void {
  document.body.innerHTML = `
    <h1 id="titleBtn" class="title-btn" role="button" tabindex="0">学習アプリ</h1>
    <span id="headerUserName"></span>
    <div id="startScreen" class="screen active">
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
      <a id="guideLink" class="hidden" href="#">解説</a>
      <div id="notesMemoContent">
        <span id="notesTitle">タッチペンで書けます</span>
        <div class="notes-controls"></div>
        <canvas id="notesCanvas"></canvas>
        <div id="kanjiInputArea" class="hidden">
          <div class="kanji-input-header">
            <span class="kanji-input-label">1文字ずつ書いてください</span>
            <div class="kanji-input-controls">
              <button id="kanjiDeleteLastBtn" type="button">↩</button>
              <button id="kanjiEraseBtn" type="button">🗑️</button>
              <button id="kanjiToggleBtn" type="button" aria-expanded="true">▲</button>
            </div>
          </div>
          <div id="kanjiInputBody" class="kanji-input-body">
            <canvas id="kanjiCanvas" width="400" height="400"></canvas>
            <div id="kanjiCandidateList"></div>
          </div>
        </div>
      </div>
    </div>
    <div id="resultScreen" class="screen">
      <div id="scoreDisplay"></div>
      <div id="resultDetails"></div>
      <button id="retryAllBtn">もう一度</button>
      <button id="retryWrongBtn">間違えた問題</button>
      <button id="backToStartBtn">スタート画面に戻る</button>
    </div>
  `;
}

describe("QuizApp — テキスト入力問題のKanjiCanvas入力仕様", () => {
  beforeEach(() => {
    setupTextInputDom();
    kanjiCanvasMock.recognize.mockReturnValue("");

    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTextInputManifest) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTextInputFile) } as Response);
    });

    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("テキスト入力問題ではメモエリアのnotesTitleが手書き入力を促すテキストに変わる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const notesTitle = document.getElementById("notesTitle");
    expect(notesTitle?.textContent).toContain("書いて");
  });

  it("テキスト入力問題ではKanjiCanvas入力エリアが表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const kanjiInputArea = document.getElementById("kanjiInputArea");
    expect(kanjiInputArea?.classList.contains("hidden")).toBe(false);
  });

  it("クイズ開始直後（ストローク前）は候補ボタンが表示されない", async () => {
    kanjiCanvasMock.recognize.mockReturnValue("や  き");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    // ストロークを描かずに確認
    const candidateBtns = document.querySelectorAll(".kanji-candidate-btn");
    expect(candidateBtns.length).toBe(0);
  });

  it("テキスト入力問題ではKanjiCanvasが初期化される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    expect(kanjiCanvasMock.init).toHaveBeenCalledWith("kanjiCanvas");
  });

  it("KanjiCanvas初期化後にstrokeColorsが空配列に設定される（書き順番号・色変化の無効化）", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    expect(kanjiCanvasMock.strokeColors).toEqual([]);
  });

  it("候補ボタンをクリックすると文字が答えの入力エリアに追加される", async () => {
    kanjiCanvasMock.recognize.mockReturnValue("や  ゆ  よ");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    // 候補を手動で描画後の認識をシミュレート
    const canvas = document.getElementById("kanjiCanvas") as HTMLCanvasElement;
    canvas.dispatchEvent(new Event("mouseup"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const candidateList = document.getElementById("kanjiCandidateList");
    const firstBtn = candidateList?.querySelector<HTMLButtonElement>(".kanji-candidate-btn");
    expect(firstBtn?.textContent).toBe("や");

    firstBtn?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const textInput = document.querySelector<HTMLInputElement>(".text-answer-input");
    expect(textInput?.value).toBe("や");
  });

  it("候補ボタンをクリックするとKanjiCanvasがクリアされる", async () => {
    kanjiCanvasMock.recognize.mockReturnValue("や  き");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const canvas = document.getElementById("kanjiCanvas") as HTMLCanvasElement;
    canvas.dispatchEvent(new Event("mouseup"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const firstBtn = document.querySelector<HTMLButtonElement>(".kanji-candidate-btn");
    firstBtn?.click();

    expect(kanjiCanvasMock.erase).toHaveBeenCalledWith("kanjiCanvas");
  });

  it("候補ボタンを複数回クリックするとテキストが追記される", async () => {
    kanjiCanvasMock.recognize.mockReturnValue("や  き");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const canvas = document.getElementById("kanjiCanvas") as HTMLCanvasElement;

    // 1文字目
    canvas.dispatchEvent(new Event("mouseup"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.querySelector<HTMLButtonElement>(".kanji-candidate-btn")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 2文字目
    canvas.dispatchEvent(new Event("mouseup"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.querySelector<HTMLButtonElement>(".kanji-candidate-btn")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const textInput = document.querySelector<HTMLInputElement>(".text-answer-input");
    expect(textInput?.value).toBe("やや");
  });

  it("候補ボタンをクリックしても回答はまだ送信されない", async () => {
    kanjiCanvasMock.recognize.mockReturnValue("や");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const canvas = document.getElementById("kanjiCanvas") as HTMLCanvasElement;
    canvas.dispatchEvent(new Event("mouseup"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.querySelector<HTMLButtonElement>(".kanji-candidate-btn")?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // 回答が登録されていないこと（フィードバックが非表示のまま）
    const feedback = document.getElementById("answerFeedback");
    expect(feedback?.classList.contains("hidden")).toBe(true);

    // テキスト入力欄が無効化されていないこと
    const textInput = document.querySelector<HTMLInputElement>(".text-answer-input");
    expect(textInput?.disabled).toBe(false);
  });

  it("ストロークがないとき認識後に候補ボタンが表示されない", async () => {
    kanjiCanvasMock.recognize.mockReturnValue("");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const canvas = document.getElementById("kanjiCanvas") as HTMLCanvasElement;
    canvas.dispatchEvent(new Event("mouseup"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const candidateBtns = document.querySelectorAll(".kanji-candidate-btn");
    expect(candidateBtns.length).toBe(0);
  });

  it("認識候補が6個以上あっても候補ボタンは5個まで表示される", async () => {
    kanjiCanvasMock.recognize.mockReturnValue("や い う え お か き");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const canvas = document.getElementById("kanjiCanvas") as HTMLCanvasElement;
    canvas.dispatchEvent(new Event("mouseup"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const candidateBtns = document.querySelectorAll(".kanji-candidate-btn");
    expect(candidateBtns.length).toBe(5);
  });

  it("↩ボタンをクリックするとKanjiCanvasの最後のストロークが削除される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    document.getElementById("kanjiDeleteLastBtn")?.click();

    expect(kanjiCanvasMock.deleteLast).toHaveBeenCalledWith("kanjiCanvas");
  });

  it("🗑️ボタンをクリックするとKanjiCanvasが全消去される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    document.getElementById("kanjiEraseBtn")?.click();

    expect(kanjiCanvasMock.erase).toHaveBeenCalledWith("kanjiCanvas");
  });

  it("回答後に次の問題へ移動するとKanjiCanvas入力エリアが再表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    // テキスト入力欄に入力して「確認する」で回答登録
    const textInput = document.querySelector<HTMLInputElement>(".text-answer-input");
    if (textInput) textInput.value = "やま";
    const submitBtn = document.querySelector<HTMLButtonElement>(".text-answer-submit-btn");
    submitBtn?.click();

    // 次の問題へ移動
    const nextBtn = document.getElementById("nextBtn") as HTMLButtonElement;
    expect(nextBtn?.disabled).toBe(false);
    nextBtn?.click();

    // 次の問題（未回答）でKanjiCanvas入力エリアが表示されていること
    const kanjiInputArea = document.getElementById("kanjiInputArea");
    expect(kanjiInputArea?.classList.contains("hidden")).toBe(false);
  });

  it("KanjiCanvasが未ロードの場合はKanjiCanvas入力エリアが非表示になりノートキャンバスが表示される", async () => {
    // KanjiCanvas グローバルを一時的に削除して未ロード状態をシミュレート
    const original = (globalThis as unknown as Record<string, unknown>).KanjiCanvas;
    delete (globalThis as unknown as Record<string, unknown>).KanjiCanvas;

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const kanjiInputArea = document.getElementById("kanjiInputArea");
    expect(kanjiInputArea?.classList.contains("hidden")).toBe(true);

    const notesCanvas = document.getElementById("notesCanvas");
    expect(notesCanvas?.classList.contains("hidden")).toBe(false);

    // 後片付け
    (globalThis as unknown as Record<string, unknown>).KanjiCanvas = original;
  });

  it("選択肢問題ではKanjiCanvas入力エリアが非表示のままで notesTitleが変わらない", async () => {
    // 選択肢問題のモックに差し替え
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifest) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockQuestionFile) } as Response);
    });

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const kanjiInputArea = document.getElementById("kanjiInputArea");
    expect(kanjiInputArea?.classList.contains("hidden")).toBe(true);

    const notesTitle = document.getElementById("notesTitle");
    expect(notesTitle?.textContent).toBe("タッチペンで書けます");
  });
  it("ひらがな問題では認識候補のうちひらがな以外が除外される", async () => {
    kanjiCanvasMock.recognize.mockReturnValue("や  山  き  川");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const canvas = document.getElementById("kanjiCanvas") as HTMLCanvasElement;
    canvas.dispatchEvent(new Event("mouseup"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const candidateBtns = document.querySelectorAll<HTMLButtonElement>(".kanji-candidate-btn");
    const candidateTexts = Array.from(candidateBtns).map((btn) => btn.textContent);
    expect(candidateTexts).toEqual(["や", "き"]);
  });

  it("英語問題（正解がラテン文字）では漢字・ひらがなの候補が除外される", async () => {
    const mockEnglishWritingFile = {
      subject: "english",
      subjectName: "英語",
      category: "english-writing",
      categoryName: "英語書き取り",
      questionType: "text-input",
      questions: [
        {
          id: "ew1",
          question: "「play」の過去形を書いてください",
          choices: ["played"],
          correct: 0,
          explanation: "played",
        },
      ],
    };
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTextInputManifest) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockEnglishWritingFile) } as Response);
    });
    kanjiCanvasMock.recognize.mockReturnValue("p  山  q  や  r");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const canvas = document.getElementById("kanjiCanvas") as HTMLCanvasElement;
    canvas.dispatchEvent(new Event("mouseup"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const candidateBtns = document.querySelectorAll<HTMLButtonElement>(".kanji-candidate-btn");
    const candidateTexts = Array.from(candidateBtns).map((btn) => btn.textContent);
    // 英語問題ではラテン文字のみ表示（漢字・ひらがなは除外）
    expect(candidateTexts).toEqual(["p", "q", "r"]);
  });

  it("漢字書き取り問題（正解が漢字）では認識候補がフィルタされず漢字も表示される", async () => {
    const mockKanjiWritingFile = {
      subject: "japanese",
      subjectName: "国語",
      category: "kanji-writing",
      categoryName: "漢字書き取り",
      questionType: "text-input",
      questions: [
        { id: "kw1", question: "「やま」を漢字で書いてください", choices: ["山"], correct: 0, explanation: "山" },
      ],
    };
    global.fetch = vi.fn((url: string) => {
      const urlStr = String(url);
      if (urlStr.includes("index.json")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockTextInputManifest) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockKanjiWritingFile) } as Response);
    });
    kanjiCanvasMock.recognize.mockReturnValue("山  川  や  き");

    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const canvas = document.getElementById("kanjiCanvas") as HTMLCanvasElement;
    canvas.dispatchEvent(new Event("mouseup"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const candidateBtns = document.querySelectorAll<HTMLButtonElement>(".kanji-candidate-btn");
    const candidateTexts = Array.from(candidateBtns).map((btn) => btn.textContent);
    // 漢字問題では全候補が表示される（フィルタされない）
    expect(candidateTexts).toEqual(["山", "川", "や", "き"]);
  });

  it("▲トグルボタンをクリックするとkanjiInputBodyが非表示になる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const toggleBtn = document.getElementById("kanjiToggleBtn");
    const inputBody = document.getElementById("kanjiInputBody");

    // クリック前は展開状態
    expect(inputBody?.classList.contains("hidden")).toBe(false);
    expect(toggleBtn?.getAttribute("aria-expanded")).toBe("true");
    expect(toggleBtn?.textContent).toBe("▲");

    // クリックで折りたたむ
    toggleBtn?.click();

    expect(inputBody?.classList.contains("hidden")).toBe(true);
    expect(toggleBtn?.getAttribute("aria-expanded")).toBe("false");
    expect(toggleBtn?.textContent).toBe("▼");
  });

  it("▼トグルボタンを再クリックするとkanjiInputBodyが再表示される", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const toggleBtn = document.getElementById("kanjiToggleBtn");
    const inputBody = document.getElementById("kanjiInputBody");

    // 一度折りたたむ
    toggleBtn?.click();
    expect(inputBody?.classList.contains("hidden")).toBe(true);

    // 再度クリックで展開
    toggleBtn?.click();
    expect(inputBody?.classList.contains("hidden")).toBe(false);
    expect(toggleBtn?.getAttribute("aria-expanded")).toBe("true");
    expect(toggleBtn?.textContent).toBe("▲");
  });

  it("次の問題へ移動するとトグルボタンが展開状態にリセットされる", async () => {
    new QuizApp();
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById("startRandomBtn")?.click();

    const toggleBtn = document.getElementById("kanjiToggleBtn");
    const inputBody = document.getElementById("kanjiInputBody");

    // 折りたたんだ状態にする
    toggleBtn?.click();
    expect(inputBody?.classList.contains("hidden")).toBe(true);

    // テキスト入力で回答して次の問題へ移動
    const textInput = document.querySelector<HTMLInputElement>(".text-answer-input");
    if (textInput) textInput.value = "やま";
    const submitBtn = document.querySelector<HTMLButtonElement>(".text-answer-submit-btn");
    submitBtn?.click();

    const nextBtn = document.getElementById("nextBtn") as HTMLButtonElement;
    nextBtn?.click();

    // 次の問題ではトグルが展開状態にリセットされている
    expect(inputBody?.classList.contains("hidden")).toBe(false);
    expect(toggleBtn?.getAttribute("aria-expanded")).toBe("true");
    expect(toggleBtn?.textContent).toBe("▲");
  });
});
