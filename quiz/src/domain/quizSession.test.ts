/**
 * QuizSession 集約 — 仕様テスト
 */

import { QuizSession } from "./quizSession";
import type { Question } from "./question";

const makeQuestion = (id: string, correct = 0): Question => ({
  id,
  question: `Question ${id}`,
  choices: ["A", "B", "C", "D"],
  correct,
  explanation: `Explanation ${id}`,
  subject: "test",
  subjectName: "テスト",
  category: "cat",
  categoryName: "カテゴリ",
});

const q1 = makeQuestion("q1", 0);
const q2 = makeQuestion("q2", 1);
const q3 = makeQuestion("q3", 2);

describe("QuizSession — セッション初期化仕様", () => {
  it("少なくとも1問が必要", () => {
    expect(() => new QuizSession([])).toThrow("at least one question");
  });

  it("問題リストが正しく設定される", () => {
    const session = new QuizSession([q1, q2]);
    expect(session.questions).toHaveLength(2);
    expect(session.totalCount).toBe(2);
  });

  it("最初の問題インデックスは0", () => {
    const session = new QuizSession([q1, q2]);
    expect(session.currentIndex).toBe(0);
  });
});

describe("QuizSession — 回答仕様", () => {
  it("有効な回答を記録できる", () => {
    const session = new QuizSession([q1, q2]);
    session.selectAnswer(0, 2);
    expect(session.getAnswer(0)).toBe(2);
  });

  it("無効な問題インデックスはエラー", () => {
    const session = new QuizSession([q1]);
    expect(() => session.selectAnswer(5, 0)).toThrow("Invalid question index");
  });

  it("無効な選択肢インデックスはエラー", () => {
    const session = new QuizSession([q1]);
    expect(() => session.selectAnswer(0, 4)).toThrow("Invalid choice index");
  });
});

describe("QuizSession — ナビゲーション仕様", () => {
  it("次の問題に進める", () => {
    const session = new QuizSession([q1, q2, q3]);
    session.navigate(1);
    expect(session.currentIndex).toBe(1);
  });

  it("先頭より前には進めない", () => {
    const session = new QuizSession([q1, q2]);
    expect(() => session.navigate(-1)).toThrow("Cannot navigate to index -1");
  });

  it("末尾より後には進めない", () => {
    const session = new QuizSession([q1, q2]);
    session.navigate(1);
    expect(() => session.navigate(1)).toThrow("Cannot navigate to index 2");
  });
});

describe("QuizSession — 採点仕様", () => {
  it("全問回答前は採点できない（canSubmit = false）", () => {
    const session = new QuizSession([q1, q2]);
    session.selectAnswer(0, 0);
    expect(session.canSubmit()).toBe(false);
  });

  it("全問回答後は採点できる（canSubmit = true）", () => {
    const session = new QuizSession([q1, q2]);
    session.selectAnswer(0, 0);
    session.selectAnswer(1, 1);
    expect(session.canSubmit()).toBe(true);
  });

  it("正解数を正確に計算する", () => {
    const session = new QuizSession([q1, q2, q3]);
    // シャッフル後の正解インデックスを使用
    session.selectAnswer(0, session.questions[0]!.correct); // correct
    // 確実に不正解を選ぶ（正解と異なるインデックス）
    const wrongIndex1 = session.questions[1]!.correct === 0 ? 1 : 0;
    session.selectAnswer(1, wrongIndex1); // wrong
    session.selectAnswer(2, session.questions[2]!.correct); // correct
    expect(session.score()).toBe(2);
  });

  it("結果に各問の正誤が含まれる", () => {
    const session = new QuizSession([q1, q2]);
    // シャッフル後の正解インデックスを取得して使用
    session.selectAnswer(0, session.questions[0]!.correct); // correct
    // 確実に不正解を選ぶ（正解と異なるインデックス）
    const wrongIndex = session.questions[1]!.correct === 0 ? 1 : 0;
    session.selectAnswer(1, wrongIndex); // wrong
    const results = session.getResults();
    expect(results[0]!.isCorrect).toBe(true);
    expect(results[1]!.isCorrect).toBe(false);
  });
});

describe("QuizSession.pickRandom — ランダム選択仕様", () => {
  const questions = Array.from({ length: 20 }, (_, i) => makeQuestion(`q${i}`));

  it("指定した件数を返す", () => {
    const picked = QuizSession.pickRandom(questions, 10);
    expect(picked).toHaveLength(10);
  });

  it("問題数より多くは返さない", () => {
    const picked = QuizSession.pickRandom(questions, 100);
    expect(picked).toHaveLength(20);
  });
});

describe("QuizSession.filter — フィルター仕様", () => {
  const qs: Question[] = [
    { ...q1, subject: "english", category: "phonics" },
    { ...q2, subject: "english", category: "linking" },
    { ...q3, subject: "math", category: "addition" },
  ];

  it("教科でフィルターできる", () => {
    const filtered = QuizSession.filter(qs, { subject: "english", category: "all" });
    expect(filtered).toHaveLength(2);
  });

  it("カテゴリでフィルターできる", () => {
    const filtered = QuizSession.filter(qs, { subject: "all", category: "phonics" });
    expect(filtered).toHaveLength(1);
  });

  it("all を指定すると全件返る", () => {
    const filtered = QuizSession.filter(qs, { subject: "all", category: "all" });
    expect(filtered).toHaveLength(3);
  });
});
