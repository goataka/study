// Generated from: e2e/features/quiz.feature
import { test } from "playwright-bdd";

test.describe('学習クイズ', () => {

  test.beforeEach('Background', async ({ Given, page }, testInfo) => { if (testInfo.error) return;
    await Given('the quiz application is loaded', null, { page }); 
  });
  
  test('スタート画面が表示される', async ({ Then, And, page }) => { 
    await Then('the start screen should be visible', null, { page }); 
    await And('the quiz title should be "学習クイズ"', null, { page }); 
  });

  test('カテゴリツリーをスクロールしてもヘッダーとクイズパネルが表示されたまま', async ({ When, Then, And, page }) => { 
    await Then('the start screen should be visible', null, { page }); 
    await And('the quiz title should be "学習クイズ"', null, { page }); 
    await When('I scroll the category tree', null, { page }); 
    await Then('the header should remain visible', null, { page }); 
    await And('the quiz panel should remain visible', null, { page }); 
  });

  test('ランダムクイズを開始できる', async ({ When, Then, And, page }) => { 
    await When('I click the "ランダム10問" button', null, { page }); 
    await Then('the quiz screen should be visible', null, { page }); 
    await And('I should see question 1', null, { page }); 
  });

  test('問題に回答して次の問題に進める', async ({ When, Then, And, page }) => { 
    await When('I click the "ランダム10問" button', null, { page }); 
    await And('I select the first choice', null, { page }); 
    await Then('the "次へ" button should be enabled', null, { page }); 
  });

  test('全問回答後に採点できる', async ({ When, Then, And, page }) => { 
    await When('I click the "ランダム10問" button', null, { page }); 
    await And('I answer all questions', null, { page }); 
    await Then('I should see the "採点する" button', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('e2e/features/quiz.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":10,"pickleLine":6,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given the quiz application is loaded","isBg":true,"stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":7,"keywordType":"Outcome","textWithKeyword":"Then the start screen should be visible","stepMatchArguments":[]},{"pwStepLine":12,"gherkinStepLine":8,"keywordType":"Outcome","textWithKeyword":"And the quiz title should be \"学習クイズ\"","stepMatchArguments":[{"group":{"start":25,"value":"\"学習クイズ\"","children":[{"start":26,"value":"学習クイズ","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":15,"pickleLine":10,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given the quiz application is loaded","isBg":true,"stepMatchArguments":[]},{"pwStepLine":16,"gherkinStepLine":11,"keywordType":"Outcome","textWithKeyword":"Then the start screen should be visible","stepMatchArguments":[]},{"pwStepLine":17,"gherkinStepLine":12,"keywordType":"Outcome","textWithKeyword":"And the quiz title should be \"学習クイズ\"","stepMatchArguments":[{"group":{"start":25,"value":"\"学習クイズ\"","children":[{"start":26,"value":"学習クイズ","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":18,"gherkinStepLine":13,"keywordType":"Action","textWithKeyword":"When I scroll the category tree","stepMatchArguments":[]},{"pwStepLine":19,"gherkinStepLine":14,"keywordType":"Outcome","textWithKeyword":"Then the header should remain visible","stepMatchArguments":[]},{"pwStepLine":20,"gherkinStepLine":15,"keywordType":"Outcome","textWithKeyword":"And the quiz panel should remain visible","stepMatchArguments":[]}]},
  {"pwTestLine":23,"pickleLine":17,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given the quiz application is loaded","isBg":true,"stepMatchArguments":[]},{"pwStepLine":24,"gherkinStepLine":18,"keywordType":"Action","textWithKeyword":"When I click the \"ランダム10問\" button","stepMatchArguments":[{"group":{"start":12,"value":"\"ランダム10問\"","children":[{"start":13,"value":"ランダム10問","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":25,"gherkinStepLine":19,"keywordType":"Outcome","textWithKeyword":"Then the quiz screen should be visible","stepMatchArguments":[]},{"pwStepLine":26,"gherkinStepLine":20,"keywordType":"Outcome","textWithKeyword":"And I should see question 1","stepMatchArguments":[]}]},
  {"pwTestLine":29,"pickleLine":22,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given the quiz application is loaded","isBg":true,"stepMatchArguments":[]},{"pwStepLine":30,"gherkinStepLine":23,"keywordType":"Action","textWithKeyword":"When I click the \"ランダム10問\" button","stepMatchArguments":[{"group":{"start":12,"value":"\"ランダム10問\"","children":[{"start":13,"value":"ランダム10問","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":31,"gherkinStepLine":24,"keywordType":"Action","textWithKeyword":"And I select the first choice","stepMatchArguments":[]},{"pwStepLine":32,"gherkinStepLine":25,"keywordType":"Outcome","textWithKeyword":"Then the \"次へ\" button should be enabled","stepMatchArguments":[{"group":{"start":4,"value":"\"次へ\"","children":[{"start":5,"value":"次へ","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":35,"pickleLine":27,"tags":[],"steps":[{"pwStepLine":7,"gherkinStepLine":4,"keywordType":"Context","textWithKeyword":"Given the quiz application is loaded","isBg":true,"stepMatchArguments":[]},{"pwStepLine":36,"gherkinStepLine":28,"keywordType":"Action","textWithKeyword":"When I click the \"ランダム10問\" button","stepMatchArguments":[{"group":{"start":12,"value":"\"ランダム10問\"","children":[{"start":13,"value":"ランダム10問","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":37,"gherkinStepLine":29,"keywordType":"Action","textWithKeyword":"And I answer all questions","stepMatchArguments":[]},{"pwStepLine":38,"gherkinStepLine":30,"keywordType":"Outcome","textWithKeyword":"Then I should see the \"採点する\" button","stepMatchArguments":[{"group":{"start":17,"value":"\"採点する\"","children":[{"start":18,"value":"採点する","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
]; // bdd-data-end