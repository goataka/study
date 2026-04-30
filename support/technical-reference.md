---
permalink: /support/technical-reference/
---

# 技術リファレンス

学習アプリの問題データ（JSON形式）の仕様を説明します。

## 問題データのURL

問題データはGitHub Pagesで公開されています。

### インデックスファイル

```text
https://goataka.github.io/study/questions/index.json
```

インデックスファイルには、利用可能な全問題ファイルの一覧が含まれます。

### 問題ファイル

```text
https://goataka.github.io/study/questions/{subject}/{category}.json
```

例：

```text
https://goataka.github.io/study/questions/english/alphabet.json
https://goataka.github.io/study/questions/math/addition-no-carry-1digit.json
https://goataka.github.io/study/questions/japanese/kanji-grade1.json
```

## インデックスファイルの形式

```json
{
  "version": "2.0.0",
  "subjects": {
    "english": { "name": "英語" },
    "math":    { "name": "数学" },
    "japanese":{ "name": "国語" }
  },
  "questionFiles": [
    "english/alphabet.json",
    "english/alphabet-lowercase.json",
    "..."
  ]
}
```

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `version` | string | データフォーマットのバージョン |
| `subjects` | object | 科目の一覧（キー：科目ID） |
| `subjects.*.name` | string | 科目の表示名 |
| `questionFiles` | string[] | 問題ファイルのパス一覧（インデックスからの相対パス） |

## 問題ファイルの形式

```json
{
  "subject": "english",
  "subjectName": "英語",
  "category": "alphabet",
  "categoryName": "🔤 大文字の読み",
  "topCategory": "pronunciation",
  "topCategoryName": "発音",
  "parentCategory": "alphabet",
  "parentCategoryName": "アルファベット",
  "guideUrl": "../english/pronunciation/alphabet/guide",
  "parentCategoryGuideUrl": "../english/pronunciation/guide",
  "example": "A(えい) B(びー)",
  "referenceGrade": "小学3年",
  "description": "英語で使う26文字のアルファベット大文字の名前（読み方）を覚えます。",
  "questions": [
    {
      "id": "fd31a226-8dc3-576f-9e55-b481c5b4c00b",
      "question": "「A」の読み方は？",
      "choices": ["えい", "えー", "あい", "いー"],
      "correct": 0,
      "explanation": "Aは「えい」と読みます"
    }
  ]
}
```

### カテゴリ情報

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `subject` | string | 科目ID（`english` / `math` / `japanese`） |
| `subjectName` | string | 科目の表示名 |
| `category` | string | カテゴリID |
| `categoryName` | string | カテゴリの表示名 |
| `topCategory` | string | 大カテゴリID |
| `topCategoryName` | string | 大カテゴリの表示名 |
| `parentCategory` | string | 親カテゴリID |
| `parentCategoryName` | string | 親カテゴリの表示名 |
| `guideUrl` | string | 解説ページへのURL（サイトルートを基準とした相対URL） |
| `parentCategoryGuideUrl` | string | 親カテゴリの解説ページへのURL |
| `example` | string | 例文・例題 |
| `referenceGrade` | string | 参考学年 |
| `description` | string | カテゴリの説明 |

### 問題データ（questions配列）

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `id` | string | 問題の一意なID（UUID v5） |
| `question` | string | 問題文 |
| `choices` | string[] | 選択肢（4択）の配列 |
| `correct` | number | 正解の選択肢インデックス（0始まり） |
| `explanation` | string | 解説テキスト |

## 科目ID一覧

| 科目ID | 表示名 | 説明 |
|--------|--------|------|
| `english` | 英語 | 発音・文法・語彙 |
| `math` | 数学 | 算数から高校数学まで |
| `japanese` | 国語 | 漢字・ことわざ・読解 |

## データ永続化

アプリの進捗データ（回答履歴・間違えた問題・習得済み問題など）は **IndexedDB** を使用してブラウザに保存されます。

### データベース構造

| 項目 | 値 |
|------|-----|
| データベース名 | `studyProgressDB` |
| バージョン | `1` |
| オブジェクトストア | `keyValue` |

### 保存されるデータ

| キー | 型 | 説明 |
|------|-----|------|
| `wrongQuestions` | string[] | 間違えた問題IDのリスト |
| `correctStreaks` | object | 問題IDごとの正解連続数 |
| `masteredIds` | string[] | 習得済み問題IDのリスト |
| `questionStats` | object | 問題IDごとの回答統計（total/correct） |
| `userName` | string | ユーザー名 |
| `quizHistory` | array | クイズ回答履歴（最大100件） |
| `categoryViewMode` | string | カテゴリ表示モード（`category` / `grade`） |
| `fontSizeLevel` | string | フォントサイズ設定（`small` / `medium` / `large`） |
| `overallShareUrl` | string | 活動サマリの共有URL |

### 注意事項

- データはブラウザのIndexedDBに保存されるため、ブラウザのデータを削除するとリセットされます
- 異なるブラウザやデバイス間でのデータ同期はサポートしていません
- データのエクスポート機能を使用してバックアップすることをお勧めします

## 🔗 関連リンク

- [サポートトップ](../) ─ サポートページのトップ
- [スタートアップガイド](../startup-guide/) ─ 使い始め方と基本操作
- [操作ガイド](../operation-guide/) ─ 画面構成と各機能
- [コンテンツ一覧](../content-list/) ─ 学習できる全教科・単元
- [トラブルシューティング](../troubleshooting/) ─ よくある質問
