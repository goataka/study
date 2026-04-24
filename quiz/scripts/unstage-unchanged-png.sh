#!/bin/bash
# pre-commit: ステージング済みPNGファイルをバイナリ比較し、
# HEADと内容が同一なら、コミット対象外にする。

# HEADが存在しない場合（初回コミット）はスキップ
if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  exit 0
fi

# ステージング済みの変更されたPNGファイルを取得（新規追加は除く）
staged_pngs=$(git diff --cached --name-only --diff-filter=M -- '*.png')

if [ -z "$staged_pngs" ]; then
  exit 0
fi

unstaged_count=0

while IFS= read -r file; do
  # ステージング済みのblobハッシュとHEADのblobハッシュを比較
  staged_hash=$(git ls-files --stage -- "$file" | awk '{print $2}')
  head_hash=$(git rev-parse "HEAD:$file" 2>/dev/null) || continue

  if [ "$staged_hash" = "$head_hash" ]; then
    echo "バイナリ同一のためアンステージ: $file"
    git restore --staged "$file"
    unstaged_count=$((unstaged_count + 1))
  fi
done <<< "$staged_pngs"

if [ "$unstaged_count" -gt 0 ]; then
  echo "${unstaged_count}件のPNGファイルはバイナリが変更されていないため、コミット対象外にしました。"
fi
