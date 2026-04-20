/**
 * ProgressExporter — クイズの進捗データ（間違えた問題ID）をJSONファイルとしてダウンロードする。
 */

export interface ProgressData {
  version: string;
  exportedAt: string;
  wrongQuestionIds: string[];
}

export class ProgressExporter {
  private static readonly VERSION = "1.0.0";

  /**
   * 進捗データをJSON文字列に変換する。
   */
  static serialize(wrongIds: string[]): string {
    const data: ProgressData = {
      version: this.VERSION,
      exportedAt: new Date().toISOString(),
      wrongQuestionIds: wrongIds,
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * 進捗データをJSONファイルとしてダウンロードする。
   */
  static download(wrongIds: string[]): void {
    const json = this.serialize(wrongIds);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `quiz-progress-${this.getDateString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  /**
   * ファイル名用の日付文字列を生成する（例: 2026-04-20）。
   */
  private static getDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
