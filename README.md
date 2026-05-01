# Goataka Study

小・中・高校生向け学習アプリのリポジトリです。

## 学習アプリ

- [アプリ](https://goataka.github.io/study/app/) - 4択・記述形式で学習できるクイズアプリ
  - [英語](https://goataka.github.io/study/app/?subject=english) - フォニックス・文法・語彙
  - [数学](https://goataka.github.io/study/app/?subject=math) - 算数・数学の計算・文章問題
  - [国語](https://goataka.github.io/study/app/?subject=japanese) - 漢字・語彙
- [ドリル](support/README.md) - 手を動かして学ぶ解説・練習プリント

### 特徴

- 無料・サーバー通信不要（問題データの初回読み込みのみ通信）
- 進捗はブラウザに保存（端末間の同期なし）
- スマートフォン・PC 両対応

## GitHub Pages

GitHub Actions により、`support/` フォルダの内容と `app/` アプリが自動的に GitHub Pages へデプロイされます。

- **Pages URL**: <https://goataka.github.io/study/>
- **アプリ URL**: <https://goataka.github.io/study/app/>
- **サポート URL**: <https://goataka.github.io/study/support/>
- **ワークフロー**: `.github/workflows/jekyll-gh-pages.yml`
