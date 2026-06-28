/**
 * 解説 HTML のサニタイズ。
 *
 * `loadGuideContent` および `<GuideContent>` React コンポーネントから共有される、
 * 副作用ゼロの純粋関数。同一オリジン HTML を受け取り、XSS リスクとなる要素・属性を
 * 除去したうえで、表示すべき本体（`<body>` 内）の innerHTML 文字列を返す。
 *
 * 除去対象:
 * - `<script>` / `<iframe>` / `<object>` / `<embed>` / `<form>` / 危険な submit ボタン等
 * - `on*` イベントハンドラ属性
 * - `style` 属性
 * - 安全でない URL（`javascript:` / `data:` 等）を持つ `href` / `src` / `xlink:href` /
 *   `formaction` / `action` 属性
 * - すべての `id` 属性（注入先ページの ID と衝突するため）
 * - GitHub Pages 系の不要要素（site-header / site-footer / edit-link 等）
 * - 「This site is open source」「Improve this page」を含む説明的要素
 */

/**
 * URL が安全な http(s) または相対パスかどうかを判定する。
 * `mailto:` 等はフィッシングに悪用されうるため許可しない。
 */
function isSafeGuideUrl(raw: string | null): boolean {
  const trimmed = raw?.trim() ?? "";
  if (trimmed === "") return false;
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("?") ||
    trimmed.startsWith("./") ||
    trimmed.startsWith("../")
  ) {
    return true;
  }
  try {
    const parsed = new URL(trimmed, window.location.href);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * 相対 URL を基準 URL に対して解決し、絶対 URL 文字列を返す。
 * フラグメント（`#...`）やクエリ（`?...`）のみのリンク、既に絶対 URL のものは
 * SPA ナビゲーションや既存挙動を壊さないため書き換え対象外（null を返す）とする。
 */
function resolveRelativeUrl(value: string, baseUrl: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.startsWith("#") || trimmed.startsWith("?")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith("//")) return null;
  try {
    return new URL(trimmed, baseUrl).href;
  } catch {
    return null;
  }
}

/**
 * 解説 HTML をサニタイズして表示用の本体 HTML 文字列を返す。
 *
 * @param html 同一オリジンから fetch した生の HTML
 * @param baseUrl 画像など相対 URL を解決するための基準 URL（解説ページの URL）。
 *   省略時は相対 URL の書き換えを行わない。注入先（アプリ）の URL と解説ページの
 *   ディレクトリが異なる場合、相対 `src`（例: `../images/foo.png`）が壊れるため、
 *   解説ページ URL を基準に絶対 URL へ解決して画像が表示されるようにする。
 * @returns `<body>` 内の innerHTML（GitHub Pages 系装飾要素を除去した状態）
 */
export function sanitizeGuideHtml(html: string, baseUrl?: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // XSS 対策: script 要素・on* 属性・危険な要素を除去する
  doc
    .querySelectorAll(
      "script, iframe, object, embed, link[rel='import'], meta[http-equiv='refresh'], form, button[type='submit'], input[type='submit']",
    )
    .forEach((el) => el.remove());

  doc.querySelectorAll("*").forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
        return;
      }
      if (name === "style") {
        el.removeAttribute(attr.name);
        return;
      }
      if (name === "href" || name === "src" || name === "xlink:href" || name === "formaction" || name === "action") {
        if (!isSafeGuideUrl(attr.value)) {
          el.removeAttribute(attr.name);
          return;
        }
        // 画像等の相対 src のみ baseUrl 基準で絶対 URL へ解決する（href は対象外）
        if (name === "src" && baseUrl) {
          const resolved = resolveRelativeUrl(attr.value, baseUrl);
          if (resolved !== null) el.setAttribute(attr.name, resolved);
        }
      }
    });
  });

  // 注入コンテンツ内のすべての id 属性を除去して主ページIDとの衝突を防ぐ
  doc.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));

  // body のコンテンツを取得（site-header・site-footer・post-header・スタイル等を除く）
  const bodyClone = doc.body.cloneNode(true) as HTMLBodyElement;
  bodyClone
    .querySelectorAll(
      "header.site-header, footer.site-footer, footer, header.post-header, style, .site-nav, .site-title, a.site-title",
    )
    .forEach((el) => el.remove());
  // 「This site is open source. Improve this page.」等の GitHub Pages 固有要素を除去
  bodyClone
    .querySelectorAll(".edit-link, .gh-edit-link, [class*='improve'], [class*='edit-page']")
    .forEach((el) => el.remove());
  // テキストに「This site is open source」または「Improve this page」を含む要素を除去する
  // ただし h1〜h6・table・ul・ol 等のコンテンツ構造を持つ要素は除去しない（親コンテナの誤削除を防ぐ）
  const contentStructureSelector = "h1, h2, h3, h4, h5, h6, table, ul, ol";
  bodyClone.querySelectorAll("p, div, span, aside").forEach((el) => {
    const text = el.textContent ?? "";
    if (
      (text.includes("This site is open source") || text.includes("Improve this page")) &&
      !el.querySelector(contentStructureSelector)
    ) {
      el.remove();
    }
  });

  // 解説タブでは h1（ページタイトル）のみ表示しない
  bodyClone.querySelectorAll("h1").forEach((el) => el.remove());

  return bodyClone.innerHTML;
}

/**
 * 与えられた URL が現在のオリジンと異なるかを判定する。
 * 外部オリジンの場合、`<GuideContent>` は埋め込みではなく別タブリンクを表示する。
 */
export function isExternalGuideUrl(guideUrl: string): boolean {
  try {
    const parsed = new URL(guideUrl, window.location.href);
    return parsed.origin !== window.location.origin;
  } catch {
    return false;
  }
}
