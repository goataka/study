/**
 * 解説（guide）コンテンツのフェッチ・サニタイズ・挿入ヘルパー。
 *
 * 同一オリジンの HTML を fetch して `<script>` や `on*` 属性、外部リソースを除去したうえで
 * 指定コンテナに挿入する。外部オリジンの URL は CORS 対策として別タブで開くリンクに置き換える。
 *
 * レースコンディション対策として、最後に開始したリクエストのみ反映するためのトークンを
 * 呼び出し元から渡してもらう。
 */

/**
 * トークン付きで `loadGuideContent` を呼び出すための環境。
 *
 * `nextToken()` を呼ぶたびに新しいトークン番号を発行し、
 * `currentToken()` でその時点の最新トークン番号を取得する。
 */
export interface GuideLoaderTokenSource {
  nextToken: () => number;
  currentToken: () => number;
}

/**
 * 解説 HTML を fetch して container に挿入する。
 *
 * - 同じ URL を表示中なら何もしない
 * - 外部オリジンの URL は別タブで開くリンクに変換する
 * - 取得した HTML から `<script>` / `<iframe>` / `on*` 属性 / `id` 属性を除去する
 * - 古いリクエスト（自分のトークンが最新でない）は破棄する
 *
 * @param container  解説コンテンツを挿入するコンテナ要素
 * @param guideUrl   解説ページの URL（相対パスまたは同一オリジンの HTML）
 * @param tokenSource レースコンディション制御用のトークンソース
 * @param noContent  解説なしメッセージ要素（任意）
 */
export async function loadGuideContent(
  container: HTMLElement,
  guideUrl: string,
  tokenSource: GuideLoaderTokenSource,
  noContent?: HTMLElement,
): Promise<void> {
  if (container.dataset.loadedUrl === guideUrl) return;

  const token = tokenSource.nextToken();

  try {
    const parsed = new URL(guideUrl, window.location.href);
    if (parsed.origin !== window.location.origin) {
      if (token !== tokenSource.currentToken()) return;
      container.dataset.loadedUrl = "";
      container.querySelectorAll(".guide-error-msg").forEach((el) => el.remove());
      const link = document.createElement("p");
      link.className = "guide-error-msg guide-no-content";
      const anchor = document.createElement("a");
      anchor.href = guideUrl;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = "解説を別タブで開く";
      link.appendChild(anchor);
      container.appendChild(link);
      noContent?.classList.add("hidden");
      container.classList.remove("hidden");
      return;
    }
  } catch {
    // URL パースに失敗した場合はそのまま fetch を試みる
  }

  try {
    const response = await fetch(guideUrl);
    if (token !== tokenSource.currentToken()) return; // 古いリクエストは破棄
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // XSS 対策: script 要素・on* 属性・危険な要素を除去する
    doc
      .querySelectorAll(
        "script, iframe, object, embed, link[rel='import'], meta[http-equiv='refresh'], form, button[type='submit'], input[type='submit']",
      )
      .forEach((el) => el.remove());
    // 安全な URL スキーム（http/https/相対パス・フラグメント）の許可リスト判定。
    // mailto: 等はフィッシングに悪用される可能性があるため許可しない。
    const isSafeUrl = (raw: string | null): boolean => {
      const trimmed = raw?.trim() ?? "";
      if (trimmed === "") return false;
      // 相対パス・フラグメント・クエリは安全
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
    };
    doc.querySelectorAll("*").forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        // on* イベントハンドラ属性を除去
        if (name.startsWith("on")) {
          el.removeAttribute(attr.name);
          return;
        }
        // style 属性を除去（CSS 経由の情報流出・クリックジャッキング対策）
        if (name === "style") {
          el.removeAttribute(attr.name);
          return;
        }
        // href / src / xlink:href / formaction / action は安全な URL のみ許可
        if (name === "href" || name === "src" || name === "xlink:href" || name === "formaction" || name === "action") {
          if (!isSafeUrl(attr.value)) {
            el.removeAttribute(attr.name);
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

    // guide-content コンテナを作成（または既存を再利用）して直接挿入する
    let guideContent = container.querySelector<HTMLElement>(".guide-content");
    if (!guideContent) {
      guideContent = document.createElement("div");
      guideContent.className = "guide-content";
      container.appendChild(guideContent);
    }
    guideContent.innerHTML = bodyClone.innerHTML;

    container.dataset.loadedUrl = guideUrl;
    container.classList.remove("hidden");
    noContent?.classList.add("hidden");
  } catch (err) {
    if (token !== tokenSource.currentToken()) return; // 古いリクエストは破棄
    console.error("解説の読み込みに失敗しました:", err);
    container.dataset.loadedUrl = "";
    container.querySelectorAll(".guide-error-msg").forEach((el) => el.remove());
    const errorMsg = document.createElement("p");
    errorMsg.className = "guide-error-msg guide-no-content";
    errorMsg.textContent = "解説の読み込みに失敗しました。";
    container.appendChild(errorMsg);
    noContent?.classList.add("hidden");
  }
}
