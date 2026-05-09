/**
 * クイズ画面右カラムの手書きメモパネル：ヘッダー（クリア / 消しゴム / 太さ / 色 / 中止）と
 * 描画用キャンバスを含む。
 *
 * キャンバスへの描画と各コントロールの挙動は `NotesController` が DOM 操作で実装する。
 */

export function NotesPanel(): React.JSX.Element {
  return (
    <>
      <div className="notes-header">
        <span id="notesTitle" className="notes-title">
          タッチペンで書けます
        </span>
        <div className="notes-controls">
          <button id="clearNotesBtn" className="notes-btn" type="button" title="メモをクリア" aria-label="メモをクリア">
            🗑️
          </button>
          <button id="eraserBtn" className="notes-btn" type="button" title="消しゴム" aria-label="消しゴム">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
              aria-hidden="true"
            >
              <path d="M8.086 2.207a2 2 0 0 1 2.828 0l3.879 3.879a2 2 0 0 1 0 2.828l-5.5 5.5A2 2 0 0 1 7.879 15H5.12a2 2 0 0 1-1.414-.586l-2.5-2.5a2 2 0 0 1 0-2.828l6.879-6.879zm.66 11.34L3.453 8.254 1.914 9.793a1 1 0 0 0 0 1.414l2.5 2.5a1 1 0 0 0 .707.293H7.88a1 1 0 0 0 .707-.293l.16-.16zm.255-8.172 4.893 4.894-2.276 2.035-5.022-5.022 2.405-1.907z" />
            </svg>
          </button>
          <select
            id="penSizeSelect"
            className="pen-size-select"
            title="線の太さ"
            aria-label="線の太さ"
            defaultValue="2"
          >
            <option value="2">普通</option>
            <option value="4">太い</option>
            <option value="6">極太</option>
          </select>
          <select id="penColorSelect" className="pen-color-select" title="色" aria-label="線の色">
            <option value="#000000">黒</option>
            <option value="#0366d6">青</option>
            <option value="#dc3545">赤</option>
            <option value="#28a745">緑</option>
          </select>
        </div>
        <button
          id="cancelQuizBtn"
          className="cancel-quiz-btn"
          type="button"
          title="中止する"
          aria-label="クイズを中止する"
        >
          ✕
        </button>
      </div>
      <canvas id="notesCanvas" className="notes-canvas"></canvas>
    </>
  );
}
