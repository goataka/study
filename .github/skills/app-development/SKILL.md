---
name: app-development
description: アプリ（app/）の技術リファレンス。アーキテクチャ構造、UI規約、スタイリング、CI設定を確認するときに使用する。
---

# アプリ技術リファレンス

`app/` の技術的な構造・規約・設定のリファレンス。

## DDD アーキテクチャ構造

```
app/src/
  domain/           # ビジネスロジック（純粋関数・エンティティ・集約・値オブジェクト）
    question/       # Question 関連（型・検証・展開・シャッフル）
      index.ts / types.ts / validateManifest.ts / validateQuestionFile.ts
      validateGuideUrl.ts / expandQuestions.ts / shuffleChoices.ts / tests/
    valueObjects/   # ValueObject 群（QuestionId / Score / CategoryPath）
    quizSession.ts  # QuizSession 集約
    categoryRegistry.ts / categoryRegistry/  # カテゴリ階層集約
    tests/
  application/      # ユースケース
    ports.ts        # IQuestionRepository / IProgressRepository
    quizUseCase.ts / quizUseCase/
  infrastructure/   # 外部システム接続（fetch、IndexedDB）
    remoteQuestionRepository.ts / indexedDBProgressRepository.ts
    localStorageProgressRepository.ts / questionData.test.ts
  presentation/     # UI コントローラー（DOM 操作）
    quizApp.ts / uiHelpers.ts / notesCanvas.ts / ocrService.ts
```

## ValueObject 規約

- 配置: `domain/valueObjects/<Name>.ts`（1ファイル1ValueObject）
- 不変: `private` コンストラクタ + `static` ファクトリ（`from` / `of`）+ `readonly` フィールド
- 値同一性: `equals(other)` を実装
- 新規追加関数では ValueObject を優先、外部 API は段階的に置換

## クリーンアーキテクチャ維持ルール

- 依存方向: `presentation` → `application` → `domain`（逆禁止）
- `domain/` は副作用ゼロ
- `application/` は `ports.ts` 経由のみ
- `presentation/` は 600行超で分割、30メソッド超でサブコントローラー化
- ドメイン設計（`Question`, `QuizSession`）の公開 API 変更禁止

## コントローラ分割方針

- `presentation/<controllerName>/` サブフォルダに責務単位で配置
- 抽出後は純粋関数化（`this` を受け取らない）
- コントローラは薄いファサードに保つ
- 1 責務ずつ抽出し、都度テストを通す

## UI パーツのID規則

- 主要パーツには安定した `id` を付与
- lowerCamelCase / kebab-case 規約に揃える

## UIℹ️説明ルール

- ℹ️ボタンで `absolute` 配置のオーバーレイ吹き出しを表示
- `useState` でトグル、`aria-label="〇〇を表示"` を付与

## スタイリング（Tailwind CSS v4 / CVA）

- 新規スタイルは Tailwind ユーティリティクラスで記述
- 既存 `app/css/quiz.css` は段階的に縮小（`app/css/parts/` に分割済み）
- 設定: CSS-first（`@theme` ベース）、`tailwind.config.*` は不使用
- バリエーション UI は CVA レシピ（`src/presentation/styles/<name>Styles.ts`）
- セマンティッククラス名は `app/css/parts/` から消えるまで維持

## UIデグレード防止ルール

- ノート背景に罫線を二重表示しない
- ノートの折り目はノート領域の上端まで届かせる
- ノート右側コンテンツ部タブは単元詳細のタブ仕様と整合
- フォントサイズ指定（切り替え）を必ず維持

## Lint・フォーマット

- ESLint + `typescript-eslint`: `pnpm run lint`
- Prettier: `pnpm run format` / `pnpm run format:check`
- `pre-commit` フックと CI で自動実行

## E2E テスト

- Playwright + Gherkin
- フィーチャー: `e2e/features/**/*.feature`
- ステップ定義: `e2e/steps/**/*.ts`
- 実行: `cd app && pnpm run test:e2e`

## CI 設定

- コンテナイメージ: `ghcr.io/goataka/study-app-ci:latest`
- `container.image` で `env` を使わないこと（GitHub Actions 制約）
- `ci.yml`: test-and-build + e2e ジョブ
- `jekyll-gh-pages.yml`: デプロイ後に本番 E2E 実行
