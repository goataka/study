# Goataka Study

小・中・高校生向け学習アプリのリポジトリです。

## 学習アプリ

- [アプリ（本番）](https://goataka.github.io/study/v1/) - 4択・記述形式で学習できるクイズアプリ
  - [英語](https://goataka.github.io/study/v1/?subject=english) - フォニックス・文法・語彙
  - [数学](https://goataka.github.io/study/v1/?subject=math) - 算数・数学の計算・文章問題
  - [国語](https://goataka.github.io/study/v1/?subject=japanese) - 漢字・語彙
- [アプリ（検証）](https://goataka.github.io/study/v0/) - main からの最新成果物を確認する環境
- [サポート](support/README.md) - 利用の仕方やコンテンツ一覧

### 特徴

- 無料・サーバー通信不要（問題データの初回読み込みのみ通信）
- 進捗はブラウザに保存（端末間の同期なし）
- スマートフォン・PC 両対応

## GitHub Pages

GitHub Actions により `app/` アプリと`support/` フォルダの内容が GitHub Pages に3環境でデプロイされます。

- **転送環境 URL**: <https://goataka.github.io/study/>（`/v1/` へ転送）
- **本番環境 URL**: <https://goataka.github.io/study/v1/>
- **検証環境 URL**: <https://goataka.github.io/study/v0/>
- **サポート URL**: <https://goataka.github.io/study/support/>
- **デプロイワークフロー URL**: <https://github.com/goataka/study/blob/main/.github/workflows/jekyll-gh-pages.yml>
- **リリース作成ワークフロー URL**: <https://github.com/goataka/study/blob/main/.github/workflows/release-app.yml>

## DeepWiki

- **Indexed**: <https://deepwiki.com/goataka/study>
