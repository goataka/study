# Goataka Study

子供向け学習アプリのリポジトリです。

## 学習アプリ

- [ドリル](contents/README.md)
- [クイズ](https://goataka.github.io/study/quiz/) - 4択クイズ形式で学習
  - [英語クイズ](https://goataka.github.io/study/quiz/?subject=english) - 英語の4択クイズ
  - [数学クイズ](https://goataka.github.io/study/quiz/?subject=math) - 数学の4択クイズ

## GitHub Pages

GitHub Actions により、`contents/` フォルダの内容と `quiz/` アプリが自動的に GitHub Pages へデプロイされます。

- **Pages URL**: <https://goataka.github.io/study/>
- **クイズ URL**: <https://goataka.github.io/study/quiz/>
- **ワークフロー**: `.github/workflows/jekyll-gh-pages.yml`
