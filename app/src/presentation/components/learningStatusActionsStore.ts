/**
 * 学習状況パネルの「開始する」ボタンアクションを管理するシンプルなアクションストア。
 *
 * QuizApp.init() 時に `setStartQuizAction` で登録し、
 * React コンポーネントから `triggerStartQuiz` で呼び出す。
 */

type StartQuizAction = () => void;

let _onStartQuiz: StartQuizAction | null = null;

/**
 * 「開始する」ボタンが呼ぶアクションを登録する。
 * QuizApp 側から呼ぶこと。
 */
export function setStartQuizAction(fn: StartQuizAction | null): void {
  _onStartQuiz = fn;
}

/**
 * 「開始する」ボタンからのアクションを実行する。
 * React コンポーネントから呼ぶこと。
 */
export function triggerStartQuiz(): void {
  _onStartQuiz?.();
}
