/**
 * `shareButton` CVA レシピの仕様テスト。
 */

import { describe, expect, it } from "vitest";
import { shareButton } from "./shareButtonStyles";

describe("shareButton スタイル（CVA）", () => {
  it("copy バリアントで share-copy-btn クラスを出力する", () => {
    const cls = shareButton({ kind: "copy" });
    expect(cls).toContain("share-copy-btn");
    expect(cls).not.toContain("share-url-open-btn");
  });

  it("open バリアントで share-url-open-btn クラスを出力する", () => {
    const cls = shareButton({ kind: "open" });
    expect(cls).toContain("share-url-open-btn");
    expect(cls).not.toContain("share-copy-btn");
  });

  it("save バリアントで share-url-save-btn クラスを出力する", () => {
    const cls = shareButton({ kind: "save" });
    expect(cls).toContain("share-url-save-btn");
    expect(cls).not.toContain("share-url-open-btn");
  });

  it("hidden=true で hidden を出力する", () => {
    const cls = shareButton({ kind: "open", hidden: true });
    expect(cls.split(/\s+/)).toContain("hidden");
  });
});
