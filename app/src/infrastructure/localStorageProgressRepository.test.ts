/**
 * LocalStorageProgressRepository — 仕様テスト
 *
 * localStorageを使って進捗（間違えた問題IDリスト）を永続化するリポジトリの仕様を記述します。
 * DOMが必要なためjsdom環境で実行します。
 */

// @vitest-environment jsdom

import { LocalStorageProgressRepository } from "./localStorageProgressRepository";
import type { QuizRecord } from "../application/ports";

describe("LocalStorageProgressRepository — 間違えた問題ID永続化仕様", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("初回ロード時は空配列を返す", () => {
    const repo = new LocalStorageProgressRepository();
    expect(repo.loadWrongIds()).toEqual([]);
  });

  it("保存したIDリストを正しく読み込める", () => {
    const repo = new LocalStorageProgressRepository();
    repo.saveWrongIds(["q1", "q2", "q3"]);
    expect(repo.loadWrongIds()).toEqual(["q1", "q2", "q3"]);
  });

  it("空配列を保存した後は空配列を返す", () => {
    const repo = new LocalStorageProgressRepository();
    repo.saveWrongIds(["q1"]);
    repo.saveWrongIds([]);
    expect(repo.loadWrongIds()).toEqual([]);
  });

  it("上書き保存が正しく機能する", () => {
    const repo = new LocalStorageProgressRepository();
    repo.saveWrongIds(["q1", "q2"]);
    repo.saveWrongIds(["q3"]);
    expect(repo.loadWrongIds()).toEqual(["q3"]);
  });

  it("別のインスタンスからも同じデータを読み込める（永続化確認）", () => {
    const repo1 = new LocalStorageProgressRepository();
    repo1.saveWrongIds(["q1", "q2"]);

    const repo2 = new LocalStorageProgressRepository();
    expect(repo2.loadWrongIds()).toEqual(["q1", "q2"]);
  });

  it("localStorageに不正なJSONが入っていてもロード時に空配列を返す", () => {
    localStorage.setItem("wrongQuestions", "invalid json{{{");
    const repo = new LocalStorageProgressRepository();
    expect(repo.loadWrongIds()).toEqual([]);
  });
});

describe("LocalStorageProgressRepository — ユーザー名永続化仕様", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("初回ロード時はnullを返す", () => {
    const repo = new LocalStorageProgressRepository();
    expect(repo.loadUserName()).toBeNull();
  });

  it("保存したユーザー名を正しく読み込める", () => {
    const repo = new LocalStorageProgressRepository();
    repo.saveUserName("太郎");
    expect(repo.loadUserName()).toBe("太郎");
  });

  it("上書き保存が正しく機能する", () => {
    const repo = new LocalStorageProgressRepository();
    repo.saveUserName("太郎");
    repo.saveUserName("花子");
    expect(repo.loadUserName()).toBe("花子");
  });

  it("別のインスタンスからも同じデータを読み込める（永続化確認）", () => {
    const repo1 = new LocalStorageProgressRepository();
    repo1.saveUserName("次郎");

    const repo2 = new LocalStorageProgressRepository();
    expect(repo2.loadUserName()).toBe("次郎");
  });
});

describe("LocalStorageProgressRepository — 回答履歴永続化仕様", () => {
  const makeRecord = (id: string): QuizRecord => ({
    id,
    date: new Date().toISOString(),
    subject: "english",
    subjectName: "英語",
    category: "all",
    categoryName: "英語 全体",
    mode: "random",
    totalCount: 5,
    correctCount: 3,
    entries: [],
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it("初回ロード時は空配列を返す", () => {
    const repo = new LocalStorageProgressRepository();
    expect(repo.loadHistory()).toEqual([]);
  });

  it("保存した履歴を正しく読み込める", () => {
    const repo = new LocalStorageProgressRepository();
    const records = [makeRecord("r1"), makeRecord("r2")];
    repo.saveHistory(records);
    expect(repo.loadHistory()).toHaveLength(2);
    expect(repo.loadHistory()[0]!.id).toBe("r1");
  });

  it("100件を超える履歴は切り詰められる", () => {
    const repo = new LocalStorageProgressRepository();
    const records = Array.from({ length: 110 }, (_, i) => makeRecord(`r${i}`));
    repo.saveHistory(records);
    expect(repo.loadHistory()).toHaveLength(100);
  });

  it("不正なJSONが入っていてもロード時に空配列を返す", () => {
    localStorage.setItem("quizHistory", "invalid{{{");
    const repo = new LocalStorageProgressRepository();
    expect(repo.loadHistory()).toEqual([]);
  });

  it("別のインスタンスからも同じデータを読み込める（永続化確認）", () => {
    const repo1 = new LocalStorageProgressRepository();
    repo1.saveHistory([makeRecord("r1")]);

    const repo2 = new LocalStorageProgressRepository();
    expect(repo2.loadHistory()).toHaveLength(1);
    expect(repo2.loadHistory()[0]!.id).toBe("r1");
  });
});

describe("LocalStorageProgressRepository — 正解連続数永続化仕様", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("初回ロード時は空オブジェクトを返す", () => {
    const repo = new LocalStorageProgressRepository();
    expect(repo.loadCorrectStreaks()).toEqual({});
  });

  it("保存した正解連続数を正しく読み込める", () => {
    const repo = new LocalStorageProgressRepository();
    repo.saveCorrectStreaks({ q1: 1, q2: 2 });
    expect(repo.loadCorrectStreaks()).toEqual({ q1: 1, q2: 2 });
  });

  it("上書き保存が正しく機能する", () => {
    const repo = new LocalStorageProgressRepository();
    repo.saveCorrectStreaks({ q1: 1 });
    repo.saveCorrectStreaks({ q1: 2 });
    expect(repo.loadCorrectStreaks()).toEqual({ q1: 2 });
  });

  it("別のインスタンスからも同じデータを読み込める（永続化確認）", () => {
    const repo1 = new LocalStorageProgressRepository();
    repo1.saveCorrectStreaks({ q1: 1, q2: 2 });

    const repo2 = new LocalStorageProgressRepository();
    expect(repo2.loadCorrectStreaks()).toEqual({ q1: 1, q2: 2 });
  });

  it("localStorageに不正なJSONが入っていてもロード時に空オブジェクトを返す", () => {
    localStorage.setItem("correctStreaks", "invalid{{{");
    const repo = new LocalStorageProgressRepository();
    expect(repo.loadCorrectStreaks()).toEqual({});
  });
});

describe("LocalStorageProgressRepository — カテゴリ表示モード永続化仕様", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("初回ロード時はカテゴリ別モードを返す", () => {
    const repo = new LocalStorageProgressRepository();
    expect(repo.loadCategoryViewMode()).toBe("category");
  });

  it("学年別モードを保存して読み込める", () => {
    const repo = new LocalStorageProgressRepository();
    repo.saveCategoryViewMode("grade");
    expect(repo.loadCategoryViewMode()).toBe("grade");
  });

  it("カテゴリ別モードを保存して読み込める", () => {
    const repo = new LocalStorageProgressRepository();
    repo.saveCategoryViewMode("grade");
    repo.saveCategoryViewMode("category");
    expect(repo.loadCategoryViewMode()).toBe("category");
  });

  it("別のインスタンスからも同じデータを読み込める（永続化確認）", () => {
    const repo1 = new LocalStorageProgressRepository();
    repo1.saveCategoryViewMode("grade");

    const repo2 = new LocalStorageProgressRepository();
    expect(repo2.loadCategoryViewMode()).toBe("grade");
  });
});

describe("LocalStorageProgressRepository — フォントサイズ永続化仕様", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("初回ロード時はnullを返す", () => {
    const repo = new LocalStorageProgressRepository();
    expect(repo.loadFontSizeLevel()).toBeNull();
  });

  it("保存した medium を正しく読み込める", () => {
    const repo = new LocalStorageProgressRepository();
    repo.saveFontSizeLevel("medium");
    expect(repo.loadFontSizeLevel()).toBe("medium");
  });

  it("保存した large を正しく読み込める", () => {
    const repo = new LocalStorageProgressRepository();
    repo.saveFontSizeLevel("large");
    expect(repo.loadFontSizeLevel()).toBe("large");
  });

  it("保存した small を正しく読み込める", () => {
    const repo = new LocalStorageProgressRepository();
    repo.saveFontSizeLevel("small");
    expect(repo.loadFontSizeLevel()).toBe("small");
  });

  it("上書き保存が正しく機能する", () => {
    const repo = new LocalStorageProgressRepository();
    repo.saveFontSizeLevel("medium");
    repo.saveFontSizeLevel("large");
    expect(repo.loadFontSizeLevel()).toBe("large");
  });

  it("無効な値が保存されている場合はnullを返す", () => {
    localStorage.setItem("fontSizeLevel", "extra-large");
    const repo = new LocalStorageProgressRepository();
    expect(repo.loadFontSizeLevel()).toBeNull();
  });

  it("別のインスタンスからも同じデータを読み込める（永続化確認）", () => {
    const repo1 = new LocalStorageProgressRepository();
    repo1.saveFontSizeLevel("large");

    const repo2 = new LocalStorageProgressRepository();
    expect(repo2.loadFontSizeLevel()).toBe("large");
  });
});

describe("LocalStorageProgressRepository — 習得済みID永続化仕様", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("初回ロード時は空配列を返す", () => {
    const repo = new LocalStorageProgressRepository();
    expect(repo.loadMasteredIds()).toEqual([]);
  });

  it("保存したIDリストを正しく読み込める", () => {
    const repo = new LocalStorageProgressRepository();
    repo.saveMasteredIds(["q1", "q2"]);
    expect(repo.loadMasteredIds()).toEqual(["q1", "q2"]);
  });

  it("上書き保存が正しく機能する", () => {
    const repo = new LocalStorageProgressRepository();
    repo.saveMasteredIds(["q1"]);
    repo.saveMasteredIds(["q2", "q3"]);
    expect(repo.loadMasteredIds()).toEqual(["q2", "q3"]);
  });

  it("別のインスタンスからも同じデータを読み込める（永続化確認）", () => {
    const repo1 = new LocalStorageProgressRepository();
    repo1.saveMasteredIds(["q1"]);

    const repo2 = new LocalStorageProgressRepository();
    expect(repo2.loadMasteredIds()).toEqual(["q1"]);
  });

  it("localStorageに不正なJSONが入っていてもロード時に空配列を返す", () => {
    localStorage.setItem("masteredIds", "invalid{{{");
    const repo = new LocalStorageProgressRepository();
    expect(repo.loadMasteredIds()).toEqual([]);
  });
});

describe("LocalStorageProgressRepository — エクスポート仕様", () => {
  const makeRecord = (id: string): QuizRecord => ({
    id,
    date: new Date().toISOString(),
    subject: "english",
    subjectName: "英語",
    category: "all",
    categoryName: "英語 全体",
    mode: "random",
    totalCount: 5,
    correctCount: 3,
    entries: [],
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it("初期状態で全フィールドが含まれるオブジェクトを返す", () => {
    const repo = new LocalStorageProgressRepository();
    const data = repo.exportAllData();
    expect(data).toHaveProperty("exportedAt");
    expect(data.userName).toBeNull();
    expect(data.wrongIds).toEqual([]);
    expect(data.correctStreaks).toEqual({});
    expect(data.masteredIds).toEqual([]);
    expect(data.history).toEqual([]);
    expect(data.categoryViewMode).toBe("category");
    expect(data.fontSizeLevel).toBeNull();
  });

  it("保存済みデータがすべてエクスポートに含まれる", () => {
    const repo = new LocalStorageProgressRepository();
    repo.saveUserName("太郎");
    repo.saveWrongIds(["q1", "q2"]);
    repo.saveCorrectStreaks({ q1: 3 });
    repo.saveMasteredIds(["q3"]);
    repo.saveHistory([makeRecord("r1")]);
    repo.saveCategoryViewMode("grade");
    repo.saveFontSizeLevel("large");

    const data = repo.exportAllData();
    expect(data.userName).toBe("太郎");
    expect(data.wrongIds).toEqual(["q1", "q2"]);
    expect(data.correctStreaks).toEqual({ q1: 3 });
    expect(data.masteredIds).toEqual(["q3"]);
    expect(data.history).toHaveLength(1);
    expect(data.history[0]!.id).toBe("r1");
    expect(data.categoryViewMode).toBe("grade");
    expect(data.fontSizeLevel).toBe("large");
  });

  it("exportedAt が ISO 8601 形式の文字列である", () => {
    const repo = new LocalStorageProgressRepository();
    const data = repo.exportAllData();
    expect(Date.parse(data.exportedAt)).not.toBeNaN();
    expect(new Date(data.exportedAt).toISOString()).toBe(data.exportedAt);
  });
});
