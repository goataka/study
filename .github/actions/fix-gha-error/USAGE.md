# Fix GHA Error コンポジットアクションの使用例

このアクションは `workflow_run` イベントと組み合わせて使用します。
同一ワークフロー内での `if: failure()` ステップとしては使用できません。

## 基本的な使い方

監視したいワークフロー名を `workflows:` に列挙した専用ワークフローを作成します。

```yaml
name: Fix GHA Error

on:
  workflow_run:
    workflows:
      - "CI"
    types:
      - completed

jobs:
  fix-error:
    runs-on: ubuntu-latest
    if: github.event.workflow_run.conclusion == 'failure' && github.event.workflow_run.head_repository.full_name == github.repository
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Copilotエージェントタスクを作成
        uses: ./.github/actions/fix-gha-error
        with:
          copilot-token: ${{ secrets.COPILOT_TOKEN }}
```

## 複数のワークフローを監視する

```yaml
name: Fix GHA Error

on:
  workflow_run:
    workflows:
      - "CI"
      - "Build"
      - "Release"
    types:
      - completed

jobs:
  fix-error:
    runs-on: ubuntu-latest
    if: github.event.workflow_run.conclusion == 'failure' && github.event.workflow_run.head_repository.full_name == github.repository
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Copilotエージェントタスクを作成
        uses: ./.github/actions/fix-gha-error
        with:
          copilot-token: ${{ secrets.COPILOT_TOKEN }}
          error-context: "詳細なエラー情報をここに記載"
```

## セットアップ手順

1. **Copilot Tokenを取得**
   - GitHub Copilotの管理画面からトークンを取得

2. **リポジトリSecretに追加**
   ```
   Settings > Secrets and variables > Actions > New repository secret
   Name: COPILOT_TOKEN
   Value: (取得したトークン)
   ```

3. **ワークフローを作成**
   - `.github/workflows/fix-gha-error.yml` を上記の例を参考に作成
   - 監視するワークフロー名を `workflows:` に列挙

4. **動作確認**
   - 監視対象のワークフローが失敗したときにエージェントタスクが作成されることを確認

## 重要なポイント

1. **`workflow_run` イベント必須**: このアクションは `workflow_run` コンテキストに依存しているため、他のイベントトリガーでは動作しません
2. **fork対策**: `github.event.workflow_run.head_repository.full_name == github.repository` の条件で、forkからのワークフロー実行によるタスクスパムを防ぎます
3. **`copilot-token`**: リポジトリのSecretsに `COPILOT_TOKEN` を設定する必要があります
