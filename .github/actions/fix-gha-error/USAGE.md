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
      pull-requests: write
      issues: write
    steps:
      - uses: actions/checkout@v4

      - name: CopilotにCI修正を依頼
        uses: ./.github/actions/fix-gha-error
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
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
      pull-requests: write
      issues: write
    steps:
      - uses: actions/checkout@v4

      - name: CopilotにCI修正を依頼
        uses: ./.github/actions/fix-gha-error
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          error-context: "詳細なエラー情報をここに記載"
```

## セットアップ手順

1. **ワークフローを作成**
   - `.github/workflows/fix-gha-error.yml` を上記の例を参考に作成
   - 監視するワークフロー名を `workflows:` に列挙

2. **動作確認**
   - 監視対象のワークフローが失敗したときに動作を確認:
     - PRがある場合: PRにCopilotメンションのコメントが投稿される
     - PRがない場合: 新規Issueが作成されCopilotがアサインされる（または既存Issueにコメントが追加される）

## 重要なポイント

1. **`workflow_run` イベント必須**: このアクションは `workflow_run` コンテキストに依存しているため、他のイベントトリガーでは動作しません
2. **fork対策**: `github.event.workflow_run.head_repository.full_name == github.repository` の条件で、forkからのワークフロー実行によるスパムを防ぎます
3. **`GITHUB_TOKEN` のみ使用**: 追加のシークレット設定は不要です。`with.github-token` に `${{ secrets.GITHUB_TOKEN }}` を渡してください
4. **Issue重複防止**: 同一ワークフロー名のオープンなIssueが既に存在する場合は新規作成せず、既存Issueにコメントを追加します
