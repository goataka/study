Feature: ガイドリンクの SPA ナビゲーション

  Background:
    Given the quiz application is loaded

  Scenario: URLフラグメントで教科を切り替えるとタブがアクティブになる
    When I navigate to the hash "#subject=english"
    Then the "英語" tab should be active
    And the category list should be visible

  Scenario: URLフラグメントの不正な教科名は無視される
    When I click the "英語" tab
    And I navigate to the hash "#subject=nonexistent_subject"
    Then the "英語" tab should be active
