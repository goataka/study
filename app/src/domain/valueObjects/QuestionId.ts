/**
 * QuestionId — 問題を一意に識別する ValueObject。
 *
 * - 不変（immutable）
 * - 等価性は値で判定（`equals` / `toString`）
 * - シャッフル等の決定論的アルゴリズムで利用するシード値生成を提供
 */

/**
 * 問題の一意識別子を表す ValueObject。
 *
 * 文字列としての ID を直接扱う代わりに、ドメインの語彙として
 * `QuestionId` を経由することで型安全性と意図の明確化を図る。
 */
export class QuestionId {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  /**
   * 文字列から QuestionId を生成する。
   * 空文字列は不正な ID として拒否する。
   */
  static from(value: string): QuestionId {
    if (typeof value !== "string" || value.length === 0) {
      throw new Error("QuestionId は空でない文字列でなければなりません");
    }
    return new QuestionId(value);
  }

  /** 文字列表現（生の ID） */
  toString(): string {
    return this.value;
  }

  /** 同一性比較（値で比較） */
  equals(other: QuestionId): boolean {
    return this.value === other.value;
  }

  /**
   * 決定論的アルゴリズムで利用する非負整数シードを生成する。
   * 同じ ID からは常に同じシードが得られる。
   */
  toSeed(): number {
    let hash = 0;
    for (let i = 0; i < this.value.length; i++) {
      const char = this.value.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 32bit 整数に変換
    }
    return Math.abs(hash);
  }
}
