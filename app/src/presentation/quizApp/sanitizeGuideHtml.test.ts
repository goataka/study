// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { isExternalGuideUrl, sanitizeGuideHtml } from "./sanitizeGuideHtml";

describe("sanitizeGuideHtml 関数", () => {
  it("script 要素を除去する", () => {
    const html = "<html><body><p>hi</p><script>alert(1)</script></body></html>";
    const out = sanitizeGuideHtml(html);
    expect(out).toContain("hi");
    expect(out).not.toContain("script");
    expect(out).not.toContain("alert");
  });

  it("on* イベントハンドラ属性を除去する", () => {
    const html = `<html><body><div onclick="bad()">x</div></body></html>`;
    const out = sanitizeGuideHtml(html);
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("bad()");
    expect(out).toContain(">x<");
  });

  it("javascript: スキームの href を除去する", () => {
    const html = `<html><body><a href="javascript:alert(1)">x</a></body></html>`;
    const out = sanitizeGuideHtml(html);
    expect(out).not.toContain("javascript:");
  });

  it("style 属性を除去する", () => {
    const html = `<html><body><div style="color:red">x</div></body></html>`;
    expect(sanitizeGuideHtml(html)).not.toContain("style");
  });

  it("id 属性をすべて除去する", () => {
    const html = `<html><body><h1 id="t">a</h1><p id="p">b</p></body></html>`;
    const out = sanitizeGuideHtml(html);
    expect(out).not.toContain('id="t"');
    expect(out).not.toContain('id="p"');
  });

  it("h1 は除去し、h2 は保持する", () => {
    const html = `<html><body><h1>大見出し</h1><h2>中見出し</h2></body></html>`;
    const out = sanitizeGuideHtml(html);
    expect(out).not.toContain("大見出し");
    expect(out).toContain("中見出し");
  });

  it("site-header / site-footer / edit-link を除去する", () => {
    const html = `<html><body>
      <header class="site-header">H</header>
      <main><p>本文</p></main>
      <footer class="site-footer">F</footer>
      <a class="edit-link">edit</a>
    </body></html>`;
    const out = sanitizeGuideHtml(html);
    expect(out).toContain("本文");
    expect(out).not.toContain(">H<");
    expect(out).not.toContain(">F<");
    expect(out).not.toContain("edit");
  });

  it("「This site is open source」を含む説明的要素を除去する（コンテンツ構造は保持）", () => {
    const html = `<html><body>
      <p>This site is open source. <a>Improve this page.</a></p>
      <h2>本文タイトル</h2>
      <ul><li>This site is open source の項目</li></ul>
    </body></html>`;
    const out = sanitizeGuideHtml(html);
    expect(out).not.toMatch(/<p[^>]*>This site is open source/);
    // ul は保持される（コンテンツ構造）
    expect(out).toContain("<ul>");
  });

  it("相対 href / フラグメントは保持する", () => {
    const html = `<html><body>
      <a href="/abs">a</a><a href="#frag">b</a><a href="./rel">c</a>
    </body></html>`;
    const out = sanitizeGuideHtml(html);
    expect(out).toContain('href="/abs"');
    expect(out).toContain('href="#frag"');
    expect(out).toContain('href="./rel"');
  });
});

describe("isExternalGuideUrl 関数", () => {
  it("同一オリジン (相対) は false", () => {
    expect(isExternalGuideUrl("/path")).toBe(false);
    expect(isExternalGuideUrl("./rel.html")).toBe(false);
  });

  it("別オリジンは true", () => {
    expect(isExternalGuideUrl("https://example.com/x")).toBe(true);
  });

  it("不正な URL は false", () => {
    expect(isExternalGuideUrl("ht!tp:/x")).toBe(false);
  });
});
