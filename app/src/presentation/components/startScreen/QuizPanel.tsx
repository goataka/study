/**
 * スタート画面右カラムのインナータブ群（解説 / 確認 / 問題 / 履歴）と各タブのコンテンツ。
 *
 * クイズモードの設定（問題数 / 並び順 / 学習済の扱い）と「学習済みにする」ボタンを含む。
 * インナータブの active 状態と各パネルの hidden 表示は `panelTabsStore` を購読して
 * 宣言的に反映する。クリックは onClick で `setActivePanelTab` を直接呼び出す。
 */

import { type PanelTab } from "./panelTabsStore";
import { useActivePanelTab, useHiddenPanelTabs } from "./usePanelTabsStore";

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
  const classes = ["panel-tab"];
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
      // クリックハンドラは buildPanelTabs が addEventListener で登録する。
      // React onClick を併用すると静的 HTML 互換の DOM 委譲と二重発火するため、
      // ここでは onClick を付けない（React は active/hidden の宣言的反映のみを担う）。
    >
      {label}
    </button>
  );
}

export function QuizPanel(): React.JSX.Element {
  const active = useActivePanelTab();
  const hiddenTabs = useHiddenPanelTabs();
  const hiddenIfNot = (tab: PanelTab): string => (active === tab ? "" : "hidden");
  return (
    <>
      <div className="panel-tabs" role="tablist" aria-label="パネル切り替え">
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

      <div id="quizModePanel" role="tabpanel" aria-labelledby="panelTab-quiz" className={hiddenIfNot("quiz")}>
        <div id="statsInfo" className="stats-info">
          読み込み中...
        </div>
        <div className="button-group">
          <button id="startRandomBtn" className="primary-btn">
            スタート
          </button>
        </div>
        <div className="question-count-section">
          <span className="question-count-label">問題数：</span>
          <div className="question-count-group">
            <label className="count-label">
              <input type="radio" name="questionCount" value="5" /> 5問
            </label>
            <label className="count-label">
              <input type="radio" name="questionCount" value="10" defaultChecked /> 10問
            </label>
            <label className="count-label">
              <input type="radio" name="questionCount" value="20" /> 20問
            </label>
          </div>
        </div>
        <div className="quiz-order-section">
          <span className="quiz-order-label">並び順：</span>
          <div className="quiz-order-group">
            <label className="order-label">
              <input type="radio" name="quizOrder" value="straight" /> ストレート
            </label>
            <label className="order-label">
              <input type="radio" name="quizOrder" value="random" defaultChecked /> ランダム
            </label>
          </div>
        </div>
        <div className="quiz-learned-section">
          <span className="quiz-order-label">学習済：</span>
          <div className="quiz-order-group">
            <label className="order-label">
              <input type="radio" name="quizLearned" value="exclude" defaultChecked /> 含めない
            </label>
            <label className="order-label">
              <input type="radio" name="quizLearned" value="include" /> 含める
            </label>
          </div>
        </div>
        <div className="mark-learned-section">
          <button id="markLearnedBtn" className="mark-learned-btn" disabled>
            ✅ 学習済みにする
          </button>
        </div>
      </div>

      <div id="guideContent" className={hiddenIfNot("guide")} role="tabpanel" aria-labelledby="panelTab-guide">
        <div id="guidePanelFrame" className="guide-frame"></div>
        <p id="guideNoContent" className="guide-no-content hidden">
          このカテゴリには解説がありません。
        </p>
      </div>

      <div id="historyContent" className={hiddenIfNot("history")} role="tabpanel" aria-labelledby="panelTab-history">
        <div id="historyList" className="history-list"></div>
      </div>

      <div
        id="questionListContent"
        className={hiddenIfNot("questions")}
        role="tabpanel"
        aria-labelledby="panelTab-questions"
      >
        <div className="question-list-filter-bar">
          <button id="questionListFilterAll" className="question-list-filter-btn active" type="button">
            すべて
          </button>
          <button id="questionListFilterUnlearned" className="question-list-filter-btn" type="button">
            未学習
          </button>
          <button id="questionListFilterLearned" className="question-list-filter-btn" type="button">
            学習済
          </button>
          <span id="questionListFilterCount" className="question-list-filter-count"></span>
        </div>
        <div id="questionListBody" className="question-list-panel-body"></div>
      </div>
    </>
  );
}
