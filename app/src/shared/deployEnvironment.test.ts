import { describe, expect, it } from "vitest";
import { detectDeployEnvironment, resolveSupportHrefForPath } from "./deployEnvironment";

describe("deployEnvironment", () => {
  it("パスセグメントから環境を判定できる", () => {
    expect(detectDeployEnvironment("/study/v1/")).toBe("v1");
    expect(detectDeployEnvironment("/study/rc/")).toBe("rc");
  });

  it("サポートリンクの相対パスを環境に応じて返す", () => {
    expect(resolveSupportHrefForPath("/study/")).toBe("./support/");
    expect(resolveSupportHrefForPath("/study/v1/")).toBe("../support/");
    expect(resolveSupportHrefForPath("/study/rc/")).toBe("../support/");
  });
});
