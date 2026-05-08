/**
 * selectedUnitInfoView の仕様テスト
 */

// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import {
  buildSelectedUnitInfoBody,
  buildSelectedUnitInfoSimpleBody,
  buildSelectedUnitCloseButton,
} from "./selectedUnitInfoView";

describe("buildSelectedUnitInfoBody", () => {
  it("単元名・カテゴリパス・学年・例文・進捗バーを含む完全な body を返す", () => {
    const body = buildSelectedUnitInfoBody({
      name: "1の段",
      topCatName: "九九",
      parentCatName: "かけ算",
      grade: "小2",
      example: "1×2=`2`",
      description: "1の段のかけ算",
      mastered: 3,
      inProgressCount: 2,
      total: 10,
    });

    expect(body.querySelector(".selected-unit-info-name")?.textContent).toBe("1の段");
    expect(body.querySelector(".selected-unit-info-desc")?.textContent).toBe("1の段のかけ算");
    expect(body.querySelector(".selected-unit-info-category")?.textContent).toBe("九九 › かけ算");
    expect(body.querySelector(".category-grade")?.textContent).toBe("小2");
    expect(body.querySelector(".selected-unit-info-example")).not.toBeNull();
    // 進捗ラベル: inProgressCount > 0 のとき "mastered(inProgress)/total" 形式
    expect(body.querySelector(".selected-unit-progress-label")?.textContent).toBe("3(2)/10");
  });

  it("inProgressCount が 0 の場合は進捗ラベルを 'mastered/total' 形式で表示する", () => {
    const body = buildSelectedUnitInfoBody({
      name: "test",
      mastered: 5,
      inProgressCount: 0,
      total: 10,
    });
    expect(body.querySelector(".selected-unit-progress-label")?.textContent).toBe("5/10");
  });

  it("description / example / カテゴリ・学年がいずれも未指定の場合でも進捗バーは描画される", () => {
    const body = buildSelectedUnitInfoBody({
      name: "シンプル",
      mastered: 0,
      inProgressCount: 0,
      total: 0,
    });
    expect(body.querySelector(".selected-unit-info-desc")).toBeNull();
    expect(body.querySelector(".selected-unit-info-desc-row")).toBeNull();
    expect(body.querySelector(".selected-unit-progress-bar")).not.toBeNull();
  });
});

describe("buildSelectedUnitInfoSimpleBody", () => {
  it("名前のみを含む簡易 body を返す", () => {
    const body = buildSelectedUnitInfoSimpleBody("カテゴリA");
    expect(body.className).toBe("selected-unit-info-body");
    expect(body.querySelector(".selected-unit-info-name")?.textContent).toBe("カテゴリA");
    expect(body.querySelector(".selected-unit-progress-bar")).toBeNull();
  });
});

describe("buildSelectedUnitCloseButton", () => {
  it("クリックで onClose が呼ばれ、aria-label が指定したテキストになる", () => {
    const onClose = vi.fn();
    const btn = buildSelectedUnitCloseButton("閉じるアクション", onClose);
    expect(btn.getAttribute("aria-label")).toBe("閉じるアクション");
    expect(btn.textContent).toBe("✕");
    btn.dispatchEvent(new MouseEvent("click"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
