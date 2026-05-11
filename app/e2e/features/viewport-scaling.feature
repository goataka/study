Feature: 縦方向スケーリング

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

  # 1920×1080 を基準とした JavaScript スケーリングの検証

  Scenario: 1920×1080の標準画面でスケールは1倍になる
    Given the viewport is 1920x1080
    And the quiz application is loaded
    Then the html scale should be 1

  Scenario: 1280×720の画面でスケールが比率に応じて適用される
    Given the viewport is 1280x720
    And the quiz application is loaded
    Then the html scale should be approximately 0.6667

  Scenario: 2560×1440の画面でスケールが比率に応じて適用される
    Given the viewport is 2560x1440
    And the quiz application is loaded
    Then the html scale should be approximately 1.3333

  # モバイル対応: 横幅 768px 未満ではスケーリングを無効にしてレスポンシブ CSS に任せる

  Scenario: 390×844のスマホ縦持ちではスケーリングが適用されない
    Given the viewport is 390x844
    And the quiz application is loaded
    Then the html scale should not be applied

  Scenario: 390×844のスマホ縦持ちでスタート画面が表示される
    Given the viewport is 390x844
    And the quiz application is loaded
    Then the start screen should be visible
    And the header should remain visible
