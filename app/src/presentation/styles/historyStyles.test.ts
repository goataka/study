/**
 * `historyScore` / `historyEntry` / `historyEntryIcon` CVA レシピの仕様テスト。
 */

import { describe, expect, it } from "vitest";
import { historyScore, historyEntry, historyEntryIcon } from "./historyStyles";

describe("historyScore (CVA)", () => {
  it("result='pass' で pass クラスと緑色テキストを出力する", () => {
    const tokens = historyScore({ result: "pass" }).split(/\s+/);
    expect(tokens).toContain("history-score");
    expect(tokens).toContain("pass");
    expect(tokens).not.toContain("fail");
  });

  it("result='fail' で fail クラスと赤色テキストを出力する", () => {
    const tokens = historyScore({ result: "fail" }).split(/\s+/);
    expect(tokens).toContain("history-score");
    expect(tokens).toContain("fail");
    expect(tokens).not.toContain("pass");
  });
});

describe("historyEntry (CVA)", () => {
  it("result='correct' で correct クラスと緑背景を出力する", () => {
    const tokens = historyEntry({ result: "correct" }).split(/\s+/);
    expect(tokens).toContain("history-entry");
    expect(tokens).toContain("correct");
    expect(tokens).not.toContain("incorrect");
  });

  it("result='incorrect' で incorrect クラスと赤背景を出力する", () => {
    const tokens = historyEntry({ result: "incorrect" }).split(/\s+/);
    expect(tokens).toContain("history-entry");
    expect(tokens).toContain("incorrect");
    expect(tokens).not.toContain("correct");
  });
});

describe("historyEntryIcon (CVA)", () => {
  it("result='correct' で緑色テキストを出力する", () => {
    const cls = historyEntryIcon({ result: "correct" });
    expect(cls).toContain("history-entry-icon");
    expect(cls).toContain("text-[#28a745]");
    expect(cls).not.toContain("text-[#dc3545]");
  });

  it("result='incorrect' で赤色テキストを出力する", () => {
    const cls = historyEntryIcon({ result: "incorrect" });
    expect(cls).toContain("history-entry-icon");
    expect(cls).toContain("text-[#dc3545]");
    expect(cls).not.toContain("text-[#28a745]");
  });
});
