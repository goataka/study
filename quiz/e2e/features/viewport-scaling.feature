Feature: 縦方向ズームスケーリング

  # 高さが制約となるビューポート（横長比率 > 16:9）でコンテンツがビューポートに収まることを確認

  Scenario: 1920×900のワイドスクリーンでスタート画面がビューポート内に収まる
    Given the viewport is 1920x900
    And the quiz application is loaded
    Then the start screen should be visible
    And the header should remain visible
    And the page content should fit within the viewport height

  Scenario: 2560×900の超ワイドスクリーンでスタート画面がビューポート内に収まる
    Given the viewport is 2560x900
    And the quiz application is loaded
    Then the start screen should be visible
    And the header should remain visible
    And the page content should fit within the viewport height
