# Fix GHA Error コンポジットアクション

GitHub Actionsのワークフローがエラーになった場合に、`gh agent-task create` コマンドを使用してCopilotエージェントタスクを直接作成し、自動的に修正を依頼するコンポジットアクションです。

## 機能

- **エージェントタスクの自動作成**: `gh` CLIを使用してCopilotエージェントタスクを直接作成し、自動的に修正PRを作成
- **`workflow_run`イベント連携**: 他のワークフローが失敗で完了したときに発動
- **ターゲットブランチの自動判定**:
  - PRベースの実行: 元のPRのブランチをターゲットにする
  - ブランチベースの実行: 失敗したワークフローの`head_branch`をターゲットにする
- **詳細なエラー情報**: ワークフロー名、コミット情報、実行ログURLを自動収集

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
      - "Deploy to GitHub Pages"
    types:
      - completed

jobs:
  fix-error:
    runs-on: ubuntu-latest
    if: github.event.workflow_run.conclusion == 'failure'
    permissions:
      contents: read
      issues: write
    steps:
      - uses: actions/checkout@v4

      - name: エラー時にCopilotに修正を依頼
        uses: ./.github/actions/fix-gha-error
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          copilot-token: ${{ secrets.COPILOT_TOKEN }}
```

## Inputs

| 名前 | 必須 | デフォルト | 説明 |
|------|------|-----------|------|
| `github-token` | ✅ | - | GitHub認証用トークン（`GITHUB_TOKEN`） |
| `copilot-token` | ✅ | - | Copilotエージェント用トークン（`COPILOT_TOKEN`） |
| `error-context` | ❌ | `""` | エラーの詳細情報（オプション） |

## 動作の詳細

### トリガー条件

このアクションは `workflow_run` イベントで発動します。監視するワークフロー名と `if: github.event.workflow_run.conclusion == 'failure'` 条件をワークフロー側で指定してください。

### ターゲットブランチの判定

このアクションは、失敗したワークフロー実行に関連するPRを自動検出してターゲットブランチを判定します：

#### PRベースの実行

- ターゲット: 関連するPRのhead branch
- エージェントタスク: PR番号とブランチ名を含む
- 修正PR: 元のPRブランチをターゲットにする

#### ブランチベースの実行

- ターゲット: 失敗したワークフローの `head_branch`
- エージェントタスク: ブランチ名を含む
- 修正PR: そのブランチをターゲットにする

### 作成されるエージェントタスク

`gh agent-task create` コマンドを使用してエージェントタスクを作成します。タスクには以下の情報が含まれます：

- **ベースブランチ**: ターゲットブランチ
- **タスク説明**:
  - ワークフロー名
  - コミット情報
  - CIログURL
  - PR情報（PRベースの場合）
  - エラー詳細（提供された場合）
  - 詳細な修正手順

## セットアップ

### 1. Copilot Tokenの設定

リポジトリのSecretsに `COPILOT_TOKEN` を追加してください：

1. GitHub リポジトリの `Settings` > `Secrets and variables` > `Actions`
2. `New repository secret` をクリック
3. Name: `COPILOT_TOKEN`
4. Value: あなたのCopilot Token
5. `Add secret` をクリック

### 2. ワークフローの作成

監視したいワークフロー名を `workflows:` に列挙した専用ワークフローを作成します：

```yaml
name: Fix GHA Error

on:
  workflow_run:
    workflows:
      - "CI"
      - "Deploy to GitHub Pages"
    types:
      - completed

jobs:
  fix-error:
    runs-on: ubuntu-latest
    if: github.event.workflow_run.conclusion == 'failure'
    permissions:
      contents: read
      issues: write
    steps:
      - uses: actions/checkout@v4

      - uses: ./.github/actions/fix-gha-error
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          copilot-token: ${{ secrets.COPILOT_TOKEN }}
```

## 参考資料

- [Composite Actionsの作成](https://docs.github.com/ja/actions/creating-actions/creating-a-composite-action)
- [GitHub Actions コンテキスト](https://docs.github.com/ja/actions/learn-github-actions/contexts)
- [workflow_runイベント](https://docs.github.com/ja/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#workflow_run)
- [Qiitaの参考記事](https://qiita.com/s0ukada025/items/ab4308b2dbd833298be9)
