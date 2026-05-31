# シナリオ検証の実行動画

`scenario-validation.webm` は、基本ユースケースの連続E2E
（[`e2e/features/scenario-validation.feature`](../features/scenario-validation.feature)）を
録画付きで実行した最終結果の動画です。

スタート画面 → 教科選択 → 単元選択 → クイズ → 採点 → 結果 → スタート画面復帰までの
基本フローを通しで確認しており、特に問題の進捗（プログレスバーと問題番号の整合）と
画面表示（同時にひとつの画面だけが表示されること）を検証しています。

## 動画の再生成

```bash
pnpm run test:e2e:scenario:video
```
