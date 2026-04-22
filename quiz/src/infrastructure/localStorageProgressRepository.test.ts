/**
 * LocalStorageProgressRepository — 仕様テスト
 *
 * localStorageを使って進捗（間違えた問題IDリスト）を永続化するリポジトリの仕様を記述します。
 * DOMが必要なためjsdom環境で実行します。
 */

// @vitest-environment jsdom

import { LocalStorageProgressRepository, DONE_CATEGORIES_KEY } from "./localStorageProgressRepository";

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

describe("LocalStorageProgressRepository — 単元実施済みカテゴリ永続化仕様", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("初回ロード時は空配列を返す", () => {
    const repo = new LocalStorageProgressRepository();
    expect(repo.loadDoneCategories()).toEqual([]);
  });

  it("保存したカテゴリキーリストを正しく読み込める", () => {
    const repo = new LocalStorageProgressRepository();
    repo.saveDoneCategories(["english::phonics-1", "math::addition-no-carry"]);
    expect(repo.loadDoneCategories()).toEqual(["english::phonics-1", "math::addition-no-carry"]);
  });

  it("空配列を保存した後は空配列を返す", () => {
    const repo = new LocalStorageProgressRepository();
    repo.saveDoneCategories(["english::phonics-1"]);
    repo.saveDoneCategories([]);
    expect(repo.loadDoneCategories()).toEqual([]);
  });

  it("別のインスタンスからも同じデータを読み込める（永続化確認）", () => {
    const repo1 = new LocalStorageProgressRepository();
    repo1.saveDoneCategories(["english::phonics-1"]);

    const repo2 = new LocalStorageProgressRepository();
    expect(repo2.loadDoneCategories()).toEqual(["english::phonics-1"]);
  });

  it("localStorageに不正なJSONが入っていてもロード時に空配列を返す", () => {
    localStorage.setItem(DONE_CATEGORIES_KEY, "invalid json{{{");
    const repo = new LocalStorageProgressRepository();
    expect(repo.loadDoneCategories()).toEqual([]);
  });

  it("localStorageに配列以外のJSONが入っていてもロード時に空配列を返す", () => {
    localStorage.setItem(DONE_CATEGORIES_KEY, JSON.stringify({ key: "value" }));
    const repo = new LocalStorageProgressRepository();
    expect(repo.loadDoneCategories()).toEqual([]);
  });

  it("配列の要素にstring以外が含まれている場合はstring要素のみ返す", () => {
    localStorage.setItem(DONE_CATEGORIES_KEY, JSON.stringify(["english::phonics-1", 42, null, "math::addition"]));
    const repo = new LocalStorageProgressRepository();
    expect(repo.loadDoneCategories()).toEqual(["english::phonics-1", "math::addition"]);
  });
});
