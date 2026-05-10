/**
 * AvatarController の純粋ロジック群（DOM 副作用なし）。
 *
 * `presentation/avatarController.ts` から分離した、ストレージ値のパース・
 * ドラッグ計算・ズーム値の正規化など、DOM・ブラウザ API に依存しない関数群。
 *
 * これにより React コンポーネント版を作る際にも同じロジックを再利用でき、
 * 単体テストが容易になる。
 */

/** クロップ座標とズーム値の組（0〜100% / 1〜3）。 */
export interface AvatarTransform {
  cropX: number;
  cropY: number;
  zoom: number;
}

/** ローカルストレージから読んだ生文字列。 */
export interface AvatarTransformRaw {
  /** "0"〜"100" のパーセント数値文字列。 */
  cropPositionX: string | null;
  /** "0"〜"100" のパーセント数値文字列、または旧フォーマット "top"/"center"/"bottom"。 */
  cropPositionY: string | null;
  /** "1"〜"3" のズーム数値文字列。 */
  cropZoom: string | null;
}

const DEFAULT_TRANSFORM: AvatarTransform = { cropX: 50, cropY: 50, zoom: 1 };

/**
 * ストレージから読んだ生文字列を `AvatarTransform` にパースする。
 *
 * - X 座標: 数値で 0〜100 の範囲なら採用、不正値はデフォルト 50
 * - Y 座標: 数値（0〜100）なら採用、旧フォーマット "top"/"center"/"bottom" は 0/50/100 に変換
 * - ズーム: 数値（1〜3）なら採用、不正値はデフォルト 1
 */
export function parseAvatarTransform(raw: AvatarTransformRaw): AvatarTransform {
  const result: AvatarTransform = { ...DEFAULT_TRANSFORM };

  const xPos = parseFloat(raw.cropPositionX ?? "");
  if (!isNaN(xPos) && xPos >= 0 && xPos <= 100) {
    result.cropX = xPos;
  }

  const yPos = raw.cropPositionY;
  if (yPos !== null) {
    const yNum = parseFloat(yPos);
    if (!isNaN(yNum) && yNum >= 0 && yNum <= 100) {
      result.cropY = yNum;
    } else if (yPos === "top") {
      result.cropY = 0;
    } else if (yPos === "center") {
      result.cropY = 50;
    } else if (yPos === "bottom") {
      result.cropY = 100;
    }
  }

  const zoom = parseFloat(raw.cropZoom ?? "");
  if (!isNaN(zoom) && zoom >= 1 && zoom <= 3) {
    result.zoom = zoom;
  }

  return result;
}

/**
 * ピクセル単位のドラッグ移動量と要素サイズから、% 単位のデルタを計算する。
 */
export function pctDelta(dx: number, dy: number, rectWidth: number, rectHeight: number): { x: number; y: number } {
  return {
    x: rectWidth > 0 ? (dx / rectWidth) * 100 : 0,
    y: rectHeight > 0 ? (dy / rectHeight) * 100 : 0,
  };
}

/**
 * ドラッグ開始時のクロップ位置と現在のドラッグデルタ % から、新しいクロップ位置を計算する。
 *
 * 画像を右/下にドラッグした時は表示位置を逆方向（左/上）へ動かすため、デルタは減算する。
 * 結果は 0〜100 にクランプされる。
 */
export function nextCropOnDrag(
  startCropX: number,
  startCropY: number,
  deltaPctX: number,
  deltaPctY: number,
): { cropX: number; cropY: number } {
  return {
    cropX: clamp(startCropX - deltaPctX, 0, 100),
    cropY: clamp(startCropY - deltaPctY, 0, 100),
  };
}

/** ズーム値を 1〜3 の範囲にクランプする（NaN は 1 にフォールバック）。 */
export function clampZoom(value: number): number {
  if (isNaN(value)) return 1;
  return clamp(value, 1, 3);
}

/**
 * アバター画像ファイルの妥当性を検証する。
 *
 * - MIME タイプが image/* で始まること
 * - サイズが 5MB 以下であること
 *
 * @returns `null` なら妥当、文字列ならエラーメッセージ（呼び出し側で alert 等に使う）
 */
export function validateAvatarFile(file: { type: string; size: number }): string | null {
  if (!file.type.startsWith("image/")) {
    return "画像ファイルを選択してください。";
  }
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return "画像ファイルサイズは5MB以下にしてください。";
  }
  return null;
}

/**
 * ストレージから読んだアバター画像 URL を検証する。
 * `data:image/` スキームでなければ無効として `null` を返す。
 */
export function validateStoredAvatarDataUrl(stored: string | null): string | null {
  return stored && stored.startsWith("data:image/") ? stored : null;
}

/**
 * AvatarTransform から CSS スタイル値（objectPosition / transformOrigin / transform）を組み立てる。
 */
export function transformToCss(t: AvatarTransform): {
  objectPosition: string;
  transformOrigin: string;
  transform: string;
} {
  return {
    objectPosition: `${t.cropX}% ${t.cropY}%`,
    transformOrigin: `${t.cropX}% ${t.cropY}%`,
    transform: `scale(${t.zoom})`,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
