# Fix GHA Error コンポジットアクションの使用例

このディレクトリには、実際のワークフローで使用できる例が含まれています。

## 使用例

### 例1: 既存のCI/CDワークフローに追加

既存の `.github/workflows/ci.yml` に以下のステップを追加するだけです：

```yaml
jobs:
  test-and-build:
    runs-on: ubuntu-latest
    steps:
      # ... 既存のステップ ...

      - name: エラー時にCopilotに修正を依頼
        if: failure()
        uses: ./.github/actions/fix-gha-error
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          copilot-token: ${{ secrets.COPILOT_TOKEN }}
          workflow-name: ${{ github.workflow }}
          job-name: "test-and-build"
```

### 例2: 本番環境テストの失敗を自動修正

デプロイ後のE2Eテスト失敗時に使用：

```yaml
jobs:
  e2e-production:
    runs-on: ubuntu-latest
    needs: deploy
    steps:
      - name: 本番環境E2Eテスト実行
        run: npm run test:e2e

      - name: エラー時にCopilotに修正を依頼
        if: failure()
        uses: ./.github/actions/fix-gha-error
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          copilot-token: ${{ secrets.COPILOT_TOKEN }}
          workflow-name: ${{ github.workflow }}
          job-name: "e2e-production"
          error-context: "本番環境でのE2Eテストが失敗しました"
```

### 例3: 複数ジョブでの使用

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - name: Lint実行
        run: npm run lint

      - name: エラー時にCopilotに修正を依頼
        if: failure()
        uses: ./.github/actions/fix-gha-error
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          copilot-token: ${{ secrets.COPILOT_TOKEN }}
          workflow-name: ${{ github.workflow }}
          job-name: "lint"

  test:
    runs-on: ubuntu-latest
    steps:
      - name: テスト実行
        run: npm test

      - name: エラー時にCopilotに修正を依頼
        if: failure()
        uses: ./.github/actions/fix-gha-error
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          copilot-token: ${{ secrets.COPILOT_TOKEN }}
          workflow-name: ${{ github.workflow }}
          job-name: "test"
```

## 重要なポイント

1. **`if: failure()`**: ステップやジョブが失敗した時のみ実行されます
2. **`job-name`**: わかりやすいジョブ名を指定してください
3. **`copilot-token`**: リポジトリのSecretsに `COPILOT_TOKEN` を設定する必要があります

## セットアップ手順

1. **Copilot Tokenを取得**
   - GitHub Copilotの管理画面からトークンを取得

2. **リポジトリSecretに追加**
   ```
   Settings > Secrets and variables > Actions > New repository secret
   Name: COPILOT_TOKEN
   Value: (取得したトークン)
   ```

3. **ワークフローに追加**
   - 上記の例を参考に、各ジョブの最後に追加

4. **動作確認**
   - わざとテストを失敗させて、Issueが自動作成されることを確認
