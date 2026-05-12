/**
 * ノート外の下部エリア：GitHub リンク + コピーライト + 文字サイズ切り替え。
 *
 * 文字サイズボタンの押下状態は `fontSizeStore` の値から
 * `aria-pressed` / `active` クラスを算出して表現する。
 *
 * NOTE: 旧 `.outer-bottom-row` / `.outer-github-link(-label)` / `.outer-copyright` /
 *       `.outer-bottom-actions` の各スタイルは Tailwind ユーティリティへ移行済み。
 *       SVG への `width/height` 指定は元 CSS の `.outer-github-link svg`（30×30）を
 *       JSX 側の `width`/`height` 属性で表現する（既存マークアップ通り）。
 */

import { useSyncExternalStore } from "react";
import { getFontSizeSnapshot, subscribeFontSizeStore, type FontSizeLevel } from "./fontSizeStore";
import { fontSizeButton } from "../styles/fontSizeButtonStyles";

type DeployEnvironment = "v1" | "rc";
const RC_SWITCH_CONFIRM_MESSAGE = "rc 環境へ切り替えます。よろしいですか？";

// support/_includes/head-custom.html にも同等ロジックがあるが、
// React バンドル外（Jekyll 静的ページ）でも動かすためここで独立して持つ。
function detectCurrentEnvironment(pathname: string): DeployEnvironment {
  const segments = pathname.split("/").filter((segment) => segment.length > 0);
  for (const segment of segments) {
    if (segment === "v1" || segment === "rc") {
      return segment;
    }
  }
  return "v1";
}

function buildEnvironmentUrl(targetEnv: DeployEnvironment): string {
  if (typeof window === "undefined") return "#";

  const url = new URL(window.location.href);
  const segments = url.pathname.split("/");
  const envIndex = segments.findIndex((segment) => segment === "v1" || segment === "rc");

  if (envIndex >= 0) {
    segments[envIndex] = targetEnv;
  } else {
    const insertIndex = segments[segments.length - 1] === "" ? segments.length - 1 : segments.length;
    segments.splice(insertIndex, 0, targetEnv);
  }

  url.pathname = segments.join("/");
  return url.toString();
}

export function OuterBottomRow(): React.JSX.Element {
  const fontSizeLevel = useSyncExternalStore(subscribeFontSizeStore, getFontSizeSnapshot, getFontSizeSnapshot);
  const isActive = (level: FontSizeLevel): boolean => fontSizeLevel === level;
  const currentEnv = typeof window === "undefined" ? "v1" : detectCurrentEnvironment(window.location.pathname);
  const confirmEnvironmentSwitch = (targetEnv: DeployEnvironment): boolean => {
    if (targetEnv !== "rc" || currentEnv === "rc") return true;
    return window.confirm(RC_SWITCH_CONFIRM_MESSAGE);
  };

  return (
    <div className="order-2 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-1 pt-0.5 pb-0.5">
      <a
        id="githubBtn"
        className="col-start-1 inline-flex items-center justify-self-start gap-1.5 px-2 py-1 text-white opacity-90 no-underline transition-opacity duration-150 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80"
        href="https://github.com/goataka/study"
        target="_blank"
        rel="noopener noreferrer"
        title="GitHubリポジトリを開く"
        aria-label="GitHubリポジトリを開く"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
        </svg>
        <span className="text-[14px] font-semibold tracking-[0.02em]">View on GitHub</span>
      </a>
      <div className="col-start-2 shrink-0 px-0 py-0.5 text-center text-[13px] tracking-[0.05em] text-white">
        © 2026 goataka{" "}
        <span id="environmentSwitch" className="ml-1 inline-flex items-center gap-1.5 tracking-normal">
          <span>[</span>
          {currentEnv === "v1" ? (
            <strong className="font-bold">v1</strong>
          ) : (
            <a className="underline hover:opacity-80" href={buildEnvironmentUrl("v1")}>
              v1
            </a>
          )}
          <span>|</span>
          {currentEnv === "rc" ? (
            <strong className="font-bold">rc</strong>
          ) : (
            <a
              className="underline hover:opacity-80"
              href={buildEnvironmentUrl("rc")}
              onClick={(e) => {
                if (!confirmEnvironmentSwitch("rc")) e.preventDefault();
              }}
            >
              rc
            </a>
          )}
          <span>]</span>
        </span>
      </div>
      <div className="col-start-3 flex items-center gap-2.5 justify-self-end">
        <div id="fontSizeBtns" className="font-size-btns flex items-center gap-1" role="group" aria-label="文字サイズ">
          <span
            className="font-size-icon text-lg font-bold text-white mr-0.5 select-none leading-none"
            aria-hidden="true"
          >
            A
          </span>
          <button
            className={fontSizeButton({ size: "small", active: isActive("small") })}
            data-size="small"
            aria-pressed={isActive("small")}
            title="文字サイズ：小"
          >
            小
          </button>
          <button
            className={fontSizeButton({ size: "medium", active: isActive("medium") })}
            data-size="medium"
            aria-pressed={isActive("medium")}
            title="文字サイズ：中"
          >
            中
          </button>
          <button
            className={fontSizeButton({ size: "large", active: isActive("large") })}
            data-size="large"
            aria-pressed={isActive("large")}
            title="文字サイズ：大"
          >
            大
          </button>
        </div>
      </div>
    </div>
  );
}
