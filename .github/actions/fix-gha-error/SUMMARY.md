# Fix GHA Error コンポジットアクション - 実装サマリー

## プロジェクト概要

GitHub Actionsのワークフローがエラーになった場合に、GitHub CLIの `gh agent-task create` を使用して
Copilotエージェントタスクを直接作成し、自動的に修正を依頼するコンポジットアクションを実装しました。

## 実装した機能

### 1. コンポジットアクション本体（`action.yml`）

**主要機能:**
- ✅ `workflow_run` イベントからのエラー情報の自動収集
- ✅ PRベース/ブランチベースの自動判定とターゲットブランチ設定
- ✅ `gh agent-task create` によるCopilotエージェントタスクの直接作成
- ✅ 前提コマンド（`jq`, `gh`, `gh agent-task`）の事前確認

**入力パラメータ:**

| パラメータ | 必須 | 説明 |
|-----------|------|------|
| `copilot-token` | ✅ | Copilot用トークン（`GH_TOKEN` として使用） |
| `error-context` | ❌ | エラーの詳細情報（オプション） |

### 2. ブランチ判定ロジック

#### PRベースの実行
- `github.event.workflow_run.pull_requests` から PR番号とheadブランチを取得
- ターゲット: 関連するPRのhead branch

#### ブランチベースの実行
- `github.event.workflow_run.head_branch` をターゲットブランチとして使用

### 3. 作成されるエージェントタスク

`gh agent-task create` コマンドでタスクを作成します。タスクには以下の情報が含まれます：
- ワークフロー名・コミット情報・CIログURL
- PR情報（PRベースの場合）
- 詳細な修正手順

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
    steps:
      - uses: actions/checkout@v4

      - uses: ./.github/actions/fix-gha-error
        with:
          copilot-token: ${{ secrets.COPILOT_TOKEN }}
```

## セットアップ要件

1. **Copilot Token**
   - リポジトリのSecretsに `COPILOT_TOKEN` を設定

2. **前提コマンド**
   - `gh` CLI（`gh agent-task` サブコマンド含む）
   - `jq`
   - `ubuntu-latest` ランナーでは標準で利用可能

3. **権限**
   ```yaml
   permissions:
     contents: read
   ```

## 技術的な実装詳細

### ステップ1: 前提確認
- `jq`, `gh`, `gh agent-task` の存在を確認
- 欠落している場合は明確なエラーメッセージを表示して終了

### ステップ2: エラー情報の収集
- `github.event.workflow_run.*` から情報を収集（環境変数経由でインジェクション防止）
- PR関連情報の取得と判定

### ステップ3: エージェントタスクの作成
- タスク説明文を生成
- `gh agent-task create --base <branch> --repo <repo> -F <file>` で作成

## 参考資料

- [Qiita参考記事](https://qiita.com/s0ukada025/items/ab4308b2dbd833298be9)
- [GitHub Composite Actions](https://docs.github.com/ja/actions/creating-actions/creating-a-composite-action)
- [workflow_runイベント](https://docs.github.com/ja/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#workflow_run)

## PR情報

- **PR番号**: #14
- **ブランチ**: `claude/create-composite-action-fix-gha-error`
