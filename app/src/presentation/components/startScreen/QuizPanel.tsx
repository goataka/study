/**
 * スタート画面右カラムのインナータブ群（解説 / 確認 / 問題 / 履歴）と各タブのコンテンツ。
 *
 * クイズモードの設定（問題数 / 並び順 / 学習済の扱い）と「学習済みにする」ボタンを含む。
 * インナータブの切り替えやリストの動的描画は既存コントローラが担当する。
 */

export function QuizPanel(): React.JSX.Element {
  return (
    <>
      <div className="panel-tabs" role="tablist" aria-label="パネル切り替え">
        <button
          className="panel-tab"
          id="panelTab-guide"
          data-panel="guide"
          role="tab"
          type="button"
          aria-selected="false"
          aria-controls="guideContent"
          tabIndex={-1}
        >
          📖 解説
        </button>
        <button
          className="panel-tab active"
          id="panelTab-quiz"
          data-panel="quiz"
          role="tab"
          type="button"
          aria-selected="true"
          aria-controls="quizModePanel"
          tabIndex={0}
        >
          ✅ 確認
        </button>
        <button
          className="panel-tab"
          id="panelTab-questions"
          data-panel="questions"
          role="tab"
          type="button"
          aria-selected="false"
          aria-controls="questionListContent"
          tabIndex={-1}
        >
          📋 問題
        </button>
        <button
          className="panel-tab"
          id="panelTab-history"
          data-panel="history"
          role="tab"
          type="button"
          aria-selected="false"
          aria-controls="historyContent"
          tabIndex={-1}
        >
          📊 履歴
        </button>
      </div>

      <div id="quizModePanel" role="tabpanel" aria-labelledby="panelTab-quiz">
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

      <div id="guideContent" className="hidden" role="tabpanel" aria-labelledby="panelTab-guide">
        <div id="guidePanelFrame" className="guide-frame"></div>
        <p id="guideNoContent" className="guide-no-content hidden">
          このカテゴリには解説がありません。
        </p>
      </div>

      <div id="historyContent" className="hidden" role="tabpanel" aria-labelledby="panelTab-history">
        <div id="historyList" className="history-list"></div>
      </div>

      <div id="questionListContent" className="hidden" role="tabpanel" aria-labelledby="panelTab-questions">
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
