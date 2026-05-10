/**
 * 解説（guide）コンテンツのフェッチ・サニタイズ・挿入ヘルパー。
 *
 * 同一オリジンの HTML を fetch して、純粋なサニタイズ関数 `sanitizeGuideHtml` で
 * `<script>` / `<iframe>` / `on*` 属性 / 安全でないスキーム（`javascript:` 等）の URL を
 * 除去したうえで指定コンテナに挿入する（http(s) の `<img src>` 等の外部リソース URL
 * 自体は許容するため、外部画像は表示される）。
 * 外部オリジンの URL は CORS 対策として別タブで開くリンクに置き換える。
 *
 * レースコンディション対策として、最後に開始したリクエストのみ反映するためのトークンを
 * 呼び出し元から渡してもらう。
 */

import { isExternalGuideUrl, sanitizeGuideHtml } from "./sanitizeGuideHtml";

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

  if (isExternalGuideUrl(guideUrl)) {
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

  try {
    const response = await fetch(guideUrl);
    if (token !== tokenSource.currentToken()) return; // 古いリクエストは破棄
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();

    const sanitizedBody = sanitizeGuideHtml(html);

    // guide-content コンテナを作成（または既存を再利用）して直接挿入する
    let guideContent = container.querySelector<HTMLElement>(".guide-content");
    if (!guideContent) {
      guideContent = document.createElement("div");
      guideContent.className = "guide-content";
      container.appendChild(guideContent);
    }
    guideContent.innerHTML = sanitizedBody;

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
