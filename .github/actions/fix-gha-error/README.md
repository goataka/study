# Fix GHA Error コンポジットアクション

GitHub Actionsのワークフローがエラーになった場合に、Copilotに修正を依頼するコンポジットアクションです。

## 機能

- **`workflow_run`イベント連携**: 他のワークフローが失敗で完了したときに発動
- **PRがある場合**: 対象PRに `@copilot` をメンションしてコメントを投稿
- **PRがない場合**:
  - 同一ワークフローのオープンIssueが存在する場合は既存IssueにCopilotをメンションしてコメントを追加
  - 存在しない場合は新規Issueを作成してCopilotをアサイン
- **詳細なエラー情報**: ワークフロー名、コミット情報、実行ログURLを自動収集

## 前提条件

このアクションを実行するrunnerには、以下のコマンドが利用可能である必要があります：

- `gh` CLI がインストールされていること
- `jq` がインストールされていること

`ubuntu-latest` では標準でこれらのコマンドが利用可能です。
カスタムイメージを使用する場合は、事前にこれらをセットアップしてください。

## 使用方法

### 基本的な使い方

このアクションは `workflow_run` イベントと組み合わせて使用します。
監視するワークフロー名はトリガー側の `workflows:` で指定します。

```yaml
name: Fix GHA Error

on:
  workflow_run:
    # 監視するワークフロー名をここに列挙する
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

## Inputs

| 名前 | 必須 | デフォルト | 説明 |
|------|------|-----------|------|
| `github-token` | ✅ | - | GitHub Actions 用のトークン（`GITHUB_TOKEN`） |
| `error-context` | ❌ | `""` | エラーの詳細情報（オプション） |

## 動作の詳細

### トリガー条件

このアクションは `workflow_run` イベントで発動します。監視するワークフロー名と `if: github.event.workflow_run.conclusion == 'failure'` 条件をワークフロー側で指定してください。

### PRの有無による分岐

このアクションは、失敗したワークフロー実行に関連するPRを自動検出して動作を分岐します：

#### PRがある場合

- 対象PRに `@copilot` をメンションするコメントを投稿
- コメントには、ワークフロー名・コミット・PR番号・CIログURLが含まれる

#### PRがない場合

- タイトル `[CI失敗] {ワークフロー名}` でオープンなIssueを検索
- **既存Issueあり**: そのIssueに `@copilot` をメンションするコメントを追加
- **既存Issueなし**: 新規Issueを作成してCopilotをアサインし、`@copilot` をメンション

### 必要な権限

```yaml
permissions:
  contents: read
  pull-requests: write  # PRコメント投稿に必要
  issues: write         # Issue作成・コメントに必要
```

## セットアップ

### ワークフローの作成

監視したいワークフロー名を `workflows:` に列挙した専用ワークフローを作成します：

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

      - uses: ./.github/actions/fix-gha-error
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## 参考資料

- [Composite Actionsの作成](https://docs.github.com/ja/actions/creating-actions/creating-a-composite-action)
- [GitHub Actions コンテキスト](https://docs.github.com/ja/actions/learn-github-actions/contexts)
- [workflow_runイベント](https://docs.github.com/ja/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#workflow_run)
