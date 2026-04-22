# 統合ガイド

`workflow_run` イベントで動作します。既存ワークフロー内の `if: failure()` ステップとしては使用できません。

## 必要な権限

```yaml
permissions:
  contents: read
  pull-requests: write
  issues: write
```

## 注意事項

- 既に失敗時のIssue作成処理が存在するワークフローは監視対象から除外してください
- `if` 条件に `github.event.workflow_run.head_repository.full_name == github.repository` を含めてください（fork対策）

## トラブルシューティング

コメント・Issueが作成されない場合:

1. `pull-requests: write` / `issues: write` が設定されているか確認
2. `workflows:` のワークフロー名が `name:` フィールドと完全一致しているか確認
