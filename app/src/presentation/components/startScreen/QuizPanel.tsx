/**
 * スタート画面右カラムのインナータブ群（解説 / 確認 / 問題 / 履歴）と各タブのコンテンツ。
 *
 * クイズモードの設定（問題数 / 並び順 / 学習済の扱い）と「学習済みにする」ボタンを含む。
 * インナータブの active 状態と各パネルの hidden 表示は `panelTabsStore` を購読して
 * 宣言的に反映し、クリックは React onClick で `panelTabsStore` を更新する。
 */

import { setActivePanelTab, type PanelTab } from "./panelTabsStore";
import { useActivePanelTab, useHiddenPanelTabs } from "./usePanelTabsStore";
import { setQuizSettings } from "./quizSettingsStore";
import { useQuizSettings } from "./useQuizSettingsStore";
import { button } from "../../styles/buttonStyles";
import { panelTab, panelTabs } from "../../styles/panelTabStyles";

// 問題一覧フィルタ（すべて / 未学習 / 学習済）の共通ボタンスタイル。
// `active` は `questionListView.tsx` の `classList.toggle("active", ...)` で
// 切り替わるため、Tailwind の arbitrary variant `[&.active]:` でアクティブ表現する。
const filterBtnClass =
  "question-list-filter-btn cursor-pointer rounded-xl border border-solid border-[#d1d5da] bg-white px-3 py-1 text-sm text-[#586069] transition-colors duration-150 hover:border-[#0366d6] hover:bg-[#e8f0fe] hover:text-[#0366d6] [&.active]:border-[#0366d6] [&.active]:bg-[#0366d6] [&.active]:text-white";

interface PanelTabButtonProps {
  tab: PanelTab;
  active: PanelTab;
  hidden: boolean;
  id: string;
  controls: string;
  label: string;
}

function PanelTabButton({ tab, active, hidden, id, controls, label }: PanelTabButtonProps): React.JSX.Element {
  const isActive = tab === active;
  const classes = [panelTab()];
  if (isActive) classes.push("active");
  if (hidden) classes.push("hidden");
  return (
    <button
      className={classes.join(" ")}
      id={id}
      data-panel={tab}
      role="tab"
      type="button"
      aria-selected={isActive}
      aria-controls={controls}
      tabIndex={isActive ? 0 : -1}
      onClick={() => setActivePanelTab(tab)}
    >
      {label}
    </button>
  );
}

export function QuizPanel(): React.JSX.Element {
  const active = useActivePanelTab();
  const hiddenTabs = useHiddenPanelTabs();
  const settings = useQuizSettings();
  const hiddenIfNot = (tab: PanelTab): string => (active === tab ? "" : "hidden");
  return (
    <>
      <div className={panelTabs()} role="tablist" aria-label="パネル切り替え">
        <PanelTabButton
          tab="guide"
          active={active}
          hidden={hiddenTabs.has("guide")}
          id="panelTab-guide"
          controls="guideContent"
          label="📖 解説"
        />
        <PanelTabButton
          tab="questions"
          active={active}
          hidden={hiddenTabs.has("questions")}
          id="panelTab-questions"
          controls="questionListContent"
          label="📋 問題"
        />
        <PanelTabButton
          tab="quiz"
          active={active}
          hidden={hiddenTabs.has("quiz")}
          id="panelTab-quiz"
          controls="quizModePanel"
          label="✅ 確認"
        />
        <PanelTabButton
          tab="history"
          active={active}
          hidden={hiddenTabs.has("history")}
          id="panelTab-history"
          controls="historyContent"
          label="📊 履歴"
        />
      </div>

      <div
        id="quizModePanel"
        role="tabpanel"
        aria-labelledby="panelTab-quiz"
        className={`flex flex-1 flex-col overflow-y-auto px-[30px] py-6 ${hiddenIfNot("quiz")}`}
      >
        <div id="statsInfo" className="stats-info mb-4 text-center text-base text-[#666]">
          読み込み中...
        </div>
        <div className="button-group mb-5 flex flex-col gap-[15px]">
          <button id="startRandomBtn" className={button({ variant: "primary" })}>
            スタート
          </button>
        </div>
        <div className="question-count-section flex flex-wrap items-center gap-3 py-1.5 max-[600px]:flex-col max-[600px]:items-start">
          <span className="question-count-label text-lg font-semibold text-[#333]">問題数：</span>
          <div className="question-count-group flex gap-4">
            <label className="count-label flex cursor-pointer items-center gap-[5px] text-[17px] text-[#333]">
              <input
                type="radio"
                name="questionCount"
                value="5"
                checked={settings.questionCount === 5}
                onChange={() => setQuizSettings({ questionCount: 5 })}
                className="cursor-pointer accent-[#0366d6]"
              />{" "}
              5問
            </label>
            <label className="count-label flex cursor-pointer items-center gap-[5px] text-[17px] text-[#333]">
              <input
                type="radio"
                name="questionCount"
                value="10"
                checked={settings.questionCount === 10}
                onChange={() => setQuizSettings({ questionCount: 10 })}
                className="cursor-pointer accent-[#0366d6]"
              />{" "}
              10問
            </label>
            <label className="count-label flex cursor-pointer items-center gap-[5px] text-[17px] text-[#333]">
              <input
                type="radio"
                name="questionCount"
                value="20"
                checked={settings.questionCount === 20}
                onChange={() => setQuizSettings({ questionCount: 20 })}
                className="cursor-pointer accent-[#0366d6]"
              />{" "}
              20問
            </label>
          </div>
        </div>
        <div className="quiz-order-section flex items-center gap-2 py-1.5">
          <span className="quiz-order-label text-lg font-semibold whitespace-nowrap text-[#333]">並び順：</span>
          <div className="quiz-order-group flex flex-wrap gap-2">
            <label className="order-label flex cursor-pointer items-center gap-1 text-[17px] text-[#333]">
              <input
                type="radio"
                name="quizOrder"
                value="straight"
                checked={settings.quizOrder === "straight"}
                onChange={() => setQuizSettings({ quizOrder: "straight" })}
                className="cursor-pointer accent-[#0366d6]"
              />{" "}
              ストレート
            </label>
            <label className="order-label flex cursor-pointer items-center gap-1 text-[17px] text-[#333]">
              <input
                type="radio"
                name="quizOrder"
                value="random"
                checked={settings.quizOrder === "random"}
                onChange={() => setQuizSettings({ quizOrder: "random" })}
                className="cursor-pointer accent-[#0366d6]"
              />{" "}
              ランダム
            </label>
          </div>
        </div>
        <div className="quiz-learned-section flex items-center gap-2 py-1.5">
          <span className="quiz-order-label text-lg font-semibold whitespace-nowrap text-[#333]">学習済：</span>
          <div className="quiz-order-group flex flex-wrap gap-2">
            <label className="order-label flex cursor-pointer items-center gap-1 text-[17px] text-[#333]">
              <input
                type="radio"
                name="quizLearned"
                value="exclude"
                checked={!settings.includeMastered}
                onChange={() => setQuizSettings({ includeMastered: false })}
                className="cursor-pointer accent-[#0366d6]"
              />{" "}
              含めない
            </label>
            <label className="order-label flex cursor-pointer items-center gap-1 text-[17px] text-[#333]">
              <input
                type="radio"
                name="quizLearned"
                value="include"
                checked={settings.includeMastered}
                onChange={() => setQuizSettings({ includeMastered: true })}
                className="cursor-pointer accent-[#0366d6]"
              />{" "}
              含める
            </label>
          </div>
        </div>
        <div className="mark-learned-section">
          <button id="markLearnedBtn" className="mark-learned-btn" disabled>
            ✅ 学習済みにする
          </button>
        </div>
      </div>

      <div
        id="guideContent"
        className={`flex min-h-0 flex-1 flex-col overflow-hidden ${hiddenIfNot("guide")}`}
        role="tabpanel"
        aria-labelledby="panelTab-guide"
      >
        <div id="guidePanelFrame" className="guide-frame"></div>
        <p id="guideNoContent" className="guide-no-content hidden">
          このカテゴリには解説がありません。
        </p>
      </div>

      <div
        id="historyContent"
        className={`flex-1 overflow-y-auto px-5 py-4 ${hiddenIfNot("history")}`}
        role="tabpanel"
        aria-labelledby="panelTab-history"
      >
        <div id="historyList" className="history-list flex flex-col gap-2.5"></div>
      </div>

      <div
        id="questionListContent"
        className={`flex min-h-0 flex-1 flex-col overflow-hidden ${hiddenIfNot("questions")}`}
        role="tabpanel"
        aria-labelledby="panelTab-questions"
      >
        <div className="question-list-filter-bar flex shrink-0 items-center gap-2 border-b border-solid border-[#e1e4e8] bg-[#f6f8fa] px-4 py-2">
          <button id="questionListFilterAll" className={`${filterBtnClass} active`} type="button">
            すべて
          </button>
          <button id="questionListFilterUnlearned" className={filterBtnClass} type="button">
            未学習
          </button>
          <button id="questionListFilterLearned" className={filterBtnClass} type="button">
            学習済
          </button>
          <span
            id="questionListFilterCount"
            className="question-list-filter-count ml-auto text-[13px] font-semibold text-[#586069]"
          ></span>
        </div>
        <div id="questionListBody" className="question-list-panel-body min-h-0 flex-1 overflow-y-auto py-2"></div>
      </div>
    </>
  );
}
