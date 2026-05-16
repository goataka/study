/**
 * SelectedUnitInfoPanel の仕様テスト。
 *
 * 旧 `selectedUnitInfoView.test.ts` で検証していた DOM 構造（class 名・テキスト）が
 * React コンポーネントでも維持されていることを確認する。
 */

// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { SelectedUnitInfoPanel } from "./SelectedUnitInfoPanel";

function render(vm: Parameters<typeof SelectedUnitInfoPanel>[0]["vm"]): HTMLElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(<SelectedUnitInfoPanel vm={vm} />);
  });
  return container;
}

describe("SelectedUnitInfoPanel コンポーネント", () => {
  it("単元名・カテゴリパス・学年・例文・進捗バーを含む完全な body を描画する", () => {
    const container = render({
      kind: "full",
      closeAriaLabel: "閉じる",
      onClose: () => undefined,
      data: {
        name: "1の段",
        topCatName: "九九",
        parentCatName: "かけ算",
        grade: "小2",
        example: "1×2=`2`",
        description: "1の段のかけ算",
        mastered: 3,
        inProgressCount: 2,
        total: 10,
      },
    });

    expect(container.querySelector(".selected-unit-info-name")?.textContent).toBe("1の段");
    expect(container.querySelector(".selected-unit-info-desc")?.textContent).toBe("1の段のかけ算");
    expect(container.querySelector(".selected-unit-info-category")?.textContent).toBe("九九 › かけ算");
    expect(container.querySelector(".category-grade")?.textContent).toBe("小2");
    // 例文内のバッククォート部分は <code> として描画される
    const exampleEl = container.querySelector(".selected-unit-info-example");
    expect(exampleEl).not.toBeNull();
    expect(exampleEl?.querySelector("code.category-example-highlight")?.textContent).toBe("2");
    // 進捗ラベル: inProgressCount > 0 のとき "mastered(inProgress)/total" 形式
    expect(container.querySelector(".selected-unit-progress-label")?.textContent).toBe("3(2)/10");
  });

  it("inProgressCount が 0 の場合は進捗ラベルを 'mastered/total' 形式で表示する", () => {
    const container = render({
      kind: "full",
      closeAriaLabel: "閉じる",
      onClose: () => undefined,
      data: { name: "test", mastered: 5, inProgressCount: 0, total: 10 },
    });
    expect(container.querySelector(".selected-unit-progress-label")?.textContent).toBe("5/10");
  });

  it("stage 未指定かつ全問学習済みの場合は単元名の右に ✔️ を表示する", () => {
    const container = render({
      kind: "full",
      closeAriaLabel: "閉じる",
      onClose: () => undefined,
      data: { name: "test", mastered: 5, inProgressCount: 2, total: 5 },
    });
    expect(container.querySelector(".selected-unit-stage-badge")?.textContent).toBe("✔️");
    expect(container.querySelector(".selected-unit-progress-label")?.textContent).toBe("5/5");
  });

  it("stage=0 かつ全問学習済みの場合も単元名の右に ✔️ を表示する", () => {
    const container = render({
      kind: "full",
      closeAriaLabel: "閉じる",
      onClose: () => undefined,
      data: { name: "test", mastered: 5, inProgressCount: 2, total: 5, stage: 0 },
    });
    expect(container.querySelector(".selected-unit-stage-badge")?.textContent).toBe("✔️");
    expect(container.querySelector(".selected-unit-progress-label")?.textContent).toBe("5/5");
  });

  it("stage>0 の単元でも inProgressCount が残っていればオレンジ進捗を表示する", () => {
    const container = render({
      kind: "full",
      closeAriaLabel: "閉じる",
      onClose: () => undefined,
      data: { name: "test", mastered: 0, inProgressCount: 3, total: 5, stage: 1 },
    });
    expect(container.querySelector(".selected-unit-progress-label")?.textContent).toBe("0(3)/5");
    const inProgressFill = container.querySelector<HTMLElement>(".selected-unit-progress-fill-inprogress");
    expect(inProgressFill?.style.width).toBe("60%");
  });

  it("description / example / カテゴリパス / 学年がすべて未指定なら該当行を描画しない", () => {
    const container = render({
      kind: "full",
      closeAriaLabel: "閉じる",
      onClose: () => undefined,
      data: { name: "test", mastered: 0, inProgressCount: 0, total: 0 },
    });
    expect(container.querySelector(".selected-unit-info-desc")).toBeNull();
    expect(container.querySelector(".selected-unit-info-category")).toBeNull();
    expect(container.querySelector(".category-grade")).toBeNull();
    expect(container.querySelector(".selected-unit-info-example")).toBeNull();
    expect(container.querySelector(".selected-unit-info-desc-row")).toBeNull();
  });

  it("簡易表示は単元名のみを描画する", () => {
    const container = render({
      kind: "simple",
      name: "九九",
      closeAriaLabel: "閉じる",
      onClose: () => undefined,
    });
    expect(container.querySelector(".selected-unit-info-name")?.textContent).toBe("九九");
    expect(container.querySelector(".selected-unit-progress-label")).toBeNull();
  });

  it("閉じるボタンをクリックすると onClose が呼ばれる", () => {
    const onClose = vi.fn();
    const container = render({
      kind: "simple",
      name: "九九",
      closeAriaLabel: "選択を解除して閉じる",
      onClose,
    });
    const btn = container.querySelector<HTMLButtonElement>(".selected-unit-close-btn");
    expect(btn?.getAttribute("aria-label")).toBe("選択を解除して閉じる");
    btn?.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
