Feature: ガイドリンクの SPA ナビゲーション

  Background:
    Given クイズアプリが読み込まれている

  Scenario: URLフラグメントで教科を切り替えるとタブがアクティブになる
    When URL フラグメント "#subject=english" に移動する
    Then "英語" タブがアクティブになっている
    And 単元一覧が表示される

  Scenario: URLフラグメントの不正な教科名は無視される
    When "英語" タブをクリックする
    And URL フラグメント "#subject=nonexistent_subject" に移動する
    Then "英語" タブがアクティブになっている
