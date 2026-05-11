// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { extractSpeechText } from "./QuizScreen";

describe("QuizScreen", () => {
  describe("extractSpeechText", () => {
    it("「」で囲まれた部分を読み上げ対象として抽出できる", () => {
      expect(extractSpeechText("「apple」をえらぼう")).toBe("apple");
    });

    it("バッククォートで囲まれた部分を読み上げ対象として抽出できる", () => {
      expect(extractSpeechText("次の単語 `banana` を読もう")).toBe("banana");
    });

    it("末尾のヒント括弧を除去して読み上げ対象を返せる", () => {
      expect(extractSpeechText("cat (ねこ)")).toBe("cat");
    });
  });
});
