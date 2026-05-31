/**
 * ユーザープロフィールダイアログ用の外部ストア。
 *
 * ヘッダーのアバター / ユーザー名クリック時にダイアログを開き、
 * 名前変更・画像変更・ユーザー追加・ユーザー切り替えを 1 つの
 * ポップアップから実施できるようにする。
 *
 * パターンは confirmDialogStore と同様: 命令的 API を
 * `useSyncExternalStore` で React コンポーネントに橋渡しする。
 */

import type { IProgressRepository, UserProfile } from "../../../application/ports";

export interface UserProfileDialogState {
  open: boolean;
  users: UserProfile[];
  activeUserId: string;
  /** 現在のユーザー名（編集対象）。 */
  currentUserName: string;
}

const CLOSED_STATE: UserProfileDialogState = {
  open: false,
  users: [],
  activeUserId: "guest",
  currentUserName: "ゲスト",
};

type Listener = () => void;

const listeners = new Set<Listener>();
let state: UserProfileDialogState = CLOSED_STATE;
let progressRepo: IProgressRepository | null = null;

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

/** useSyncExternalStore 用 subscribe。 */
export function subscribeUserProfileDialog(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** useSyncExternalStore 用 getSnapshot。 */
export function getUserProfileDialogSnapshot(): UserProfileDialogState {
  return state;
}

/** ストアに progressRepo を注入する（QuizApp 起動時に一度だけ呼ぶ）。 */
export function initUserProfileDialogStore(repo: IProgressRepository): void {
  progressRepo = repo;
}

/** ダイアログを開く。 */
export function openUserProfileDialog(currentUserName: string): void {
  if (!progressRepo) return;
  state = {
    open: true,
    users: progressRepo.listUsers(),
    activeUserId: progressRepo.getActiveUserId(),
    currentUserName,
  };
  notify();
}

/** ダイアログを閉じる。 */
export function closeUserProfileDialog(): void {
  state = { ...CLOSED_STATE };
  notify();
}

/** ユーザー名を保存する。保存後のコールバックを返す。 */
export function saveUserName(name: string): string {
  if (!progressRepo) return name;
  const trimmed = name.trim() || "ゲスト";
  progressRepo.saveUserName(trimmed);
  state = { ...state, currentUserName: trimmed };
  notify();
  return trimmed;
}

/** ユーザーを切り替える。 */
export function switchUser(id: string): void {
  if (!progressRepo) return;
  if (id === progressRepo.getActiveUserId()) return;
  void progressRepo
    .switchUser(id)
    .then(() => {
      window.location.reload();
    })
    .catch((err: unknown) => {
      console.error("ユーザーの切り替えに失敗しました", err);
      alert("ユーザーの切り替えに失敗しました。ページを再読み込みしてもう一度お試しください。");
    });
}

/** ユーザーを追加して切り替える。 */
export function addUserAndSwitch(name: string): void {
  if (!progressRepo) return;
  const trimmed = name.trim();
  if (!trimmed) return;
  const created = progressRepo.addUser(trimmed);
  void progressRepo
    .switchUser(created.id)
    .then(() => {
      window.location.reload();
    })
    .catch((err: unknown) => {
      console.error("ユーザーの切り替えに失敗しました", err);
      alert("ユーザーの追加に失敗しました。ページを再読み込みしてもう一度お試しください。");
    });
}

/** テスト用リセット。 */
export function __resetUserProfileDialogStoreForTests(): void {
  state = CLOSED_STATE;
  listeners.clear();
  progressRepo = null;
}
