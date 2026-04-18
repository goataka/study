# クイズシステムのテスト

TypeScript + Vitest によるテストスイートです。

## 実行方法

```bash
cd quiz
npm install        # 初回のみ
npm test           # Vitest でテストを実行（一回実行）
npm run test:watch # ウォッチモード
npm run build      # 型チェック + Vite ビルド
```

## テストファイル

### `questionData.test.ts`

`public/questions/` ディレクトリ以下のデータ整合性を検証します。

- `public/questions/index.json` (マニフェスト) の構造検証
- 各カテゴリファイルのスキーマ検証
- 問題 ID のグローバル一意性チェック
- データ統計（英語・数学それぞれの問題数）
- 後方互換性

### `questionLoader.test.ts`

`src/questionLoader.ts` の純粋関数ロジックを検証します。

- `validateManifest()` — 有効・無効なデータの受け入れ/拒否
- `validateQuestionFile()` — 有効・無効なデータの受け入れ/拒否

## 新しい問題を追加する場合

1. 対応するカテゴリファイル (`public/questions/{subject}/{category}.json`) に問題を追加
2. 新しいカテゴリの場合は、ファイルを作成して `public/questions/index.json` の `questionFiles` に追加
3. `npm test` でテストを実行して整合性を確認
4. すべてのテストが通過することを確認してからコミット
