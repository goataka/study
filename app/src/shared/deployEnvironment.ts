/**
 * URL パスからデプロイ環境（v1 / rc）を判定する共通ヘルパー。
 */

export type DeployEnvironment = "v1" | "rc";

export function detectDeployEnvironment(pathname: string): DeployEnvironment {
  const segments = pathname.split("/").filter((segment) => segment.length > 0);
  for (const segment of segments) {
    if (segment === "v1" || segment === "rc") {
      return segment;
    }
  }
  return "v1";
}

/**
 * app 配下から support へのリンクで 1 階層上を参照すべきかを判定する。
 * 例: /study/v1/ -> ../support/
 */
export function needsParentSupportPath(pathname: string): boolean {
  const env = detectDeployEnvironment(pathname);
  const segments = pathname.split("/").filter((segment) => segment.length > 0);
  return segments.includes(env);
}

export function resolveSupportHrefForPath(pathname: string): string {
  return needsParentSupportPath(pathname) ? "../support/" : "./support/";
}
