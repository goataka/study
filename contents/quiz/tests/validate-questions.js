/**
 * Quiz Data Validator
 * questions.jsonのデータ整合性をチェックするスクリプト
 */

const fs = require('fs');
const path = require('path');

// カラーコード
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

class QuizValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.stats = {
            totalQuestions: 0,
            subjects: {},
            categories: {},
            uniqueIds: new Set()
        };
    }

    log(message, color = 'reset') {
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    error(message) {
        this.errors.push(message);
        this.log(`❌ ERROR: ${message}`, 'red');
    }

    warn(message) {
        this.warnings.push(message);
        this.log(`⚠️  WARNING: ${message}`, 'yellow');
    }

    success(message) {
        this.log(`✅ ${message}`, 'green');
    }

    info(message) {
        this.log(`ℹ️  ${message}`, 'blue');
    }

    validateQuestionFormat(question, subject, category, questionIndex) {
        const prefix = `[${subject}/${category}/Q${questionIndex + 1}]`;

        // 必須フィールドのチェック
        const requiredFields = ['id', 'question', 'choices', 'correct', 'explanation'];
        for (const field of requiredFields) {
            if (!(field in question)) {
                this.error(`${prefix} Missing required field: ${field}`);
            }
        }

        // IDの一意性チェック
        if (question.id) {
            if (this.stats.uniqueIds.has(question.id)) {
                this.error(`${prefix} Duplicate question ID: ${question.id}`);
            } else {
                this.stats.uniqueIds.add(question.id);
            }
        }

        // 選択肢のチェック
        if (question.choices) {
            if (!Array.isArray(question.choices)) {
                this.error(`${prefix} 'choices' must be an array`);
            } else if (question.choices.length !== 4) {
                this.error(`${prefix} 'choices' must have exactly 4 options (has ${question.choices.length})`);
            } else {
                // 空の選択肢チェック
                question.choices.forEach((choice, idx) => {
                    if (!choice || choice.trim() === '') {
                        this.error(`${prefix} Choice ${idx} is empty`);
                    }
                });
            }
        }

        // 正解インデックスのチェック
        if (question.correct !== undefined) {
            if (typeof question.correct !== 'number') {
                this.error(`${prefix} 'correct' must be a number`);
            } else if (question.correct < 0 || question.correct > 3) {
                this.error(`${prefix} 'correct' must be between 0 and 3 (is ${question.correct})`);
            }
        }

        // 問題文と解説の長さチェック
        if (question.question && question.question.length > 200) {
            this.warn(`${prefix} Question text is very long (${question.question.length} chars)`);
        }

        if (question.explanation && question.explanation.length > 300) {
            this.warn(`${prefix} Explanation is very long (${question.explanation.length} chars)`);
        }
    }

    validateStructure(data) {
        this.info('Validating quiz data structure...');

        // バージョンチェック
        if (!data.version) {
            this.warn('Missing version field');
        }

        // subjectsの存在チェック
        if (!data.subjects || typeof data.subjects !== 'object') {
            this.error('Missing or invalid "subjects" object');
            return false;
        }

        // 各教科のチェック
        for (const [subjectId, subjectData] of Object.entries(data.subjects)) {
            if (!subjectData.name) {
                this.error(`Subject "${subjectId}" is missing "name" field`);
            }

            if (!subjectData.categories || typeof subjectData.categories !== 'object') {
                this.error(`Subject "${subjectId}" is missing or has invalid "categories"`);
                continue;
            }

            this.stats.subjects[subjectId] = {
                name: subjectData.name,
                questionCount: 0,
                categories: {}
            };

            // 各カテゴリのチェック
            for (const [categoryId, categoryData] of Object.entries(subjectData.categories)) {
                if (!categoryData.name) {
                    this.error(`Category "${subjectId}/${categoryId}" is missing "name" field`);
                }

                if (!categoryData.questions || !Array.isArray(categoryData.questions)) {
                    this.error(`Category "${subjectId}/${categoryId}" is missing or has invalid "questions" array`);
                    continue;
                }

                const questionCount = categoryData.questions.length;
                this.stats.subjects[subjectId].questionCount += questionCount;
                this.stats.subjects[subjectId].categories[categoryId] = {
                    name: categoryData.name,
                    questionCount
                };
                this.stats.totalQuestions += questionCount;

                // 各問題のチェック
                categoryData.questions.forEach((question, idx) => {
                    this.validateQuestionFormat(question, subjectId, categoryId, idx);
                });
            }
        }

        return true;
    }

    printStats() {
        this.log('\n📊 Statistics:', 'blue');
        this.log(`Total questions: ${this.stats.totalQuestions}`);

        for (const [subjectId, subjectStats] of Object.entries(this.stats.subjects)) {
            this.log(`\n${subjectStats.name} (${subjectStats.questionCount} questions):`);
            for (const [categoryId, categoryStats] of Object.entries(subjectStats.categories)) {
                this.log(`  - ${categoryStats.name}: ${categoryStats.questionCount} questions`);
            }
        }
    }

    printSummary() {
        this.log('\n' + '='.repeat(60), 'blue');
        this.log('VALIDATION SUMMARY', 'blue');
        this.log('='.repeat(60), 'blue');

        if (this.errors.length === 0 && this.warnings.length === 0) {
            this.success('All checks passed! ✨');
        } else {
            if (this.errors.length > 0) {
                this.log(`\n❌ ${this.errors.length} error(s) found`, 'red');
            }
            if (this.warnings.length > 0) {
                this.log(`⚠️  ${this.warnings.length} warning(s) found`, 'yellow');
            }
        }

        this.printStats();
        this.log('\n' + '='.repeat(60), 'blue');

        return this.errors.length === 0;
    }

    validate(filePath) {
        try {
            this.info(`Loading: ${filePath}`);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            this.validateStructure(data);

            return this.printSummary();
        } catch (error) {
            this.error(`Failed to load or parse JSON: ${error.message}`);
            return false;
        }
    }
}

// CLI実行
if (require.main === module) {
    const questionsDir = path.join(__dirname, '..', 'questions');
    const indexPath = path.join(questionsDir, 'index.json');

    try {
        const manifest = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        const validator = new QuizValidator();

        // マニフェストを検証（合成した全体データとして扱う）
        const combined = {
            version: manifest.version,
            subjects: {}
        };

        for (const file of manifest.questionFiles) {
            const filePath = path.join(questionsDir, file);
            const qf = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            if (!combined.subjects[qf.subject]) {
                combined.subjects[qf.subject] = {
                    name: qf.subjectName,
                    categories: {}
                };
            }
            combined.subjects[qf.subject].categories[qf.category] = {
                name: qf.categoryName,
                questions: qf.questions
            };
        }

        validator.validateStructure(combined);
        const isValid = validator.printSummary();
        process.exit(isValid ? 0 : 1);
    } catch (error) {
        console.error(`\x1b[31m❌ ERROR: ${error.message}\x1b[0m`);
        process.exit(1);
    }
}

module.exports = QuizValidator;
