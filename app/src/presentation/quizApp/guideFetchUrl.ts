/**
 * guideUrl から実際に fetch するURLを解決する。
 * support 配下の相対パス（./ または ../）は app 側から参照できるよう ./support/ を補う。
 */
export function resolveGuideFetchUrl(guideUrl: string): string {
  if (/^https?:\/\//i.test(guideUrl)) return guideUrl;
  if (guideUrl.startsWith("/")) return guideUrl;
  if (guideUrl.startsWith("./support/") || guideUrl.startsWith("../support/")) return guideUrl;
  if (guideUrl.startsWith("./") || guideUrl.startsWith("../")) {
    const relativePath = guideUrl.replace(/^\.\.?\//, "");
    return `./support/${relativePath}`;
  }
  return guideUrl;
}
