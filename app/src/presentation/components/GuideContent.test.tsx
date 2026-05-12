// @vitest-environment jsdom

import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { GuideContent } from "./GuideContent";

describe("GuideContent", () => {
  let container: HTMLElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    flushSync(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  function flush(): Promise<void> {
    return new Promise((r) => setTimeout(r, 0));
  }

  it("guideUrl が null の場合は何も描画しない", () => {
    flushSync(() => root.render(React.createElement(GuideContent, { guideUrl: null })));
    expect(container.querySelector(".guide-content")).toBeNull();
    expect(container.querySelector(".guide-error-msg")).toBeNull();
  });

  it("外部オリジン URL は別タブリンクを描画する", async () => {
    flushSync(() => root.render(React.createElement(GuideContent, { guideUrl: "https://example.com/g" })));
    await flush();
    const link = container.querySelector("a[target='_blank']") as HTMLAnchorElement | null;
    expect(link).not.toBeNull();
    expect(link?.getAttribute("rel")).toContain("noopener");
    expect(link?.href).toContain("example.com/g");
  });

  it("同一オリジン URL は fetch + sanitize して挿入する（h1 は除去）", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        text: () =>
          Promise.resolve(
            "<html><body><h1>タイトル</h1><h2>見出し</h2><p>本文</p><script>bad()</script></body></html>",
          ),
      } as Response),
    );

    flushSync(() => root.render(React.createElement(GuideContent, { guideUrl: "/g.html" })));
    await flush();
    await flush();

    const guide = container.querySelector(".guide-content") as HTMLElement | null;
    expect(guide).not.toBeNull();
    // h1/h2 は sanitizeGuideHtml で除去されるため表示されない
    expect(guide?.innerHTML).not.toContain("タイトル");
    expect(guide?.innerHTML).not.toContain("見出し");
    // 本文は残る
    expect(guide?.innerHTML).toContain("本文");
    expect(guide?.innerHTML).not.toContain("script");
  });

  it("fetch 失敗時はエラーメッセージを描画する", async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error("net")));
    vi.spyOn(console, "error").mockImplementation(() => {});

    flushSync(() => root.render(React.createElement(GuideContent, { guideUrl: "/g.html" })));
    await flush();
    await flush();

    const err = container.querySelector(".guide-error-msg");
    expect(err?.textContent).toContain("解説の読み込みに失敗しました");
  });

  it("URL が変わると再 fetch される", async () => {
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(`<html><body><p>${url}</p></body></html>`),
      } as Response),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    flushSync(() => root.render(React.createElement(GuideContent, { guideUrl: "/a.html" })));
    await flush();
    await flush();
    expect(container.querySelector(".guide-content")?.textContent).toContain("/a.html");

    flushSync(() => root.render(React.createElement(GuideContent, { guideUrl: "/b.html" })));
    await flush();
    await flush();
    expect(container.querySelector(".guide-content")?.textContent).toContain("/b.html");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("support 配下への相対 guideUrl は ./support/ プレフィックス付きで fetch される", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve("<html><body><p>ok</p></body></html>"),
      } as Response),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    flushSync(() => root.render(React.createElement(GuideContent, { guideUrl: "./english/grammar/guide" })));
    await flush();
    await flush();

    expect(fetchMock).toHaveBeenCalledWith("./support/english/grammar/guide");
  });
});
