Feature: ビジュアルリグレッション

  Background:
    Given the quiz application is loaded

  Scenario: スタート画面のビジュアル確認
    Then the start screen matches the snapshot

  Scenario: クイズ画面のビジュアル確認
    When I click the "ランダム" button
    Then the quiz screen layout matches the snapshot

  Scenario: 結果画面のビジュアル確認
    When I click the "ランダム" button
    And I answer all questions
    And I click the "採点する" button
    Then the result screen layout matches the snapshot
