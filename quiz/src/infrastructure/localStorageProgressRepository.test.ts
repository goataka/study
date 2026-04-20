/**
 * LocalStorageProgressRepository — 仕様テスト
 *
 * localStorageを使って進捗（間違えた問題IDリスト・正解した問題IDリスト）を永続化するリポジトリの仕様を記述します。
 * DOMが必要なためjsdom環境で実行します。
 */

// @vitest-environment jsdom

import { LocalStorageProgressRepository } from "./localStorageProgressRepository";

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

describe("LocalStorageProgressRepository — 正解した問題ID永続化仕様", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("初回ロード時は空配列を返す", () => {
    const repo = new LocalStorageProgressRepository();
    expect(repo.loadCorrectIds()).toEqual([]);
  });

  it("保存したIDリストを正しく読み込める", () => {
    const repo = new LocalStorageProgressRepository();
    repo.saveCorrectIds(["q4", "q5", "q6"]);
    expect(repo.loadCorrectIds()).toEqual(["q4", "q5", "q6"]);
  });

  it("空配列を保存した後は空配列を返す", () => {
    const repo = new LocalStorageProgressRepository();
    repo.saveCorrectIds(["q4"]);
    repo.saveCorrectIds([]);
    expect(repo.loadCorrectIds()).toEqual([]);
  });

  it("上書き保存が正しく機能する", () => {
    const repo = new LocalStorageProgressRepository();
    repo.saveCorrectIds(["q4", "q5"]);
    repo.saveCorrectIds(["q6"]);
    expect(repo.loadCorrectIds()).toEqual(["q6"]);
  });

  it("別のインスタンスからも同じデータを読み込める（永続化確認）", () => {
    const repo1 = new LocalStorageProgressRepository();
    repo1.saveCorrectIds(["q4", "q5"]);

    const repo2 = new LocalStorageProgressRepository();
    expect(repo2.loadCorrectIds()).toEqual(["q4", "q5"]);
  });

  it("localStorageに不正なJSONが入っていてもロード時に空配列を返す", () => {
    localStorage.setItem("correctQuestions", "invalid json{{{");
    const repo = new LocalStorageProgressRepository();
    expect(repo.loadCorrectIds()).toEqual([]);
  });

  it("wrongIdsとcorrectIdsは独立して管理される", () => {
    const repo = new LocalStorageProgressRepository();
    repo.saveWrongIds(["q1", "q2"]);
    repo.saveCorrectIds(["q3", "q4"]);

    expect(repo.loadWrongIds()).toEqual(["q1", "q2"]);
    expect(repo.loadCorrectIds()).toEqual(["q3", "q4"]);
  });
});
