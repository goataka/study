# Fix GHA Error コンポジットアクション

GitHub Actionsのワークフローがエラーになった場合に、Copilotエージェントタスクを直接作成して自動的に修正を依頼するコンポジットアクションです。

## 機能

- **エージェントタスクの自動作成**: ワークフローエラー時にCopilotエージェントタスクを直接作成し、自動的に修正PRを作成
- **ターゲットブランチの自動判定**:
  - PRベースの実行: 元のPRのブランチをターゲットにする
  - Pushベースの実行: デフォルトブランチ（main）をターゲットにする
- **Fallback機能**: エージェントタスク作成に失敗した場合は、代わりにIssueを作成
- **詳細なエラー情報**: ワークフロー名、ジョブ名、コミット情報、実行ログURLを自動収集

## 使用方法

### 基本的な使い方

```yaml
- name: エラー時にCopilotに修正を依頼
  if: failure()
  uses: ./.github/actions/fix-gha-error
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    copilot-token: ${{ secrets.COPILOT_TOKEN }}
    workflow-name: ${{ github.workflow }}
    job-name: "ジョブ名"
```

### エラー詳細情報を含める場合

```yaml
- name: テスト実行
  id: test
  run: npm test
  continue-on-error: true

- name: エラー時にCopilotに修正を依頼
  if: steps.test.outcome == 'failure'
  uses: ./.github/actions/fix-gha-error
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    copilot-token: ${{ secrets.COPILOT_TOKEN }}
    workflow-name: ${{ github.workflow }}
    job-name: "テスト実行"
    error-context: ${{ steps.test.outputs.error }}
```

## Inputs

| 名前 | 必須 | デフォルト | 説明 |
|------|------|-----------|------|
| `github-token` | ✅ | - | GitHub認証用トークン（`GITHUB_TOKEN`） |
| `copilot-token` | ✅ | - | Copilotエージェント用トークン（`COPILOT_TOKEN`） |
| `workflow-name` | ✅ | - | 失敗したワークフロー名（`${{ github.workflow }}`を推奨） |
| `job-name` | ✅ | - | 失敗したジョブ名 |
| `error-context` | ❌ | `""` | エラーの詳細情報（オプション） |

## Outputs

| 名前 | 説明 |
|------|------|
| `task_id` | 作成されたエージェントタスクID |
| `task_url` | 作成されたエージェントタスクのURL |
| `issue_number` | 作成されたIssue番号（Fallback時のみ） |
| `issue_url` | 作成されたIssueのURL（Fallback時のみ） |

## 動作の詳細

### ターゲットブランチの判定

このアクションは、ワークフローの実行タイプに応じて適切なターゲットブランチを自動判定します：

#### PRベースの実行（`pull_request`イベント）

- ターゲット: 元のPRのブランチ（`github.head_ref`）
- エージェントタスク: PR番号とブランチ名を含む
- 修正PR: 元のPRブランチをターゲットにする

#### Pushベースの実行（`push`イベント）

- ターゲット: デフォルトブランチ（`main`または`master`）
- エージェントタスク: デフォルトブランチをターゲットにする
- 修正PR: デフォルトブランチをターゲットにする

### 作成されるエージェントタスク

エージェントタスクには以下の情報が含まれます：

- **base**: ターゲットブランチ（PRブランチまたはデフォルトブランチ）
- **task**: タスクの概要（ワークフロー名、ジョブ名、コミット情報）
- **instructions**: 詳細な修正手順
  - ワークフロー実行ログの確認
  - ローカルでの再現確認手順
  - 修正すべき対象（ワークフロー、ジョブ、コミット）
  - エラー詳細（提供された場合）
  - テスト実行の推奨
  - PR作成の指示
- **context**: 構造化された追加情報（workflow, job, commit, run_url, is_pr, pr_number）

### Fallback機能

エージェントタスクの作成に失敗した場合（APIエラー、認証エラーなど）、自動的にIssueを作成します。Issueには同じ情報が含まれ、`copilot` ラベルが付与されます。

## セットアップ

### 1. Copilot Tokenの設定

リポジトリのSecretsに `COPILOT_TOKEN` を追加してください：

1. GitHub リポジトリの `Settings` > `Secrets and variables` > `Actions`
2. `New repository secret` をクリック
3. Name: `COPILOT_TOKEN`
4. Value: あなたのCopilot Token
5. `Add secret` をクリック

### 2. ワークフローでの使用

既存のワークフローに以下のステップを追加します：

```yaml
jobs:
  your-job:
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
          job-name: "your-job"
```

## 実装例

### CI ワークフローでの使用

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

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

### デプロイワークフローでの使用

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: デプロイ実行
        run: ./deploy.sh

      - name: エラー時にCopilotに修正を依頼
        if: failure()
        uses: ./.github/actions/fix-gha-error
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          copilot-token: ${{ secrets.COPILOT_TOKEN }}
          workflow-name: ${{ github.workflow }}
          job-name: "deploy"
```

## 参考資料

- [Composite Actionsの作成](https://docs.github.com/ja/actions/creating-actions/creating-a-composite-action)
- [GitHub Actions コンテキスト](https://docs.github.com/ja/actions/learn-github-actions/contexts)
- [Qiitaの参考記事](https://qiita.com/s0ukada025/items/ab4308b2dbd833298be9)
