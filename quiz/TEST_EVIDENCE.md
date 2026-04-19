# クイズ動作検証エビデンス

<!-- このファイルはAIエージェントが自動生成します。手動編集不要です。 -->
<!-- AIの作業時・CI実行時に必ず更新されます。 -->

## 概要

| 項目 | 値 |
|------|------|
| **ステータス** | ✅ PASSED |
| **最終更新** | 2026-04-19 09:23:23 JST |
| **更新者** | GitHub Actions (CI) |
| **コミット** | `e823a68` |
| **コミットメッセージ** | feat: add AI operation guarantee - evidence system, auto-lint-fix CI |

## テスト結果サマリー

| 項目 | 結果 |
|------|------|
| テストスイート（合格 / 合計） | 9 / 9 |
| テストケース（合格 / 合計） | 26 / 26 |
| 失敗テスト | 0 |
| 実行時間 | 0.06s |

## テストスイート詳細

### ✅ `tests/questionData.test.ts` (17/17)

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

### ✅ `tests/questionLoader.test.ts` (9/9)

| 結果 | テスト名 |
|------|---------|
| ✅ | validateManifest > 有効なマニフェストを受け入れる |
| ✅ | validateManifest > null を拒否する |
| ✅ | validateManifest > version がない場合に拒否する |
| ✅ | validateManifest > subjects がない場合に拒否する |
| ✅ | validateManifest > questionFiles が配列でない場合に拒否する |
| ✅ | validateQuestionFile > 有効な問題ファイルを受け入れる |
| ✅ | validateQuestionFile > null を拒否する |
| ✅ | validateQuestionFile > subject がない場合に拒否する |
| ✅ | validateQuestionFile > questions が配列でない場合に拒否する |

---

> **ルール**: quizフォルダのコードを変更した後は必ず `npm run test:evidence` を実行して
> このファイルを更新し、コミットに含めること（AI・CI共通）。