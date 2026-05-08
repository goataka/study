/**
 * 総合タブのシェア用テキスト構築 / 日付フィルタ関数。
 *
 * QuizApp から肥大化していた `buildShareSummaryText` / `filterRecordsBySelectedDate` を切り出したもの。
 */

import type { QuizUseCase, QuizRecord } from "../application/quizUseCase";
import { SUBJECTS, parseDateString } from "./uiHelpers";

/**
 * 指定日付（YYYY-MM-DD）のクイズ記録のみに絞り込む。
 * `manual`（手動確認済み）モードのレコードは除外する。
 */
export function filterRecordsBySelectedDate(records: QuizRecord[], selectedActivityDate: string): QuizRecord[] {
  const dateToCheck = parseDateString(selectedActivityDate).toDateString();
  const isOverallActivityRecord = (r: QuizRecord): boolean => r.mode !== "manual";
  return records.filter((r) => new Date(r.date).toDateString() === dateToCheck && isOverallActivityRecord(r));
}

/**
 * SNS 共有用の活動サマリテキストを構築して返す。
 * `selectedActivityDate` の日付を基準とし、各単元の成績を含む。
 * テキストに「学習サマリ」ヘッダーは含めず、単元数で合計を表示する。
 */
export function buildShareSummaryText(
  records: QuizRecord[],
  selectedActivityDate: string,
  useCase: QuizUseCase,
): string {
  const [year, month, day] = selectedActivityDate.split("-");
  const dateStr = `${year}/${month}/${day}`;
  const dateRecords = filterRecordsBySelectedDate(records, selectedActivityDate);

  const lines: string[] = [`📅 ${dateStr}`];

  if (dateRecords.length === 0) {
    lines.push("まだクイズをしていません。");
    return lines.join("\n");
  }

  const subjectIconMap = Object.fromEntries(
    SUBJECTS.filter((s) => s.id !== "all" && s.id !== "admin").map((s) => [s.id, s.icon]),
  );

  // 教科＋単元ごとに集計
  const byUnit = new Map<
    string,
    { subject: string; subjectName: string; categoryName: string; icon: string; total: number; correct: number }
  >();
  for (const r of dateRecords) {
    const key = `${r.subject}::${r.category}`;
    const u = byUnit.get(key) ?? {
      subject: r.subject,
      subjectName: r.subjectName,
      categoryName: r.categoryName,
      icon: subjectIconMap[r.subject] ?? "📝",
      total: 0,
      correct: 0,
    };
    u.total += r.totalCount;
    u.correct += r.correctCount;
    byUnit.set(key, u);
  }

  for (const [key, data] of byUnit.entries()) {
    const pct = Math.round((data.correct / data.total) * 100);
    const category = key.split("::")[1] ?? "";
    const topCat = useCase.getTopCategoryForUnit(data.subject, category);
    const parentCat = useCase.getParentCategoryForUnit(data.subject, category);

    // パス: 教科 > トップカテゴリ > 親カテゴリ > 単元名（存在する階層のみ表示）
    // トップカテゴリと親カテゴリが同名の場合は重複を避けてトップカテゴリを省略する
    const pathParts: string[] = [data.subjectName];
    const shouldIncludeTopCategory = topCat !== undefined && topCat.name !== parentCat?.name;
    if (shouldIncludeTopCategory && topCat) pathParts.push(topCat.name);
    if (parentCat) pathParts.push(parentCat.name);
    pathParts.push(data.categoryName);

    lines.push(`${data.icon} ${pathParts.join(" > ")}: ${data.correct}/${data.total}問正解 (${pct}%)`);
  }

  // 合計は単元数で表示する
  const unitCount = byUnit.size;
  lines.push("---");
  lines.push(`合計: ${unitCount}単元`);

  return lines.join("\n");
}
