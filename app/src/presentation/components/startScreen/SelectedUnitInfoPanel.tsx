/**
 * 「選択中の単元情報」パネル（`#selectedUnitInfo`）の React コンポーネント。
 *
 * 既存の `selectedUnitInfoView.ts` の builder 群と同等の DOM 構造を React で構築する。
 * - 単元（あるいはカテゴリ・学年グループ）の詳細サマリ
 * - 末尾の「✕ 閉じる」ボタン
 *
 * 既存の class 名（`selected-unit-info-body` 等）は CSS 互換のため維持する。
 */

import * as React from "react";
import { gradeColorClass, calcDualProgressPct, parseBacktickText } from "../../uiHelpers";

/** 単元詳細表示に必要なデータ（`buildSelectedUnitInfoBody` と同型）。 */
export interface SelectedUnitInfoData {
  /** 単元名（または親カテゴリ・トップカテゴリ名） */
  name: string;
  /** トップカテゴリ名（パンくずに使用） */
  topCatName?: string;
  /** 親カテゴリ名（パンくずに使用） */
  parentCatName?: string;
  /** 学習指導要領上の学年（"小1" など） */
  grade?: string;
  /** 例文（バッククォート付きテキスト） */
  example?: string;
  /** カテゴリの説明文 */
  description?: string;
  /** 習得済み問題数 */
  mastered: number;
  /** 学習中（未習得かつ過去に出題された）問題数 */
  inProgressCount: number;
  /** 単元内の総問題数 */
  total: number;
}

/** パネルの表示種別。 */
export type SelectedUnitInfoViewModel =
  | { kind: "full"; data: SelectedUnitInfoData; closeAriaLabel: string; onClose: () => void }
  | { kind: "simple"; name: string; closeAriaLabel: string; onClose: () => void };

/** パネル全体の React コンポーネント。 */
export function SelectedUnitInfoPanel({ vm }: { vm: SelectedUnitInfoViewModel }): React.JSX.Element {
  return (
    <div className="relative pr-9">
      {vm.kind === "full" ? <SelectedUnitInfoBody data={vm.data} /> : <SelectedUnitInfoSimpleBody name={vm.name} />}
      <div className="absolute top-0 right-0">
        <SelectedUnitCloseButton ariaLabel={vm.closeAriaLabel} onClick={vm.onClose} />
      </div>
    </div>
  );
}

/** 完全な単元詳細 body（タイトル・カテゴリ・例文・進捗バー）。 */
export function SelectedUnitInfoBody({ data }: { data: SelectedUnitInfoData }): React.JSX.Element {
  const catParts: string[] = [];
  if (data.topCatName) catParts.push(data.topCatName);
  if (data.parentCatName) catParts.push(data.parentCatName);
  const hasCatOrGrade = catParts.length > 0 || !!data.grade;
  const showDescRow = hasCatOrGrade || data.example !== undefined;

  return (
    <div className="selected-unit-info-body flex-1 min-w-0 flex flex-col gap-[3px] pl-[5px]">
      <HeaderRow name={data.name} description={data.description} />
      {showDescRow && <DescRow catParts={catParts} grade={data.grade} example={data.example} />}
      <ProgressRow mastered={data.mastered} inProgressCount={data.inProgressCount} total={data.total} />
    </div>
  );
}

/** カテゴリ・トップカテゴリ選択時用の簡易表示（タイトルのみ）。 */
export function SelectedUnitInfoSimpleBody({ name }: { name: string }): React.JSX.Element {
  return (
    <div className="selected-unit-info-body flex-1 min-w-0 flex flex-col gap-[3px] pl-[5px]">
      <span className="selected-unit-info-name text-base font-bold text-[#0366d6] whitespace-nowrap overflow-hidden text-ellipsis">
        {name}
      </span>
    </div>
  );
}

/** 「✕ 閉じる」ボタン。 */
export function SelectedUnitCloseButton({
  ariaLabel,
  onClick,
}: {
  ariaLabel: string;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      className="selected-unit-close-btn shrink-0 bg-none border border-[#c8d8f8] rounded-full w-[26px] h-[26px] text-sm leading-none cursor-pointer text-[#586069] transition-[background,color,border-color] duration-150 flex items-center justify-center p-0 hover:bg-[#0366d6] hover:border-[#0366d6] hover:text-white focus-visible:bg-[#0366d6] focus-visible:border-[#0366d6] focus-visible:text-white focus-visible:outline-3 focus-visible:outline-[#9ecbff] focus-visible:outline-offset-2"
      title="閉じる"
      aria-label={ariaLabel}
      onClick={onClick}
    >
      ✕
    </button>
  );
}

function HeaderRow({ name, description }: { name: string; description?: string }): React.JSX.Element {
  return (
    <div className="selected-unit-info-header-row flex items-start justify-between gap-2 min-w-0">
      <div className="selected-unit-info-header-left flex-1 min-w-0">
        <span className="selected-unit-info-name text-base font-bold text-[#0366d6] whitespace-nowrap overflow-hidden text-ellipsis">
          {name}
        </span>
      </div>
      {description !== undefined && (
        <div className="selected-unit-info-header-right shrink-0 text-right">
          <div className="selected-unit-info-desc-right selected-unit-info-desc text-base text-[#444d56] mt-[3px]">
            {description}
          </div>
        </div>
      )}
    </div>
  );
}

function DescRow({
  catParts,
  grade,
  example,
}: {
  catParts: string[];
  grade?: string;
  example?: string;
}): React.JSX.Element {
  return (
    <div className="selected-unit-info-desc-row flex items-center justify-between gap-2 min-w-0">
      <div className="selected-unit-info-desc-left flex-1 min-w-0 flex items-center gap-1">
        {catParts.length > 0 && (
          <span className="selected-unit-info-category text-[13px] text-[#586069] bg-[#f0f0f0] px-1.5 py-px rounded-[10px] whitespace-nowrap">
            {catParts.join(" › ")}
          </span>
        )}
        {grade && <GradeBadge grade={grade} />}
      </div>
      {/* selected-unit-info-example の ::before { content: "例）" } は CSS に残置 */}
      {example !== undefined && (
        <div className="selected-unit-info-desc-right selected-unit-info-example shrink-0 text-right">
          <BacktickText text={example} />
        </div>
      )}
    </div>
  );
}

function GradeBadge({ grade }: { grade: string }): React.JSX.Element {
  const colorClass = gradeColorClass(grade);
  const className = [
    "category-grade",
    colorClass,
    "text-xs whitespace-nowrap px-[5px] py-px rounded-[10px] shrink-0",
    "[&.grade-elementary]:text-[#c0392b] [&.grade-elementary]:bg-[#fde8e8]",
    "[&.grade-middle]:text-[#0366d6] [&.grade-middle]:bg-[#e8f0fe]",
    "[&.grade-high]:text-[#1a7f37] [&.grade-high]:bg-[#e8f8f0]",
  ]
    .filter(Boolean)
    .join(" ");
  return <span className={className}>{grade}</span>;
}

function ProgressRow({
  mastered,
  inProgressCount,
  total,
}: {
  mastered: number;
  inProgressCount: number;
  total: number;
}): React.JSX.Element {
  const { masteredPct, inProgressPct } = calcDualProgressPct(mastered, inProgressCount, total);
  const label = inProgressCount > 0 ? `${mastered}(${inProgressCount})/${total}` : `${mastered}/${total}`;
  return (
    <div className="selected-unit-progress-row flex items-center gap-2 mt-1 w-full">
      <div className="selected-unit-progress-bar flex-1 h-1.5 bg-[#e1e4e8] rounded-[3px] overflow-hidden flex">
        <div
          className="selected-unit-progress-fill h-full bg-[#28a745] rounded-[3px] transition-[width] duration-300 ease shrink-0"
          style={{ width: `${masteredPct}%` }}
        />
        <div
          className="selected-unit-progress-fill-inprogress h-full bg-[#f0a800] rounded-[3px] transition-[width] duration-300 ease shrink-0"
          style={{ width: `${inProgressPct}%` }}
        />
      </div>
      <span className="selected-unit-progress-label text-xs text-[#586069] whitespace-nowrap">{label}</span>
    </div>
  );
}

/**
 * バッククォート区切りテキストを `<code>` でハイライトしながら描画する。
 * 既存の `renderBacktickText` と同等の出力（テキストノードと `<code>` の混在）。
 */
function BacktickText({ text }: { text: string }): React.JSX.Element {
  const parts = parseBacktickText(text);
  return (
    <>
      {parts.map((part, i) =>
        part.type === "code" ? (
          <code key={i} className="category-example-highlight">
            {part.text}
          </code>
        ) : (
          // テキストノードと同等の出力に保つため Fragment でラップ（DOM ノードを増やさない）
          <React.Fragment key={i}>{part.text}</React.Fragment>
        ),
      )}
    </>
  );
}
