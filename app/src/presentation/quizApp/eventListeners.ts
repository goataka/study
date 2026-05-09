/**
 * QuizApp の DOM イベントリスナー登録ヘルパー群。
 *
 * 各関数は責務単位で必要なコールバックだけを引数で受け取り、
 * `addEventListener` で DOM に紐付ける純粋なセットアップ関数。
 */

import type { AvatarController } from "../avatarController";

/** ヘッダー（タイトルロゴ・ユーザー名編集・管理メニュー）のイベント。 */
export interface HeaderListenersCallbacks {
  onTitleClick: () => void;
  onOpenUserNameEdit: () => void;
  onSaveUserName: () => void;
  onCancelUserName: () => void;
  onAdminMenuClick: () => void;
}

export function setupHeaderListeners(callbacks: HeaderListenersCallbacks): void {
  // タイトルクリックでスタート画面へ
  const titleBtn = document.getElementById("titleBtn");
  if (titleBtn) {
    titleBtn.addEventListener("click", callbacks.onTitleClick);
    titleBtn.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        callbacks.onTitleClick();
      }
    });
  }

  // ヘッダーのユーザー名をクリックして編集を開く
  document.getElementById("headerUserName")?.addEventListener("click", callbacks.onOpenUserNameEdit);
  document.getElementById("headerUserNameSaveBtn")?.addEventListener("click", callbacks.onSaveUserName);

  // 入力フィールド: Enter で保存、Escape でキャンセル
  const headerUserNameInput = document.getElementById("headerUserNameInput");
  headerUserNameInput?.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      callbacks.onSaveUserName();
    } else if (e.key === "Escape") {
      callbacks.onCancelUserName();
    }
  });
  headerUserNameInput?.addEventListener("blur", (e: FocusEvent) => {
    // 保存ボタンへのフォーカス移動はスキップ（保存ボタンのclickが先に発火するため）
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (relatedTarget?.id !== "headerUserNameSaveBtn") {
      callbacks.onSaveUserName();
    }
  });

  // ヘッダーのメニューボタン（管理パネルへのナビゲーション）
  document.getElementById("adminMenuBtn")?.addEventListener("click", callbacks.onAdminMenuClick);
}

/** アバター画像（ヘッダーのアイコン＋クロップダイアログ）のイベント。 */
export function setupAvatarListeners(avatarController: AvatarController): void {
  const headerUserAvatar = document.getElementById("headerUserAvatar");
  const avatarCropDialog = document.getElementById("avatarCropDialog") as HTMLDialogElement | null;
  headerUserAvatar?.addEventListener("click", () => {
    avatarController.openCropDialog();
  });
  headerUserAvatar?.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      avatarController.openCropDialog();
    }
  });

  // ダイアログ内のファイル選択
  const headerUserAvatarInput = document.getElementById("headerUserAvatarInput") as HTMLInputElement | null;
  headerUserAvatarInput?.addEventListener("change", (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) avatarController.previewInDialog(file);
    // ファイル選択後にリセットして同じファイルを再選択可能に
    headerUserAvatarInput.value = "";
  });

  // ダイアログ確定ボタン
  document.getElementById("avatarCropConfirmBtn")?.addEventListener("click", () => {
    avatarController.confirmCrop();
  });

  // ダイアログキャンセルボタン
  document.getElementById("avatarCropCancelBtn")?.addEventListener("click", () => {
    avatarCropDialog?.close();
    avatarController.cancelCrop();
  });

  // ダイアログ外クリックで閉じる
  avatarCropDialog?.addEventListener("click", (e) => {
    if (e.target === avatarCropDialog) {
      avatarCropDialog.close();
      avatarController.cancelCrop();
    }
  });
}

/** クイズ設定（問題数・並び順・学習済み含む）ラジオのイベント。 */
export interface QuizSettingsCallbacks {
  onQuestionCountChange: (count: number) => void;
  onQuizOrderChange: (order: "random" | "straight") => void;
  onIncludeMasteredChange: (include: boolean) => void;
}

export function setupQuizSettingsListeners(callbacks: QuizSettingsCallbacks): void {
  document.querySelectorAll<HTMLInputElement>('input[name="questionCount"]').forEach((input) => {
    input.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      if (target.checked) {
        callbacks.onQuestionCountChange(parseInt(target.value));
      }
    });
  });

  document.querySelectorAll<HTMLInputElement>('input[name="quizOrder"]').forEach((input) => {
    input.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      if (target.checked) {
        callbacks.onQuizOrderChange(target.value as "random" | "straight");
      }
    });
  });

  document.querySelectorAll<HTMLInputElement>('input[name="quizLearned"]').forEach((input) => {
    input.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      if (target.checked) {
        callbacks.onIncludeMasteredChange(target.value === "include");
      }
    });
  });
}

/** カテゴリ一覧の学習状態フィルターボタンのイベント。 */
export function setupCategoryStatusFilterListeners(
  onSelect: (filter: "all" | "unlearned" | "studying" | "learned") => void,
): void {
  const statusFilterBtns: Array<{ id: string; filter: "all" | "unlearned" | "studying" | "learned" }> = [
    { id: "filterStatusAll", filter: "all" },
    { id: "filterStatusUnlearned", filter: "unlearned" },
    { id: "filterStatusStudying", filter: "studying" },
    { id: "filterStatusLearned", filter: "learned" },
  ];
  statusFilterBtns.forEach(({ id, filter }) => {
    document.getElementById(id)?.addEventListener("click", () => onSelect(filter));
  });
}

/** フォントサイズ切替ボタンのイベント。 */
export function setupFontSizeListeners(onSelect: (size: "small" | "medium" | "large") => void): void {
  document.querySelectorAll<HTMLButtonElement>(".font-size-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const size = btn.dataset.size as "small" | "medium" | "large" | undefined;
      if (size === "small" || size === "medium" || size === "large") {
        onSelect(size);
      }
    });
  });
}

/** 共有 URL／活動サマリ関連のイベント。 */
export interface ShareSummaryCallbacks {
  onCopySummary: () => void;
  onOpenShareUrl: () => void;
  onShareUrlDisplayClick: () => void;
  onSaveAndCloseShareUrl: () => void;
  onCloseShareUrlEdit: () => void;
}

export function setupShareSummaryListeners(callbacks: ShareSummaryCallbacks): void {
  document.getElementById("copySummaryBtn")?.addEventListener("click", callbacks.onCopySummary);
  document.getElementById("openShareUrlBtn")?.addEventListener("click", callbacks.onOpenShareUrl);
  document.getElementById("shareUrlDisplayBtn")?.addEventListener("click", callbacks.onShareUrlDisplayClick);
  document.getElementById("saveShareUrlBtn")?.addEventListener("click", callbacks.onSaveAndCloseShareUrl);

  document.getElementById("shareUrlInput")?.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      callbacks.onSaveAndCloseShareUrl();
    } else if (e.key === "Escape") {
      callbacks.onCloseShareUrlEdit();
    }
  });

  // URL編集中に編集エリア外をクリックしたらキャンセル
  document.addEventListener("mousedown", (e: MouseEvent) => {
    const editArea = document.getElementById("shareUrlEditArea");
    if (!editArea || editArea.classList.contains("hidden")) return;
    const inline = document.querySelector(".share-url-inline");
    if (inline && !inline.contains(e.target as Node)) {
      callbacks.onCloseShareUrlEdit();
    }
  });
}

/** ブラウザ履歴・モバイル戻るボタンのナビゲーション系イベント。 */
export interface HistoryNavigationCallbacks {
  /** popstate でスタート画面に戻る試み。Promise を返し、キャンセル時の挙動は呼び出し側が決める。 */
  onPopState: () => Promise<void>;
  onMobileBack: () => void;
}

export function setupHistoryNavigationListeners(callbacks: HistoryNavigationCallbacks): void {
  // ブラウザの戻るボタンでスタート画面に戻る（setupEventListeners はコンストラクタから 1 度だけ呼ばれる）
  // クイズ進行中の場合は確認ダイアログを表示し、キャンセルされたら履歴に再プッシュして戻る操作を打ち消す
  window.addEventListener("popstate", () => {
    const startScreen = document.getElementById("startScreen");
    if (!startScreen?.classList.contains("hidden")) return;
    void callbacks.onPopState().then(() => {
      // キャンセル時（スタート画面に遷移しなかった場合）は履歴エントリを再追加して「進む」操作を封じる
      const stillOnStart = !document.getElementById("startScreen")?.classList.contains("hidden");
      if (!stillOnStart) {
        const activeScreen = document.querySelector(".screen:not(.hidden)");
        const screenName = activeScreen?.id === "quizScreen" ? "quiz" : "result";
        window.history.pushState({ screen: screenName }, document.title);
      }
    });
  });

  document.getElementById("mobileBackBtn")?.addEventListener("click", callbacks.onMobileBack);
}

/** 進度詳細パネルのモバイル用クローズボタンにハンドラーを登録する。 */
export function setupProgressDetailPanelListeners(): void {
  document.getElementById("progressDetailCloseBtn")?.addEventListener("click", () => {
    document.getElementById("progressDetailPanel")?.classList.add("hidden");
  });
}

/** クイズ進行ボタン（開始・前後・採点・キャンセルなど）のイベント。 */
export interface QuizFlowCallbacks {
  onStartRandom: () => void;
  onMarkLearnedToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onRetryAll: () => void;
  onBackToStart: () => void;
  onCancelQuiz: () => void;
  onReload: () => void;
}

export function setupQuizFlowListeners(callbacks: QuizFlowCallbacks): void {
  document.getElementById("startRandomBtn")?.addEventListener("click", callbacks.onStartRandom);
  document.getElementById("markLearnedBtn")?.addEventListener("click", callbacks.onMarkLearnedToggle);
  document.getElementById("prevBtn")?.addEventListener("click", callbacks.onPrev);
  document.getElementById("nextBtn")?.addEventListener("click", callbacks.onNext);
  document.getElementById("submitBtn")?.addEventListener("click", callbacks.onSubmit);
  document.getElementById("retryAllBtn")?.addEventListener("click", callbacks.onRetryAll);
  document.getElementById("backToStartBtn")?.addEventListener("click", callbacks.onBackToStart);
  document.getElementById("cancelQuizBtn")?.addEventListener("click", callbacks.onCancelQuiz);
  document.getElementById("reloadBtn")?.addEventListener("click", callbacks.onReload);
}

/** 問題一覧の学習状態フィルターボタンのイベント。 */
export function setupQuestionListFilterListeners(onSelect: (value: "all" | "unlearned" | "learned") => void): void {
  const filterBtns = [
    { id: "questionListFilterAll", value: "all" as const },
    { id: "questionListFilterUnlearned", value: "unlearned" as const },
    { id: "questionListFilterLearned", value: "learned" as const },
  ];
  filterBtns.forEach(({ id, value }) => {
    document.getElementById(id)?.addEventListener("click", () => {
      filterBtns.forEach(({ id: btnId }) => {
        document.getElementById(btnId)?.classList.remove("active");
      });
      document.getElementById(id)?.classList.add("active");
      onSelect(value);
    });
  });
}

/** 進度タブ: 学習状況フィルター切替ボタンのイベント。 */
export function setupProgressFilterListeners(
  onSelect: (filter: "all" | "unlearned" | "studying" | "learned") => void,
): void {
  const filterButtons = [
    { id: "progressStatusAllBtn", filter: "all" as const },
    { id: "progressStatusUnlearnedBtn", filter: "unlearned" as const },
    { id: "progressStatusStudyingBtn", filter: "studying" as const },
    { id: "progressStatusLearnedBtn", filter: "learned" as const },
  ];
  filterButtons.forEach(({ id, filter }) => {
    document.getElementById(id)?.addEventListener("click", () => onSelect(filter));
  });
}

/** メモエリアのコントロール（クリア・消しゴム）のイベント。 */
export interface NotesCallbacks {
  onClear: () => void;
  onToggleEraser: () => void;
}

export function setupNotesListeners(callbacks: NotesCallbacks): void {
  document.getElementById("clearNotesBtn")?.addEventListener("click", callbacks.onClear);
  document.getElementById("eraserBtn")?.addEventListener("click", callbacks.onToggleEraser);
}

/** メモエリアのペンサイズ・ペン色セレクトのイベント。 */
export interface NotesPenSelectCallbacks {
  onPenSizeChange: (size: number) => void;
  onPenColorChange: (color: string) => void;
}

export function setupNotesPenSelectListeners(callbacks: NotesPenSelectCallbacks): void {
  const penSizeSelect = document.getElementById("penSizeSelect") as HTMLSelectElement | null;
  penSizeSelect?.addEventListener("change", (e) => {
    callbacks.onPenSizeChange(parseInt((e.target as HTMLSelectElement).value));
  });

  const penColorSelect = document.getElementById("penColorSelect") as HTMLSelectElement | null;
  penColorSelect?.addEventListener("change", (e) => {
    callbacks.onPenColorChange((e.target as HTMLSelectElement).value);
  });
}

/** 漢字認識キャンバス（KanjiCanvas）のイベント。 */
export interface KanjiCanvasCallbacks {
  onDeleteLast: () => void;
  onErase: () => void;
  onApplyToggleBtnState: (btn: HTMLElement, expanded: boolean) => void;
}

export function setupKanjiCanvasListeners(callbacks: KanjiCanvasCallbacks): void {
  document.getElementById("kanjiDeleteLastBtn")?.addEventListener("click", callbacks.onDeleteLast);
  document.getElementById("kanjiEraseBtn")?.addEventListener("click", callbacks.onErase);

  // KanjiCanvas 折りたたみトグルボタン
  document.getElementById("kanjiToggleBtn")?.addEventListener("click", () => {
    const body = document.getElementById("kanjiInputBody");
    const btn = document.getElementById("kanjiToggleBtn");
    if (!body || !btn) return;
    const isExpanded = btn.getAttribute("aria-expanded") === "true";
    body.classList.toggle("hidden", isExpanded);
    callbacks.onApplyToggleBtnState(btn, !isExpanded);
  });
}
