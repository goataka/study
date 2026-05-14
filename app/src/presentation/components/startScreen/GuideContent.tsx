/**
 * 解説 HTML を fetch・サニタイズして表示する React コンポーネント。
 *
 * 命令的な `loadGuideContent` ヘルパーと同じ責務を React 化した版で、
 * `useEffect` ベースのライフサイクルで以下を扱う:
 *
 * - `guideUrl` が変わるたびに fetch を起動
 * - 外部オリジンの URL は別タブリンクへフォールバック
 * - レースコンディション対策として、最後に開始したリクエストのみ反映
 * - `sanitizeGuideHtml` で XSS リスクを除去したうえで `dangerouslySetInnerHTML` に渡す
 *
 * 既存の `loadGuideContent`（命令的版）は後方互換のため残しているが、
 * 新規マウント箇所はこちらを優先して使う想定。
 */

import * as React from "react";
import { isExternalGuideUrl, sanitizeGuideHtml } from "../../quizApp/sanitizeGuideHtml";
import { guideContent } from "../../styles/guideContentStyles";
import { resolveGuideFetchUrl } from "../../quizApp/guideFetchUrl";

export interface GuideContentProps {
  /** 解説ページの URL（同一オリジン HTML または外部 URL）。null の場合は何も表示しない。 */
  guideUrl: string | null;
}

type LoadState =
  | { kind: "idle" }
  | { kind: "loading"; url: string }
  | { kind: "external"; url: string }
  | { kind: "ready"; url: string; html: string }
  | { kind: "error"; url: string };

export function GuideContent({ guideUrl }: GuideContentProps): React.JSX.Element | null {
  const [state, setState] = React.useState<LoadState>({ kind: "idle" });

  React.useEffect(() => {
    if (guideUrl === null) {
      setState({ kind: "idle" });
      return;
    }

    if (isExternalGuideUrl(guideUrl)) {
      setState({ kind: "external", url: guideUrl });
      return;
    }

    let cancelled = false;
    setState({ kind: "loading", url: guideUrl });

    fetch(resolveGuideFetchUrl(guideUrl))
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((html) => {
        if (cancelled) return;
        setState({ kind: "ready", url: guideUrl, html: sanitizeGuideHtml(html) });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("解説の読み込みに失敗しました:", err);
        setState({ kind: "error", url: guideUrl });
      });

    return () => {
      cancelled = true;
    };
  }, [guideUrl]);

  if (state.kind === "idle" || state.kind === "loading") {
    return null;
  }

  if (state.kind === "external") {
    return (
      <p className="guide-error-msg guide-no-content text-[#586069] text-center px-5 py-10 text-[17px]">
        <a href={state.url} target="_blank" rel="noopener noreferrer">
          解説を別タブで開く
        </a>
      </p>
    );
  }

  if (state.kind === "error") {
    return (
      <p className="guide-error-msg guide-no-content text-[#586069] text-center px-5 py-10 text-[17px]">
        解説の読み込みに失敗しました。
      </p>
    );
  }

  // sanitizeGuideHtml は信頼できるサニタイザとして XSS リスク要素を除去済み。
  // ガイド内のリンクをクリックした際に、アプリ内ハッシュ（#subject=...&category=... 等）へ
  // 遷移するリンクはページリロードを起こさず SPA 内ナビゲーションで処理する。
  return (
    <div
      className={guideContent()}
      dangerouslySetInnerHTML={{ __html: state.html }}
      onClick={(e) => {
        const anchor = (e.target as HTMLElement).closest("a[href]");
        if (!anchor) return;
        const href = (anchor as HTMLAnchorElement).getAttribute("href") ?? "";
        /** ハッシュ文字列（# 含む）がアプリ状態パラメータ subject を持つか確認する。 */
        const isAppStateHash = (rawHash: string): boolean =>
          new URLSearchParams(rawHash.startsWith("#") ? rawHash.slice(1) : rawHash).has("subject");
        let hash: string | null = null;
        if (href.startsWith("#")) {
          // ハッシュのみのリンク: アプリ状態パラメータ（subject）を持つ場合のみ SPA で処理する
          if (isAppStateHash(href)) {
            hash = href;
          }
        } else if (href.includes("#")) {
          // 相対パス + ハッシュ: 同一オリジンかつアプリ状態ハッシュ（subject）の場合のみ処理する
          try {
            const resolved = new URL(href, window.location.href);
            if (resolved.origin === window.location.origin && isAppStateHash(resolved.hash)) {
              hash = resolved.hash || null;
            }
          } catch {
            // 解析失敗はデフォルト動作に任せる
          }
        }
        if (hash) {
          e.preventDefault();
          window.location.hash = hash.startsWith("#") ? hash.slice(1) : hash;
        }
      }}
    />
  );
}
