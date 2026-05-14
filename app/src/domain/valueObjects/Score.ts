/**
 * Score — クイズの採点結果を表す ValueObject。
 *
 * 正解数 / 全問数の組み合わせから派生値（パーセンテージ・満点判定など）を提供する。
 */

/**
 * クイズ採点結果の ValueObject。
 *
 * - 不変（immutable）
 * - 0 <= correct <= total / total >= 0 を不変条件として保証
 */
export class Score {
  private readonly _correct: number;
  private readonly _total: number;

  private constructor(correct: number, total: number) {
    this._correct = correct;
    this._total = total;
  }

  /**
   * 正解数と全問数から Score を生成する。
   * 不変条件（非負整数 / correct <= total）を満たさない場合は Error をスロー。
   */
  static of(correct: number, total: number): Score {
    if (!Number.isInteger(correct) || correct < 0) {
      throw new Error("Score.correct は非負整数でなければなりません");
    }
    if (!Number.isInteger(total) || total < 0) {
      throw new Error("Score.total は非負整数でなければなりません");
    }
    if (correct > total) {
      throw new Error("Score.correct は Score.total を超えることができません");
    }
    return new Score(correct, total);
  }

  /** 正解数 */
  get correct(): number {
    return this._correct;
  }

  /** 全問数 */
  get total(): number {
    return this._total;
  }

  /** 正答率（0〜1）。`total` が 0 の場合は 0 を返す。 */
  get ratio(): number {
    if (this._total === 0) return 0;
    return this._correct / this._total;
  }

  /** 正答率（0〜100 の整数パーセンテージ） */
  get percentage(): number {
    return Math.round(this.ratio * 100);
  }

  /** 満点（全問正解）かどうか。`total === 0` の場合は false。 */
  get isPerfect(): boolean {
    return this._total > 0 && this._correct === this._total;
  }

  /** `"3 / 5"` 形式の文字列表現 */
  toString(): string {
    return `${this._correct} / ${this._total}`;
  }

  /** 値の同一性比較 */
  equals(other: Score): boolean {
    return this._correct === other._correct && this._total === other._total;
  }
}
