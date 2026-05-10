/**
 * ノート外の下部エリア：GitHub リンク + コピーライト + 文字サイズ切り替え。
 *
 * 文字サイズボタンの押下状態は既存コントローラ（`fontSizeManager` 等）が
 * `aria-pressed` / `active` クラスを付け替えて表現する。
 *
 * NOTE: 旧 `.outer-bottom-row` / `.outer-github-link(-label)` / `.outer-copyright` /
 *       `.outer-bottom-actions` の各スタイルは Tailwind ユーティリティへ移行済み。
 *       SVG への `width/height` 指定は元 CSS の `.outer-github-link svg`（30×30）を
 *       JSX 側の `width`/`height` 属性で表現する（既存マークアップ通り）。
 */

export function OuterBottomRow(): React.JSX.Element {
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
        © 2026 goataka
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
            className="font-size-btn active cursor-pointer border border-solid border-[#c8d8e8] rounded-md bg-[#f0f7ff] px-[10px] py-1 text-[#586069] font-semibold font-[inherit] transition-[background,color,border-color] duration-200 hover:border-[#0366d6] hover:text-[#0366d6] hover:bg-[#e0efff] [&.active]:bg-[#0366d6] [&.active]:text-white [&.active]:border-[#0366d6] text-[11px]"
            data-size="small"
            aria-pressed="true"
            title="文字サイズ：小"
          >
            小
          </button>
          <button
            className="font-size-btn cursor-pointer border border-solid border-[#c8d8e8] rounded-md bg-[#f0f7ff] px-[10px] py-1 text-[#586069] font-semibold font-[inherit] transition-[background,color,border-color] duration-200 hover:border-[#0366d6] hover:text-[#0366d6] hover:bg-[#e0efff] [&.active]:bg-[#0366d6] [&.active]:text-white [&.active]:border-[#0366d6] text-[15px]"
            data-size="medium"
            aria-pressed="false"
            title="文字サイズ：中"
          >
            中
          </button>
          <button
            className="font-size-btn cursor-pointer border border-solid border-[#c8d8e8] rounded-md bg-[#f0f7ff] px-[10px] py-1 text-[#586069] font-semibold font-[inherit] transition-[background,color,border-color] duration-200 hover:border-[#0366d6] hover:text-[#0366d6] hover:bg-[#e0efff] [&.active]:bg-[#0366d6] [&.active]:text-white [&.active]:border-[#0366d6] text-[19px]"
            data-size="large"
            aria-pressed="false"
            title="文字サイズ：大"
          >
            大
          </button>
        </div>
      </div>
    </div>
  );
}
