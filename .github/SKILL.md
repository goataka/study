# プロジェクト技術リファレンス（SKILL）

このファイルはプロジェクトの技術的な知識・コンテンツ規約・アーキテクチャ情報をまとめたリファレンスです。
変更プロセスのルールは `copilot-instructions.md` を参照してください。

## マークダウン記法

- 見出し（`#`〜`###`）の直後は必ず1行空けること（Markdownルール準拠）
- フォニックスの対象文字はバッククォート `` `text` `` で強調する（`<u>text</u>` や `**text**` は使わない）
- 文法ドリルの強調もバッククォート `` `text` `` を使う（`**text**` は使わない）
- `>` （引用記法）は引用以外の用途に使わない
- テーブルの回答スペース（空欄セル）は全角スペース12個（`　×12`）でパディングし、必要スペースの約1.5倍の幅を確保すること

## URLルール

- 原則として、アプリ内状態を表すリンクは URL フラグメント（`#...`）形式に対応すること

## 解説ルール

- 説明はできるだけ簡潔に箇条書きにする
- 例題を示して、それを解説する形式にする
- 絵文字や記号を活用して視覚的に分かりやすくする

## コンテンツ分割ルール

- 難易度や種類に違いがある場合（くり上がりあり/なし、あまりあり/なし等）はmdを分ける
- あり/なしを混ぜた練習が必要な場合は、個別の後にまとめとして配置する
- 演算の種類（たし算、ひき算、かけ算等）が異なる場合も分ける

## UIℹ️説明ルール

- 機能の説明は一段小さいフォントのℹ️を配置し、クリックしたら吹き出しで説明する
  - 説明文は通常のフォントサイズで記述する
  - 吹き出しは `absolute` 配置のオーバーレイで表示し、箇条書き（`<ul>`）で説明を列挙する
  - ℹ️ボタンのクリックで表示・非表示をトグルする（`useState` で状態管理）
  - ℹ️ボタンには `aria-label="〇〇を表示"` を付与する

## 英語ドリル固有ルール

### ファイル構成

各ドリルは `guide.md`（解説と例を統合）1ファイルで構成する。
文法ドリルには解説・例・英作文解答をすべて `guide.md` 内に統合する。

```
support/english/
  01-alphabet/
    guide.md
  12-tenses-regular-past/
    guide.md          （解説・解答・英作文解答を統合）
  ...
```

### guide.mdの構成

各 `guide.md` は以下の順で構成する：

1. **解説**: 文法規則の説明・例題・活用パターン
2. **例**: 穴埋め問題の解答（空欄なし・答えあり）（見出し: `## 例`）
3. 文法ドリルのみ：**英作文解答**: 英作文の解答

### カタカナ表記ルール

- **単語全体のカタカナ表記**：フォニックスの解答には「単語全体」列を追加し、フォニックスごとにスペースで区切ったカタカナを記載する
  - 例：`book` → `ブ ウッ ク`（フォニックス毎に分割）
  - 例：`shoe` → `シュ ウー`
- **音声変化の発音表記**：音声変化の解答でも、発音をフォニックス単位でスペースで区切る
  - 例：`meet you` → `ミー チュー`
  - 例：`check it out` → `チェ キッ ト アウ ト`

### README

README の維持ルールは「共通ルール > README」に従うこと（英語ドリルも同様）。

```markdown
| ドリル           | 解説             |
| ---------------- | ---------------- |
| 01. ドリル名     | [解説](guide.md) |
| 10. 文法ドリル名 | [解説](guide.md) |
```

### 音声変化（アシミレーション）のテーブル形式

アシミレーションセクションでは「変化」列を追加して音変化のルールを明示する：

```markdown
| フレーズ | 変化     | 音                       |
| -------- | -------- | ------------------------ |
| meet you | t+y→チュ | 　　　　　　　　　　　　 |
```

### 文法ドリルの解説（guide.md）

- 解説ファイルは `guide.md` とする
- 現在形以外の文法は、現在形の例文との比較で説明する
- 比較は横に並べず、縦に並べる（1行ごとに時制を書く）
- タイトルに「現在との比較」は入れない（内容として比較する）
- 主となるトピック（例: 過去形、未来形）は `##` 見出しで目立たせる
- 活用形のパターンをテーブル形式の一覧で比較できるようにする
- 練習ドリルでは、現在形など最初の1つは答えを示す（何を変化させるか分かるように）

```markdown
現在形:
I `play` games.

## 過去形

I `played` games.

## 活用パターン

| 時制   | 変化ルール | 例         |
| ------ | ---------- | ---------- |
| 現在形 | 動詞の原形 | I `play`   |
| 過去形 | 動詞 + ed  | I `played` |
```

## 数学ドリル固有ルール

### ファイル構成

各トピックは `guide.md`（解説・例を統合）1ファイルで構成する。

```
support/math/
  01-addition-no-carry/
    guide.md
  ...
```

### 例セクションの解説

- 例セクション（`## 例`）内に簡単な解き方のポイントを💡マーク等で記載する

### 単元名の絵文字ルール

- 各 `guide.md` の H1 タイトル（単元名・カテゴリ概要を含む）には必ず絵文字を付けること
- 絵文字は単元の内容に合ったものを先頭に配置する（下記は選択の目安で、内容に応じて他の絵文字も可）
  - たし算: ➕
  - ひき算: ➖
  - かけ算: ✖️
  - わり算: ➗
  - 比・割合・指数対数・微分積分: 📊
  - 方程式・三角関数: 📐
  - 関数: 📈
  - 確率: 🎲
  - 数・数列・平方根等: 🔢
  - 文字式・記号: 🔤
  - 不等式: ⚖️
  - ベクトル: ➡️
  - 極限: ♾️
  - 文章問題: 📝
- 分数・小数など同名の演算が複数ある場合は、単元名に「分数の」「小数の」等の修飾語を付けて一意にすること
  - 例: `# ✖️ 分数のかけ算`、`# ➕ 小数のたし算`

## アプリ（app/）技術リファレンス

### コードの言語規則

- **コードコメント・ファイルヘッダー**: 日本語で記述する
- **変数名・関数名・型名**: 英語（TypeScript の慣習に従う）
- **CI ワークフローのステップ名**: 日本語で記述する
- **テストの `it()` / `describe()` 名**: 日本語の仕様表現で記述する（例: `it("初回ロード時は空配列を返す", ...)`）

### UI パーツのID規則

- UI の主要パーツ（ボタン、入力、タブ、パネル、状態表示など）には安定した `id` を付与すること
- `id` は E2E テストや UI テストで参照しやすい命名（既存の lowerCamelCase / kebab-case 規約）に揃えること

### DDD アーキテクチャ構造

`app/src/` は DDD（ドメイン駆動設計）のレイヤー構造で整理されている：

```
app/src/
  domain/           # ビジネスロジック（純粋関数・エンティティ・集約・値オブジェクト）
    question/       # Question 関連のドメインロジック（型・検証・展開・シャッフル）
      index.ts                 # 公開エントリ（再エクスポート）
      types.ts                 # Question / QuestionFile などの型定義
      validateManifest.ts      # マニフェスト検証
      validateQuestionFile.ts  # 問題ファイル検証
      validateGuideUrl.ts      # 解説 URL 検証ヘルパー
      expandQuestions.ts       # QuestionFile → Question[] 展開
      shuffleChoices.ts        # 決定論的シャッフル
      tests/                   # question/ 配下の全テスト
    valueObjects/   # ValueObject 群（QuestionId / Score / CategoryPath）
      index.ts
      QuestionId.ts
      Score.ts
      CategoryPath.ts
      tests/
    quizSession.ts  # QuizSession 集約（問題選択・回答・採点）
    categoryRegistry.ts # 公開エントリ（既存 import 維持用）
    categoryRegistry/   # カテゴリ階層・メタデータ集約の実装
      CategoryRegistry.ts
      cacheKeys.ts
      types.ts
    tests/          # quizSession / categoryRegistry のテスト
  application/      # ユースケース（ポートに依存、実装には依存しない）
    ports.ts        # IQuestionRepository / IProgressRepository インターフェース
    quizUseCase.ts  # クイズの開始・採点・進捗保存を統括
    quizUseCase/    # ユースケース内責務分割と各テスト
  infrastructure/   # 外部システムとの接続（fetch、IndexedDB）
    remoteQuestionRepository.ts       # IQuestionRepository の実装（fetch）
    remoteQuestionRepository.test.ts
    indexedDBProgressRepository.ts    # IProgressRepository の実装（IndexedDB）
    indexedDBProgressRepository.test.ts
    localStorageProgressRepository.ts # IProgressRepository の実装（localStorage、テスト用）
    questionData.test.ts              # JSON データ整合性テスト
  presentation/     # UI コントローラー（DOM 操作）
    quizApp.ts      # QuizUseCase を使う UI コントローラー（薄いファサード）
    uiHelpers.ts    # 純粋ヘルパー関数群（SUBJECTS/gradeColorClass 等）
    notesCanvas.ts  # 手書きメモ用キャンバスコントローラー
    ocrService.ts   # OCR（Tesseract.js）サービス
```

#### ドメイン層の値オブジェクト（ValueObject）規約

- **配置先**: `domain/valueObjects/<Name>.ts` に 1 ファイル 1 ValueObject を配置する。テストは同フォルダ配下の `tests/` に置く。
- **不変（immutable）**: コンストラクタを `private` にし、`static` ファクトリ（`from` / `of` 等）経由で生成する。フィールドは `readonly`。
- **値同一性**: `equals(other)` を実装し、生成時のバリデーションでドメイン不変条件を保証する。
- **既存代替**: 既存コードがプリミティブ（string / number）を直接扱っている箇所をリファクタする際、新規追加の関数では ValueObject を優先する。外部公開 API の引数型は段階的に置換する。

### クリーンアーキテクチャの維持ルール

リファクタリング時は以下を必ず守ること：

- **依存方向は外→内のみ**: `presentation` → `application` → `domain`、および `infrastructure` → `application` → `domain`。逆方向の import は禁止。
- **`domain/` は副作用ゼロ**: DOM・fetch・localStorage・IndexedDB・タイマー・乱数（テスト不能なもの）を直接触らない。
- **`application/` は port インターフェース経由でのみ infrastructure を利用**: `application/ports.ts` を経由せずに具象クラス（`IndexedDBProgressRepository` 等）を import しない。
- **`presentation/` を肥大化させない**:
  - 1 ファイル 600 行を超えたら分割を検討する
  - 1 クラスのメソッド数が 30 を超えたら、責務単位でサブコントローラー or ヘルパーモジュールに切り出す
  - DOM 非依存の純粋ロジックは `presentation/uiHelpers.ts` か `domain/`（ドメインに該当する場合のみ）へ移す
- **ドメイン設計は変更しない**: 既存の `domain/`（`Question`, `QuizSession`）の責務・公開 API を変えるリファクタリングは禁止。内部実装の改善のみ可。

#### 大きなコントローラの分割方針（サブフォルダ規約）

`quizApp.ts` のような大きな UI コントローラを分割する際は、以下のパターンに従う：

- **適切な名前のサブフォルダに配置**: `presentation/<controllerName>/` を作り、責務単位の小さなモジュールを並べる（例: `presentation/quizApp/confirmDialog.ts`, `presentation/quizApp/urlStateService.ts`）。
- **抽出する単位**: 1 つの責務（ダイアログ表示・フォントサイズ管理・URL同期・ある画面のレンダリング 等）ごとに 1 ファイル。
- **抽出後の関数は純粋関数にする**: コントローラのインスタンスや `this` を引数で受け取らない。必要な依存（`useCase`, リポジトリ, 状態オブジェクト, コールバック）は引数として明示的に渡す。
- **依存はクリーンアーキテクチャに従う**: 抽出したモジュールでも `domain` / `application` への依存方向を守る。`infrastructure` の具象クラスは直接 import しない。
- **コントローラは薄いファサードに保つ**: 抽出後のコントローラ側メソッドは、状態を集めて純粋関数を呼ぶだけの 1〜数行のラッパーに留める。
- **抽出ごとに `pnpm run test` をパスさせる**: 1 度に 1 責務ずつ抽出し、その都度テストを通す。複数責務を一度に動かさない。

### スタイリング（CSS / Tailwind CSS / CVA）

- スタイリングは **Tailwind CSS v4** を基本とする。新規コンポーネントや既存コンポーネントへの追加スタイルは、原則としてユーティリティクラスで記述する。
- 既存の `app/css/quiz.css` は段階的な縮小対象。`app/css/parts/` 配下の partial に分割済み。新たな手書きCSSの追加は最小限にとどめ、既存スタイルもリファクタの中で順次 Tailwind ユーティリティへ置き換えていく。
- Tailwind の有効化は `app/vite.config.ts` の `@tailwindcss/vite` プラグインと、`app/css/quiz.css` 先頭の `@import "tailwindcss";` で行っている。設定は CSS-first（`@theme` ベース）で、`tailwind.config.*` は使わない。
- ユーティリティの自動検出対象は `src/**/*.{ts,tsx}` および `index.html` などのテンプレート群。動的なクラス文字列は Tailwind が検出できないため、条件分岐ではフルクラス名を直接書く。
- **バリエーションのある UI（ボタン・バッジ・タブ等）は [CVA (class-variance-authority)](https://cva.style/) のレシピで定義する**。レシピは `src/presentation/styles/` 配下に `<name>Styles.ts` として置き、コロケーションで `<name>Styles.test.ts` を作成する。例：`button({ variant: "primary", hidden: false })`。
- CVA レシピを書くときは、フォントサイズ切替（`15-font-size.css`）など既存 CSS が依存する**セマンティッククラス名**（例：`primary-btn`）はレシピの出力に含めて維持する。これにより legacy CSS との互換性を保ちつつ見た目だけ Tailwind に移行できる。
- セマンティッククラス名を CVA レシピから削除してよいのは、**そのクラス名を参照する手書き CSS が `app/css/parts/` 配下から完全に消えた時点**。それまでは互換性維持のため残す。

### テストの配置ルール

新規追加するテストは、同じフォルダ内の `tests/` サブフォルダに配置することを **推奨** とする（DDD の階層をフォルダで明示する方針）。

- 推奨形：`src/domain/valueObjects/QuestionId.ts` ↔ `src/domain/valueObjects/tests/QuestionId.test.ts`
- ファイル名（basename）は対象ソースと同じ語幹に `.test.ts` を付ける
- `tests/` はソースと同じ階層に置き、`src/` の外へは出さないこと
- 既存のコロケーション配置（同一フォルダ直下の `*.test.ts`）も互換のため許容するが、**新規追加・大規模リファクタの際は `tests/` 配下に揃える**
- テストは **仕様テストスタイル**（Behavior-Driven）で記述し、`it("〇〇できる", ...)` のように日本語で仕様を表現する

### E2E テスト（Playwright + Gherkin）

```bash
cd app && pnpm run test:e2e     # Gherkin シナリオを実行
cd app && pnpm run test:e2e:ui  # UI モードで実行
```

- フィーチャーファイル: `e2e/features/**/*.feature`
- ステップ定義: `e2e/steps/**/*.ts`
- E2E は CI の `e2e` ジョブで自動実行される

### UIデグレード防止ルール（再発防止）

- ノート背景に罫線を二重表示しないこと（背景レイヤーの重複適用を禁止）
- ノートの折り目はノート領域の上端まで届くようにすること
- ノート右側のコンテンツ部タブは、単元詳細のタブ仕様と整合させること
- 文字はフォントサイズ指定（切り替え）を必ず維持すること

### Lint・フォーマットルール

- TypeScript コードは ESLint + `typescript-eslint` でチェックする（`pnpm run lint`）
- フォーマットは Prettier に統一する（`pnpm run format` / `pnpm run format:check`）
- `pre-commit` フックと CI の `test-and-build` ジョブで `lint` と `format:check` を実行する

### CIコンテナイメージ指定ルール

- CI の `container.image` には GHCR にプッシュ済みのイメージ（例: `ghcr.io/goataka/study-app-ci:latest`）を使うこと
- GitHub Actions の制約により、`container.image` の指定で `env`（`${{ env.* }}`）を使わないこと
