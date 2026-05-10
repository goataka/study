/**
 * CategoryPath — 教科 / トップカテゴリ / 親カテゴリ / カテゴリの階層を表す ValueObject。
 *
 * 既存コードでは `${subject}::${id}` のような文字列キーで階層を識別する箇所があり、
 * ここではその構築ロジックをドメインの語彙としてまとめる。
 */

/**
 * カテゴリ階層を表す ValueObject。
 *
 * - 不変（immutable）
 * - `subject` と `category` は必須、`parentCategory` / `topCategory` はオプション
 * - `key()` でリポジトリやキャッシュ用の安定した文字列キーを生成する
 */
export class CategoryPath {
  readonly subject: string;
  readonly category: string;
  readonly parentCategory?: string;
  readonly topCategory?: string;

  private constructor(subject: string, category: string, parentCategory?: string, topCategory?: string) {
    this.subject = subject;
    this.category = category;
    this.parentCategory = parentCategory;
    this.topCategory = topCategory;
  }

  /**
   * 必須項目（subject / category）を検証して CategoryPath を生成する。
   */
  static of(params: {
    subject: string;
    category: string;
    parentCategory?: string;
    topCategory?: string;
  }): CategoryPath {
    const { subject, category, parentCategory, topCategory } = params;
    if (typeof subject !== "string" || subject.length === 0) {
      throw new Error("CategoryPath.subject must be a non-empty string");
    }
    if (typeof category !== "string" || category.length === 0) {
      throw new Error("CategoryPath.category must be a non-empty string");
    }
    return new CategoryPath(subject, category, parentCategory, topCategory);
  }

  /**
   * `subject::category` 形式のキャッシュ用キーを生成する。
   * 親カテゴリやトップカテゴリ用のキーは `keyFor()` で取得する。
   */
  key(): string {
    return `${this.subject}::${this.category}`;
  }

  /**
   * 任意のカテゴリ ID（category / parentCategory / topCategory）に対するキーを生成する。
   * `subject` を共通プレフィックスとし、リポジトリ／キャッシュキーとして利用する。
   */
  keyFor(id: string): string {
    return `${this.subject}::${id}`;
  }

  /** 値の同一性比較 */
  equals(other: CategoryPath): boolean {
    return (
      this.subject === other.subject &&
      this.category === other.category &&
      this.parentCategory === other.parentCategory &&
      this.topCategory === other.topCategory
    );
  }
}
