/**
 * 漢字 / ひらがな手書き入力エリア（text-input 問題のときのみ表示）。
 *
 * `KanjiCanvasController` がキャンバスへの描画と認識結果のリスト表示を制御する。
 * 折りたたみトグルボタンや「最後の1画を消す」「全部消す」も含む。
 *
 * クラス名（`kanji-input-body` / `kanji-canvas` / `kanji-candidates-area` /
 * `kanji-candidate-list`）は `16-admin.css` のレスポンシブ上書き
 * （`@media (max-width: ...)` 内）から参照されるため**残置**している。
 * Tailwind ユーティリティはレイヤー優先度が低く、レスポンシブ上書きが
 * 有効に働くため共存できる。
 */

// すべての kanji 操作ボタンに共通する見た目（旧 `.kanji-ctrl-btn`）。
const kanjiCtrlBtnClass =
  "cursor-pointer rounded border border-solid border-[#e1e4e8] bg-white px-2.5 py-1 text-base transition-colors duration-150 hover:bg-[#f3f4f6]";

interface KanjiInputAreaProps {
  showKanjiInput: boolean;
}

export function KanjiInputArea({ showKanjiInput }: KanjiInputAreaProps): React.JSX.Element {
  const rootClass = [
    showKanjiInput ? "flex" : "hidden",
    "flex-col",
    "gap-2",
    "border-t",
    "border-solid",
    "border-[#e1e4e8]",
    "p-2",
  ].join(" ");
  return (
    <div id="kanjiInputArea" className={rootClass}>
      <div className="kanji-input-header flex items-center justify-between gap-2">
        <span className="text-[15px] text-[#586069]">1文字ずつ書いてください</span>
      </div>
      <div id="kanjiInputBody" className="kanji-input-body flex w-full flex-1 flex-row items-start gap-2 min-h-0">
        <div className="inline-flex shrink-0 overflow-hidden rounded-md border-2 border-solid border-[#e1e4e8]">
          <canvas
            id="kanjiCanvas"
            className="kanji-canvas block h-[400px] w-[400px] shrink-0 cursor-crosshair touch-none bg-white"
            width="400"
            height="400"
            data-stroke-numbers="false"
          ></canvas>
        </div>
        <div className="kanji-candidates-area flex flex-col items-end gap-2">
          <div className="flex justify-end gap-1.5">
            <button
              id="kanjiDeleteLastBtn"
              className={kanjiCtrlBtnClass}
              type="button"
              title="最後の1画を消す"
              aria-label="最後の1画を消す"
            >
              ↩
            </button>
            <button
              id="kanjiEraseBtn"
              className={kanjiCtrlBtnClass}
              type="button"
              title="全部消す"
              aria-label="全部消す"
            >
              🗑️
            </button>
            <button
              id="kanjiToggleBtn"
              className={kanjiCtrlBtnClass}
              type="button"
              title="入力エリアを折りたたむ"
              aria-label="入力エリアを折りたたむ"
              aria-expanded="true"
            >
              ▲
            </button>
          </div>
          <div id="kanjiCandidateList" className="kanji-candidate-list flex min-h-10 min-w-[50px] flex-col gap-1"></div>
        </div>
      </div>
    </div>
  );
}
