# クイズシステムのテスト

このディレクトリには、クイズシステムのデータ整合性とアプリケーション動作を検証するテストが含まれています。

## 実行方法

```bash
cd contents/quiz
npm install        # 初回のみ
npm test           # Jest でテストを実行
npm run typecheck  # TypeScript 型チェック
npm run build      # ブラウザ向けバンドル生成 (quiz.js)
```

## テストファイル

### `questionData.test.ts`

`questions/` ディレクトリ以下のデータ整合性を TypeScript + Jest で検証します。

**テスト内容:**

- `questions/index.json` (マニフェスト) の構造検証
  - version / subjects / questionFiles フィールドの存在確認
  - 各ファイルが実際に存在するか
- 各カテゴリファイルのスキーマ検証
  - 必須フィールド (subject, category, questions) の存在
  - 全問題の必須フィールド (id, question, choices, correct, explanation)
  - choices がちょうど 4 つで空でないこと
  - correct が 0〜3 の整数であること
- 問題 ID のグローバル一意性チェック
- データ統計 (英語・数学それぞれの問題数)
- 後方互換性 (`questions.json` が存在する場合、同じ ID セットを含むか)

### `questionLoader.test.ts`

`src/questionLoader.ts` の純粋関数ロジックを検証します。

**テスト内容:**

- `validateManifest()` — 有効・無効なデータの受け入れ/拒否
- `validateQuestionFile()` — 有効・無効なデータの受け入れ/拒否

### `validate-questions.js` (レガシー)

Node.js で直接実行できる旧バリデータです。新しいテストと同等の検証を行います。

```bash
cd contents/quiz
node tests/validate-questions.js
```

### `test.html` (レガシー)

ブラウザで実行できる旧テストスイートです。開発時のデバッグに使用できます。

## データフォーマット

### `questions/index.json` (マニフェスト)

```json
{
  "version": "2.0.0",
  "subjects": {
    "english": { "name": "英語" },
    "math": { "name": "数学" }
  },
  "questionFiles": [
    "english/phonics-1.json",
    "english/phonics-2.json"
  ]
}
```

### `questions/{subject}/{category}.json` (カテゴリファイル)

```json
{
  "subject": "english",
  "subjectName": "英語",
  "category": "phonics-1",
  "categoryName": "フォニックス（1文字）",
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
```

## 新しい問題を追加する場合

1. 対応するカテゴリファイル (`questions/{subject}/{category}.json`) に問題を追加
2. 新しいカテゴリの場合は、ファイルを作成して `questions/index.json` の `questionFiles` に追加
3. `npm test` でテストを実行して整合性を確認
4. すべてのテストが通過することを確認してからコミット

