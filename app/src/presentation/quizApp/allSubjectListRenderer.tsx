/**
 * 「総合」タブ用のおすすめ単元一覧描画ヘルパー（React 版）。
 *
 * 全教科横断のおすすめ単元を1つのリストとして表示する。
 * 目標数分の単元をメインリストとして、追加αを区切り線の下に表示する。
 *
 * `categoryList` 共有コンテナへ React で同期描画する。
 * 公開 API（`renderAllSubjectList(params)`）と DOM の class 構造は既存実装と互換。
 */

import { useState } from "react";
import type { QuizUseCase, GlobalRecommendedUnit } from "../../application/quizUseCase";
import { calcDualProgressPct, gradeColorClass, SUBJECTS } from "../uiHelpers";
import { categoryListContentStore } from "../components/categoryListContentStore";

/**
 * 教科 ID からアイコン文字列を返す。
 * SUBJECTS（presentation 層）から解決し、application 層に UI 情報を持たせない。
 */
function getSubjectIcon(subjectId: string): string {
  return SUBJECTS.find((s) => s.id === subjectId)?.icon ?? "📚";
}

/** 目標数の選択肢 */
export const GLOBAL_RECOMMENDED_COUNT_OPTIONS = [3, 5, 8, 13, 21];

/** デフォルトのα数（目標数の半分程度） */
function calcAlphaCount(goalCount: number): number {
  return Math.max(2, Math.ceil(goalCount / 2));
}

/** 総合タブ教科一覧描画のパラメータ。 */
export interface RenderAllSubjectListParams {
  useCase: QuizUseCase;
  /** 全教科共通のおすすめ単元目標数。 */
  globalRecommendedCount: number;
  /** 目標数変更時に呼ばれる（永続化＋再描画）。 */
  onGlobalCountChange: (count: number) => void;
  /** 単元カードクリック時に呼ばれる。 */
  onSelectUnit: (subjectId: string, categoryId: string, categoryName: string) => void;
}

/** 「総合」タブ用のおすすめ単元一覧を描画する。 */
export function renderAllSubjectList(params: RenderAllSubjectListParams): void {
  const goalCount = params.globalRecommendedCount;
  const alphaCount = calcAlphaCount(goalCount);

  categoryListContentStore.set(
    <GlobalRecommendedList
      useCase={params.useCase}
      goalCount={goalCount}
      alphaCount={alphaCount}
      onGlobalCountChange={params.onGlobalCountChange}
      onSelectUnit={params.onSelectUnit}
    />,
  );
}

// ─── React コンポーネント ────────────────────────────────────────────────

interface GlobalRecommendedListProps {
  useCase: QuizUseCase;
  goalCount: number;
  alphaCount: number;
  onGlobalCountChange: (count: number) => void;
  onSelectUnit: (subjectId: string, categoryId: string, categoryName: string) => void;
}

function GlobalRecommendedList({
  useCase,
  goalCount,
  alphaCount,
  onGlobalCountChange,
  onSelectUnit,
}: GlobalRecommendedListProps): React.JSX.Element {
  // 「もっと追加」で増やす一時的な追加件数（永続化しない。目標数設定とは別）
  const [extraCount, setExtraCount] = useState(0);
  const units = useCase.getRecommendedUnitsGlobal(goalCount, alphaCount + extraCount);

  const mainUnits = units.slice(0, goalCount);
  const extraUnits = units.slice(goalCount);

  return (
    <div className="global-recommended-list flex flex-col gap-0">
      <GlobalCountHeaderRow currentCount={goalCount} onCountChange={onGlobalCountChange} />
      {mainUnits.length === 0 ? (
        <div className="global-recommended-empty px-3 py-2 text-sm text-[#586069]">おすすめ単元なし</div>
      ) : (
        mainUnits.map((unit) => (
          <RecommendedUnitCard
            key={`${unit.subject}::${unit.categoryId}`}
            unit={unit}
            onActivate={() => onSelectUnit(unit.subject, unit.categoryId, unit.categoryName)}
          />
        ))
      )}
      {extraUnits.length > 0 && (
        <>
          <div
            className="global-recommended-divider flex items-center gap-2 px-2 py-1.5"
            role="separator"
            aria-label="目標数を超えた単元"
          >
            <div className="flex-1 h-px bg-[#d0d7de]" />
            <span className="text-[10px] text-[#8b949e] whitespace-nowrap select-none">＋α</span>
            <div className="flex-1 h-px bg-[#d0d7de]" />
          </div>
          {extraUnits.map((unit) => (
            <RecommendedUnitCard
              key={`${unit.subject}::${unit.categoryId}`}
              unit={unit}
              onActivate={() => onSelectUnit(unit.subject, unit.categoryId, unit.categoryName)}
            />
          ))}
        </>
      )}
      <div className="global-recommended-add-row px-3 pt-1.5 pb-2">
        <button
          type="button"
          className="global-recommended-add-btn w-full text-sm py-1 px-2 rounded border border-dashed border-[#d1d5da] text-[#586069] bg-transparent cursor-pointer hover:bg-[#f6f8fa] hover:border-[#0366d6] hover:text-[#0366d6] transition-[background,border-color,color] duration-150"
          onClick={() => setExtraCount((c) => c + calcAlphaCount(goalCount))}
        >
          ＋ もっと追加
        </button>
      </div>
    </div>
  );
}

function GlobalCountHeaderRow({
  currentCount,
  onCountChange,
}: {
  currentCount: number;
  onCountChange: (n: number) => void;
}): React.JSX.Element {
  return (
    <div className="global-count-header-row flex items-center gap-[5px] pt-1 px-1 pb-0.5 pl-0.5">
      <span className="global-count-icon text-lg leading-none shrink-0">🎯</span>
      <span className="global-count-label text-sm font-bold text-[#24292e]">おすすめ</span>
      <div className="global-count-controls flex items-center gap-0.5 ml-auto">
        <span className="global-count-label-small text-[11px] text-[#586069] mr-0.5">目標数:</span>
        {GLOBAL_RECOMMENDED_COUNT_OPTIONS.map((n) => {
          const active = currentCount === n;
          return (
            <button
              key={n}
              type="button"
              className={[
                "overall-rec-count-btn",
                "text-xs px-2 py-0.5 border border-[#d1d5da] rounded bg-transparent text-[#24292e] cursor-pointer",
                "transition-[background,border-color] duration-150",
                "hover:bg-[#e8f0fe] hover:border-[#0366d6]",
                "[&.active]:bg-[#0366d6] [&.active]:border-[#0366d6] [&.active]:text-white",
                active ? "active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={active}
              onClick={() => onCountChange(n)}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** ステージバッジを返す */
function stageBadge(stage: number): { emoji: string; sizeClass: string } | null {
  if (stage === 1) return { emoji: "🎖️", sizeClass: "text-sm" };
  if (stage === 2) return { emoji: "🏆", sizeClass: "text-base" };
  if (stage === 3) return { emoji: "👑", sizeClass: "text-lg" };
  return null;
}

function RecommendedUnitCard({
  unit,
  onActivate,
}: {
  unit: GlobalRecommendedUnit;
  onActivate: () => void;
}): React.JSX.Element {
  const badge = stageBadge(unit.stage);
  const { masteredPct, inProgressPct } = calcDualProgressPct(unit.mastered, unit.inProgressCount, unit.totalQuestions);
  const gradeClassName = unit.referenceGrade ? gradeColorClass(unit.referenceGrade) : "";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate();
    }
  };

  return (
    <div
      className="subject-overview-item flex flex-row items-start gap-1.5 px-3 py-2 rounded-lg bg-transparent cursor-pointer select-none transition-[background] duration-150 text-left hover:bg-[#e8f0fe] focus:outline-2 focus:outline-[#0366d6] focus:outline-offset-2"
      role="button"
      tabIndex={0}
      data-subject={unit.subject}
      onClick={onActivate}
      onKeyDown={handleKeyDown}
    >
      <span className="subject-overview-status text-sm shrink-0 leading-none pt-px" aria-hidden="true">
        {getSubjectIcon(unit.subject)}
      </span>
      <div className="subject-overview-name-area flex-1 min-w-0 flex flex-col gap-[3px]">
        <div className="subject-overview-title-row flex flex-row items-center gap-1 min-w-0 flex-wrap">
          <span className={`subject-overview-rec-name font-semibold min-w-0 ${badge ? badge.sizeClass : "text-sm"}`}>
            {unit.categoryName}
          </span>
          {badge && (
            <span
              className={`stage-badge ${badge.sizeClass} shrink-0 leading-none`}
              aria-label={`ステージ${unit.stage}`}
            >
              {badge.emoji}
            </span>
          )}
          {unit.referenceGrade && (
            <span
              className={[
                "subject-overview-grade ml-auto shrink-0",
                "text-[10px] px-[4px] py-px rounded-[10px] whitespace-nowrap",
                "[&.grade-elementary]:text-[#c0392b] [&.grade-elementary]:bg-[#fde8e8]",
                "[&.grade-middle]:text-[#0366d6] [&.grade-middle]:bg-[#e8f0fe]",
                "[&.grade-high]:text-[#1a7f37] [&.grade-high]:bg-[#e8f8f0]",
                gradeClassName,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {unit.referenceGrade}
            </span>
          )}
        </div>
        <div className="subject-overview-progress-row flex items-center gap-1.5 min-w-0">
          <div className="subject-overview-progress-bar flex-1 h-1 bg-[#e1e4e8] rounded-sm overflow-hidden flex">
            <div
              className="subject-overview-progress-fill h-full bg-[#28a745] rounded-sm shrink-0"
              style={{ width: `${masteredPct}%` }}
            />
            <div
              className="subject-overview-progress-fill-inprogress h-full bg-[#f0a800] rounded-sm shrink-0"
              style={{ width: `${inProgressPct}%` }}
            />
          </div>
          {unit.totalQuestions > 0 && (unit.mastered > 0 || unit.inProgressCount > 0) && (
            <span className="subject-overview-pct text-[11px] text-[#586069] whitespace-nowrap shrink-0">
              {unit.inProgressCount > 0
                ? `${unit.mastered}(${unit.inProgressCount})/${unit.totalQuestions}`
                : `${unit.mastered}/${unit.totalQuestions}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
