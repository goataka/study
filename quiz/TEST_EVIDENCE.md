# クイズ動作検証エビデンス

<!-- このファイルはAIエージェントが自動生成します。手動編集不要です。 -->
<!-- AIの作業時・CI実行時に必ず更新されます。 -->
<!-- 改ざん検証: 各テスト結果JSONのSHA256ハッシュをこのファイルに記録しています。 -->

## 概要

| 項目 | 値 |
|------|------|
| **ステータス（単体テスト）** | ✅ PASSED |
| **ステータス（E2Eテスト）** | ⏭ 未実行（CIで実行） |
| **最終更新** | 2026-04-21 09:14:01 JST |
| **更新者** | GitHub Actions (CI) |
| **コミット** | `6b95de0` |
| **コミットメッセージ** | feat: add hierarchical structure to math drills (arithmetic/algebra/calculus) |

## 改ざん防止チェックサム

テスト結果JSONファイルのSHA256ハッシュです。
`sha256sum test-results.json e2e-results.json` で検証できます。

| ファイル | SHA256 |
|------|------|
| `test-results.json` | `bee6e62fd7d03d26f632048394929761e63325e680f3c3bd2e922ad95e363df9` |
| `e2e-results.json` | 未実行 |

## 単体テスト結果サマリー

| 項目 | 結果 |
|------|------|
| テストスイート（合格 / 合計） | 41 / 41 |
| テストケース（合格 / 合計） | 112 / 112 |
| 失敗テスト | 0 |
| 実行時間 | 0.46s |

## E2Eテスト結果サマリー（Playwright + Gherkin）

> E2Eテストは CI の `e2e` ジョブで実行されます。
> ローカルで実行する場合: `npm run build && npm run test:e2e`

## 単体テストスイート詳細

### ✅ `src/application/quizUseCase.test.ts` (8/8)

| 結果 | テスト名 |
|------|---------|
| ✅ | QuizUseCase — 初期化仕様 > initialize() で全問題をロードする |
| ✅ | QuizUseCase — フィルター仕様 > 教科フィルターが機能する |
| ✅ | QuizUseCase — フィルター仕様 > 教科の categories が取得できる |
| ✅ | QuizUseCase — セッション開始仕様 > randomモードで最大10問のセッションが開始される |
| ✅ | QuizUseCase — セッション開始仕様 > retryモードで間違えた問題がなければエラー |
| ✅ | QuizUseCase — セッション開始仕様 > retryモードで間違えた問題のみが出題される |
| ✅ | QuizUseCase — 採点・進捗保存仕様 > 正解した問題は wrongIds から除かれる |
| ✅ | QuizUseCase — 採点・進捗保存仕様 > 不正解の問題は wrongIds に追加される |

### ✅ `src/domain/question.test.ts` (19/19)

| 結果 | テスト名 |
|------|---------|
| ✅ | validateManifest — マニフェスト検証仕様 > 有効なマニフェストを受け入れる |
| ✅ | validateManifest — マニフェスト検証仕様 > null を拒否する |
| ✅ | validateManifest — マニフェスト検証仕様 > version フィールドがない場合に拒否する |
| ✅ | validateManifest — マニフェスト検証仕様 > subjects フィールドがない場合に拒否する |
| ✅ | validateManifest — マニフェスト検証仕様 > questionFiles が配列でない場合に拒否する |
| ✅ | validateQuestionFile — 問題ファイル検証仕様 > 有効な問題ファイルを受け入れる |
| ✅ | validateQuestionFile — 問題ファイル検証仕様 > null を拒否する |
| ✅ | validateQuestionFile — 問題ファイル検証仕様 > subject フィールドがない場合に拒否する |
| ✅ | validateQuestionFile — 問題ファイル検証仕様 > questions が配列でない場合に拒否する |
| ✅ | validateQuestionFile — 問題ファイル検証仕様 > 選択肢が4つでない場合に拒否する |
| ✅ | validateQuestionFile — 問題ファイル検証仕様 > correct が範囲外の場合に拒否する |
| ✅ | expandQuestions — 問題展開仕様 > 各問題にメタ情報（subject, category など）が付加される |
| ✅ | expandQuestions — 問題展開仕様 > 元の問題フィールドが保持される |
| ✅ | shuffleChoices — 選択肢シャッフル仕様 > 元の問題を変更せず、同じ要素数の選択肢を返す |
| ✅ | shuffleChoices — 選択肢シャッフル仕様 > すべての選択肢が保持される |
| ✅ | shuffleChoices — 選択肢シャッフル仕様 > 正解のインデックスが正しく更新される |
| ✅ | shuffleChoices — 選択肢シャッフル仕様 > 同じIDの問題は常に同じシャッフル結果を返す（決定論的） |
| ✅ | shuffleChoices — 選択肢シャッフル仕様 > 異なるIDの問題は異なるシャッフル結果を返す |
| ✅ | shuffleChoices — 選択肢シャッフル仕様 > 正解が最後の位置にある場合も正しくシャッフルされる |

### ✅ `src/domain/quizSession.test.ts` (18/18)

| 結果 | テスト名 |
|------|---------|
| ✅ | QuizSession — セッション初期化仕様 > 少なくとも1問が必要 |
| ✅ | QuizSession — セッション初期化仕様 > 問題リストが正しく設定される |
| ✅ | QuizSession — セッション初期化仕様 > 最初の問題インデックスは0 |
| ✅ | QuizSession — 回答仕様 > 有効な回答を記録できる |
| ✅ | QuizSession — 回答仕様 > 無効な問題インデックスはエラー |
| ✅ | QuizSession — 回答仕様 > 無効な選択肢インデックスはエラー |
| ✅ | QuizSession — ナビゲーション仕様 > 次の問題に進める |
| ✅ | QuizSession — ナビゲーション仕様 > 先頭より前には進めない |
| ✅ | QuizSession — ナビゲーション仕様 > 末尾より後には進めない |
| ✅ | QuizSession — 採点仕様 > 全問回答前は採点できない（canSubmit = false） |
| ✅ | QuizSession — 採点仕様 > 全問回答後は採点できる（canSubmit = true） |
| ✅ | QuizSession — 採点仕様 > 正解数を正確に計算する |
| ✅ | QuizSession — 採点仕様 > 結果に各問の正誤が含まれる |
| ✅ | QuizSession.pickRandom — ランダム選択仕様 > 指定した件数を返す |
| ✅ | QuizSession.pickRandom — ランダム選択仕様 > 問題数より多くは返さない |
| ✅ | QuizSession.filter — フィルター仕様 > 教科でフィルターできる |
| ✅ | QuizSession.filter — フィルター仕様 > カテゴリでフィルターできる |
| ✅ | QuizSession.filter — フィルター仕様 > all を指定すると全件返る |

### ✅ `src/infrastructure/localStorageProgressRepository.test.ts` (10/10)

| 結果 | テスト名 |
|------|---------|
| ✅ | LocalStorageProgressRepository — 間違えた問題ID永続化仕様 > 初回ロード時は空配列を返す |
| ✅ | LocalStorageProgressRepository — 間違えた問題ID永続化仕様 > 保存したIDリストを正しく読み込める |
| ✅ | LocalStorageProgressRepository — 間違えた問題ID永続化仕様 > 空配列を保存した後は空配列を返す |
| ✅ | LocalStorageProgressRepository — 間違えた問題ID永続化仕様 > 上書き保存が正しく機能する |
| ✅ | LocalStorageProgressRepository — 間違えた問題ID永続化仕様 > 別のインスタンスからも同じデータを読み込める（永続化確認） |
| ✅ | LocalStorageProgressRepository — 間違えた問題ID永続化仕様 > localStorageに不正なJSONが入っていてもロード時に空配列を返す |
| ✅ | LocalStorageProgressRepository — ユーザー名永続化仕様 > 初回ロード時はnullを返す |
| ✅ | LocalStorageProgressRepository — ユーザー名永続化仕様 > 保存したユーザー名を正しく読み込める |
| ✅ | LocalStorageProgressRepository — ユーザー名永続化仕様 > 上書き保存が正しく機能する |
| ✅ | LocalStorageProgressRepository — ユーザー名永続化仕様 > 別のインスタンスからも同じデータを読み込める（永続化確認） |

### ✅ `src/infrastructure/questionData.test.ts` (17/17)

| 結果 | テスト名 |
|------|---------|
| ✅ | questions/index.json — マニフェスト構造 > index.json が存在する |
| ✅ | questions/index.json — マニフェスト構造 > version フィールドが文字列 |
| ✅ | questions/index.json — マニフェスト構造 > subjects オブジェクトが存在する |
| ✅ | questions/index.json — マニフェスト構造 > subjects の各エントリに name がある |
| ✅ | questions/index.json — マニフェスト構造 > questionFiles が配列 |
| ✅ | questions/index.json — マニフェスト構造 > questionFiles の全ファイルが実際に存在する |
| ✅ | 各カテゴリファイル — スキーマ検証 > 全ファイルに subject・subjectName・category・categoryName がある |
| ✅ | 各カテゴリファイル — スキーマ検証 > 全ファイルに questions 配列がある |
| ✅ | 各カテゴリファイル — スキーマ検証 > 全問題に必須フィールド (id, question, choices, correct, explanation) がある |
| ✅ | 各カテゴリファイル — スキーマ検証 > 全問題の choices がちょうど 4 つ |
| ✅ | 各カテゴリファイル — スキーマ検証 > 全問題の choices が空でない |
| ✅ | 各カテゴリファイル — スキーマ検証 > correct が 0〜3 の整数 |
| ✅ | 問題ID — グローバル一意性 > 全ファイルを通じて問題IDが重複しない |
| ✅ | データ統計 — 問題数チェック > 英語の問題が 1 件以上ある |
| ✅ | データ統計 — 問題数チェック > 数学の問題が 1 件以上ある |
| ✅ | データ統計 — 問題数チェック > 全問題数が manifest の subjects に記載された教科を網羅している |
| ✅ | 後方互換性 — questions.json との整合性 > 旧 questions.json が存在する場合、同じ問題IDセットを含む |

### ✅ `src/infrastructure/remoteQuestionRepository.test.ts` (9/9)

| 結果 | テスト名 |
|------|---------|
| ✅ | validateManifest — リモートリポジトリで使用するバリデーション仕様 > 有効なマニフェストを受け入れる |
| ✅ | validateManifest — リモートリポジトリで使用するバリデーション仕様 > null を拒否する |
| ✅ | validateManifest — リモートリポジトリで使用するバリデーション仕様 > version がない場合に拒否する |
| ✅ | validateManifest — リモートリポジトリで使用するバリデーション仕様 > subjects がない場合に拒否する |
| ✅ | validateManifest — リモートリポジトリで使用するバリデーション仕様 > questionFiles が配列でない場合に拒否する |
| ✅ | validateQuestionFile — リモートリポジトリで使用するバリデーション仕様 > 有効な問題ファイルを受け入れる |
| ✅ | validateQuestionFile — リモートリポジトリで使用するバリデーション仕様 > null を拒否する |
| ✅ | validateQuestionFile — リモートリポジトリで使用するバリデーション仕様 > subject がない場合に拒否する |
| ✅ | validateQuestionFile — リモートリポジトリで使用するバリデーション仕様 > questions が配列でない場合に拒否する |

### ✅ `src/presentation/notesCanvas.test.ts` (12/12)

| 結果 | テスト名 |
|------|---------|
| ✅ | NotesCanvas > インスタンス生成 > NotesCanvasクラスをインスタンス化できる |
| ✅ | NotesCanvas > 公開メソッドの存在確認 > 必要なメソッドがすべて存在する |
| ✅ | NotesCanvas > パラメータの型確認 > setPenSizeは数値を受け取る |
| ✅ | NotesCanvas > パラメータの型確認 > setPenColorは文字列を受け取る |
| ✅ | NotesCanvas > canvas未初期化時の安全な振る舞い > clearはcanvasが未設定でも例外を投げない |
| ✅ | NotesCanvas > canvas未初期化時の安全な振る舞い > saveはcanvasが未設定のときnullを返す |
| ✅ | NotesCanvas > canvas未初期化時の安全な振る舞い > restoreはcanvasが未設定でも例外を投げない |
| ✅ | NotesCanvas > canvas未初期化時の安全な振る舞い > destroyはcanvasが未設定でも例外を投げない |
| ✅ | NotesCanvas > canvasスタブを使った状態操作の検証 > clearはclearRectを呼び出す |
| ✅ | NotesCanvas > canvasスタブを使った状態操作の検証 > saveはdataUrlを含むオブジェクトを返す |
| ✅ | NotesCanvas > canvasスタブを使った状態操作の検証 > restoreは例外を投げない |
| ✅ | NotesCanvas > canvasスタブを使った状態操作の検証 > destroyの後はsaveがnullを返す |

### ✅ `src/presentation/quizApp.test.ts` (20/20)

| 結果 | テスト名 |
|------|---------|
| ✅ | QuizApp — 初期化仕様 > DOM が揃っていればエラーなしでインスタンス化できる |
| ✅ | QuizApp — 初期化仕様 > 初期状態では「間違えた問題」ボタンが無効化されている |
| ✅ | QuizApp — 問題ロード後の仕様 > 問題のロードが完了したら statsInfo に問題数が表示される |
| ✅ | QuizApp — カテゴリツリー仕様 > 問題ロード後にツリーに教科ノード（すべて・英語・数学）が3件描画される |
| ✅ | QuizApp — カテゴリツリー仕様 > 問題ロード後にカテゴリノードが描画される |
| ✅ | QuizApp — カテゴリツリー仕様 > 教科ノードのヘッダーに role=button と tabindex=0 が設定されている |
| ✅ | QuizApp — カテゴリツリー仕様 > 展開可能な教科ノードには aria-controls が設定されている |
| ✅ | QuizApp — カテゴリツリー仕様 > 教科ノードをクリックすると statsInfo がその教科の問題数に更新される |
| ✅ | QuizApp — カテゴリツリー仕様 > カテゴリノードをクリックすると statsInfo がそのカテゴリの問題数に更新される |
| ✅ | QuizApp — カテゴリツリー仕様 > 教科ノードをクリックすると aria-expanded が true になる |
| ✅ | QuizApp — カテゴリツリー仕様 > Enter キーで教科ノードを操作できる |
| ✅ | QuizApp — カテゴリツリー仕様 > Space キーで教科ノードを操作できる |
| ✅ | QuizApp — カテゴリツリー仕様 > 間違えた問題が0件のときの統計表示は「0/総数」の形式である |
| ✅ | QuizApp — 回答フィードバック仕様 > 未回答の問題ではフィードバック領域が非表示になっている |
| ✅ | QuizApp — 回答フィードバック仕様 > 回答を選択するとフィードバック領域が表示される |
| ✅ | QuizApp — 回答フィードバック仕様 > 正解を選択すると correct クラスが付与される |
| ✅ | QuizApp — 回答フィードバック仕様 > 不正解を選択すると incorrect クラスが付与される |
| ✅ | QuizApp — 回答フィードバック仕様 > 回答後に次の問題へ移動するとフィードバックが非表示になる |
| ✅ | QuizApp — 回答フィードバック仕様 > 回答済みの問題に戻るとフィードバックが再表示される |
| ✅ | QuizApp — 回答フィードバック仕様 > フィードバックのテキストはtextContentで設定されXSSリスクがない |

---

> **ルール**: quizフォルダのコードを変更した後は必ず `npm run test:evidence` を実行して
> このファイルを更新し、コミットに含めること（AI・CI共通）。

[📜 エビデンス履歴を見る](TEST_EVIDENCE_LOG.md)
