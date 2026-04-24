# Fix GHA Error コンポジットアクション

ワークフロー失敗時にCopilotへ修正を依頼するコンポジットアクションです。

## 動作

- **PRあり**: 対象PRに `@copilot` メンションコメントを投稿
- **PRなし（初回）**: `[CI失敗] {ワークフロー名}` タイトルでIssueを作成しCopilotをアサイン
- **PRなし（再失敗）**: 既存Issueに `@copilot` メンションコメントを追加

### PR検出ロジック

1. `workflow_run.pull_requests` にPR情報があればその番号を使用
2. 空の場合は、ヘッドブランチ名で `gh pr list` を検索してオープンなPRを探す（フォールバック）
3. どちらでも見つからない場合はIssueを作成

## Inputs

| 名前 | 必須 | 説明 |
|------|------|------|
| `github-token` | ✅ | `GITHUB_TOKEN` |
| `error-context` | ❌ | 追加のエラー情報（オプション） |

## 使用例

```yaml
name: Fix GHA Error
on:
  workflow_run:
    workflows: ["CI"]
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
```

## 参考

- [workflow_runイベント](https://docs.github.com/ja/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#workflow_run)
- [Composite Actions](https://docs.github.com/ja/actions/creating-actions/creating-a-composite-action)
