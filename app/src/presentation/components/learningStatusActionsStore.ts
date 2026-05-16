/**
 * 学習状況パネルの「開始する」ボタンアクションを管理するシンプルなアクションストア。
 *
 * QuizApp.init() 時に `setStartQuizAction` で登録し、
 * React コンポーネントから `triggerStartQuiz` で呼び出す。
 * `setSelectUnitAction` で単元選択アクションを登録し、
 * React コンポーネントから `triggerSelectUnit` で呼び出す。
 */

type StartQuizAction = () => void;
type SelectUnitAction = (subject: string, categoryId: string, categoryName: string) => void;

let _onStartQuiz: StartQuizAction | null = null;
let _onSelectUnit: SelectUnitAction | null = null;

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

/**
 * 単元選択アクションを登録する。
 * QuizApp 側から呼ぶこと。
 */
export function setSelectUnitAction(fn: SelectUnitAction | null): void {
  _onSelectUnit = fn;
}

/**
 * 単元選択アクションを実行する。
 * React コンポーネントから呼ぶこと。
 */
export function triggerSelectUnit(subject: string, categoryId: string, categoryName: string): void {
  _onSelectUnit?.(subject, categoryId, categoryName);
}
