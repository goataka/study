# 既存ワークフローへの統合ガイド

このガイドでは、既存のGitHub Actionsワークフローに `fix-gha-error` アクションを統合する方法を説明します。

## 前提条件

### 1. COPILOT_TOKEN の設定

リポジトリのSecretsに `COPILOT_TOKEN` を追加する必要があります：

```
Settings > Secrets and variables > Actions > New repository secret
Name: COPILOT_TOKEN
Value: (あなたのCopilot Token)
```

### 2. 必要な権限

ワークフローに以下の権限が必要です：

```yaml
permissions:
  contents: read
  issues: write  # Issue作成のために必要
```

## 統合パターン

### パターン1: ジョブレベルでの統合（推奨）

ジョブの最後にステップを追加し、そのジョブの任意のステップが失敗した場合に実行されるようにします。

```yaml
jobs:
  your-job:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
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

### パターン2: 特定のステップ失敗時のみ実行

特定のステップが失敗した場合のみIssueを作成したい場合：

```yaml
- name: 重要なテスト
  id: critical-test
  run: npm test

- name: テスト失敗時にCopilotに修正を依頼
  if: steps.critical-test.outcome == 'failure'
  uses: ./.github/actions/fix-gha-error
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    copilot-token: ${{ secrets.COPILOT_TOKEN }}
    workflow-name: ${{ github.workflow }}
    job-name: "critical-test"
    error-context: ${{ steps.critical-test.outputs.error }}
```

### パターン3: 複数ジョブで使用

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
    steps:
      - uses: actions/checkout@v4
      - run: npm run lint

      - name: エラー時にCopilotに修正を依頼
        if: failure()
        uses: ./.github/actions/fix-gha-error
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          copilot-token: ${{ secrets.COPILOT_TOKEN }}
          workflow-name: ${{ github.workflow }}
          job-name: "lint"

  test:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
    steps:
      - uses: actions/checkout@v4
      - run: npm test

      - name: エラー時にCopilotに修正を依頼
        if: failure()
        uses: ./.github/actions/fix-gha-error
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          copilot-token: ${{ secrets.COPILOT_TOKEN }}
          workflow-name: ${{ github.workflow }}
          job-name: "test"

  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
    steps:
      - uses: actions/checkout@v4
      - run: npm run build

      - name: エラー時にCopilotに修正を依頼
        if: failure()
        uses: ./.github/actions/fix-gha-error
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          copilot-token: ${{ secrets.COPILOT_TOKEN }}
          workflow-name: ${{ github.workflow }}
          job-name: "build"
```

## 実際の統合例

### 例1: CI ワークフローへの統合

**変更前:**

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Node.js のセットアップ
        uses: actions/setup-node@v4
        with:
          node-version: "22"
      - name: 依存関係のインストール
        run: npm ci
      - name: テスト実行
        run: npm test
      - name: ビルド
        run: npm run build
```

**変更後:**

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test-and-build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write  # 追加
    steps:
      - uses: actions/checkout@v4
      - name: Node.js のセットアップ
        uses: actions/setup-node@v4
        with:
          node-version: "22"
      - name: 依存関係のインストール
        run: npm ci
      - name: テスト実行
        run: npm test
      - name: ビルド
        run: npm run build

      # 追加
      - name: エラー時にCopilotに修正を依頼
        if: failure()
        uses: ./.github/actions/fix-gha-error
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          copilot-token: ${{ secrets.COPILOT_TOKEN }}
          workflow-name: ${{ github.workflow }}
          job-name: "test-and-build"
```

### 例2: デプロイワークフローへの統合

**変更前:**

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://example.com
    steps:
      - uses: actions/checkout@v4
      - name: デプロイ実行
        run: ./deploy.sh
      - name: E2Eテスト
        run: npm run test:e2e:production
```

**変更後:**

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write  # 追加
    environment:
      name: production
      url: https://example.com
    steps:
      - uses: actions/checkout@v4
      - name: デプロイ実行
        run: ./deploy.sh
      - name: E2Eテスト
        run: npm run test:e2e:production

      # 追加
      - name: エラー時にCopilotに修正を依頼
        if: failure()
        uses: ./.github/actions/fix-gha-error
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          copilot-token: ${{ secrets.COPILOT_TOKEN }}
          workflow-name: ${{ github.workflow }}
          job-name: "deploy"
          error-context: "本番環境へのデプロイまたはE2Eテストが失敗しました"
```

## トラブルシューティング

### Issue が作成されない

1. **権限の確認**
   - `permissions.issues: write` が設定されているか確認
   - `COPILOT_TOKEN` がSecretsに正しく設定されているか確認

2. **if 条件の確認**
   - `if: failure()` が正しく設定されているか確認
   - ステップが実際に失敗しているか確認

3. **トークンの確認**
   ```yaml
   - name: トークンの確認（デバッグ用）
     if: failure()
     run: |
       echo "GITHUB_TOKEN length: ${#GITHUB_TOKEN}"
       echo "COPILOT_TOKEN length: ${#COPILOT_TOKEN}"
     env:
       GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
       COPILOT_TOKEN: ${{ secrets.COPILOT_TOKEN }}
   ```

### 重複Issue の防止

同じエラーで複数のIssueが作成されるのを防ぐには：

```yaml
- name: 既存Issue確認
  id: check-issue
  if: failure()
  uses: actions/github-script@v7
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    script: |
      const issues = await github.rest.issues.listForRepo({
        owner: context.repo.owner,
        repo: context.repo.repo,
        state: 'open',
        labels: 'bug,copilot,github-actions',
      });
      const existingIssue = issues.data.find(issue =>
        issue.title.includes('${{ github.workflow }}') &&
        issue.title.includes('${{ github.job }}')
      );
      return existingIssue ? existingIssue.number : null;

- name: エラー時にCopilotに修正を依頼
  if: failure() && steps.check-issue.outputs.result == 'null'
  uses: ./.github/actions/fix-gha-error
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    copilot-token: ${{ secrets.COPILOT_TOKEN }}
    workflow-name: ${{ github.workflow }}
    job-name: ${{ github.job }}
```

## ベストプラクティス

1. **わかりやすいジョブ名を使用**
   ```yaml
   job-name: "test-and-build"  # Good
   job-name: "job1"            # Bad
   ```

2. **エラーコンテキストを提供**
   ```yaml
   error-context: "E2Eテストが失敗しました。本番環境での動作を確認してください。"
   ```

3. **重要なジョブにのみ適用**
   - すべてのジョブに適用するとIssueが多くなりすぎる可能性があります
   - 重要なテスト、ビルド、デプロイのみに適用することを推奨

4. **定期的なIssueのクリーンアップ**
   - 古いIssueを定期的にクローズする
   - 重複Issueを統合する

## 参考リンク

- [GitHub Actions コンテキスト](https://docs.github.com/ja/actions/learn-github-actions/contexts)
- [Composite Actions](https://docs.github.com/ja/actions/creating-actions/creating-a-composite-action)
- [GitHub Actions 権限](https://docs.github.com/ja/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token)
