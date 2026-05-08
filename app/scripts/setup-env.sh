#!/bin/bash
# ローカル環境セットアップスクリプト
# CIの visual-regression ジョブと同じ環境をローカルで再現する。
# npm の pretest:e2e:vr フックから自動的に呼び出される。

set -e

# Debian/Ubuntu 系 Linux 以外はスキップ（macOS・Windows・sudo不可環境への影響を防ぐ）
if ! command -v apt-get >/dev/null 2>&1 || ! command -v sudo >/dev/null 2>&1; then
  echo "apt-get / sudo が利用できない環境のため、環境セットアップをスキップします。"
  exit 0
fi

# 日本語フォントのインストール（未インストールの場合のみ）
if ! fc-list | grep -q "Noto Sans CJK"; then
  echo "日本語フォント（fonts-noto-cjk）をインストールしています..."
  sudo apt-get update -qq
  sudo apt-get install -y fonts-noto-cjk
else
  echo "日本語フォントは既にインストールされています。"
fi

# 日本語ロケールの設定
if ! locale -a 2>/dev/null | grep -q "ja_JP.utf8"; then
  echo "日本語ロケール（ja_JP.UTF-8）を設定しています..."
  sudo apt-get install -y locales
  sudo locale-gen ja_JP.UTF-8
  sudo update-locale LANG=ja_JP.UTF-8 LC_ALL=ja_JP.UTF-8
else
  echo "日本語ロケールは既に設定されています。"
fi

export LANG=ja_JP.UTF-8
export LC_ALL=ja_JP.UTF-8

echo "環境セットアップが完了しました。"
