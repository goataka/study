/**
 * 解説 URL（guideUrl 系フィールド）のスキーム/パストラバーサル検証ヘルパー。
 *
 * `validateQuestionFile` から `guideUrl` / `parentCategoryGuideUrl` /
 * `topCategoryGuideUrl` の検証で共通利用される。
 */

/**
 * 値が `./` または `../` で始まる安全な相対パス、もしくは http/https の絶対URLであることを検証する。
 * パストラバーサル（プレフィックスを除いた本体に `..` が含まれる）を拒否する。
 *
 * @param value 検証対象の文字列
 * @param fieldName エラー文言で用いるフィールド名（例: `"guideUrl"`）
 * @throws 値が要件を満たさない場合は Error をスロー
 */
export function validateGuideUrl(value: string, fieldName: string): void {
  // 安全なスキームのみ許可：./ または ../ で始まる相対パス（直後が . や / でない）または http/https の絶対URL
  const isCurrentRelative = /^\.\/[^./]/.test(value);
  const isParentRelative = /^\.\.\/[^./]/.test(value);
  const isRelative = isCurrentRelative || isParentRelative;
  const isAbsolute = /^https?:\/\//i.test(value);
  if (!isRelative && !isAbsolute) {
    throw new Error(`"${fieldName}" must be a relative path starting with "./" or "../" or an http/https URL`);
  }
  // パストラバーサル防止：URL デコード後にさらなる .. が含まれないことを確認
  if (isRelative) {
    let decoded = value;
    try {
      decoded = decodeURIComponent(value);
    } catch {
      // デコード失敗の場合は元の文字列で検証
    }
    const prefix = isParentRelative ? "../" : "./";
    if (decoded.slice(prefix.length).includes("..")) {
      throw new Error(`"${fieldName}" must not contain path traversal sequences`);
    }
  }
}
