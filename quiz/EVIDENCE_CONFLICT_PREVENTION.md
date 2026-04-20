# TEST_EVIDENCE.md のコンフリクト防止機構

## 問題の背景

`TEST_EVIDENCE.md` は以下の複数の場所で自動生成・更新されます：

1. **開発者のローカル環境** - `npm run test:evidence` 実行時
2. **CI の test-and-build ジョブ** - PR での単体テスト実行後
3. **CI の e2e ジョブ** - PR での E2E テスト実行後
4. **本番デプロイワークフロー** - デプロイ後の本番 E2E テスト実行後

これらが並行して実行されると、Git のマージコンフリクトが発生する可能性があります。

## 解決策

### 1. `.gitattributes` による自動マージ戦略

`.gitattributes` ファイルで `TEST_EVIDENCE.md` に対して `merge=ours` 戦略を設定しています：

```gitattributes
# TEST_EVIDENCE.md: Auto-generated file that should use "ours" merge strategy
quiz/TEST_EVIDENCE.md merge=ours
```

この設定により：

- マージ時にコンフリクトが発生した場合、自動的に「自分側（ours）」の変更が優先されます
- 手動でコンフリクトを解決する必要がなくなります
- 最新のテスト結果が常に優先されます

### 2. CI ワークフローでのリトライロジック

各 CI ジョブでエビデンスファイルをコミット・プッシュする際に、以下のロジックを実装しています：

```bash
# Pull with rebase and retry push up to 3 times to handle concurrent updates
for i in {1..3}; do
  git pull --rebase origin ${{ github.head_ref }} && git push && break || sleep 2
done
```

このロジックにより：

- 他のジョブが先にプッシュしていた場合でも、rebase して再度プッシュを試みます
- 最大 3 回までリトライすることで、一時的な競合を自動的に解決します
- `merge=ours` 戦略により、rebase 時のコンフリクトも自動解決されます

### 3. 適用箇所

以下の CI ワークフローで実装されています：

1. **`.github/workflows/ci.yml`**
   - `test-and-build` ジョブ - 単体テストエビデンスのコミット
   - `e2e` ジョブ - E2E エビデンスのコミット

2. **`.github/workflows/jekyll-gh-pages.yml`**
   - `e2e-production` ジョブ - 本番 E2E エビデンスのコミット

## 仕組みの詳細

### マージ戦略 `merge=ours` とは

Git の `ours` マージ戦略は、マージ時に以下のように動作します：

- **マージ元（ours）**: 現在のブランチの変更
- **マージ先（theirs）**: マージされるブランチの変更
- **結果**: 常に「ours」側の内容を採用し、「theirs」側の変更は破棄される

`TEST_EVIDENCE.md` の場合：

- ファイルは常に最新のテスト結果で完全に上書きされる自動生成ファイル
- 過去の内容を保持する必要がない
- 最新のテスト実行結果が最も重要

そのため、`ours` 戦略が適しています。

### リトライロジックの動作

```bash
for i in {1..3}; do
  git pull --rebase origin ${{ github.head_ref }} && git push && break || sleep 2
done
```

1. **1回目の試行**:
   - `git pull --rebase` で最新の変更を取得
   - `merge=ours` により、コンフリクトがあれば自動解決
   - `git push` でプッシュ
   - 成功すれば `break` でループ終了

2. **失敗時**:
   - `sleep 2` で 2 秒待機
   - 再度 pull-rebase-push を試行（最大 3 回）

3. **3 回失敗した場合**:
   - ループが終了し、次のステップに進む
   - エビデンスファイルの更新失敗は致命的ではないため、ワークフローは継続

## 検証方法

### ローカルでの検証

```bash
# マージ戦略が設定されているか確認
git check-attr merge quiz/TEST_EVIDENCE.md
# 出力: quiz/TEST_EVIDENCE.md: merge: ours

# マージドライバーが設定されているか確認
git config --get merge.ours.driver
# 出力: true
```

### CI での動作確認

1. PR を作成すると、`test-and-build` と `e2e` ジョブが並行実行されます
2. 両方のジョブが `TEST_EVIDENCE.md` を更新しようとします
3. リトライロジックにより、両方のジョブが正常に完了します
4. 最終的に最後にプッシュされたエビデンスファイルが採用されます

## トラブルシューティング

### それでもコンフリクトが発生する場合

1. **`.gitattributes` の確認**:
   ```bash
   cat .gitattributes | grep TEST_EVIDENCE
   ```

2. **マージドライバーの設定確認**:
   ```bash
   git config merge.ours.driver
   ```
   出力が `true` でない場合:
   ```bash
   git config merge.ours.driver true
   ```

3. **手動でのコンフリクト解決**:
   ```bash
   # 最新のエビデンスを再生成
   cd quiz
   npm run test:evidence

   # コンフリクトを解決
   git add quiz/TEST_EVIDENCE.md
   git rebase --continue
   ```

## まとめ

この仕組みにより、`TEST_EVIDENCE.md` のコンフリクトは以下のように自動的に防止されます：

✅ **自動マージ**: `.gitattributes` の `merge=ours` 戦略
✅ **リトライロジック**: CI での pull-rebase-push の 3 回リトライ
✅ **非ブロッキング**: エビデンス更新の失敗はワークフローを止めない

これにより、開発者は手動でコンフリクトを解決する必要がなく、CI も安定して動作します。
