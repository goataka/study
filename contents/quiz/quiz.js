// クイズアプリケーション
class QuizApp {
    constructor() {
        this.allQuestions = [];
        this.currentQuestions = [];
        this.currentQuestionIndex = 0;
        this.userAnswers = [];
        this.wrongQuestions = this.loadWrongQuestions();

        this.init();
    }

    async init() {
        await this.loadQuestions();
        this.setupEventListeners();
        this.updateStartScreen();
    }

    async loadQuestions() {
        try {
            const response = await fetch('questions.json');
            const data = await response.json();
            this.allQuestions = data.questions;
        } catch (error) {
            console.error('問題の読み込みに失敗しました:', error);
            alert('問題の読み込みに失敗しました。ページを再読み込みしてください。');
        }
    }

    setupEventListeners() {
        // スタート画面
        document.getElementById('startRandomBtn').addEventListener('click', () => this.startQuiz('random'));
        document.getElementById('startRetryBtn').addEventListener('click', () => this.startQuiz('retry'));

        // クイズ画面
        document.getElementById('prevBtn').addEventListener('click', () => this.navigateQuestion(-1));
        document.getElementById('nextBtn').addEventListener('click', () => this.navigateQuestion(1));
        document.getElementById('submitBtn').addEventListener('click', () => this.submitQuiz());

        // 結果画面
        document.getElementById('retryAllBtn').addEventListener('click', () => this.startQuiz('random'));
        document.getElementById('retryWrongBtn').addEventListener('click', () => this.startQuiz('retry'));
        document.getElementById('backToStartBtn').addEventListener('click', () => this.showScreen('start'));
    }

    updateStartScreen() {
        const statsInfo = document.getElementById('statsInfo');
        const retryBtn = document.getElementById('startRetryBtn');

        if (this.wrongQuestions.length > 0) {
            statsInfo.textContent = `間違えた問題が${this.wrongQuestions.length}問あります`;
            retryBtn.disabled = false;
        } else {
            statsInfo.textContent = '間違えた問題はありません';
            retryBtn.disabled = true;
        }
    }

    startQuiz(mode) {
        this.currentQuestionIndex = 0;
        this.userAnswers = [];

        if (mode === 'random') {
            // ランダムに10問選択
            this.currentQuestions = this.getRandomQuestions(10);
        } else if (mode === 'retry') {
            // 間違えた問題のみ
            this.currentQuestions = this.wrongQuestions.map(id =>
                this.allQuestions.find(q => q.id === id)
            ).filter(q => q !== undefined);

            if (this.currentQuestions.length === 0) {
                alert('間違えた問題がありません');
                return;
            }
        }

        this.showScreen('quiz');
        this.displayQuestion();
    }

    getRandomQuestions(count) {
        const shuffled = [...this.allQuestions].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    displayQuestion() {
        const question = this.currentQuestions[this.currentQuestionIndex];

        // 問題番号とトピック
        document.getElementById('questionNumber').textContent =
            `問題 ${this.currentQuestionIndex + 1} / ${this.currentQuestions.length}`;
        document.getElementById('topicName').textContent = question.topic;

        // 進捗バー
        const progress = ((this.currentQuestionIndex + 1) / this.currentQuestions.length) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;

        // 問題文
        document.getElementById('questionText').textContent = question.question;

        // 選択肢
        const choicesContainer = document.getElementById('choicesContainer');
        choicesContainer.innerHTML = '';

        question.choices.forEach((choice, index) => {
            const label = document.createElement('label');
            label.className = 'choice-label';

            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'answer';
            input.value = index;
            input.checked = this.userAnswers[this.currentQuestionIndex] === index;
            input.addEventListener('change', () => this.selectAnswer(index));

            const span = document.createElement('span');
            span.className = 'choice-text';
            span.textContent = choice;

            label.appendChild(input);
            label.appendChild(span);
            choicesContainer.appendChild(label);
        });

        // ナビゲーションボタンの状態
        this.updateNavigationButtons();
    }

    selectAnswer(choiceIndex) {
        this.userAnswers[this.currentQuestionIndex] = choiceIndex;
        this.updateNavigationButtons();
    }

    navigateQuestion(direction) {
        this.currentQuestionIndex += direction;
        this.displayQuestion();
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const submitBtn = document.getElementById('submitBtn');

        // 前へボタン
        prevBtn.disabled = this.currentQuestionIndex === 0;

        // 次へボタンと採点ボタン
        const isLastQuestion = this.currentQuestionIndex === this.currentQuestions.length - 1;

        if (isLastQuestion) {
            nextBtn.classList.add('hidden');
            submitBtn.classList.remove('hidden');
            submitBtn.disabled = this.userAnswers.length !== this.currentQuestions.length;
        } else {
            nextBtn.classList.remove('hidden');
            submitBtn.classList.add('hidden');
            nextBtn.disabled = this.userAnswers[this.currentQuestionIndex] === undefined;
        }
    }

    submitQuiz() {
        // 結果を計算
        let correctCount = 0;
        const newWrongQuestions = [];

        this.currentQuestions.forEach((question, index) => {
            const userAnswer = this.userAnswers[index];
            if (userAnswer === question.correct) {
                correctCount++;
                // 正解した場合は間違えた問題リストから削除
                this.wrongQuestions = this.wrongQuestions.filter(id => id !== question.id);
            } else {
                // 間違えた問題をリストに追加
                if (!this.wrongQuestions.includes(question.id)) {
                    newWrongQuestions.push(question.id);
                }
            }
        });

        // 新しく間違えた問題を追加
        this.wrongQuestions.push(...newWrongQuestions);
        this.saveWrongQuestions();

        // 結果画面を表示
        this.showResults(correctCount);
    }

    showResults(correctCount) {
        const totalQuestions = this.currentQuestions.length;
        const percentage = Math.round((correctCount / totalQuestions) * 100);

        // スコア表示
        const scoreDisplay = document.getElementById('scoreDisplay');
        scoreDisplay.innerHTML = `
            <div class="score-circle ${percentage >= 70 ? 'pass' : 'fail'}">
                <div class="score-percentage">${percentage}%</div>
                <div class="score-text">${correctCount} / ${totalQuestions} 正解</div>
            </div>
        `;

        // 詳細結果
        const resultDetails = document.getElementById('resultDetails');
        resultDetails.innerHTML = '<h3>解答一覧</h3>';

        this.currentQuestions.forEach((question, index) => {
            const userAnswer = this.userAnswers[index];
            const isCorrect = userAnswer === question.correct;

            const resultItem = document.createElement('div');
            resultItem.className = `result-item ${isCorrect ? 'correct' : 'incorrect'}`;
            resultItem.innerHTML = `
                <div class="result-header">
                    <span class="result-icon">${isCorrect ? '✓' : '✗'}</span>
                    <span class="result-question">${question.question}</span>
                </div>
                <div class="result-answer">
                    <div>あなたの解答: <strong>${question.choices[userAnswer]}</strong></div>
                    ${!isCorrect ? `<div>正解: <strong>${question.choices[question.correct]}</strong></div>` : ''}
                    <div class="explanation">${question.explanation}</div>
                </div>
            `;
            resultDetails.appendChild(resultItem);
        });

        // 間違えた問題だけボタンの状態を更新
        const retryWrongBtn = document.getElementById('retryWrongBtn');
        retryWrongBtn.disabled = this.wrongQuestions.length === 0;
        if (this.wrongQuestions.length > 0) {
            retryWrongBtn.textContent = `間違えた問題だけ (${this.wrongQuestions.length}問)`;
        } else {
            retryWrongBtn.textContent = '間違えた問題だけ';
        }

        this.showScreen('result');
    }

    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });

        if (screenName === 'start') {
            document.getElementById('startScreen').classList.remove('hidden');
            this.updateStartScreen();
        } else if (screenName === 'quiz') {
            document.getElementById('quizScreen').classList.remove('hidden');
        } else if (screenName === 'result') {
            document.getElementById('resultScreen').classList.remove('hidden');
        }
    }

    // LocalStorage管理
    loadWrongQuestions() {
        try {
            const saved = localStorage.getItem('wrongQuestions');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('データの読み込みに失敗しました:', error);
            return [];
        }
    }

    saveWrongQuestions() {
        try {
            localStorage.setItem('wrongQuestions', JSON.stringify(this.wrongQuestions));
        } catch (error) {
            console.error('データの保存に失敗しました:', error);
        }
    }
}

// アプリケーション起動
document.addEventListener('DOMContentLoaded', () => {
    new QuizApp();
});
