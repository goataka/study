import { describe, expect, it } from "vitest";
import { resolveGuideFetchUrl } from "./guideFetchUrl";

describe("resolveGuideFetchUrl 関数", () => {
  it("http/https URL はそのまま返す", () => {
    expect(resolveGuideFetchUrl("https://example.com/guide")).toBe("https://example.com/guide");
    expect(resolveGuideFetchUrl("http://example.com/guide")).toBe("http://example.com/guide");
  });

  it("絶対パスはそのまま返す", () => {
    expect(resolveGuideFetchUrl("/support/english/guide")).toBe("/support/english/guide");
  });

  it("./support/ または ../support/ はそのまま返す", () => {
    expect(resolveGuideFetchUrl("./support/english/guide")).toBe("./support/english/guide");
    expect(resolveGuideFetchUrl("../support/english/guide")).toBe("../support/english/guide");
  });

  it("./ と ../ の相対パスは ./support/ を補って返す", () => {
    expect(resolveGuideFetchUrl("./english/guide")).toBe("./support/english/guide");
    expect(resolveGuideFetchUrl("../math/guide")).toBe("./support/math/guide");
  });

  it("その他の文字列はそのまま返す", () => {
    expect(resolveGuideFetchUrl("guide")).toBe("guide");
  });
});
