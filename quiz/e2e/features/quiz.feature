Feature: 学習クイズ

  Background:
    Given the quiz application is loaded

  Scenario: スタート画面が表示される
    Then the start screen should be visible
    And the quiz title should be "学習クイズ"

  Scenario: タブで教科を切り替えるとクイズパネルが表示されたまま
    Then the start screen should be visible
    And the quiz title should be "学習クイズ"
    When I click the "英語" tab
    Then the header should remain visible
    And the quiz panel should remain visible

  Scenario: ランダムクイズを開始できる
    When I click the "ランダム" button
    Then the quiz screen should be visible
    And I should see question 1

  Scenario: 問題に回答して次の問題に進める
    When I click the "ランダム" button
    And I select the first choice
    Then the "次へ" button should be enabled

  Scenario: 全問回答後に採点できる
    When I click the "ランダム" button
    And I answer all questions
    Then I should see the "採点する" button

  Scenario: 採点後に結果画面が表示される
    When I click the "ランダム" button
    And I answer all questions
    And I click the "採点する" button
    Then the result screen should be visible
    And I should see the score

  Scenario: 結果画面から「もう一度」でクイズ画面に戻れる
    When I click the "ランダム" button
    And I answer all questions
    And I click the "採点する" button
    Then the result screen should be visible
    When I click the "もう一度" button
    Then the quiz screen should be visible
    And I should see question 1

  Scenario: 結果画面から「スタート画面に戻る」で戻れる
    When I click the "ランダム" button
    And I answer all questions
    And I click the "採点する" button
    Then the result screen should be visible
    When I click the "スタート画面に戻る" button
    Then the start screen should be visible
