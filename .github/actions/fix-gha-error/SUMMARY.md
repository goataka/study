# Fix GHA Error コンポジットアクション - 実装サマリー

## プロジェクト概要

GitHub Actionsのワークフローがエラーになった場合に、Copilotに修正を依頼するコンポジットアクションです。
PRがある場合はPRにCopilotをメンションしてコメントを投稿し、
PRがない場合はIssueを作成（または既存Issueにコメント）してCopilotをアサインします。

## 実装した機能

### 1. コンポジットアクション本体（`action.yml`）

**主要機能:**

- ✅ `workflow_run` イベントからのエラー情報の自動収集
- ✅ PRの有無を自動判定して動作を分岐
- ✅ PRがある場合: 対象PRに `@copilot` メンションコメントを投稿
- ✅ PRがない場合: 同一ワークフローのオープンIssueを検索して既存IssueにコメントorIssue新規作成

**入力パラメータ:**

| パラメータ | 必須 | 説明 |
|-----------|------|------|
| `github-token` | ✅ | GitHub Actions 用のトークン（`GITHUB_TOKEN`） |
| `error-context` | ❌ | エラーの詳細情報（オプション） |

### 2. PRの有無による分岐ロジック

#### PRがある場合

- `github.event.workflow_run.pull_requests` から PR番号とheadブランチを取得
- 対象PRに `@copilot` をメンションするコメントを投稿

#### PRがない場合

1. タイトル `[CI失敗] {ワークフロー名}` でオープンなIssueを検索
2. **既存Issueあり**: そのIssueに `@copilot` メンションコメントを追加
3. **既存Issueなし**: 新規Issueを作成してCopilotをアサイン、`@copilot` をメンション

### 3. 必要な権限

```yaml
permissions:
  contents: read
  pull-requests: write
  issues: write
```

## ディレクトリ構造

```
.github/
  actions/
    fix-gha-error/
      action.yml         # コンポジットアクション本体
      README.md          # 詳細ドキュメント
      USAGE.md           # 使用例
      INTEGRATION.md     # 統合ガイド
  workflows/
    fix-gha-error.yml    # 本番運用ワークフロー（workflow_runトリガー）
```

## 使用方法

### 基本構成

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

## セットアップ要件

1. **権限設定**
   - ワークフローに `pull-requests: write` と `issues: write` を追加する
   - `GITHUB_TOKEN` は GitHub が自動で付与するため追加作業は不要

2. **前提コマンド**
   - `gh` CLI
   - `jq`
   - `ubuntu-latest` ランナーでは標準で利用可能

## 技術的な実装詳細

### ステップ1: 前提確認

- `jq`, `gh` の存在を確認
- 欠落している場合は明確なエラーメッセージを表示して終了

### ステップ2: エラー情報の収集

- `github.event.workflow_run.*` から情報を収集（環境変数経由でインジェクション防止）
- PR関連情報の取得と判定

### ステップ3: Copilotへの依頼

- PRがある場合: `gh pr comment` でコメント投稿
- PRがない場合: `gh issue list` で既存Issue検索 → `gh issue comment` or `gh issue create`

## 参考資料

- [GitHub Composite Actions](https://docs.github.com/ja/actions/creating-actions/creating-a-composite-action)
- [workflow_runイベント](https://docs.github.com/ja/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#workflow_run)
