/**
 * questions/ ディレクトリのデータ整合性テスト
 *
 * - manifest (index.json) の構造検証
 * - 各カテゴリファイルの構造・フォーマット検証
 * - 問題IDのグローバル一意性チェック
 * - 後方互換性チェック（旧 questions.json と同じ問題セットが存在するか）
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ─── ヘルパー型 ─────────────────────────────────────────────────────────────

interface RawQuestion {
  id: string;
  question: string;
  choices: string[];
  correct: number;
  explanation: string;
}

interface QuestionFile {
  subject: string;
  subjectName: string;
  category: string;
  categoryName: string;
  questions: RawQuestion[];
}

interface QuestionsManifest {
  version: string;
  subjects: Record<string, { name: string }>;
  questionFiles: string[];
}

// ─── パス定義 ────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUESTIONS_DIR = path.join(__dirname, "..", "public", "questions");
const INDEX_FILE = path.join(QUESTIONS_DIR, "index.json");

// ─── ユーティリティ ──────────────────────────────────────────────────────────

function loadJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

function loadManifest(): QuestionsManifest {
  return loadJson<QuestionsManifest>(INDEX_FILE);
}

function loadAllQuestionFiles(manifest: QuestionsManifest): QuestionFile[] {
  return manifest.questionFiles.map((file) =>
    loadJson<QuestionFile>(path.join(QUESTIONS_DIR, file))
  );
}

// ─── テストスイート ──────────────────────────────────────────────────────────

describe("questions/index.json — マニフェスト構造", () => {
  let manifest: QuestionsManifest;

  beforeAll(() => {
    manifest = loadManifest();
  });

  test("index.json が存在する", () => {
    expect(fs.existsSync(INDEX_FILE)).toBe(true);
  });

  test("version フィールドが文字列", () => {
    expect(typeof manifest.version).toBe("string");
    expect(manifest.version.length).toBeGreaterThan(0);
  });

  test("subjects オブジェクトが存在する", () => {
    expect(manifest.subjects).toBeDefined();
    expect(typeof manifest.subjects).toBe("object");
  });

  test("subjects の各エントリに name がある", () => {
    for (const [id, subject] of Object.entries(manifest.subjects)) {
      expect(typeof subject.name).toBe("string");
      expect(subject.name.length).toBeGreaterThan(0);
    }
  });

  test("questionFiles が配列", () => {
    expect(Array.isArray(manifest.questionFiles)).toBe(true);
    expect(manifest.questionFiles.length).toBeGreaterThan(0);
  });

  test("questionFiles の全ファイルが実際に存在する", () => {
    for (const file of manifest.questionFiles) {
      const fullPath = path.join(QUESTIONS_DIR, file);
      expect(fs.existsSync(fullPath)).toBe(true);
    }
  });
});

describe("各カテゴリファイル — スキーマ検証", () => {
  let manifest: QuestionsManifest;
  let questionFiles: QuestionFile[];

  beforeAll(() => {
    manifest = loadManifest();
    questionFiles = loadAllQuestionFiles(manifest);
  });

  test("全ファイルに subject・subjectName・category・categoryName がある", () => {
    for (const qf of questionFiles) {
      expect(typeof qf.subject).toBe("string");
      expect(typeof qf.subjectName).toBe("string");
      expect(typeof qf.category).toBe("string");
      expect(typeof qf.categoryName).toBe("string");
    }
  });

  test("全ファイルに questions 配列がある", () => {
    for (const qf of questionFiles) {
      expect(Array.isArray(qf.questions)).toBe(true);
      expect(qf.questions.length).toBeGreaterThan(0);
    }
  });

  test("全問題に必須フィールド (id, question, choices, correct, explanation) がある", () => {
    for (const qf of questionFiles) {
      for (const q of qf.questions) {
        expect(typeof q.id).toBe("string");
        expect(q.id.length).toBeGreaterThan(0);
        expect(typeof q.question).toBe("string");
        expect(q.question.length).toBeGreaterThan(0);
        expect(Array.isArray(q.choices)).toBe(true);
        expect(typeof q.correct).toBe("number");
        expect(typeof q.explanation).toBe("string");
      }
    }
  });

  test("全問題の choices がちょうど 4 つ", () => {
    for (const qf of questionFiles) {
      for (const q of qf.questions) {
        expect(q.choices).toHaveLength(4);
      }
    }
  });

  test("全問題の choices が空でない", () => {
    for (const qf of questionFiles) {
      for (const q of qf.questions) {
        for (const choice of q.choices) {
          expect(choice.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  test("correct が 0〜3 の整数", () => {
    for (const qf of questionFiles) {
      for (const q of qf.questions) {
        expect(q.correct).toBeGreaterThanOrEqual(0);
        expect(q.correct).toBeLessThanOrEqual(3);
        expect(Number.isInteger(q.correct)).toBe(true);
      }
    }
  });
});

describe("問題ID — グローバル一意性", () => {
  test("全ファイルを通じて問題IDが重複しない", () => {
    const manifest = loadManifest();
    const questionFiles = loadAllQuestionFiles(manifest);
    const ids = new Set<string>();
    const duplicates: string[] = [];

    for (const qf of questionFiles) {
      for (const q of qf.questions) {
        if (ids.has(q.id)) {
          duplicates.push(q.id);
        }
        ids.add(q.id);
      }
    }

    expect(duplicates).toHaveLength(0);
  });
});

describe("データ統計 — 問題数チェック", () => {
  let manifest: QuestionsManifest;
  let questionFiles: QuestionFile[];

  beforeAll(() => {
    manifest = loadManifest();
    questionFiles = loadAllQuestionFiles(manifest);
  });

  test("英語の問題が 1 件以上ある", () => {
    const englishQuestions = questionFiles
      .filter((qf) => qf.subject === "english")
      .flatMap((qf) => qf.questions);
    expect(englishQuestions.length).toBeGreaterThan(0);
  });

  test("数学の問題が 1 件以上ある", () => {
    const mathQuestions = questionFiles
      .filter((qf) => qf.subject === "math")
      .flatMap((qf) => qf.questions);
    expect(mathQuestions.length).toBeGreaterThan(0);
  });

  test("全問題数が manifest の subjects に記載された教科を網羅している", () => {
    const subjectsInManifest = new Set(Object.keys(manifest.subjects));
    const subjectsInFiles = new Set(questionFiles.map((qf) => qf.subject));
    for (const subjectId of subjectsInManifest) {
      expect(subjectsInFiles.has(subjectId)).toBe(true);
    }
  });
});

describe("後方互換性 — questions.json との整合性", () => {
  const LEGACY_FILE = path.join(__dirname, "..", "questions.json");

  test("旧 questions.json が存在する場合、同じ問題IDセットを含む", () => {
    if (!fs.existsSync(LEGACY_FILE)) {
      // 旧ファイルが削除されている場合はスキップ
      return;
    }

    const legacy = loadJson<{
      subjects?: Record<string, { categories: Record<string, { questions: { id: string }[] }> }>;
      questions?: { id: string }[];
    }>(LEGACY_FILE);

    const legacyIds = new Set<string>();
    if (legacy.subjects) {
      for (const subj of Object.values(legacy.subjects)) {
        for (const cat of Object.values(subj.categories)) {
          for (const q of cat.questions) legacyIds.add(q.id);
        }
      }
    } else if (legacy.questions) {
      for (const q of legacy.questions) legacyIds.add(q.id);
    }

    const manifest = loadManifest();
    const questionFiles = loadAllQuestionFiles(manifest);
    const newIds = new Set<string>(questionFiles.flatMap((qf) => qf.questions.map((q) => q.id)));

    for (const id of legacyIds) {
      expect(newIds.has(id)).toBe(true);
    }
  });
});
