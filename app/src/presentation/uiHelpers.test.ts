/**
 * presentation/uiHelpers — 仕様テスト
 */

import { describe, it, expect } from "vitest";
import { SUBJECTS, gradeColorClass, calcDualProgressPct, getScoreMessage, getScoreResultClass } from "./uiHelpers";

describe("SUBJECTS 定数", () => {
  it("「英語」「数学」「国語」「管理」「おすすめ」「進度」をすべて含む", () => {
    const ids = SUBJECTS.map((s) => s.id);
    expect(ids).toEqual(["all", "progress", "english", "math", "japanese", "admin"]);
  });

  it("各教科は id, name, icon を持つ", () => {
    SUBJECTS.forEach((s) => {
      expect(typeof s.id).toBe("string");
      expect(typeof s.name).toBe("string");
      expect(typeof s.icon).toBe("string");
      expect(s.id.length).toBeGreaterThan(0);
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.icon.length).toBeGreaterThan(0);
    });
  });

  it("英語タブのアイコンは 🌐 である", () => {
    const english = SUBJECTS.find((s) => s.id === "english");
    expect(english?.icon).toBe("🌐");
  });

  it("数学タブのアイコンは 📐 である", () => {
    const math = SUBJECTS.find((s) => s.id === "math");
    expect(math?.icon).toBe("📐");
  });
});

describe("gradeColorClass 関数", () => {
  it("「小」で始まる学年は grade-elementary を返す", () => {
    expect(gradeColorClass("小1")).toBe("grade-elementary");
    expect(gradeColorClass("小学校6年")).toBe("grade-elementary");
  });

  it("「中」で始まる学年は grade-middle を返す", () => {
    expect(gradeColorClass("中1")).toBe("grade-middle");
    expect(gradeColorClass("中学2年")).toBe("grade-middle");
  });

  it("「高」で始まる学年は grade-high を返す", () => {
    expect(gradeColorClass("高1")).toBe("grade-high");
    expect(gradeColorClass("高校3年")).toBe("grade-high");
  });

  it("該当しない文字列は空文字を返す", () => {
    expect(gradeColorClass("")).toBe("");
    expect(gradeColorClass("大学1年")).toBe("");
    expect(gradeColorClass("不明")).toBe("");
  });
});

describe("calcDualProgressPct 関数", () => {
  it("total が 0 の場合は両方 0 を返す", () => {
    expect(calcDualProgressPct(0, 0, 0)).toEqual({ masteredPct: 0, inProgressPct: 0 });
  });

  it("理想的な比率を四捨五入して返す", () => {
    // 50/100 mastered, 25/100 wrong → 50%, 25%
    expect(calcDualProgressPct(50, 25, 100)).toEqual({ masteredPct: 50, inProgressPct: 25 });
  });

  it("丸め誤差で合計が 100% を超える場合に inProgressPct をクランプする", () => {
    // 1/3 mastered (33%), 2/3 wrong (67%) → 33 + 67 = 100、ぎりぎり 100% 以内
    const r = calcDualProgressPct(1, 2, 3);
    expect(r.masteredPct + r.inProgressPct).toBeLessThanOrEqual(100);
  });

  it("すべて mastered の場合は masteredPct=100, inProgressPct=0 を返す", () => {
    expect(calcDualProgressPct(10, 0, 10)).toEqual({ masteredPct: 100, inProgressPct: 0 });
  });

  it("すべて wrong の場合は masteredPct=0, inProgressPct=100 を返す", () => {
    expect(calcDualProgressPct(0, 10, 10)).toEqual({ masteredPct: 0, inProgressPct: 100 });
  });
});

describe("getScoreMessage 関数", () => {
  it("満点（100%）は「満点」メッセージを返す", () => {
    expect(getScoreMessage(100)).toBe("🌟 満点！すごい！");
  });

  it("80% 以上 100% 未満は「よくできました」を返す", () => {
    expect(getScoreMessage(80)).toBe("🎉 よくできました！");
    expect(getScoreMessage(99)).toBe("🎉 よくできました！");
  });

  it("60% 以上 80% 未満は「もう少し」を返す", () => {
    expect(getScoreMessage(60)).toBe("😊 もう少し！次はきっとできる！");
    expect(getScoreMessage(79)).toBe("😊 もう少し！次はきっとできる！");
  });

  it("60% 未満は「がんばれ」を返す", () => {
    expect(getScoreMessage(0)).toBe("💪 がんばれ！次は必ず正解できます！");
    expect(getScoreMessage(59)).toBe("💪 がんばれ！次は必ず正解できます！");
  });
});

describe("getScoreResultClass 関数", () => {
  it("満点フラグが立っていれば perfect を返す", () => {
    expect(getScoreResultClass(true, 100)).toBe("perfect");
  });

  it("満点でなくても 70% 以上は pass を返す", () => {
    expect(getScoreResultClass(false, 70)).toBe("pass");
    expect(getScoreResultClass(false, 99)).toBe("pass");
  });

  it("70% 未満は fail を返す", () => {
    expect(getScoreResultClass(false, 69)).toBe("fail");
    expect(getScoreResultClass(false, 0)).toBe("fail");
  });
});
