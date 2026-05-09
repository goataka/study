/**
 * 漢字 / ひらがな手書き入力エリア（text-input 問題のときのみ表示）。
 *
 * `KanjiCanvasController` がキャンバスへの描画と認識結果のリスト表示を制御する。
 * 折りたたみトグルボタンや「最後の1画を消す」「全部消す」も含む。
 */

export function KanjiInputArea(): React.JSX.Element {
  return (
    <div id="kanjiInputArea" className="hidden">
      <div className="kanji-input-header">
        <span className="kanji-input-label">1文字ずつ書いてください</span>
      </div>
      <div id="kanjiInputBody" className="kanji-input-body">
        <div className="kanji-canvas-wrapper">
          <canvas
            id="kanjiCanvas"
            className="kanji-canvas"
            width="400"
            height="400"
            data-stroke-numbers="false"
          ></canvas>
        </div>
        <div className="kanji-candidates-area">
          <div className="kanji-input-controls">
            <button
              id="kanjiDeleteLastBtn"
              className="kanji-ctrl-btn"
              type="button"
              title="最後の1画を消す"
              aria-label="最後の1画を消す"
            >
              ↩
            </button>
            <button id="kanjiEraseBtn" className="kanji-ctrl-btn" type="button" title="全部消す" aria-label="全部消す">
              🗑️
            </button>
            <button
              id="kanjiToggleBtn"
              className="kanji-ctrl-btn"
              type="button"
              title="入力エリアを折りたたむ"
              aria-label="入力エリアを折りたたむ"
              aria-expanded="true"
            >
              ▲
            </button>
          </div>
          <div id="kanjiCandidateList" className="kanji-candidate-list"></div>
        </div>
      </div>
    </div>
  );
}
