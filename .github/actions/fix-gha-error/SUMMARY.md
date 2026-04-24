# 実装サマリー

ワークフロー失敗時にCopilotへ修正を依頼するコンポジットアクションです。

## 動作フロー

- **PRあり**: `gh pr comment` で `@copilot` メンションコメントを投稿
  - PR検出①: `workflow_run.pull_requests` にPR情報がある場合
  - PR検出②: 空の場合はヘッドブランチ名で `gh pr list` を検索（フォールバック）
- **PRなし**: `gh issue list` で同一タイトルのオープンIssueを検索
  - 既存Issueあり → `gh issue comment` でコメント追加
  - 既存Issueなし → `gh issue create` で新規作成（Copilotをアサイン）

## ファイル構成

```
.github/
  actions/fix-gha-error/
    action.yml      # コンポジットアクション本体
    README.md       # ドキュメント
  workflows/
    fix-gha-error.yml  # workflow_runトリガーのワークフロー
```
