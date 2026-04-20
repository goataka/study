/**
 * ProgressImporter — JSONファイルから進捗データ（間違えた問題ID）をインポートする。
 */

import type { ProgressData } from "./progressExporter";

export class ProgressImporter {
  /**
   * JSON文字列を進捗データにパースする。
   * バリデーションに失敗した場合はエラーをスローする。
   */
  static parse(json: string): string[] {
    let data: unknown;
    try {
      data = JSON.parse(json);
    } catch (error) {
      throw new Error("JSONの解析に失敗しました");
    }

    this.validate(data);
    return (data as ProgressData).wrongQuestionIds;
  }

  /**
   * ファイルから進捗データを読み込む。
   * ユーザーにファイル選択ダイアログを表示し、選択されたファイルを読み込む。
   */
  static async importFromFile(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json,.json";

      input.onchange = async (event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];

        if (!file) {
          reject(new Error("ファイルが選択されませんでした"));
          return;
        }

        try {
          const text = await file.text();
          const wrongIds = this.parse(text);
          resolve(wrongIds);
        } catch (error) {
          reject(error);
        }
      };

      input.click();
    });
  }

  /**
   * 進捗データの構造をバリデーションする。
   */
  private static validate(data: unknown): asserts data is ProgressData {
    if (!data || typeof data !== "object") {
      throw new Error("データが不正です");
    }

    const progress = data as Record<string, unknown>;

    if (typeof progress.version !== "string") {
      throw new Error("バージョン情報が見つかりません");
    }

    if (typeof progress.exportedAt !== "string") {
      throw new Error("エクスポート日時が見つかりません");
    }

    if (!Array.isArray(progress.wrongQuestionIds)) {
      throw new Error("問題IDのリストが見つかりません");
    }

    for (const [i, id] of progress.wrongQuestionIds.entries()) {
      if (typeof id !== "string") {
        throw new Error(`問題ID[${i}]が不正です`);
      }
    }
  }
}
