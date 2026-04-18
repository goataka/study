// クイズアプリケーション
class QuizApp {
    constructor() {
        this.questionData = null;
        this.allQuestions = [];
        this.currentQuestions = [];
        this.currentQuestionIndex = 0;
        this.userAnswers = [];
        this.wrongQuestions = this.loadWrongQuestions();
        this.selectedSubject = 'all';
        this.selectedCategory = 'all';

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

            // 新しいフォーマットか古いフォーマットかを判定
            if (data.subjects) {
                // 新フォーマット
                this.questionData = data;
                this.allQuestions = this.flattenQuestions(data.subjects);
            } else if (data.questions) {
                // 旧フォーマット（後方互換性）
                this.allQuestions = data.questions.map(q => ({
                    ...q,
                    subject: 'english',
                    category: q.topic || 'general'
                }));
            } else {
                throw new Error('Invalid question format');
            }
        } catch (error) {
            console.error('問題の読み込みに失敗しました:', error);
            alert('問題の読み込みに失敗しました。ページを再読み込みしてください。');
        }
    }

    // 新フォーマットの問題をフラット化
    flattenQuestions(subjects) {
        const questions = [];

        for (const [subjectId, subjectData] of Object.entries(subjects)) {
            for (const [categoryId, categoryData] of Object.entries(subjectData.categories)) {
                categoryData.questions.forEach(q => {
                    questions.push({
                        ...q,
                        subject: subjectId,
                        subjectName: subjectData.name,
                        category: categoryId,
                        categoryName: categoryData.name
                    });
                });
            }
        }

        return questions;
    }

    setupEventListeners() {
        // スタート画面
        document.getElementById('startRandomBtn').addEventListener('click', () => this.startQuiz('random'));
        document.getElementById('startRetryBtn').addEventListener('click', () => this.startQuiz('retry'));

        // フィルター（存在する場合）
        const subjectFilter = document.getElementById('subjectFilter');
        const categoryFilter = document.getElementById('categoryFilter');

        if (subjectFilter) {
            subjectFilter.addEventListener('change', (e) => {
                this.selectedSubject = e.target.value;
                this.updateCategoryFilter();
                this.updateStartScreen();
            });
        }

        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.selectedCategory = e.target.value;
                this.updateStartScreen();
            });
        }

        // クイズ画面
        document.getElementById('prevBtn').addEventListener('click', () => this.navigateQuestion(-1));
        document.getElementById('nextBtn').addEventListener('click', () => this.navigateQuestion(1));
        document.getElementById('submitBtn').addEventListener('click', () => this.submitQuiz());

        // 結果画面
        document.getElementById('retryAllBtn').addEventListener('click', () => this.startQuiz('random'));
        document.getElementById('retryWrongBtn').addEventListener('click', () => this.startQuiz('retry'));
        document.getElementById('backToStartBtn').addEventListener('click', () => this.showScreen('start'));
    }

    updateCategoryFilter() {
        const categoryFilter = document.getElementById('categoryFilter');
        if (!categoryFilter || !this.questionData) return;

        categoryFilter.innerHTML = '<option value="all">すべてのカテゴリ</option>';

        if (this.selectedSubject !== 'all' && this.questionData.subjects[this.selectedSubject]) {
            const categories = this.questionData.subjects[this.selectedSubject].categories;
            for (const [categoryId, categoryData] of Object.entries(categories)) {
                const option = document.createElement('option');
                option.value = categoryId;
                option.textContent = categoryData.name;
                categoryFilter.appendChild(option);
            }
        }

        this.selectedCategory = 'all';
    }

    getFilteredQuestions() {
        let filtered = [...this.allQuestions];

        if (this.selectedSubject !== 'all') {
            filtered = filtered.filter(q => q.subject === this.selectedSubject);
        }

        if (this.selectedCategory !== 'all') {
            filtered = filtered.filter(q => q.category === this.selectedCategory);
        }

        return filtered;
    }

    updateStartScreen() {
        const statsInfo = document.getElementById('statsInfo');
        const retryBtn = document.getElementById('startRetryBtn');

        const filteredQuestions = this.getFilteredQuestions();
        const wrongCount = this.wrongQuestions.filter(id =>
            filteredQuestions.some(q => q.id === id)
        ).length;

        let infoText = `全${filteredQuestions.length}問`;
        if (wrongCount > 0) {
            infoText += ` / 間違えた問題が${wrongCount}問あります`;
            retryBtn.disabled = false;
        } else {
            infoText += ` / 間違えた問題はありません`;
            retryBtn.disabled = true;
        }

        statsInfo.textContent = infoText;
    }

    startQuiz(mode) {
        this.currentQuestionIndex = 0;
        this.userAnswers = [];

        const filteredQuestions = this.getFilteredQuestions();

        if (mode === 'random') {
            // ランダムに10問選択
            this.currentQuestions = this.getRandomQuestions(filteredQuestions, 10);
        } else if (mode === 'retry') {
            // 間違えた問題のみ
            this.currentQuestions = this.wrongQuestions
                .map(id => filteredQuestions.find(q => q.id === id))
                .filter(q => q !== undefined);

            if (this.currentQuestions.length === 0) {
                alert('間違えた問題がありません');
                return;
            }
        }

        this.showScreen('quiz');
        this.displayQuestion();
    }

    getRandomQuestions(questions, count) {
        const shuffled = [...questions].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    }

    displayQuestion() {
        const question = this.currentQuestions[this.currentQuestionIndex];

        // 問題番号とトピック
        document.getElementById('questionNumber').textContent =
            `問題 ${this.currentQuestionIndex + 1} / ${this.currentQuestions.length}`;

        const topicText = question.categoryName || question.topic || question.category;
        document.getElementById('topicName').textContent = topicText;

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

            const topicText = question.categoryName || question.topic || '';

            resultItem.innerHTML = `
                <div class="result-header">
                    <span class="result-icon">${isCorrect ? '✓' : '✗'}</span>
                    <span class="result-question">${question.question}</span>
                    ${topicText ? `<span class="result-topic">[${topicText}]</span>` : ''}
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
