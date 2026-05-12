/**
 * URL パスからデプロイ環境（v1 / rc）を判定する共通ヘルパー。
 */

export type DeployEnvironment = "v1" | "rc";

function toPathSegments(pathname: string): string[] {
  return pathname.split("/").filter((segment) => segment.length > 0);
}

function detectDeployEnvironmentFromSegments(segments: string[]): DeployEnvironment {
  for (const segment of segments) {
    if (segment === "v1" || segment === "rc") {
      return segment;
    }
  }
  return "v1";
}

export function detectDeployEnvironment(pathname: string): DeployEnvironment {
  return detectDeployEnvironmentFromSegments(toPathSegments(pathname));
}

/**
 * app 配下から support へのリンクで 1 階層上を参照すべきかを判定する。
 * 例: /study/v1/ -> ../support/
 */
export function needsParentSupportPath(pathname: string): boolean {
  const segments = toPathSegments(pathname);
  const env = detectDeployEnvironmentFromSegments(segments);
  return segments.includes(env);
}

export function resolveSupportHrefForPath(pathname: string): string {
  return needsParentSupportPath(pathname) ? "../support/" : "./support/";
}
