// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from "vitest";
import { LocalStorageProgressRepository } from "../../infrastructure/localStorageProgressRepository";
import {
  loadUserName,
  loadFontSize,
  applyFontSize,
  loadShareUrl,
  saveShareUrl,
  loadQuizSettings,
  saveQuizSettings,
  loadQuestionCountFromDom,
  loadRecommendedCounts,
  saveRecommendedCounts,
} from "./appSettingsService";

describe("appSettingsService", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = "";
  });

  describe("loadUserName", () => {
    it("保存された名前があればそれを返す", () => {
      const repo = new LocalStorageProgressRepository();
      repo.saveUserName("たろう");
      expect(loadUserName(repo, "ゲスト")).toBe("たろう");
    });
    it("保存値がなければ fallback を返す", () => {
      const repo = new LocalStorageProgressRepository();
      expect(loadUserName(repo, "ゲスト")).toBe("ゲスト");
    });
  });

  describe("loadFontSize / applyFontSize", () => {
    it("永続化された値があれば DOM へ即時反映する", () => {
      const repo = new LocalStorageProgressRepository();
      repo.saveFontSizeLevel("large");
      document.body.innerHTML = `<button class="font-size-btn" data-size="large"></button>`;
      const result = loadFontSize(repo, "small");
      expect(result).toBe("large");
      expect(document.body.classList.contains("font-size-large")).toBe(true);
    });
    it("applyFontSize は persist=true で永続化する", () => {
      const repo = new LocalStorageProgressRepository();
      document.body.innerHTML = `<button class="font-size-btn" data-size="medium"></button>`;
      applyFontSize(repo, "medium", true);
      expect(repo.loadFontSizeLevel()).toBe("medium");
    });
  });

  describe("loadShareUrl / saveShareUrl", () => {
    it("不正なスキームは空に正規化される", () => {
      const repo = new LocalStorageProgressRepository();
      const sanitized = saveShareUrl(repo, "javascript:alert(1)");
      expect(sanitized).toBe("");
      expect(loadShareUrl(repo)).toBe("");
    });
    it("有効な URL はそのまま保存される", () => {
      const repo = new LocalStorageProgressRepository();
      saveShareUrl(repo, "https://example.com/share");
      expect(loadShareUrl(repo)).toBe("https://example.com/share");
    });
  });

  describe("loadQuizSettings / saveQuizSettings", () => {
    it("保存値を読み込んでラジオボタンを更新する", () => {
      const repo = new LocalStorageProgressRepository();
      saveQuizSettings(repo, { questionCount: 20, quizOrder: "straight", includeMastered: true });
      document.body.innerHTML = `
        <input type="radio" name="questionCount" value="10">
        <input type="radio" name="questionCount" value="20">
        <input type="radio" name="quizOrder" value="random">
        <input type="radio" name="quizOrder" value="straight">
        <input type="radio" name="quizLearned" value="exclude">
        <input type="radio" name="quizLearned" value="include">
      `;
      const settings = loadQuizSettings(repo);
      expect(settings).toEqual({ questionCount: 20, quizOrder: "straight", includeMastered: true });
      expect(document.querySelector<HTMLInputElement>('input[value="20"]')!.checked).toBe(true);
      expect(document.querySelector<HTMLInputElement>('input[value="straight"]')!.checked).toBe(true);
      expect(document.querySelector<HTMLInputElement>('input[value="include"]')!.checked).toBe(true);
    });
  });

  describe("loadQuestionCountFromDom", () => {
    it("checked のラジオから値を読み取る", () => {
      document.body.innerHTML = `
        <input type="radio" name="questionCount" value="5">
        <input type="radio" name="questionCount" value="10" checked>
      `;
      expect(loadQuestionCountFromDom(20)).toBe(10);
    });
    it("checked がなければ fallback を返す", () => {
      expect(loadQuestionCountFromDom(15)).toBe(15);
    });
  });

  describe("loadRecommendedCounts / saveRecommendedCounts", () => {
    it("Map ↔ Record で双方向に変換できる", () => {
      const repo = new LocalStorageProgressRepository();
      const counts = new Map<string, number>([
        ["english", 3],
        ["math", 5],
      ]);
      saveRecommendedCounts(repo, counts);
      const loaded = loadRecommendedCounts(repo);
      expect(loaded.get("english")).toBe(3);
      expect(loaded.get("math")).toBe(5);
    });
  });
});
