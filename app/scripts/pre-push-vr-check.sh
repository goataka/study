#!/bin/bash
# pre-push: VRスナップショットを確認し、必要であれば更新してコミットを促す
# UI変更後にスナップショットの更新漏れでCIが失敗するのを防ぐ

# app/ ディレクトリで実行されることを保証する（lefthook の root: app/ に依存しない場合の安全策）
cd "$(dirname "$0")/.." || exit 1

echo "🔍 VRスナップショットを確認しています..."

# VRテストをチェックモードで実行（スナップショット更新なし）
if npm run test:e2e:vr; then
  echo "✅ VRスナップショットは最新の状態です。"
  exit 0
fi

# VRテストが失敗した場合: スナップショットを更新
echo "📸 VRスナップショットを更新しています..."
if ! npm run test:e2e:vr:update; then
  echo ""
  echo "❌ VRスナップショットの更新に失敗しました。"
  echo "   setup-env.sh の実行ログや vr-report/ を確認してください。"
  exit 1
fi

# スナップショットの変更を確認
if ! git diff --quiet -- e2e/snapshots/; then
  echo ""
  echo "❌ VRスナップショットが更新されました。コミットしてから再度プッシュしてください:"
  echo ""
  echo "   git add e2e/snapshots/"
  echo "   git commit -m 'test: VRスナップショットを更新'"
  echo ""
  exit 1
fi

# スナップショットが変わらなかったがVRテストが失敗した場合
echo ""
echo "❌ VRテストが失敗しました（スナップショットの差分はありませんでした）。"
echo "   詳細は vr-report/ ディレクトリを確認してください。"
exit 1
