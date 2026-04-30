Feature: 学習アプリ

  Background:
    Given the quiz application is loaded

  Scenario: スタート画面が表示される
    Then the start screen should be visible
    And the quiz title should be "学習アプリ"

  Scenario: タブで教科を切り替えると単元一覧のみ表示される
    Then the start screen should be visible
    And the quiz title should be "学習アプリ"
    When I click the "英語" tab
    Then the header should remain visible
    And the category list should be visible

  Scenario: 総合タブには各教科の概要カードが表示される
    Then the start screen should be visible
    And the subject overview items should be visible

  Scenario: 総合タブには活動サマリパネルが表示される
    Then the start screen should be visible
    And the overall summary panel should be visible

  Scenario: 総合タブの活動サマリには日付が含まれる
    Then the start screen should be visible
    And the share summary text should contain "📅"

  Scenario: 単元を選択するとクイズパネルが表示される
    When I click the "英語" tab
    And I click the first category item
    Then the quiz panel should be visible

  Scenario: 本番クイズを開始できる
    Given I have selected a quiz category
    When I click the "スタート" button
    Then the quiz screen should be visible
    And I should see question 1

  Scenario: 問題に回答して次の問題に進める
    Given I have selected a quiz category
    When I click the "スタート" button
    And I select the first choice
    Then the "次へ" button should be enabled

  Scenario: 全問回答後に採点できる
    Given I have selected a quiz category
    When I click the "スタート" button
    And I answer all questions
    Then I should see the "採点する" button

  Scenario: 採点後に結果画面が表示される
    Given I have selected a quiz category
    When I click the "スタート" button
    And I answer all questions
    And I click the "採点する" button
    Then the result screen should be visible
    And I should see the score

  Scenario: 結果画面から「もう一度」でクイズ画面に戻れる
    Given I have selected a quiz category
    When I click the "スタート" button
    And I answer all questions
    And I click the "採点する" button
    Then the result screen should be visible
    When I click the "もう一度" button
    Then the quiz screen should be visible
    And I should see question 1

  Scenario: 結果画面から「スタート画面に戻る」で戻れる
    Given I have selected a quiz category
    When I click the "スタート" button
    And I answer all questions
    And I click the "採点する" button
    Then the result screen should be visible
    When I click the "スタート画面に戻る" button
    Then the start screen should be visible

  Scenario: 解説パネルにコンテンツdivが表示される
    Given I have selected a quiz category
    When I open the guide panel tab
    Then the guide content div should be attached

  Scenario: フォントサイズ「大」に切り替えるとbodyにfont-size-largeクラスが付与される
    Given I have selected a quiz category
    When I click the "大" font size button
    Then the body should have the "font-size-large" class

  Scenario: フォントサイズ「小」に戻すとfont-size-largeクラスが除去される
    Given I have selected a quiz category
    When I click the "大" font size button
    And I click the "小" font size button
    Then the body should not have the "font-size-large" class

  Scenario: ストレート順でクイズ開始時にquizScreenにpractice-modeクラスが付与される
    Given I have selected a quiz category
    When I select "straight" quiz order
    And I click the "スタート" button
    Then the quiz screen should be visible
    And the quiz screen should have the practice-mode class

  Scenario: 本番クイズ開始時にquizScreenにpractice-modeクラスが付与されない
    Given I have selected a quiz category
    When I click the "スタート" button
    Then the quiz screen should be visible
    And the quiz screen should not have the practice-mode class

  Scenario: 手動確認済み記録は実施記録でread-only表示になる
    Given I have selected a quiz category
    When I click the "✅ 学習済みにする" button
    And I confirm the dialog
    And I open the history panel
    Then the manual history record score should show "-"
    And the manual history record should have no toggle arrow
    And clicking the manual history record header should not expand details

  Scenario: 親カテゴリグループを折りたたみ・展開できる
    When I click the "英語" tab
    And I click the "verb" category group header
    Then the "verb" category group should be collapsed
    When I click the "verb" category group header again
    Then the "verb" category group should be expanded

  Scenario: 折りたたみ状態で「学習済み」フィルターを適用すると学習済みアイテムが表示される
    When I click the "英語" tab
    And I click the first category item
    When I click the "✅ 学習済みにする" button
    And I confirm the dialog
    And I click the "verb" category group header
    Then the "verb" category group should be collapsed
    When I apply the "learned" status filter
    Then learned category items should be visible in the category list

  @kanji-stub
  Scenario: ひらがな問題では手書き認識でひらがな以外の候補が表示されない
    Given I have navigated to a hiragana text-input question
    When KanjiCanvas recognizes "や 山 き 川" and I draw a stroke on the canvas
    Then only hiragana candidates should be visible in the candidate list
    And non-hiragana candidates should not be visible in the candidate list

  @vr
  Scenario: スタート画面のビジュアル確認
    Then the start screen matches the snapshot

  @vr
  Scenario: クイズ画面のビジュアル確認
    Given I have selected a quiz category
    When I click the "スタート" button
    Then the quiz screen layout matches the snapshot

  @vr
  Scenario: 結果画面のビジュアル確認
    Given I have selected a quiz category
    When I click the "スタート" button
    And I answer all questions
    And I click the "採点する" button
    Then the result screen layout matches the snapshot

  Scenario: 単元をクリックすると解説タブが開く
    When I click the "数学" tab
    And I click the first category item
    Then the guide panel should be active

  Scenario: 単元をクリックすると解説タブに解説が表示される
    When I click the "数学" tab
    And I click the first category item
    Then the guide panel should be active

  Scenario: 学年フィルターボタンが表示される
    When I click the "数学" tab
    Then the grade filter buttons should be visible

  Scenario: 学年フィルターで絞り込みができる
    When I click the "数学" tab
    And I click the "小学" grade filter button
    Then only categories with grade starting with "小学" should be visible
    And the "中学" grade filter button should be inactive

  Scenario: ビューモード切替ボタンが表示される
    When I click the "数学" tab
    Then the category view toggle button should be visible

  Scenario: 学年別ビューに切り替えると学年グループが表示される
    When I click the "数学" tab
    And I click the view mode toggle button
    Then grade groups should be visible in the category list

  Scenario: データダウンロードボタンがツールバーに表示される
    Then the download data button should be visible in the header

  Scenario: データダウンロードボタンをクリックするとJSONファイルがダウンロードされる
    When I click the download data button
    Then a JSON file download should be triggered

  Scenario: サポートボタン（?）がヘッダーに表示される
    Then the support button should be visible in the header

  Scenario: サポートボタン（?）をクリックすると別タブでサポートページが開く
    Then the support button should open support page in a new tab
