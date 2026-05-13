# Fix GHA Error コンポジットアクション

ワークフロー失敗時にCopilotへ修正を依頼するコンポジットアクションです。

## 動作

- **PRあり**: 対象PRに `@copilot` メンションコメントを投稿
- **PRなし（初回）**: `[ワークフロー失敗] {ワークフロー名}` タイトルでIssueを作成しCopilotをアサイン
- **PRなし（再失敗）**: 既存Issueに `@copilot` メンションコメントを追加
- `workflow_run` 以外のワークフローからも、必要なコンテキストを inputs で渡せば再利用可能

### PR検出ロジック

1. `workflow_run.pull_requests` にPR情報があればその番号を使用
2. 空の場合は、ヘッドブランチ名で `gh pr list` を検索してオープンなPRを探す（フォールバック）
3. どちらでも見つからない場合はIssueを作成

## Inputs

| 名前            | 必須 | 説明                                                                                                         |
| --------------- | ---- | ------------------------------------------------------------------------------------------------------------ |
| `github-token`  | ✅   | `GITHUB_TOKEN`                                                                                               |
| `copilot-token` | ❌   | Copilot classic PAT（PRコメント・Issueコメント・アサインに使用）。未指定時は `github-token` にフォールバック |
| `workflow-name` | ❌   | 対象ワークフロー名。未指定時は `workflow_run` から取得                                                       |
| `head-sha`      | ❌   | 対象コミット SHA。未指定時は `workflow_run` から取得                                                         |
| `run-url`       | ❌   | 対象実行URL。未指定時は `workflow_run` から取得                                                              |
| `head-branch`   | ❌   | 対象ブランチ名。未指定時は `workflow_run` から取得。`pr-number` 指定時に空なら PR 情報から補完を試みる       |
| `pr-number`     | ❌   | 対象PR番号。未指定時は `workflow_run` から推定                                                               |
| `error-context` | ❌   | 追加のエラー情報（オプション）                                                                               |

## 使用例

### workflow_run から使う

```yaml
name: Fix GHA Error
on:
  workflow_run:
    workflows: ["Deploy to GitHub Pages"]
    types: [completed]
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
          copilot-token: ${{ secrets.COPILOT_CLASSIC }}
```

### PR向けのCI job から使う

```yaml
- uses: ./.github/actions/fix-gha-error
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    copilot-token: ${{ secrets.COPILOT_CLASSIC }}
    workflow-name: ${{ github.workflow }}
    head-sha: ${{ github.event.pull_request.head.sha }}
    run-url: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
    head-branch: ${{ github.head_ref }}
    pr-number: ${{ github.event.pull_request.number }}
```

### Issue のタイトル例

- 初回作成: `[ワークフロー失敗] Deploy to GitHub Pages`
- 再失敗時: 同じタイトルのオープン Issue があれば、その Issue にコメントを追加

## 参考

- [workflow_runイベント](https://docs.github.com/ja/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#workflow_run)
- [Composite Actions](https://docs.github.com/ja/actions/creating-actions/creating-a-composite-action)
