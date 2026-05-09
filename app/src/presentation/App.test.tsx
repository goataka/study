/**
 * App コンポーネントのスモークテスト。
 *
 * Phase 1 の React 移行では `<App />` は薄いラッパーであり、
 * 主な責務は `useEffect` 内で `QuizApp` を 1 度だけ起動することである。
 * 本テストは以下を検証する：
 *
 * - `<App />` がエラーなくレンダリングされる
 * - DOM 要素が揃った状態でマウントすると `QuizApp` が起動される
 * - StrictMode の二重マウントでも 1 度しか起動しない
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { setupMinimalDom, kanjiCanvasMock } from "./quizApp.testHelpers";

// React 19 の act 環境フラグ（jsdom + createRoot 利用時に必要）
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// QuizApp と IndexedDBProgressRepository をモックして、
// React 起動ライフサイクルだけを検証対象にする。
const quizAppCtor = vi.fn();
const indexedDbCtor = vi.fn();
vi.mock("./quizApp", () => ({
  QuizApp: class {
    constructor(...args: unknown[]) {
      quizAppCtor(...args);
    }
  },
}));
vi.mock("../infrastructure/indexedDBProgressRepository", () => ({
  IndexedDBProgressRepository: class {
    constructor() {
      indexedDbCtor();
    }
  },
}));

// モック宣言が hoist されるため、import は mock 宣言の後に動的読み込みする。
async function importApp(): Promise<typeof import("./App").App> {
  const mod = await import("./App");
  return mod.App;
}

describe("App コンポーネント", () => {
  let root: Root | null = null;
  let container: HTMLElement | null = null;

  beforeEach(() => {
    setupMinimalDom();
    quizAppCtor.mockClear();
    indexedDbCtor.mockClear();
    kanjiCanvasMock.init.mockClear();
    container = document.createElement("div");
    container.id = "react-test-root";
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container?.remove();
  });

  it("エラーなくレンダリングできる", async () => {
    const App = await importApp();
    expect(() => {
      act(() => {
        root = createRoot(container!);
        root.render(<App />);
      });
    }).not.toThrow();
  });

  it("マウント時に QuizApp を起動する", async () => {
    const App = await importApp();
    act(() => {
      root = createRoot(container!);
      root.render(<App />);
    });
    expect(quizAppCtor).toHaveBeenCalledTimes(1);
    expect(indexedDbCtor).toHaveBeenCalledTimes(1);
  });

  it("StrictMode の二重マウントでも QuizApp は 1 度しか起動しない", async () => {
    const App = await importApp();
    act(() => {
      root = createRoot(container!);
      root.render(
        <StrictMode>
          <App />
        </StrictMode>,
      );
    });
    expect(quizAppCtor).toHaveBeenCalledTimes(1);
  });
});
