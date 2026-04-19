/**
 * RemoteQuestionRepository — fetches question data from the server.
 * Implements IQuestionRepository via fetch API.
 */

import { validateManifest, validateQuestionFile, expandQuestions } from "../domain/question";
import type { Question, QuestionFile, QuestionsManifest } from "../domain/question";
import type { IQuestionRepository } from "../application/ports";

export class RemoteQuestionRepository implements IQuestionRepository {
  constructor(private readonly baseUrl: string = "questions") {}

  async loadAll(): Promise<Question[]> {
    const manifest = await this.fetchJson<QuestionsManifest>(`${this.baseUrl}/index.json`);
    validateManifest(manifest);

    const results = await Promise.all(
      manifest.questionFiles.map((file) =>
        this.fetchJson<QuestionFile>(`${this.baseUrl}/${file}`).then((qf) => {
          validateQuestionFile(qf);
          return expandQuestions(qf);
        })
      )
    );

    return results.flat();
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch "${url}": ${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  }
}
