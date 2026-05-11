# React 完全移行 Issue 一覧

命令的 DOM 操作から完全 React 化へのロードマップ。  
各 Issue は Step 1〜3 が並行着手可能で、Step 6 は 1〜5 完了後の最終フェーズ。

---

## Issue 1: 【React移行 Step 1】画面遷移を React state で管理する（`screenNavigator.ts` 廃止）

### 背景

現在、画面遷移（スタート／クイズ／結果）は `presentation/quizApp/screenNavigator.ts` の `showScreen()` 関数が `document.querySelectorAll(".screen")` を直接操作して `hidden` クラスを制御している。  
React が DOM を所有しているにも関わらず外部から DOM を書き換える構造であり、完全移行の最大の障害となっている。

### 作業内容

**1. 画面状態 store の作成（`src/presentation/components/screenStore.ts`）**
- `currentScreen: "start" | "quiz" | "result"` を `useSyncExternalStore` 形式の store として実装
- `setCurrentScreen()` を公開する

**2. 各画面コンポーネントの表示制御を React 化**
- `App.tsx` で store を subscribe して `currentScreen` を受け取り、各画面の `hidden` を state で制御する
- `StartScreen`, `QuizScreen`, `ResultScreen` の `hidden` クラスを store の値から算出する

**3. 呼び出し元の差し替え**
- `QuizApp` の `showScreen()` 呼び出しをすべて `setCurrentScreen()` に置き換える
- `screenNavigator.ts` を削除する

**4. ブラウザ履歴の移管**
- `showScreen()` 内の `pushState` / `replaceState` 処理を store の setter に集約する
- `eventListeners.ts` の `popstate` ハンドラで `setCurrentScreen()` を呼ぶように変更する

### 影響ファイル
- `src/presentation/quizApp/screenNavigator.ts` → **削除**
- `src/presentation/App.tsx`
- `src/presentation/components/StartScreen.tsx`, `QuizScreen.tsx`, `ResultScreen.tsx`
- `src/presentation/quizApp/delegators/lifecycle.ts`（`showScreen` 呼び出し箇所）
- `src/presentation/quizApp/eventListeners.ts`（popstate ハンドラ内）

### 完了条件
- [ ] `screenNavigator.ts` が削除されている
- [ ] `.screen` の `hidden` 切り替えが React の state 経由になっている
- [ ] ブラウザの戻るボタンで正常にスタート画面に戻れる
- [ ] 既存テストがすべて通る

---

## Issue 2: 【React移行 Step 2】クイズ画面の命令的DOM操作を React state に移行する

### 背景

クイズ画面（`QuizScreen.tsx`）のコンポーネントは定義済みだが、問題表示・フィードバック・ナビゲーションボタンの状態更新はすべて命令的DOM操作で行われている。

- `questionRenderer.ts`: `setText()`, `getElementById()` で問題番号・トピック・進捗バー・問題文を更新
- `answerFeedback.ts`: `getElementById("answerFeedback")` の `classList` を直接操作
- `navigationButtons.ts`: `getElementById("prevBtn")` 等の `disabled` / `hidden` を直接操作
- `notesAreaUpdater.ts`: `getElementById` でメモエリアの表示を切り替え

### 作業内容

**1. クイズ状態 store の作成（`src/presentation/components/quizSessionStore.ts`）**
- `currentSession: QuizSession | null` および `currentIndex: number` を store で管理
- 回答状態の変化を store 経由で React に通知する

**2. `QuizScreen` コンポーネントの props 化**
- store を subscribe して問題番号・進捗・トピック名・問題文・フィードバック表示を React props で制御する
- `answerFeedback.ts` の `showAnswerFeedback()` / `hideAnswerFeedback()` を React state に置き換え
- `navigationButtons.ts` の `updateNavigationButtons()` を React state（`disabled`, `hidden`）に置き換え

**3. `questionRenderer.ts` の廃止**
- `renderQuestion()` を呼ぶ代わりに store を更新するだけになる
- `questionRenderer.ts` を削除する

**4. メモエリア更新の React 化**
- `notesAreaUpdater.ts` の `updateNotesAreaForQuestion()` ロジックを `QuizScreen` 内の React 制御に移す

### 影響ファイル
- `src/presentation/quizApp/questionRenderer.ts` → **削除**
- `src/presentation/quizApp/answerFeedback.ts` → **削除**
- `src/presentation/quizApp/navigationButtons.ts` → **削除**
- `src/presentation/quizApp/notesAreaUpdater.ts` → **削除**
- `src/presentation/components/QuizScreen.tsx`（大幅改修）
- `src/presentation/quizApp/delegators/lifecycle.ts`（`renderQuestion` 呼び出し箇所）

### 完了条件
- [ ] `questionRenderer.ts`, `answerFeedback.ts`, `navigationButtons.ts`, `notesAreaUpdater.ts` が削除されている
- [ ] クイズの進行（前へ・次へ・採点）が正常に動作する
- [ ] 回答フィードバックが正常に表示される
- [ ] 既存テストがすべて通る

---

## Issue 3: 【React移行 Step 3】結果画面の `innerHTML` を React に移行する（`resultScreenView.tsx` 刷新）

### 背景

`resultScreenView.tsx` は `.tsx` 拡張子を持つが、内部でスコア表示を `innerHTML` で生成している（`renderScoreDisplay()` 関数）。また `resultUnitName` / `resultMessage` 等も `document.getElementById()` を使った命令的更新になっている。

```ts
// 現状（resultScreenView.tsx 内）
scoreDisplay.innerHTML = `<div class="${circleClass}">...</div>`;
```

### 作業内容

**1. 結果状態 store の作成（`src/presentation/components/resultStore.ts`）**
- `results: AnswerResult[] | null` を store で管理
- `setResults()` を公開する

**2. `ResultScreen` コンポーネントの完全 React 化**
- `ResultScreen.tsx` を store を subscribe するコンポーネントに変更する
- スコア表示（パーセント・正解数）、単元名、メッセージ、解答一覧をすべて React で描画する
- `renderReactInto()` を使わず、`resultDetails` も React ツリーに含める

**3. `resultScreenView.tsx` の廃止**
- `renderResultScreenContent()` を呼ぶ代わりに `setResults()` で store を更新するだけになる
- `resultScreenView.tsx` を削除する

### 影響ファイル
- `src/presentation/quizApp/resultScreenView.tsx` → **削除**
- `src/presentation/components/ResultScreen.tsx`（大幅改修）
- `src/presentation/quizApp/delegators/lifecycle.ts`（`renderResultScreen` 呼び出し箇所）

### 完了条件
- [ ] `resultScreenView.tsx` が削除されている
- [ ] 結果画面のスコア・メッセージ・解答一覧が React コンポーネントで描画されている
- [ ] `innerHTML` の直接書き込みが除去されている
- [ ] 既存テストがすべて通る

---

## Issue 4: 【React移行 Step 4】フォントサイズ管理を React 化する（`fontSizeManager.ts` 廃止）

### 背景

`fontSizeManager.ts` の `applyFontSizeToDom()` が `document.body.classList` と `.font-size-btn` の `aria-pressed` を直接操作している。React が管理する DOM 外への副作用であり、テストも複雑になっている。

### 作業内容

**1. フォントサイズ store の作成（`src/presentation/components/fontSizeStore.ts`）**
- `fontSizeLevel: "small" | "medium" | "large"` を store で管理
- `setFontSizeLevel()` を公開し、永続化は呼び出し元のコールバックで行う

**2. `<body>` クラス適用を React 化**
- `App.tsx` で store を subscribe し、`useEffect` で `document.body.classList` を更新する（副作用として限定的に残す）

**3. フォントサイズボタンの `aria-pressed` を React 化**
- フォントサイズボタンをもし React コンポーネント化していなければ、store の値から `aria-pressed` を算出するコンポーネントに変換する

**4. `fontSizeManager.ts` の廃止**
- `applyFontSizeToDom()` を呼ぶ代わりに `setFontSizeLevel()` で store を更新するだけになる
- `fontSizeManager.ts` を削除する

### 影響ファイル
- `src/presentation/quizApp/fontSizeManager.ts` → **削除**
- `src/presentation/App.tsx`
- フォントサイズボタンを含む HTML / コンポーネント

### 完了条件
- [ ] `fontSizeManager.ts` が削除されている
- [ ] フォントサイズ切り替えが正常に動作する
- [ ] `aria-pressed` が store の値から正しく設定される
- [ ] 既存テストがすべて通る

---

## Issue 5: 【React移行 Step 5】カテゴリ統計表示を React 化する（`categoryStatsView.ts` 廃止）

### 背景

`categoryStatsView.ts` の `updateSubjectStats()` が `document.querySelectorAll(".category-item[data-subject]")` を走査して、DOM を直接書き換えている。`CategoryItem` コンポーネントが既に React で管理されているにも関わらず、外部から DOM を上書きしている。

### 作業内容

**1. 統計データを `CategoryItem` コンポーネントへの props として渡す**
- `CategoryItem.tsx` に `stat: CategoryStat` prop を追加する
- 統計計算を `categoryStatsCalculator.ts` に委譲し、`categoryListRenderer.tsx` でビルド時に渡す

**2. カテゴリ一覧再描画をトリガーに変更**
- 現在 `updateSubjectStats()` を呼んでいる箇所を、カテゴリリスト全体の再描画（`renderCategoryList()`）に統合する

**3. `categoryStatsView.ts` の廃止**
- `updateSubjectStats()` を削除し、`categoryStatsView.ts` を削除する

### 影響ファイル
- `src/presentation/quizApp/categoryStatsView.ts` → **削除**
- `src/presentation/components/CategoryItem.tsx`
- `src/presentation/quizApp/categoryListRenderer.tsx`
- `updateSubjectStats()` を呼んでいる箇所

### 完了条件
- [ ] `categoryStatsView.ts` が削除されている
- [ ] カテゴリ統計（問題数・進捗バー）が React コンポーネントで描画されている
- [ ] `document.querySelectorAll` による命令的更新が除去されている
- [ ] 既存テストがすべて通る

---

## Issue 6: 【React移行 Step 6】`renderReactInto` ブリッジを廃止する（完全 React ツリー化）

### 背景

Step 1〜5 完了後も、まだ `renderReactInto()` が残っている箇所は「React ツリーの外から React を埋め込む」パターンである。この橋渡しブリッジが残っている限り、`flushSync` による同期強制・孤児 root の検出ロジック・`data-react-mounted` マーカー管理が必要であり、React の通常の再描画モデルからも外れている。

### 作業内容

**1. 残存する `renderReactInto` 呼び出し箇所の洗い出し**
- `overallSummaryPanel.tsx`, `historyListView.tsx`, `categoryListRenderer.tsx` 等を確認する

**2. 各コンポーネントを React ツリーに直接統合**
- `renderReactInto(container, <Comp />)` のパターンを、`App.tsx` や各画面コンポーネントが直接 `<Comp />` を render する形に変更する
- store を介して必要な props を渡す

**3. `reactMount.ts` の廃止**
- `renderReactInto`, `clearReactContainer`, `hasReactMount`, `unmountReactFrom` を削除する
- `reactMount.ts` を削除する

### 影響ファイル
- `src/presentation/quizApp/reactMount.ts` → **削除**
- `renderReactInto` を呼んでいるすべてのファイル（`overallSummaryPanel.tsx`, `historyListView.tsx`, `categoryListRenderer.tsx`, `choicesRenderer.tsx` 等）

### 完了条件
- [ ] `reactMount.ts` が削除されている
- [ ] `flushSync` による同期レンダリング強制が除去されている
- [ ] React ツリー全体が単一の `createRoot` から管理されている
- [ ] 既存テストがすべて通る
