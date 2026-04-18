# クイズシステムのテスト

このディレクトリには、クイズシステムのデータ整合性とアプリケーション動作を検証するテストが含まれています。

## テストファイル

### 1. validate-questions.js

Node.jsスクリプトで、questions.jsonのデータ構造と整合性を検証します。

**実行方法:**
```bash
cd contents/quiz/tests
node validate-questions.js
```

**チェック項目:**
- データ構造の妥当性（subjects, categories, questions）
- 必須フィールドの存在確認（id, question, choices, correct, explanation）
- 問題IDの一意性
- 選択肢が正確に4つあるか
- 正解インデックスが0-3の範囲内か
- 問題文・解説の長さ

**終了コード:**
- 0: すべてのチェックが成功
- 1: エラーが検出された

### 2. test.html

ブラウザで実行できるテストスイート。questions.jsonを読み込んで、データの妥当性を確認します。

**実行方法:**
1. ブラウザで `test.html` を開く
2. 自動的にテストが実行され、結果が表示されます

**テスト内容:**
- データ読み込み
- データ構造の検証
- 問題フォーマットの検証
- IDの一意性チェック
- 選択肢の検証

## CI/CDへの統合

GitHubActionsなどのCI/CDパイプラインに統合する場合:

```yaml
- name: Validate Quiz Data
  run: |
    cd contents/quiz/tests
    node validate-questions.js
```

## テスト結果の例

```
✅ All checks passed! ✨

📊 Statistics:
Total questions: 92

英語 (60 questions):
  - フォニックス（1文字）: 20 questions
  - フォニックス（2文字・マジックE）: 15 questions
  - フォニックス（3文字）: 5 questions
  - 音声変化 - リンキング: 5 questions
  - 音声変化 - リダクション: 5 questions
  - 音声変化 - フラッピング: 5 questions
  - 音声変化 - アシミレーション: 5 questions

数学 (32 questions):
  - たし算: 8 questions
  - ひき算: 8 questions
  - かけ算: 8 questions
  - わり算: 8 questions
```

## 新しい問題を追加する場合

1. `questions.json`に問題を追加
2. テストを実行して整合性を確認
3. すべてのテストが通過することを確認してからコミット

## データフォーマット

questions.jsonの構造:

```json
{
  "version": "1.0.0",
  "subjects": {
    "subject_id": {
      "name": "教科名",
      "categories": {
        "category_id": {
          "name": "カテゴリ名",
          "questions": [
            {
              "id": "unique-id",
              "question": "問題文",
              "choices": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
              "correct": 0,
              "explanation": "解説"
            }
          ]
        }
      }
    }
  }
}
```
