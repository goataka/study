Feature: 学習クイズ

  Background:
    Given the quiz application is loaded

  Scenario: スタート画面が表示される
    Then the start screen should be visible
    And the quiz title should be "学習クイズ"

  Scenario: タブで教科を切り替えると単元一覧のみ表示される
    Then the start screen should be visible
    And the quiz title should be "学習クイズ"
    When I click the "英語" tab
    Then the header should remain visible
    And the category list should be visible

  Scenario: 総合タブには各教科の概要カードが表示される
    Then the start screen should be visible
    And the subject overview items should be visible

  Scenario: 単元を選択するとクイズパネルが表示される
    When I click the "英語" tab
    And I click the first category item
    Then the quiz panel should be visible

  Scenario: 本番クイズを開始できる
    Given I have selected a quiz category
    When I click the "本番" button
    Then the quiz screen should be visible
    And I should see question 1

  Scenario: 問題に回答して次の問題に進める
    Given I have selected a quiz category
    When I click the "本番" button
    And I select the first choice
    Then the "次へ" button should be enabled

  Scenario: 全問回答後に採点できる
    Given I have selected a quiz category
    When I click the "本番" button
    And I answer all questions
    Then I should see the "採点する" button

  Scenario: 採点後に結果画面が表示される
    Given I have selected a quiz category
    When I click the "本番" button
    And I answer all questions
    And I click the "採点する" button
    Then the result screen should be visible
    And I should see the score

  Scenario: 結果画面から「もう一度」でクイズ画面に戻れる
    Given I have selected a quiz category
    When I click the "本番" button
    And I answer all questions
    And I click the "採点する" button
    Then the result screen should be visible
    When I click the "もう一度" button
    Then the quiz screen should be visible
    And I should see question 1

  Scenario: 結果画面から「スタート画面に戻る」で戻れる
    Given I have selected a quiz category
    When I click the "本番" button
    And I answer all questions
    And I click the "採点する" button
    Then the result screen should be visible
    When I click the "スタート画面に戻る" button
    Then the start screen should be visible

  Scenario: 解説パネルのiframeにembedded=1クエリが付与される
    Given I have selected a quiz category
    When I open the guide panel tab
    Then the guide iframe src should contain "embedded=1"

  Scenario: 手動確認済み記録は実施記録でread-only表示になる
    Given I have selected a quiz category
    When I click the "✅ 学習済みにする" button
    And I open the history panel
    Then the manual history record score should show "-"
    And the manual history record should have no toggle arrow
    And clicking the manual history record header should not expand details

  @vr
  Scenario: スタート画面のビジュアル確認
    Then the start screen matches the snapshot

  @vr
  Scenario: クイズ画面のビジュアル確認
    Given I have selected a quiz category
    When I click the "本番" button
    Then the quiz screen layout matches the snapshot

  @vr
  Scenario: 結果画面のビジュアル確認
    Given I have selected a quiz category
    When I click the "本番" button
    And I answer all questions
    And I click the "採点する" button
    Then the result screen layout matches the snapshot
