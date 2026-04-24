# 使用例

詳細は [README.md](README.md) を参照してください。

## 基本

```yaml
- uses: ./.github/actions/fix-gha-error
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    copilot-token: ${{ secrets.COPILOT_CLASSIC }}
```

## エラーコンテキストを追加する

```yaml
- uses: ./.github/actions/fix-gha-error
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    copilot-token: ${{ secrets.COPILOT_CLASSIC }}
    error-context: "追加情報をここに記載"
```
