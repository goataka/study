/**
 * 解説パネルの「学年グループサマリ」表示を React で構築するコンポーネント。
 *
 * 旧 `renderGradeGuideContent`（guidePanelUpdater.ts 内）を React 化したもの。
 * 学年別ビューで学年グループを選択した際、guidePanelFrame に表示される
 * シンプルな単元一覧（タイトル + 概要 + 単元名・説明リスト）を担当する。
 */

import * as React from "react";

/** 1 単元分の表示エントリ。 */
export interface GradeGuideEntry {
  /** 単元の安定キー（カテゴリ ID 等）。React の key に使用される。 */
  id: string;
  /** 単元の表示名 */
  name: string;
  /** 単元の説明文（任意） */
  description?: string;
}

/** GradeGuideContent コンポーネントの props。 */
export interface GradeGuideContentProps {
  /** 見出しに表示する学年ラベル（例: "小1" / "学年未設定"） */
  title: string;
  /** 見出し配下の単元エントリ */
  entries: GradeGuideEntry[];
}

/** 学年グループの解説サマリを描画する。 */
export function GradeGuideContent({ title, entries }: GradeGuideContentProps): React.JSX.Element {
  return (
    <div className="guide-content px-4 py-3 text-[14px] leading-relaxed text-[#24292e]">
      <h2 className="mt-4 mb-2 text-[1.25em] font-semibold leading-tight text-[#24292e] border-b border-[#eaecef] pb-[0.3em]">{`🎓 ${title}`}</h2>
      <p className="mt-0 mb-4">{`対象学年: ${title} / ${entries.length}単元`}</p>
      <ul className="mb-4 pl-8 list-disc">
        {entries.map((entry) => (
          <li key={entry.id} className="my-1">
            {entry.description ? `${entry.name} — ${entry.description}` : entry.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
