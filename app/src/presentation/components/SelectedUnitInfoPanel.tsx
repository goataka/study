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
import { gradeColorClass, calcDualProgressPct, parseBacktickText } from "../uiHelpers";

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
    <>
      {vm.kind === "full" ? <SelectedUnitInfoBody data={vm.data} /> : <SelectedUnitInfoSimpleBody name={vm.name} />}
      <SelectedUnitCloseButton ariaLabel={vm.closeAriaLabel} onClick={vm.onClose} />
    </>
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
    <div className="selected-unit-info-body">
      <HeaderRow name={data.name} description={data.description} />
      {showDescRow && <DescRow catParts={catParts} grade={data.grade} example={data.example} />}
      <ProgressRow mastered={data.mastered} inProgressCount={data.inProgressCount} total={data.total} />
    </div>
  );
}

/** カテゴリ・トップカテゴリ選択時用の簡易表示（タイトルのみ）。 */
export function SelectedUnitInfoSimpleBody({ name }: { name: string }): React.JSX.Element {
  return (
    <div className="selected-unit-info-body">
      <span className="selected-unit-info-name">{name}</span>
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
    <button type="button" className="selected-unit-close-btn" title="閉じる" aria-label={ariaLabel} onClick={onClick}>
      ✕
    </button>
  );
}

function HeaderRow({ name, description }: { name: string; description?: string }): React.JSX.Element {
  return (
    <div className="selected-unit-info-header-row">
      <div className="selected-unit-info-header-left">
        <span className="selected-unit-info-name">{name}</span>
      </div>
      {description !== undefined && (
        <div className="selected-unit-info-header-right">
          <div className="selected-unit-info-desc-right selected-unit-info-desc">{description}</div>
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
    <div className="selected-unit-info-desc-row">
      <div className="selected-unit-info-desc-left">
        {catParts.length > 0 && <span className="selected-unit-info-category">{catParts.join(" › ")}</span>}
        {grade && <GradeBadge grade={grade} />}
      </div>
      {example !== undefined && (
        <div className="selected-unit-info-desc-right selected-unit-info-example">
          <BacktickText text={example} />
        </div>
      )}
    </div>
  );
}

function GradeBadge({ grade }: { grade: string }): React.JSX.Element {
  const colorClass = gradeColorClass(grade);
  const className = ["category-grade", colorClass].filter(Boolean).join(" ");
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
    <div className="selected-unit-progress-row">
      <div className="selected-unit-progress-bar">
        <div className="selected-unit-progress-fill" style={{ width: `${masteredPct}%` }} />
        <div className="selected-unit-progress-fill-inprogress" style={{ width: `${inProgressPct}%` }} />
      </div>
      <span className="selected-unit-progress-label">{label}</span>
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
