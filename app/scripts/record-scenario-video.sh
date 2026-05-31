#!/bin/bash
# シナリオ検証（連続E2E）を録画付きで実行し、生成された動画を
# リポジトリ管理下の安定したパスへコピーするスクリプト。
#
# 使い方:
#   pnpm run test:e2e:scenario:video
#
# 出力: e2e/videos/scenario-validation.webm

set -euo pipefail

cd "$(dirname "$0")/.."

OUT_DIR="e2e/videos"
OUT_FILE="${OUT_DIR}/scenario-validation.webm"
WORK_DIR="test-results/scenario-video"

mkdir -p "${OUT_DIR}"
rm -rf "${WORK_DIR}"

# BDD のテストコードを生成してから録画付きで実行する
pnpm exec bddgen --config playwright.scenario.config.ts
pnpm exec playwright test --config playwright.scenario.config.ts

# 生成された動画（1ファイル）を安定したパスへコピーする
VIDEO_PATH="$(find "${WORK_DIR}" -name '*.webm' | head -n 1)"
if [ -z "${VIDEO_PATH}" ]; then
  echo "エラー: 動画ファイルが見つかりませんでした。" >&2
  exit 1
fi

cp "${VIDEO_PATH}" "${OUT_FILE}"
echo "動画を保存しました: ${OUT_FILE}"
