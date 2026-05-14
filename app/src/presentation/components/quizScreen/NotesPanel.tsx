/**
 * クイズ画面右カラムの手書きメモパネル：ヘッダー（クリア / 消しゴム / 太さ / 色 / 中止）と
 * 描画用キャンバスを含む。
 *
 * キャンバスへの描画と各コントロールの挙動は `NotesController` が DOM 操作で実装する。
 *
 * `notes-btn.eraser-active` は legacy 側の `classList.toggle("eraser-active", isEraser)`
 * と互換にするため、Tailwind の arbitrary variant `[&.eraser-active]:` を採用する。
 */

import { notesButton, penSelect, cancelQuizButton } from "../../styles/notesPanelStyles";

interface NotesPanelProps {
  showKanjiInput: boolean;
}

export function NotesPanel({ showKanjiInput }: NotesPanelProps): React.JSX.Element {
  const notesControlsClass = [
    "notes-controls",
    "flex",
    "items-center",
    "gap-2",
    "max-[600px]:w-full",
    "max-[600px]:justify-between",
    showKanjiInput ? "hidden" : "",
  ].join(" ");
  const notesCanvasClass = [
    "min-h-[400px]",
    "w-full",
    "flex-1",
    "cursor-crosshair",
    "touch-none",
    "bg-transparent",
    "max-md:min-h-[200px]",
    showKanjiInput ? "hidden" : "block",
  ].join(" ");

  return (
    <>
      <div className="flex shrink-0 items-center justify-between border-b border-solid border-[#e1e4e8] bg-transparent px-[15px] py-2.5 max-[600px]:flex-col max-[600px]:items-start max-[600px]:gap-2.5">
        <span id="notesTitle" className="text-base font-semibold text-[#333]">
          {showKanjiInput ? "✏️ 1文字ずつ書いて漢字を入力できます" : "タッチペンで書けます"}
        </span>
        <div className={notesControlsClass}>
          <button
            id="clearNotesBtn"
            className={notesButton()}
            type="button"
            title="メモをクリア"
            aria-label="メモをクリア"
          >
            🗑️
          </button>
          <button id="eraserBtn" className={notesButton()} type="button" title="消しゴム" aria-label="消しゴム">
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
          <select id="penSizeSelect" className={penSelect()} title="線の太さ" aria-label="線の太さ" defaultValue="2">
            <option value="2">普通</option>
            <option value="4">太い</option>
            <option value="6">極太</option>
          </select>
          <select id="penColorSelect" className={`${penSelect()} w-[60px]`} title="色" aria-label="線の色">
            <option value="#000000">黒</option>
            <option value="#0366d6">青</option>
            <option value="#dc3545">赤</option>
            <option value="#28a745">緑</option>
          </select>
        </div>
        <button
          id="cancelQuizBtn"
          className={cancelQuizButton()}
          type="button"
          title="中止する"
          aria-label="クイズを中止する"
        >
          ✕
        </button>
      </div>
      <canvas id="notesCanvas" className={notesCanvasClass}></canvas>
    </>
  );
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export function formatTodayText(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd}（${WEEKDAYS[date.getDay()]}）`;
}
