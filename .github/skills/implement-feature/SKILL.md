---
name: implement-feature
description: アプリの機能実装・改善・リファクタリングを行うときに使用する。DDD構造、クリーンアーキテクチャ、テスト、E2Eの手順を含む。
---

# 機能実装・改善スキル

アプリ（`app/`）の機能追加・改善・リファクタリングを行う際のガイド。

## 実装の絶対手順

以下のステップを **必ずこの順番** で実施すること：

1. **マニュアルを更新する**（`support/startup-guide.md` / `support/operation-guide.md`）
2. **E2Eシナリオを作成・更新する**（`app/e2e/features/`）
3. **実装を行う**
4. **ステップ定義を作成・更新する**（`app/e2e/steps/`）
5. **E2Eシナリオを実施し完了を確認する**（`cd app && pnpm run test:e2e`）
6. **マニュアルの画像を更新する**（`support/images/`）

## アーキテクチャ規約

### DDD レイヤー構造

```
app/src/
  domain/         → 純粋関数・エンティティ・集約・値オブジェクト
  application/    → ユースケース（ポート経由で infrastructure を利用）
  infrastructure/ → 外部システム接続（fetch、IndexedDB）
  presentation/   → UI コントローラー（DOM 操作）
```

### 依存方向（絶対）

- `presentation` → `application` → `domain`
- `infrastructure` → `application` → `domain`
- **逆方向の import は禁止**

### domain/ のルール

- 副作用ゼロ（DOM・fetch・localStorage・IndexedDB・タイマー・乱数を直接触らない）
- 既存の `Question`, `QuizSession` の責務・公開 API を変えるリファクタリングは禁止
- ValueObject は `domain/valueObjects/<Name>.ts` に配置、`private` コンストラクタ + `static` ファクトリ

### application/ のルール

- `application/ports.ts` のインターフェース経由でのみ infrastructure を利用
- 具象クラスを直接 import しない

### presentation/ のルール

- 1 ファイル 600 行超で分割検討
- 1 クラスのメソッド数 30 超でサブコントローラーに分割
- DOM 非依存の純粋ロジックは `uiHelpers.ts` か `domain/` へ移す
- 分割時は `presentation/<controllerName>/` サブフォルダに責務単位で配置

## テストルール

- 新規ソースファイルには対応するテストを必ず作成
- 配置: `tests/` サブフォルダ推奨（例: `src/domain/valueObjects/tests/QuestionId.test.ts`）
- テストは仕様スタイル: `it("〇〇できる", ...)`（日本語）
- E2E: `app/e2e/features/**/*.feature` + `app/e2e/steps/**/*.ts`

## スタイリング

- **Tailwind CSS v4** が基本。ユーティリティクラスで記述
- バリエーションのある UI は CVA レシピ（`src/presentation/styles/`）
- セマンティッククラス名は legacy CSS から完全に消えるまで維持

## Lint・ビルド・テストコマンド

```bash
cd app && pnpm run build && pnpm run test    # ビルド + 単体テスト
cd app && pnpm run test:e2e                   # E2E テスト
cd app && pnpm run lint                       # ESLint
cd app && pnpm run format:check               # Prettier チェック
```

## コードの言語規則

- コメント・ファイルヘッダー: 日本語
- 変数名・関数名・型名: 英語
- テストの `it()` / `describe()` 名: 日本語
- CI ワークフローのステップ名: 日本語

## 完了前チェックリスト

- [ ] マニュアルに機能の説明が記載されているか？
- [ ] 対応する E2E シナリオが存在するか？
- [ ] ステップ定義が存在するか？
- [ ] `pnpm run test:e2e` がすべてパスするか？
- [ ] 手順の順序を遵守したか？
- [ ] 新規ソースに対応するテストがあるか？
