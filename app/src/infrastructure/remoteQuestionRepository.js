/**
 * RemoteQuestionRepository — fetch API を使ってサーバーから問題データを取得する。
 * IQuestionRepository の実装。
 */
import { validateManifest, validateQuestionFile, expandQuestions } from "../domain/question";
export class RemoteQuestionRepository {
    constructor(baseUrl = "questions") {
        this.baseUrl = baseUrl;
    }
    async loadAll() {
        const manifest = await this.fetchJson(`${this.baseUrl}/index.json`);
        validateManifest(manifest);
        const results = await Promise.all(manifest.questionFiles.map((file) => this.fetchJson(`${this.baseUrl}/${file}`).then((qf) => {
            validateQuestionFile(qf);
            return expandQuestions(qf);
        })));
        return results.flat();
    }
    async fetchJson(url) {
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Failed to fetch "${url}": ${res.status} ${res.statusText}`);
        }
        return res.json();
    }
}
