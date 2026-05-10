/**
 * Question ドメイン — 選択肢シャッフル仕様
 */

import { shuffleChoices } from "..";
import type { Question } from "..";

describe("shuffleChoices — 選択肢シャッフル仕様", () => {
  const question: Question = {
    id: "6756157d-941a-52e6-8656-21d76f08e7ad",
    question: "テスト問題",
    choices: ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
    correct: 0,
    explanation: "解説",
    subject: "test",
    subjectName: "テスト",
    category: "test-cat",
    categoryName: "テストカテゴリ",
  };

  it("元の問題を変更せず、同じ要素数の選択肢を返す", () => {
    const originalChoices = [...question.choices];
    const shuffled = shuffleChoices(question);
    expect(shuffled).not.toBe(question);
    expect(question.choices).toEqual(originalChoices);
    expect(shuffled.choices).toHaveLength(question.choices.length);
  });

  it("すべての選択肢が保持される", () => {
    const shuffled = shuffleChoices(question);
    expect(shuffled.choices).toHaveLength(4);
    // すべての元の選択肢が含まれているか確認
    for (const choice of question.choices) {
      expect(shuffled.choices).toContain(choice);
    }
  });

  it("正解のインデックスが正しく更新される", () => {
    const shuffled = shuffleChoices(question);
    // シャッフル後も正解の選択肢は元の正解と同じ内容であるべき
    const originalCorrectChoice = question.choices[question.correct];
    const shuffledCorrectChoice = shuffled.choices[shuffled.correct];
    expect(shuffledCorrectChoice).toBe(originalCorrectChoice);
  });

  it("同じIDの問題は常に同じシャッフル結果を返す（決定論的）", () => {
    const shuffled1 = shuffleChoices(question);
    const shuffled2 = shuffleChoices(question);
    expect(shuffled1.choices).toEqual(shuffled2.choices);
    expect(shuffled1.correct).toBe(shuffled2.correct);
  });

  it("異なるIDの問題は異なるシャッフル結果を返す", () => {
    const question2 = { ...question, id: "a7952725-0fe5-59e7-82ba-f8dbba207d0d" };
    const shuffled1 = shuffleChoices(question);
    const shuffled2 = shuffleChoices(question2);
    // 異なるIDでは、choices または correct の少なくとも一方が変わることを確認する
    const isSameChoices = shuffled1.choices.every((choice, index) => choice === shuffled2.choices[index]);
    const isSameCorrect = shuffled1.correct === shuffled2.correct;
    expect(isSameChoices && isSameCorrect).toBe(false);
  });

  it("正解が最後の位置にある場合も正しくシャッフルされる", () => {
    const q = { ...question, correct: 3 };
    const shuffled = shuffleChoices(q);
    const originalCorrectChoice = q.choices[q.correct];
    const shuffledCorrectChoice = shuffled.choices[shuffled.correct];
    expect(shuffledCorrectChoice).toBe(originalCorrectChoice);
  });
});

describe("shuffleChoices — text-input 問題のスキップ仕様", () => {
  it("text-input 問題はシャッフルせずにそのまま返す", () => {
    const q: Question = {
      id: "36aa8c8e-7b4d-5830-9559-5a8c82c0fb7d",
      correct: 0,
      explanation: "解説",
      subject: "japanese",
      subjectName: "国語",
      category: "kanji-grade1",
      categoryName: "漢字（小学1年）",
      questionType: "text-input",
    };
    const result = shuffleChoices(q);
    expect(result).toBe(q); // 同一オブジェクトを返すこと
  });
});
