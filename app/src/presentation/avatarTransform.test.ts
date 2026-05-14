import { describe, expect, it } from "vitest";
import {
  clampZoom,
  nextCropOnDrag,
  parseAvatarTransform,
  pctDelta,
  transformToCss,
  validateAvatarFile,
  validateStoredAvatarDataUrl,
} from "./avatarTransform";

describe("parseAvatarTransform 関数", () => {
  it("デフォルトは 50/50/1", () => {
    expect(parseAvatarTransform({ cropPositionX: null, cropPositionY: null, cropZoom: null })).toEqual({
      cropX: 50,
      cropY: 50,
      zoom: 1,
    });
  });

  it("有効な数値文字列を採用する", () => {
    expect(parseAvatarTransform({ cropPositionX: "30", cropPositionY: "70", cropZoom: "2" })).toEqual({
      cropX: 30,
      cropY: 70,
      zoom: 2,
    });
  });

  it("範囲外の値はデフォルトのまま", () => {
    expect(parseAvatarTransform({ cropPositionX: "200", cropPositionY: "-5", cropZoom: "10" })).toEqual({
      cropX: 50,
      cropY: 50,
      zoom: 1,
    });
  });

  it("旧フォーマット top/center/bottom を 0/50/100 に変換する", () => {
    expect(parseAvatarTransform({ cropPositionX: null, cropPositionY: "top", cropZoom: null }).cropY).toBe(0);
    expect(parseAvatarTransform({ cropPositionX: null, cropPositionY: "center", cropZoom: null }).cropY).toBe(50);
    expect(parseAvatarTransform({ cropPositionX: null, cropPositionY: "bottom", cropZoom: null }).cropY).toBe(100);
  });

  it("不正な文字列はデフォルト", () => {
    expect(parseAvatarTransform({ cropPositionX: "xx", cropPositionY: "abc", cropZoom: "ok" })).toEqual({
      cropX: 50,
      cropY: 50,
      zoom: 1,
    });
  });
});

describe("pctDelta 関数", () => {
  it("rect サイズ比で % を返す", () => {
    expect(pctDelta(50, 25, 100, 50)).toEqual({ x: 50, y: 50 });
  });
  it("rect サイズが 0 なら 0 を返す（0 除算回避）", () => {
    expect(pctDelta(50, 25, 0, 0)).toEqual({ x: 0, y: 0 });
  });
});

describe("nextCropOnDrag 関数", () => {
  it("デルタを開始位置から減算してクランプする", () => {
    expect(nextCropOnDrag(50, 50, 10, 20)).toEqual({ cropX: 40, cropY: 30 });
  });
  it("0 未満は 0 にクランプ", () => {
    expect(nextCropOnDrag(10, 10, 100, 100)).toEqual({ cropX: 0, cropY: 0 });
  });
  it("100 超は 100 にクランプ", () => {
    expect(nextCropOnDrag(50, 50, -100, -100)).toEqual({ cropX: 100, cropY: 100 });
  });
});

describe("clampZoom 関数", () => {
  it("範囲内はそのまま", () => {
    expect(clampZoom(2)).toBe(2);
  });
  it("1 未満は 1 に、3 超は 3 にクランプ", () => {
    expect(clampZoom(0.5)).toBe(1);
    expect(clampZoom(5)).toBe(3);
  });
  it("NaN は 1 にフォールバック", () => {
    expect(clampZoom(NaN)).toBe(1);
  });
});

describe("validateAvatarFile 関数", () => {
  it("画像でなければエラー", () => {
    expect(validateAvatarFile({ type: "text/plain", size: 100 })).toContain("画像");
  });
  it("5MB 超ならエラー", () => {
    expect(validateAvatarFile({ type: "image/png", size: 6 * 1024 * 1024 })).toContain("5MB");
  });
  it("画像かつ 5MB 以下なら null", () => {
    expect(validateAvatarFile({ type: "image/png", size: 100 })).toBeNull();
  });
});

describe("validateStoredAvatarDataUrl 関数", () => {
  it("data:image/ で始まるなら採用", () => {
    expect(validateStoredAvatarDataUrl("data:image/png;base64,xxx")).toBe("data:image/png;base64,xxx");
  });
  it("blob: URL も互換のため採用", () => {
    expect(validateStoredAvatarDataUrl("blob:https://example.com/abc")).toBe("blob:https://example.com/abc");
  });
  it("それ以外は null", () => {
    expect(validateStoredAvatarDataUrl("https://evil.com/x")).toBeNull();
    expect(validateStoredAvatarDataUrl("data:text/plain,hi")).toBeNull();
    expect(validateStoredAvatarDataUrl(null)).toBeNull();
  });
});

describe("transformToCss 関数", () => {
  it("CSS 値を組み立てる", () => {
    expect(transformToCss({ cropX: 30, cropY: 70, zoom: 2 })).toEqual({
      objectPosition: "30% 70%",
      transformOrigin: "30% 70%",
      transform: "scale(2)",
    });
  });
});
