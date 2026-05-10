import type { QuizUseCase } from "../../application/quizUseCase";
import type { IProgressRepository } from "../../application/ports";

/** AdminPanel が QuizApp 側に必要とする最小限の依存。 */
export interface AdminPanelDeps {
  useCase: QuizUseCase;
  progressRepo: IProgressRepository;
  /** 共有 URL（設定セクションのプレビュー表示用）。 */
  shareUrl: string;
  /** 確認ダイアログを表示し、OK されたら true を resolve する。 */
  showConfirmDialog: (message: string, alertOnly?: boolean) => Promise<boolean>;
}

