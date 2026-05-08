/**
 * ヘッダーのユーザー名インライン編集 UI ヘルパー。
 *
 * `#headerUserName` (表示)・`#headerUserEdit` (編集エリア)・`#headerUserNameInput` (入力)
 * の組み合わせを操作する純粋な DOM 関数群。
 */

/**
 * ユーザー名編集エリアを開き、入力にフォーカスする。
 * @param currentName 現在のユーザー名（"ゲスト" の場合は空欄で開く）
 */
export function openUserNameEdit(currentName: string): void {
  const nameBtn = document.getElementById("headerUserName");
  const editArea = document.getElementById("headerUserEdit");
  const input = document.getElementById("headerUserNameInput") as HTMLInputElement | null;
  if (!nameBtn || !editArea || !input) return;

  input.value = currentName === "ゲスト" ? "" : currentName;
  nameBtn.classList.add("hidden");
  editArea.classList.remove("hidden");
  input.focus();
  input.select();
}

/**
 * ユーザー名編集エリアを閉じて表示ボタンを再表示する。
 */
export function closeUserNameEdit(): void {
  const nameBtn = document.getElementById("headerUserName");
  const editArea = document.getElementById("headerUserEdit");
  if (!nameBtn || !editArea) return;

  editArea.classList.add("hidden");
  nameBtn.classList.remove("hidden");
}

/**
 * `#headerUserNameInput` から入力値を読み取って trim した結果を返す。
 * 空の場合は "ゲスト" を返す。入力要素が無い場合は null を返す。
 */
export function readUserNameInput(): string | null {
  const input = document.getElementById("headerUserNameInput") as HTMLInputElement | null;
  if (!input) return null;
  const name = input.value.trim();
  return name || "ゲスト";
}

/**
 * 指定要素にユーザー名を表示する。
 */
export function updateUserNameDisplay(elementId: string, userName: string): void {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = userName;
  }
}
