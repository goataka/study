# 既存ワークフローへの統合ガイド

このガイドでは、`fix-gha-error` アクションを使用して既存のワークフローを監視する専用ワークフローの作成方法を説明します。

> **重要**: このアクションは `workflow_run` イベントでのみ動作します。
> 既存のワークフロー内に `if: failure()` ステップとして追加する形では使用できません。

## 前提条件

### 1. COPILOT_TOKEN の設定

リポジトリのSecretsに `COPILOT_TOKEN` を追加する必要があります：

```
Settings > Secrets and variables > Actions > New repository secret
Name: COPILOT_TOKEN
Value: (あなたのCopilot Token)
```

### 2. 必要な権限

監視用ワークフローには以下の権限のみ必要です：

```yaml
permissions:
  contents: read
```

## 統合方法

### 1つのワークフローを監視する

`.github/workflows/fix-gha-error.yml` を作成します：

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

### 複数のワークフローを監視する

`workflows:` に複数のワークフロー名を列挙します：

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
```

### エラーコンテキストを追加する

`error-context` 入力でタスクに追加情報を付与できます：

```yaml
      - name: Copilotエージェントタスクを作成
        uses: ./.github/actions/fix-gha-error
        with:
          copilot-token: ${{ secrets.COPILOT_TOKEN }}
          error-context: "このワークフローはCI/CDパイプラインの一部です"
```

## 注意事項

### 重複タスクを避ける

既に失敗時のIssue/タスク作成処理が存在するワークフローは監視対象から除外してください。
例えばこのリポジトリでは `Deploy to GitHub Pages` ワークフローが
`jekyll-gh-pages.yml` 内で失敗時のIssue作成を行うため、監視対象から除外しています。

### fork からの実行への対処

`if` 条件に `github.event.workflow_run.head_repository.full_name == github.repository` を
必ず含めてください。これにより、forkリポジトリからのワークフロー実行によるタスクスパムを防げます。

## トラブルシューティング

### エージェントタスクが作成されない

1. **`COPILOT_TOKEN` の確認**
   - SecretsにCOPILOT_TOKENが正しく設定されているか確認

2. **ワークフロー名の確認**
   - `workflows:` に指定したワークフロー名が監視対象ワークフローの `name:` フィールドと完全一致しているか確認

3. **fork対策条件の確認**
   - `if` 条件の `full_name == github.repository` が正しいか確認
   - 想定外のforkからの実行でないか確認

4. **gh agent-task の確認**
   - `gh agent-task --help` が実行できるか確認
   - ランナーに `gh` CLIがインストールされているか確認

## 参考リンク

- [workflow_runイベント](https://docs.github.com/ja/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#workflow_run)
- [Composite Actions](https://docs.github.com/ja/actions/creating-actions/creating-a-composite-action)
- [GitHub Actions 権限](https://docs.github.com/ja/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token)
