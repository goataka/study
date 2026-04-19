# Copilot Instructions for drills-for-children

このリポジトリは子供向け学習ドリルの作成・管理に使用します。

## 共通ルール

### マークダウン記法

- 見出し（`#`〜`###`）の直後は必ず1行空けること（Markdownルール準拠）
- フォニックスの対象文字はバッククォート `` `text` `` で強調する（`<u>text</u>` や `**text**` は使わない）
- 文法ドリルの強調もバッククォート `` `text` `` を使う（`**text**` は使わない）
- `>` （引用記法）は引用以外の用途に使わない
- テーブルの回答スペース（空欄セル）は全角スペース12個（`　×12`）でパディングし、必要スペースの約1.5倍の幅を確保すること

### ナビゲーションリンク

各ファイルの末尾には2行構成でナビゲーションリンクを配置する：

**1行目**: 目次 | 練習 | 回答 | 解説
**2行目**: 前へ | **現在のタイトル** | 次へ

```markdown
[目次](../README.md) | 練習 | [回答](answer.md) | [解説](guide.md)

[前へ: ○○](../XX/drill.md) | **現在のタイトル** | [次へ: △△](../YY/drill.md)
```

- 1行目（目次・練習・回答・解説）と2行目（前へ・タイトル・次へ）の間は空行を入れる
- 目次のリンク先は科目ごとのREADME（`../README.md`）にする
- 自分自身のリンクはテキストのみ（リンクなし）にする
- 最初のコンテンツには「前へ」リンクを付けない
- 最後のコンテンツには「次へ」リンクを付けない
- 2行目は常に3要素（前へ | タイトル | 次へ）の構成を維持し、該当なしの場合はセルを空にする

### README

- `contents/README.md` にはすべてのドリルへのリンクテーブルを維持すること
- 科目ごとのREADME（例: `contents/math/README.md`）からは `contents/README.md` へ「ドリル一覧」として戻れるリンクを配置する

### 解説ルール

- 説明はできるだけ簡潔に箇条書きにする
- 例題を示して、それを解説する形式にする
- 絵文字や記号を活用して視覚的に分かりやすくする

### コンテンツ分割ルール

- 難易度や種類に違いがある場合（くり上がりあり/なし、あまりあり/なし等）はmdを分ける
- あり/なしを混ぜた練習が必要な場合は、個別の後にまとめとして配置する
- 演算の種類（たし算、ひき算、かけ算等）が異なる場合も分ける

## 英語ドリル固有ルール

### ファイル構成

各ドリルは `drill.md`（穴埋め問題）と `answer.md`（穴埋め解答）をペアで作成する。
英作文がある場合は `writing.md`（英作文問題）と `writing-answer.md`（英作文解答）も追加する。
文法ドリルには `guide.md`（解説）も追加する。

```
contents/english/
  01-alphabet/
    drill.md
    answer.md
  12-tenses-regular-past/
    drill.md          （穴埋め問題）
    answer.md         （穴埋め解答）
    writing.md        （英作文問題）
    writing-answer.md （英作文解答）
    guide.md          （解説）
  ...
```

### 1ファイル1内容の原則

- 1つのmdファイルには1種類の内容のみを含める
- 過去と未来のように別の文法概念になる場合は、mdやフォルダを分ける
- 穴埋め問題と英作文は別のmdに分ける（drill.md と writing.md）

### テーブル形式

- フォニックスの対象文字はバッククォート `` `text` `` で強調する（`<u>text</u>` や `**text**` は使わない）

### カタカナ表記ルール

- **単語全体のカタカナ表記**：フォニックスの解答には「単語全体」列を追加し、フォニックスごとにスペースで区切ったカタカナを記載する
  - 例：`book` → `ブ ウッ ク`（フォニックス毎に分割）
  - 例：`shoe` → `シュ ウー`
- **音声変化の発音表記**：音声変化の解答でも、発音をフォニックス単位でスペースで区切る
  - 例：`meet you` → `ミー チュー`
  - 例：`check it out` → `チェ キッ ト アウ ト`

### README

contents/README.md にはすべてのドリルへのリンクテーブルを維持すること。
各科目フォルダ（english/など）にも README.md を置き、科目ごとの学習ガイドとする。
科目 README.md の冒頭には `[Top](../README.md)` でドリル一覧に戻れるリンクを置く。
コンテンツファイルの「目次」リンクは科目 README.md（`../README.md`）を指す。

```markdown
| ドリル | 練習 | 解答 | 英作文 | 英作文解答 | 解説 |
|--------|------|------|--------|-----------|------|
| 01. ドリル名 | [drill](...) | [answer](...) | | | |
| 10. 文法ドリル名 | [drill](...) | [answer](...) | [writing](...) | [writing-answer](...) | [guide](...) |
```

### ナビゲーションリンク

各ドリルファイルの末尾には、2行構成でナビゲーションリンクを追加する：

**1行目**: 目次、練習、回答、英作文、英作文解答、解説（現在のファイルはリンクなしのテキスト）
**2行目**: 前へ、タイトル、次へ

- 自分自身のリンクは省略せず、リンクなしのテキストで表示する
- 前へ・次へは2行目に配置し、現在のコンテンツのタイトルを間に挟む

```markdown
（drill.md の例）
[目次](../README.md) | 練習 | [回答](answer.md) | [英作文](writing.md) | [英作文解答](writing-answer.md) | [解説](guide.md)

[前へ: ○○](../prev/drill.md) | 一般動詞の過去形 | [次へ: ○○](../next/drill.md)
```

※ 最初のトピックには「前」リンクなし、最後のトピックには「次」リンクなし
※ guide.md がないトピック（フォニックスなど）は解説リンクを省略
※ writing.md がないトピック（まとめ練習など）は英作文リンクを省略

### 音声変化（アシミレーション）のテーブル形式

アシミレーションセクションでは「変化」列を追加して音変化のルールを明示する：

```markdown
| フレーズ | 変化 | 音 |
|----------|------|------|
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

| 時制 | 変化ルール | 例 |
|------|-----------|------|
| 現在形 | 動詞の原形 | I `play` |
| 過去形 | 動詞 + ed | I `played` |
```

## クイズ（quiz/）のルール

### 動作保証とエビデンス

`quiz/` フォルダのコードを変更した場合は、必ず以下の手順を守ること：

1. **テストとエビデンス生成を実行する**

   ```bash
   cd quiz && npm run test:evidence
   ```

2. **`quiz/TEST_EVIDENCE.md` をコミットに含める**
   - エビデンスファイルは AI が作業したことと、テストが通ったことの証拠
   - タイムスタンプ・コミットハッシュ・全テスト結果が自動記録される
   - **改ざん防止**: テスト結果JSONのSHA256ハッシュがエビデンスに記録される（`sha256sum test-results.json` で検証可能）
   - このファイルを更新せずにコミットしてはならない

3. **E2E テスト結果もエビデンスに含まれる**
   - CI の `e2e` ジョブ実行後、`e2e-results.json` が存在すれば `TEST_EVIDENCE.md` に E2E 結果が追記される
   - ローカルで E2E も含めてエビデンスを生成する場合: `npm run build && npm run test:e2e && npm run generate-evidence`

4. **CI でも自動更新される**
   - `ci.yml` の `test-and-build` ジョブが PR マージ前にテストとエビデンスを再生成する
   - `e2e` ジョブが E2E 実行後にエビデンスを再生成して `[skip ci]` コミットで保存する

5. **本番デプロイ後に自動E2Eが実行される**
   - `jekyll-gh-pages.yml` の `e2e-production` ジョブがデプロイ後に本番URLに対してE2Eを実行する
   - 失敗した場合は `copilot` ラベル付きのIssueが自動作成され、Copilotエージェントが修正PRを作成する

### コードの言語規則

- **コードコメント・ファイルヘッダー**: 日本語で記述する
- **変数名・関数名・型名**: 英語（TypeScript の慣習に従う）
- **CI ワークフローのステップ名**: 日本語で記述する
- **テストの `it()` / `describe()` 名**: 日本語の仕様表現で記述する（例: `it("初回ロード時は空配列を返す", ...)`）

### テスト追加のルール

- 新しいソースファイルを追加する場合は、**同一フォルダに対応するテストファイルを必ず作成すること**
  - 例: `src/infrastructure/foo.ts` → `src/infrastructure/foo.test.ts`
- インターフェースのみのファイル（`ports.ts` など）はテスト不要だが、その旨をコメントに記載する
- 新しい問題カテゴリ（JSONファイル）を追加したら、必ず `npm run test:evidence` でデータ整合性テストが通ることを確認する
- バリデーション関数を変更した場合は `src/domain/question.test.ts` のテストも更新する

### DDD アーキテクチャ構造

`quiz/src/` は DDD（ドメイン駆動設計）のレイヤー構造で整理されている：

```
quiz/src/
  domain/           # ビジネスロジック（純粋関数・エンティティ・集約）
    question.ts     # Question エンティティ、型定義、バリデーション関数
    question.test.ts
    quizSession.ts  # QuizSession 集約（問題選択・回答・採点）
    quizSession.test.ts
  application/      # ユースケース（ポートに依存、実装には依存しない）
    ports.ts        # IQuestionRepository / IProgressRepository インターフェース
    quizUseCase.ts  # クイズの開始・採点・進捗保存を統括
    quizUseCase.test.ts
  infrastructure/   # 外部システムとの接続（fetch、localStorage）
    remoteQuestionRepository.ts       # IQuestionRepository の実装（fetch）
    remoteQuestionRepository.test.ts
    localStorageProgressRepository.ts # IProgressRepository の実装（localStorage）
    questionData.test.ts              # JSON データ整合性テスト
  presentation/     # UI コントローラー（DOM 操作）
    quizApp.ts      # QuizUseCase を使う UI コントローラー
```

### テストの配置ルール（コロケーション）

- テストファイルは対象ソースファイルと同じディレクトリに配置する（`*.test.ts`）
- `tests/` ディレクトリは廃止済み。`src/` 内のコロケーションテストを使用すること
- テストは **仕様テストスタイル**（Behavior-Driven）で記述し、`it("〇〇できる", ...)` のように日本語で仕様を表現する

### E2E テスト（Playwright + Gherkin）

```bash
cd quiz && npm run test:e2e     # Gherkin シナリオを実行
cd quiz && npm run test:e2e:ui  # UI モードで実行
```

- フィーチャーファイル: `e2e/features/**/*.feature`
- ステップ定義: `e2e/steps/**/*.ts`
- E2E は CI の `e2e` ジョブで自動実行される

### Lint エラーの自動修正

- CI の `markdownlint` ジョブが自動的に Markdown の問題を修正してコミットする
- 修正できない問題は `reviewdog` がPRにコメントを投稿するので、対応すること
## 数学ドリル固有ルール

### ファイル構成

各トピックは `drill.md`（練習問題）、`answer.md`（解答）、`guide.md`（解説）の3ファイルで構成する。

```
contents/math/
  01-addition-no-carry/
    drill.md
    answer.md
    guide.md
  ...
```

### 参考学年と学習目的

- 各ファイルの冒頭に **参考学年** を太字で記載する（`>` は使わない）
- drill.md と guide.md には **学習目的** も簡潔に記載する

### 解答の解説

- answer.md には簡単な解き方のポイントを💡マーク等で記載する
