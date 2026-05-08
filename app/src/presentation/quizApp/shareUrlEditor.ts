/**
 * 共有 URL のインライン編集 UI ヘルパー。
 *
 * `#shareUrlDisplayBtn` (表示)・`#shareUrlEditArea` (編集エリア)・`#shareUrlInput` (入力)
 * の組み合わせを操作する純粋な DOM 関数群。
 */

/**
 * 「共有 URL を開く」ボタンと「共有 URL を表示」ボタンの状態を更新する。
 * - URL が設定されていればグレー調 (`share-url-set`) を付与し、開くボタンを表示する
 * - URL が未設定なら開くボタンを隠し、表示ボタンに「URLを設定」を表示する
 */
export function updateShareUrlOpenBtn(shareUrl: string): void {
  const btn = document.getElementById("openShareUrlBtn") as HTMLButtonElement | null;
  if (btn) {
    if (shareUrl) {
      btn.classList.remove("hidden");
    } else {
      btn.classList.add("hidden");
    }
  }
  const displayBtn = document.getElementById("shareUrlDisplayBtn") as HTMLButtonElement | null;
  if (displayBtn) {
    displayBtn.textContent = shareUrl || "URLを設定";
    displayBtn.classList.toggle("share-url-set", !!shareUrl);
  }
}

/**
 * 共有 URL のインライン編集エリアを開き、入力にフォーカスする。
 */
export function openShareUrlEdit(shareUrl: string): void {
  const displayBtn = document.getElementById("shareUrlDisplayBtn");
  const editArea = document.getElementById("shareUrlEditArea");
  const input = document.getElementById("shareUrlInput") as HTMLInputElement | null;
  if (!displayBtn || !editArea || !input) return;

  input.value = shareUrl;
  displayBtn.classList.add("hidden");
  displayBtn.setAttribute("aria-expanded", "true");
  editArea.classList.remove("hidden");
  input.focus();
  input.select();
}

/**
 * 共有 URL のインライン編集エリアを閉じる。
 * フォーカスを表示ボタンに戻す。
 */
export function closeShareUrlEdit(): void {
  const displayBtn = document.getElementById("shareUrlDisplayBtn");
  const editArea = document.getElementById("shareUrlEditArea");
  if (!displayBtn || !editArea) return;

  editArea.classList.add("hidden");
  displayBtn.classList.remove("hidden");
  displayBtn.setAttribute("aria-expanded", "false");
  displayBtn.focus();
}

/**
 * `#shareUrlInput` の入力値を返す。要素が無い場合は null。
 */
export function readShareUrlInput(): string | null {
  const input = document.getElementById("shareUrlInput") as HTMLInputElement | null;
  return input ? input.value.trim() : null;
}
