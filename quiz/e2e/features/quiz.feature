Feature: 学習クイズ

  Background:
    Given the quiz application is loaded

  Scenario: スタート画面が表示される
    Then the start screen should be visible
    And the quiz title should be "学習クイズ"

  Scenario: カテゴリツリーをスクロールしてもヘッダーとクイズパネルが表示されたまま
    Then the start screen should be visible
    And the quiz title should be "学習クイズ"
    When I scroll the category tree
    Then the header should remain visible
    And the quiz panel should remain visible

  Scenario: ランダムクイズを開始できる
    When I click the "ランダム10問" button
    Then the quiz screen should be visible
    And I should see question 1

  Scenario: 問題に回答して次の問題に進める
    When I click the "ランダム10問" button
    And I select the first choice
    Then the "次へ" button should be enabled

  Scenario: 全問回答後に採点できる
    When I click the "ランダム10問" button
    And I answer all questions
    Then I should see the "採点する" button
