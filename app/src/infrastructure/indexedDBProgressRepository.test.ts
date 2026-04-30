/**
 * IndexedDBProgressRepository — 仕様テスト
 *
 * IndexedDBを使って進捗データを永続化するリポジトリの仕様を記述します。
 * fake-indexeddb を使って IndexedDB をシミュレートします。
 */

// @vitest-environment jsdom

import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { IndexedDBProgressRepository } from "./indexedDBProgressRepository";
import type { QuizRecord } from "../application/ports";

/** テスト間で IndexedDB をリセットする */
function resetIndexedDB(): void {
  // fake-indexeddb の新しいインスタンスを作成して globalThis.indexedDB に割り当てる
  (globalThis as unknown as Record<string, unknown>).indexedDB = new IDBFactory();
}

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

describe("IndexedDBProgressRepository — 初期化仕様", () => {
  beforeEach(() => {
    resetIndexedDB();
  });

  it("initialize() を呼ばなくても各メソッドはデフォルト値を返す", () => {
    const repo = new IndexedDBProgressRepository();
    expect(repo.loadWrongIds()).toEqual([]);
    expect(repo.loadCorrectStreaks()).toEqual({});
    expect(repo.loadMasteredIds()).toEqual([]);
    expect(repo.loadQuestionStats()).toEqual({});
    expect(repo.loadUserName()).toBeNull();
    expect(repo.loadHistory()).toEqual([]);
    expect(repo.loadCategoryViewMode()).toBe("category");
    expect(repo.loadFontSizeLevel()).toBeNull();
    expect(repo.loadShareUrl()).toBe("");
  });

  it("initialize() が正常に完了する", async () => {
    const repo = new IndexedDBProgressRepository();
    await expect(repo.initialize()).resolves.toBeUndefined();
  });
});

describe("IndexedDBProgressRepository — 間違えた問題ID永続化仕様", () => {
  beforeEach(() => {
    resetIndexedDB();
  });

  it("初回ロード時は空配列を返す", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    expect(repo.loadWrongIds()).toEqual([]);
  });

  it("保存したIDリストを正しく読み込める", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    repo.saveWrongIds(["q1", "q2", "q3"]);
    expect(repo.loadWrongIds()).toEqual(["q1", "q2", "q3"]);
  });

  it("空配列を保存した後は空配列を返す", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    repo.saveWrongIds(["q1"]);
    repo.saveWrongIds([]);
    expect(repo.loadWrongIds()).toEqual([]);
  });

  it("上書き保存が正しく機能する", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    repo.saveWrongIds(["q1", "q2"]);
    repo.saveWrongIds(["q3"]);
    expect(repo.loadWrongIds()).toEqual(["q3"]);
  });

  it("別のインスタンスからも同じデータを読み込める（永続化確認）", async () => {
    const repo1 = new IndexedDBProgressRepository();
    await repo1.initialize();
    repo1.saveWrongIds(["q1", "q2"]);

    // IndexedDB への書き込みが完了するまで少し待つ
    await repo1.flush();

    const repo2 = new IndexedDBProgressRepository();
    await repo2.initialize();
    expect(repo2.loadWrongIds()).toEqual(["q1", "q2"]);
  });
});

describe("IndexedDBProgressRepository — ユーザー名永続化仕様", () => {
  beforeEach(() => {
    resetIndexedDB();
  });

  it("初回ロード時はnullを返す", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    expect(repo.loadUserName()).toBeNull();
  });

  it("保存したユーザー名を正しく読み込める", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    repo.saveUserName("太郎");
    expect(repo.loadUserName()).toBe("太郎");
  });

  it("上書き保存が正しく機能する", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    repo.saveUserName("太郎");
    repo.saveUserName("花子");
    expect(repo.loadUserName()).toBe("花子");
  });

  it("別のインスタンスからも同じデータを読み込める（永続化確認）", async () => {
    const repo1 = new IndexedDBProgressRepository();
    await repo1.initialize();
    repo1.saveUserName("次郎");

    await repo1.flush();

    const repo2 = new IndexedDBProgressRepository();
    await repo2.initialize();
    expect(repo2.loadUserName()).toBe("次郎");
  });
});

describe("IndexedDBProgressRepository — 回答履歴永続化仕様", () => {
  beforeEach(() => {
    resetIndexedDB();
  });

  it("初回ロード時は空配列を返す", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    expect(repo.loadHistory()).toEqual([]);
  });

  it("保存した履歴を正しく読み込める", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    const records = [makeRecord("r1"), makeRecord("r2")];
    repo.saveHistory(records);
    expect(repo.loadHistory()).toHaveLength(2);
    expect(repo.loadHistory()[0]!.id).toBe("r1");
  });

  it("100件を超える履歴は切り詰められる", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    const records = Array.from({ length: 110 }, (_, i) => makeRecord(`r${i}`));
    repo.saveHistory(records);
    expect(repo.loadHistory()).toHaveLength(100);
  });

  it("別のインスタンスからも同じデータを読み込める（永続化確認）", async () => {
    const repo1 = new IndexedDBProgressRepository();
    await repo1.initialize();
    repo1.saveHistory([makeRecord("r1")]);

    await repo1.flush();

    const repo2 = new IndexedDBProgressRepository();
    await repo2.initialize();
    expect(repo2.loadHistory()).toHaveLength(1);
    expect(repo2.loadHistory()[0]!.id).toBe("r1");
  });
});

describe("IndexedDBProgressRepository — 正解連続数永続化仕様", () => {
  beforeEach(() => {
    resetIndexedDB();
  });

  it("初回ロード時は空オブジェクトを返す", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    expect(repo.loadCorrectStreaks()).toEqual({});
  });

  it("保存した正解連続数を正しく読み込める", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    repo.saveCorrectStreaks({ q1: 1, q2: 2 });
    expect(repo.loadCorrectStreaks()).toEqual({ q1: 1, q2: 2 });
  });

  it("上書き保存が正しく機能する", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    repo.saveCorrectStreaks({ q1: 1 });
    repo.saveCorrectStreaks({ q1: 2 });
    expect(repo.loadCorrectStreaks()).toEqual({ q1: 2 });
  });

  it("別のインスタンスからも同じデータを読み込める（永続化確認）", async () => {
    const repo1 = new IndexedDBProgressRepository();
    await repo1.initialize();
    repo1.saveCorrectStreaks({ q1: 1, q2: 2 });

    await repo1.flush();

    const repo2 = new IndexedDBProgressRepository();
    await repo2.initialize();
    expect(repo2.loadCorrectStreaks()).toEqual({ q1: 1, q2: 2 });
  });
});

describe("IndexedDBProgressRepository — カテゴリ表示モード永続化仕様", () => {
  beforeEach(() => {
    resetIndexedDB();
  });

  it("初回ロード時はカテゴリ別モードを返す", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    expect(repo.loadCategoryViewMode()).toBe("category");
  });

  it("学年別モードを保存して読み込める", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    repo.saveCategoryViewMode("grade");
    expect(repo.loadCategoryViewMode()).toBe("grade");
  });

  it("カテゴリ別モードを保存して読み込める", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    repo.saveCategoryViewMode("grade");
    repo.saveCategoryViewMode("category");
    expect(repo.loadCategoryViewMode()).toBe("category");
  });

  it("別のインスタンスからも同じデータを読み込める（永続化確認）", async () => {
    const repo1 = new IndexedDBProgressRepository();
    await repo1.initialize();
    repo1.saveCategoryViewMode("grade");

    await repo1.flush();

    const repo2 = new IndexedDBProgressRepository();
    await repo2.initialize();
    expect(repo2.loadCategoryViewMode()).toBe("grade");
  });
});

describe("IndexedDBProgressRepository — フォントサイズ永続化仕様", () => {
  beforeEach(() => {
    resetIndexedDB();
  });

  it("初回ロード時はnullを返す", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    expect(repo.loadFontSizeLevel()).toBeNull();
  });

  it("保存した medium を正しく読み込める", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    repo.saveFontSizeLevel("medium");
    expect(repo.loadFontSizeLevel()).toBe("medium");
  });

  it("保存した large を正しく読み込める", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    repo.saveFontSizeLevel("large");
    expect(repo.loadFontSizeLevel()).toBe("large");
  });

  it("保存した small を正しく読み込める", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    repo.saveFontSizeLevel("small");
    expect(repo.loadFontSizeLevel()).toBe("small");
  });

  it("上書き保存が正しく機能する", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    repo.saveFontSizeLevel("medium");
    repo.saveFontSizeLevel("large");
    expect(repo.loadFontSizeLevel()).toBe("large");
  });

  it("別のインスタンスからも同じデータを読み込める（永続化確認）", async () => {
    const repo1 = new IndexedDBProgressRepository();
    await repo1.initialize();
    repo1.saveFontSizeLevel("large");

    await repo1.flush();

    const repo2 = new IndexedDBProgressRepository();
    await repo2.initialize();
    expect(repo2.loadFontSizeLevel()).toBe("large");
  });
});

describe("IndexedDBProgressRepository — 習得済みID永続化仕様", () => {
  beforeEach(() => {
    resetIndexedDB();
  });

  it("初回ロード時は空配列を返す", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    expect(repo.loadMasteredIds()).toEqual([]);
  });

  it("保存したIDリストを正しく読み込める", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    repo.saveMasteredIds(["q1", "q2"]);
    expect(repo.loadMasteredIds()).toEqual(["q1", "q2"]);
  });

  it("上書き保存が正しく機能する", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    repo.saveMasteredIds(["q1"]);
    repo.saveMasteredIds(["q2", "q3"]);
    expect(repo.loadMasteredIds()).toEqual(["q2", "q3"]);
  });

  it("別のインスタンスからも同じデータを読み込める（永続化確認）", async () => {
    const repo1 = new IndexedDBProgressRepository();
    await repo1.initialize();
    repo1.saveMasteredIds(["q1"]);

    await repo1.flush();

    const repo2 = new IndexedDBProgressRepository();
    await repo2.initialize();
    expect(repo2.loadMasteredIds()).toEqual(["q1"]);
  });
});

describe("IndexedDBProgressRepository — 共有URL永続化仕様", () => {
  beforeEach(() => {
    resetIndexedDB();
  });

  it("初回ロード時は空文字を返す", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    expect(repo.loadShareUrl()).toBe("");
  });

  it("保存した共有URLを正しく読み込める", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    repo.saveShareUrl("https://twitter.com");
    expect(repo.loadShareUrl()).toBe("https://twitter.com");
  });

  it("上書き保存が正しく機能する", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    repo.saveShareUrl("https://twitter.com");
    repo.saveShareUrl("https://example.com");
    expect(repo.loadShareUrl()).toBe("https://example.com");
  });

  it("別のインスタンスからも同じデータを読み込める（永続化確認）", async () => {
    const repo1 = new IndexedDBProgressRepository();
    await repo1.initialize();
    repo1.saveShareUrl("https://twitter.com");

    await repo1.flush();

    const repo2 = new IndexedDBProgressRepository();
    await repo2.initialize();
    expect(repo2.loadShareUrl()).toBe("https://twitter.com");
  });
});

describe("IndexedDBProgressRepository — エクスポート仕様", () => {
  beforeEach(() => {
    resetIndexedDB();
  });

  it("初期状態で全フィールドが含まれるオブジェクトを返す", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
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

  it("保存済みデータがすべてエクスポートに含まれる", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
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

  it("exportedAt が ISO 8601 形式の文字列である", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    const data = repo.exportAllData();
    expect(Date.parse(data.exportedAt)).not.toBeNaN();
    expect(new Date(data.exportedAt).toISOString()).toBe(data.exportedAt);
  });
});

describe("IndexedDBProgressRepository — 問題統計永続化仕様", () => {
  beforeEach(() => {
    resetIndexedDB();
  });

  it("初回ロード時は空オブジェクトを返す", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    expect(repo.loadQuestionStats()).toEqual({});
  });

  it("保存した問題統計を正しく読み込める", async () => {
    const repo = new IndexedDBProgressRepository();
    await repo.initialize();
    repo.saveQuestionStats({ q1: { total: 5, correct: 3 } });
    expect(repo.loadQuestionStats()).toEqual({ q1: { total: 5, correct: 3 } });
  });

  it("別のインスタンスからも同じデータを読み込める（永続化確認）", async () => {
    const repo1 = new IndexedDBProgressRepository();
    await repo1.initialize();
    repo1.saveQuestionStats({ q1: { total: 5, correct: 3 } });

    await repo1.flush();

    const repo2 = new IndexedDBProgressRepository();
    await repo2.initialize();
    expect(repo2.loadQuestionStats()).toEqual({ q1: { total: 5, correct: 3 } });
  });
});
