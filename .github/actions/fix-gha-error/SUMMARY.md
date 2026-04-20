# Fix GHA Error コンポジットアクション - 実装サマリー

## プロジェクト概要

GitHub Actionsのワークフローがエラーになった場合に、Copilotエージェントに自動的に修正を依頼するIssueを作成するコンポジットアクションを実装しました。

## 実装した機能

### 1. コンポジットアクション本体（`action.yml`）

**主要機能:**
- ✅ PR/Push実行の自動判定
- ✅ ターゲットブランチの自動設定
- ✅ 詳細なエラー情報の収集
- ✅ Copilotラベル付きIssueの自動作成

**入力パラメータ:**
| パラメータ | 必須 | 説明 |
|-----------|------|------|
| `github-token` | ✅ | GitHub認証用トークン |
| `copilot-token` | ✅ | Copilot用トークン |
| `workflow-name` | ✅ | 失敗したワークフロー名 |
| `job-name` | ✅ | 失敗したジョブ名 |
| `error-context` | ❌ | エラーの詳細情報（オプション） |

**出力:**
- `issue_number`: 作成されたIssue番号
- `issue_url`: 作成されたIssueのURL

### 2. 自動判定ロジック

#### PRベースの実行（`pull_request` イベント）
```yaml
実行タイプ: PR
ターゲットブランチ: github.head_ref (PRのブランチ)
PR番号: github.event.pull_request.number
```

#### Pushベースの実行（`push` イベント）
```yaml
実行タイプ: Push
ターゲットブランチ: github.event.repository.default_branch (main/master)
PR番号: なし
```

### 3. 作成されるIssue

**Issue構成:**
- **タイトル**: 🚨 GHAエラー: [ワークフロー名] / [ジョブ名] ([コミット])
- **ラベル**: `bug`, `copilot`, `github-actions`
- **本文**:
  - エラー情報テーブル（ワークフロー、ジョブ、コミット、実行タイプ、ターゲットブランチ、CIログリンク）
  - エラー詳細（オプション）
  - 修正手順
  - PR関連情報（PRベースの場合）

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
    example-fix-gha-error.yml  # サンプルワークフロー
```

## ドキュメント

### README.md
- アクションの概要と機能説明
- 入力/出力パラメータの詳細
- 動作の詳細説明
- セットアップ手順
- 実装例

### USAGE.md
- 実践的な使用例
- 複数のシナリオ別使用例
- セットアップ手順

### INTEGRATION.md
- 既存ワークフローへの統合方法
- 3つの統合パターン
  1. ジョブレベルでの統合（推奨）
  2. 特定ステップ失敗時のみ実行
  3. 複数ジョブでの使用
- Before/After の具体例
- トラブルシューティング
- ベストプラクティス

## 使用方法

### 最小構成

```yaml
- name: エラー時にCopilotに修正を依頼
  if: failure()
  uses: ./.github/actions/fix-gha-error
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    copilot-token: ${{ secrets.COPILOT_TOKEN }}
    workflow-name: ${{ github.workflow }}
    job-name: "your-job-name"
```

### 完全構成（エラー詳細付き）

```yaml
- name: エラー時にCopilotに修正を依頼
  if: failure()
  uses: ./.github/actions/fix-gha-error
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    copilot-token: ${{ secrets.COPILOT_TOKEN }}
    workflow-name: ${{ github.workflow }}
    job-name: "your-job-name"
    error-context: "詳細なエラー情報をここに記載"
```

## セットアップ要件

1. **Copilot Token**
   - リポジトリのSecretsに `COPILOT_TOKEN` を設定

2. **権限設定**
   ```yaml
   permissions:
     contents: read
     issues: write  # Issue作成に必要
   ```

3. **ワークフローへの追加**
   - 各ジョブの最後に `if: failure()` 付きステップを追加

## 技術的な実装詳細

### ステップ1: エラー情報の収集
- イベントタイプ（PR/Push）の判定
- ターゲットブランチの決定
- コミット情報の取得
- ワークフロー実行URLの生成

### ステップ2: Issue作成
- `actions/github-script@v7` を使用
- 動的にIssue本文を生成
- 適切なラベルを付与
- Issue番号とURLを出力

## 実装の利点

1. **自動化**: エラー発生時に手動でIssueを作成する必要がない
2. **コンテキスト保存**: すべてのエラー情報が自動的に記録される
3. **Copilot連携**: `copilot` ラベルによりCopilotエージェントが自動対応可能
4. **柔軟性**: PR/Pushの両方のシナリオに対応
5. **再利用性**: 任意のワークフローで使用可能

## 今後の拡張案

- [ ] 重複Issue検出機能
- [ ] Issue優先度の自動設定
- [ ] Slack/Discord通知連携
- [ ] エラーログの自動解析
- [ ] 修正PRの自動作成（完全自動化）

## 参考資料

- [Qiita参考記事](https://qiita.com/s0ukada025/items/ab4308b2dbd833298be9)
- [GitHub Composite Actions](https://docs.github.com/ja/actions/creating-actions/creating-a-composite-action)
- [GitHub Actions コンテキスト](https://docs.github.com/ja/actions/learn-github-actions/contexts)

## PR情報

- **PR番号**: #14
- **ブランチ**: `claude/create-composite-action-fix-gha-error`
- **ステータス**: レビュー待ち
