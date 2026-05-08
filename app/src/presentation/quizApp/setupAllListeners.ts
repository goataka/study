/**
 * QuizApp の全イベントリスナー登録をまとめるファサード。
 *
 * `quizApp.ts` から肥大化していたセットアップ群を 1 か所に集約し、
 * QuizApp 本体は単一の関数呼び出しで全リスナーを登録できるようにする。
 */

import type { AvatarController } from "../avatarController";
import type { FontSizeLevel } from "./fontSizeManager";
import type { QuestionListFilter } from "./questionListView";
import type { ProgressStatusFilter } from "./urlStateService";
import {
  setupHeaderListeners,
  setupAvatarListeners,
  setupQuizSettingsListeners,
  setupCategoryStatusFilterListeners,
  setupFontSizeListeners,
  setupShareSummaryListeners,
  setupHistoryNavigationListeners,
  setupQuizFlowListeners,
  setupQuestionListFilterListeners,
  setupProgressFilterListeners,
  setupNotesListeners,
  setupNotesPenSelectListeners,
  setupKanjiCanvasListeners,
} from "./eventListeners";

/** すべてのリスナー登録に必要なコールバック群。 */
export interface AllListenersDeps {
  avatarController: AvatarController;
  // クイズ進行
  onStartRandom: () => void;
  onMarkLearnedToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onRetryAll: () => void;
  onBackToStart: () => void;
  onCancelQuiz: () => void;
  onReload: () => void;
  // 問題一覧フィルター
  onQuestionListFilterChange: (value: QuestionListFilter) => void;
  // 進度フィルター
  onProgressStatusFilterChange: (filter: ProgressStatusFilter) => void;
  // ヘッダー
  onTitleClick: () => void;
  onOpenUserNameEdit: () => void;
  onSaveUserName: () => void;
  onCancelUserName: () => void;
  onAdminMenuClick: () => void;
  // クイズ設定
  onQuestionCountChange: (count: number) => void;
  onQuizOrderChange: (order: "random" | "straight") => void;
  onIncludeMasteredChange: (include: boolean) => void;
  // メモ
  onClearNotes: () => void;
  onToggleEraser: () => void;
  // 漢字キャンバス
  onKanjiDeleteLast: () => void;
  onKanjiErase: () => void;
  onKanjiApplyToggleBtnState: (btn: HTMLElement, expanded: boolean) => void;
  // カテゴリ状況フィルター
  onCategoryStatusFilterChange: (filter: "all" | "unlearned" | "studying" | "learned") => void;
  // ペン
  onPenSizeChange: (size: number) => void;
  onPenColorChange: (color: string) => void;
  // フォントサイズ
  onFontSizeChange: (size: FontSizeLevel) => void;
  // 共有サマリ
  onCopySummary: () => void;
  onOpenShareUrl: () => void;
  onShareUrlDisplayClick: () => void;
  onSaveAndCloseShareUrl: () => void;
  onCloseShareUrlEdit: () => void;
  onPopState: () => Promise<void>;
  onMobileBack: () => void;
}

/**
 * QuizApp 起動時に必要なすべての DOM イベントリスナーを登録する。
 */
export function setupAllListeners(deps: AllListenersDeps): void {
  setupQuizFlowListeners({
    onStartRandom: deps.onStartRandom,
    onMarkLearnedToggle: deps.onMarkLearnedToggle,
    onPrev: deps.onPrev,
    onNext: deps.onNext,
    onSubmit: deps.onSubmit,
    onRetryAll: deps.onRetryAll,
    onBackToStart: deps.onBackToStart,
    onCancelQuiz: deps.onCancelQuiz,
    onReload: deps.onReload,
  });
  setupQuestionListFilterListeners(deps.onQuestionListFilterChange);
  setupProgressFilterListeners(deps.onProgressStatusFilterChange);
  setupHeaderListeners({
    onTitleClick: deps.onTitleClick,
    onOpenUserNameEdit: deps.onOpenUserNameEdit,
    onSaveUserName: deps.onSaveUserName,
    onCancelUserName: deps.onCancelUserName,
    onAdminMenuClick: deps.onAdminMenuClick,
  });
  setupAvatarListeners(deps.avatarController);
  setupQuizSettingsListeners({
    onQuestionCountChange: deps.onQuestionCountChange,
    onQuizOrderChange: deps.onQuizOrderChange,
    onIncludeMasteredChange: deps.onIncludeMasteredChange,
  });
  setupNotesListeners({
    onClear: deps.onClearNotes,
    onToggleEraser: deps.onToggleEraser,
  });
  setupKanjiCanvasListeners({
    onDeleteLast: deps.onKanjiDeleteLast,
    onErase: deps.onKanjiErase,
    onApplyToggleBtnState: deps.onKanjiApplyToggleBtnState,
  });
  setupCategoryStatusFilterListeners(deps.onCategoryStatusFilterChange);
  setupNotesPenSelectListeners({
    onPenSizeChange: deps.onPenSizeChange,
    onPenColorChange: deps.onPenColorChange,
  });
  setupFontSizeListeners(deps.onFontSizeChange);
  setupShareSummaryListeners({
    onCopySummary: deps.onCopySummary,
    onOpenShareUrl: deps.onOpenShareUrl,
    onShareUrlDisplayClick: deps.onShareUrlDisplayClick,
    onSaveAndCloseShareUrl: deps.onSaveAndCloseShareUrl,
    onCloseShareUrlEdit: deps.onCloseShareUrlEdit,
  });
  setupHistoryNavigationListeners({
    onPopState: deps.onPopState,
    onMobileBack: deps.onMobileBack,
  });
}
