/**
 * ノート外の下部エリア：GitHub リンク + コピーライト + 文字サイズ切り替え。
 *
 * 文字サイズボタンの押下状態は既存コントローラ（`fontSizeManager` 等）が
 * `aria-pressed` / `active` クラスを付け替えて表現する。
 */

export function OuterBottomRow(): React.JSX.Element {
  return (
    <div className="outer-bottom-row">
      <a
        id="githubBtn"
        className="outer-github-link"
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
        <span className="outer-github-link-label">View on GitHub</span>
      </a>
      <div className="outer-copyright">© 2026 goataka</div>
      <div className="outer-bottom-actions">
        <div id="fontSizeBtns" className="font-size-btns" role="group" aria-label="文字サイズ">
          <span className="font-size-icon" aria-hidden="true">
            A
          </span>
          <button className="font-size-btn active" data-size="small" aria-pressed="true" title="文字サイズ：小">
            小
          </button>
          <button className="font-size-btn" data-size="medium" aria-pressed="false" title="文字サイズ：中">
            中
          </button>
          <button className="font-size-btn" data-size="large" aria-pressed="false" title="文字サイズ：大">
            大
          </button>
        </div>
      </div>
    </div>
  );
}
