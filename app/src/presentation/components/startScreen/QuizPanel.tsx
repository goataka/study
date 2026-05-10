/**
 * スタート画面右カラムのインナータブ群（解説 / 確認 / 問題 / 履歴）と各タブのコンテンツ。
 *
 * クイズモードの設定（問題数 / 並び順 / 学習済の扱い）と「学習済みにする」ボタンを含む。
 * インナータブの active 状態と各パネルの hidden 表示は `panelTabsStore` を購読して
 * 宣言的に反映する。クリックハンドラは React onClick ではなく `buildPanelTabs`
 * （`quizApp/tabsBuilder.tsx`）の DOM 委譲で処理する（既存の静的 HTML テストとの
 * 二重発火を避けるため。詳細は `PanelTabButton` 内コメント参照）。
 */

import { type PanelTab } from "./panelTabsStore";
import { useActivePanelTab, useHiddenPanelTabs } from "./usePanelTabsStore";
import { setQuizSettings } from "./quizSettingsStore";
import { useQuizSettings } from "./useQuizSettingsStore";

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
      // クリックハンドラは buildPanelTabs（quizApp/tabsBuilder.tsx）が
      // addEventListener で登録する。React onClick を併用すると、静的 HTML を
      // 利用する既存テスト群（quizApp/panels.test.ts 等）の DOM 委譲と
      // 二重発火するため、ここでは onClick を付けない。React は active / hidden /
      // aria 属性の宣言的反映のみを担う。
      //
      // 将来、すべての関連テストが React マウントを使う形に統一できたら
      // DOM 委譲を撤去し、ここに onClick を移すことで dual-control を解消する。
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
              <input
                type="radio"
                name="questionCount"
                value="5"
                checked={settings.questionCount === 5}
                onChange={() => setQuizSettings({ questionCount: 5 })}
              />{" "}
              5問
            </label>
            <label className="count-label">
              <input
                type="radio"
                name="questionCount"
                value="10"
                checked={settings.questionCount === 10}
                onChange={() => setQuizSettings({ questionCount: 10 })}
              />{" "}
              10問
            </label>
            <label className="count-label">
              <input
                type="radio"
                name="questionCount"
                value="20"
                checked={settings.questionCount === 20}
                onChange={() => setQuizSettings({ questionCount: 20 })}
              />{" "}
              20問
            </label>
          </div>
        </div>
        <div className="quiz-order-section">
          <span className="quiz-order-label">並び順：</span>
          <div className="quiz-order-group">
            <label className="order-label">
              <input
                type="radio"
                name="quizOrder"
                value="straight"
                checked={settings.quizOrder === "straight"}
                onChange={() => setQuizSettings({ quizOrder: "straight" })}
              />{" "}
              ストレート
            </label>
            <label className="order-label">
              <input
                type="radio"
                name="quizOrder"
                value="random"
                checked={settings.quizOrder === "random"}
                onChange={() => setQuizSettings({ quizOrder: "random" })}
              />{" "}
              ランダム
            </label>
          </div>
        </div>
        <div className="quiz-learned-section">
          <span className="quiz-order-label">学習済：</span>
          <div className="quiz-order-group">
            <label className="order-label">
              <input
                type="radio"
                name="quizLearned"
                value="exclude"
                checked={!settings.includeMastered}
                onChange={() => setQuizSettings({ includeMastered: false })}
              />{" "}
              含めない
            </label>
            <label className="order-label">
              <input
                type="radio"
                name="quizLearned"
                value="include"
                checked={settings.includeMastered}
                onChange={() => setQuizSettings({ includeMastered: true })}
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
