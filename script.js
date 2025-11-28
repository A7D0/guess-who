// ====== 0. Firebase Modular imports ======
import { ref as dbRef, set as dbSet, get as dbGet, update as dbUpdate, onValue as dbOnValue } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { database } from "./firebase-config.js";

// ====== 1. البيانات والتكوين ======
const GAME_DATA = {
  "categories": {
    "العربية": {
      "أنمي": ["لوفي", "ناروتو", "غوكو", "إيرين", "سايتاما"],
      "مسلسلات": ["البروفيسور", "لعبة الحبار", "صراع العروش", "مكتبة الإسكندرية", "فريندز"],
      "أفلام": ["الجوكر", "إنترستيلار", "البداية", "ماتريكس", "تايتانيك"],
      "ألعاب": ["فورتنايت", "ماينكرافت", "فيفا", "ريد ديد", "جتا 5"],
      "يوتيوبرز": ["بندريتا", "أبو فلة", "حسن فلان", "فيصل اليامي", "أحمد النشيط"]
    },
    "English": {
      "Anime": ["Luffy", "Naruto", "Goku", "Eren", "Saitama"],
      "Series": ["Money Heist", "Squid Game", "Game of Thrones", "Black Mirror", "Friends"],
      "Movies": ["Joker", "Interstellar", "Inception", "The Matrix", "Titanic"],
      "Games": ["Fortnite", "Minecraft", "FIFA", "Red Dead", "GTA V"],
      "YouTubers": ["BanderitaX", "AboFlah", "Hassan Falan", "Faisal Al Yami", "Ahmed Al Nashit"]
    }
  }
};

// ====== 2. الترجمات ======
const TEXTS = {
    "العربية": {
        title: "🎮 مَن في بالك؟",
        langToggle: "English",
        catHeader: "اختر فئة اللعب:",
        startPVP: "بدء اللعبة",
        duplicateQuestion: "❌ عذراً! لقد سألت هذا السؤال من قبل",
        alreadyAsked: "الأسئلة السابقة:",
        answerQuestion: "أجب على السؤال (نعم/لا):",
        wrongGuess: "✗ التخمين خاطئ",
        winHeader: "🎉 تهانينا!",
        winMessage: " خمّن بنجاح!",
        guessingPlayer: "العنصر السري:",
        restart: "ابدأ جولة جديدة",
        playerName: (n) => `اللاعب ${n}`,
        currentTurn: "دورك الآن",
        waitingOpponent: "انتظر دوره...",
        onlineGame: "لعبة أون لاين 🌐",
        localGame: "لعبة محلية 👥",
        gameCode: "رمز اللعبة الخاص بك:",
        enterOpponentCode: "أدخل رمز الخصم:",
        joinGame: "انضم للعبة",
        copying: "تم النسخ!",
        waitingOpponentSetup: "ينتظر الخصم لإدخال عنصره السري",
        incomingQuestion: "الخصم يسأل:",
        youAsked: "أنت سألت:",
        waitingAnswer: "(بانتظار الإجابة...)",
        opponentAnswered: "الخصم أجاب:",
        yes: "نعم",
        no: "لا"
    },
    "English": {
        title: "🎮 Guess Who?",
        langToggle: "العربية",
        catHeader: "Select a Category:",
        startPVP: "Start Game",
        duplicateQuestion: "❌ Sorry! You already asked this question",
        alreadyAsked: "Previous questions:",
        answerQuestion: "Answer the question (yes/no):",
        wrongGuess: "✗ Wrong guess",
        winHeader: "🎉 Congratulations!",
        winMessage: " guessed correctly!",
        guessingPlayer: "Secret item:",
        restart: "Start New Round",
        playerName: (n) => `Player ${n}`,
        currentTurn: "Your Turn",
        waitingOpponent: "Waiting for opponent...",
        onlineGame: "Online Game 🌐",
        localGame: "Local Game 👥",
        gameCode: "Your Game Code:",
        enterOpponentCode: "Enter Opponent's Code:",
        joinGame: "Join Game",
        copying: "Copied!",
        waitingOpponentSetup: "Waiting for opponent to enter secret item",
        incomingQuestion: "Opponent asks:",
        youAsked: "You asked:",
        waitingAnswer: "(Waiting for answer...)",
        opponentAnswered: "Opponent answered:",
        yes: "Yes",
        no: "No"
    }
};

// ====== 3. حالة اللعبة الشاملة ======
let currentLang = 'العربية';
let gameMode = null; 
let selectedCategory = '';
let player1Secret = '';
let player2Secret = '';
let currentPlayerTurn = 1;
let gameActive = false;
let isMyTurn = true;
let myPlayerNumber = 1;
let gameId = null;
let askedQuestions = [];
let lastProcessedTimestamp = 0; 

// ====== 4. Helper Elements & Modal Creation ======
// نقوم بإنشاء نافذة الإجابة ديناميكياً لتجنب تعديل HTML
const elements = {
    body: document.body,
    langToggle: document.getElementById('lang-toggle'),
    title: document.getElementById('title'),
    mainMenuScreen: document.getElementById('main-menu-screen'),
    localGameButton: document.getElementById('local-game-button'),
    onlineGameButton: document.getElementById('online-game-button'),
    categorySelectionScreen: document.getElementById('category-selection'),
    categoryButtonsContainer: document.getElementById('category-buttons'),
    startPVPButton: document.getElementById('start-pvp-button'),
    backToMenuButton: document.getElementById('back-to-menu-button'),
    onlineWaitingScreen: document.getElementById('online-waiting-screen'),
    gameCodeDisplay: document.getElementById('game-code'),
    copyCodeButton: document.getElementById('copy-code-button'),
    opponentCodeInput: document.getElementById('opponent-code-input'),
    joinGameButton: document.getElementById('join-game-button'),
    cancelOnlineButton: document.getElementById('cancel-online-button'),
    player1SetupScreen: document.getElementById('player1-setup-screen'),
    player1SecretInput: document.getElementById('player1-secret-input'),
    player1ConfirmButton: document.getElementById('player1-confirm-button'),
    player2SetupScreen: document.getElementById('player2-setup-screen'),
    player2SecretInput: document.getElementById('player2-secret-input'),
    player2ConfirmButton: document.getElementById('player2-confirm-button'),
    gameScreen: document.getElementById('game-screen'),
    currentPlayer: document.getElementById('current-player'),
    playerStatus: document.getElementById('player-status'),
    questionInput: document.getElementById('question-input'),
    askButton: document.getElementById('ask-button'),
    guessInput: document.getElementById('guess-input'),
    guessButton: document.getElementById('guess-button'),
    feedbackArea: document.getElementById('feedback-area'),
    duplicateWarning: document.getElementById('duplicate-warning'),
    askedQuestionsWarning: document.getElementById('asked-questions-warning'),
    resultScreen: document.getElementById('result-screen'),
    resultHeader: document.getElementById('result-header'),
    resultMessage: document.getElementById('result-message'),
    resultDetails: document.getElementById('result-details'),
    restartButton: document.getElementById('restart-button'),
    waitingOpponentScreen: document.getElementById('waiting-opponent-screen'),
    waitingMessage: document.getElementById('waiting-message')
};

// إنشاء نافذة الإجابة (Modal) ديناميكياً
function createAnswerModal() {
    const modal = document.createElement('div');
    modal.id = 'answer-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.85); display: none; flex-direction: column;
        justify-content: center; align-items: center; z-index: 1000;
    `;
    modal.innerHTML = `
        <div style="background: #1a1a2e; padding: 30px; border: 2px solid #e94560; border-radius: 15px; text-align: center; max-width: 90%;">
            <h2 id="modal-question-text" style="color: #fff; margin-bottom: 20px;"></h2>
            <div style="display: flex; gap: 20px; justify-content: center;">
                <button id="btn-yes" class="neon-button" style="background: #4CAF50;">نعم</button>
                <button id="btn-no" class="neon-button" style="background: #f44336;">لا</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}
const answerModal = createAnswerModal();

// ====== 5. Firebase Logic ======

function generateGameCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function createOnlineGame() {
    const gameCode = generateGameCode();
    const gameRef = dbRef(database, `games/${gameCode}`);
    
    await dbSet(gameRef, {
        players: {},
        createdAt: Date.now(),
        status: 'waiting'
    });

    const codeInput = document.getElementById('gameCodeInput');
    if (codeInput) codeInput.value = gameCode;
    elements.gameCodeDisplay.textContent = gameCode;

    gameId = gameCode;
    myPlayerNumber = 1;
    isMyTurn = true; // اللاعب 1 يبدأ دائماً

    listenToGameChanges(gameCode);
    return gameCode;
}

async function joinGame(opponentCode) {
    const code = opponentCode.trim().toUpperCase();
    if (!code) return alert(TEXTS[currentLang].enterOpponentCode);

    const gameRef = dbRef(database, `games/${code}`);
    const snapshot = await dbGet(gameRef);

    if (!snapshot.exists()) return alert("Code not found!");
    
    const data = snapshot.val();
    const players = data.players || {};
    if (Object.keys(players).length >= 2) return alert("Game full!");

    myPlayerNumber = 2;
    isMyTurn = false; // اللاعب 2 ينتظر
    const playerId = `player${Date.now()}`;
    
    players[playerId] = { number: 2, joinedAt: Date.now() };
    await dbUpdate(gameRef, { players });

    gameId = code;
    elements.opponentCodeInput.value = '';
    listenToGameChanges(code);
    hideAllScreens();
    elements.categorySelectionScreen.classList.remove('hidden');
}

// === إرسال الأحداث لـ Firebase ===
async function sendAction(type, content) {
    if (!gameId) return;
    const gameRef = dbRef(database, `games/${gameId}`);
    
    await dbUpdate(gameRef, {
        lastAction: {
            type: type, // 'question', 'answer', 'guess', 'end'
            content: content,
            sender: myPlayerNumber,
            timestamp: Date.now()
        }
    });
}

// === الاستماع للتغييرات ===
let gameListener = null;

function listenToGameChanges(code) {
    const gameRef = dbRef(database, `games/${code}`);
    if (gameListener) gameListener();

    gameListener = dbOnValue(gameRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // 1. مزامنة حالة اللاعبين وبدء اللعبة
        const players = data.players || {};
        if (Object.keys(players).length >= 2 && gameMode === 'online' && !gameActive) {
            // ننتظر قليلاً للتأكد من التزامن ثم ننتقل للشاشة التالية
            if (elements.onlineWaitingScreen.classList.contains('hidden') === false) {
                 setTimeout(() => startGameAfterCategory(), 500);
            }
        }

        // 2. تحديث الأسرار (Secrets)
        if (data.p1Secret) player1Secret = data.p1Secret;
        if (data.p2Secret) player2Secret = data.p2Secret;

        // التحقق من اكتمال الإعداد للبدء
        if (player1Secret && player2Secret && !gameActive && elements.player2SetupScreen.classList.contains('hidden')) {
             // إذا كنا في شاشات الانتظار، ابدأ اللعبة
             startGameScreen();
        } else if (player1Secret && myPlayerNumber === 2 && !player2Secret && elements.waitingOpponentScreen.classList.contains('hidden') === false) {
             // اللاعب 1 وضع سره، الآن دور اللاعب 2 (يجب أن ينتقل اللاعب 2 لشاشة الإعداد)
             // تم التعامل مع هذا في منطق setSecret
        }

        // 3. معالجة الأحداث (Questions/Answers)
        if (data.lastAction && data.lastAction.timestamp > lastProcessedTimestamp) {
            handleIncomingAction(data.lastAction);
            lastProcessedTimestamp = data.lastAction.timestamp;
        }
    });
}

function handleIncomingAction(action) {
    const textMap = TEXTS[currentLang];
    
    // تجاهل الأحداث القديمة أو التي أرسلتها أنا (إلا إذا كانت تحديثاً للواجهة)
    
    // --- حالة استقبال سؤال ---
    if (action.type === 'question') {
        if (action.sender !== myPlayerNumber) {
            // الخصم يسأل -> أظهر نافذة الإجابة
            showAnswerModalUI(action.content);
        } else {
            // أنا سألت -> أظهر في السجل أنني أنتظر
            addFeedback(`<strong>${textMap.youAsked}</strong> ${action.content} <br> <span style="font-size:0.8em; color:#ccc;">${textMap.waitingAnswer}</span>`, 'question-attempt');
        }
    }
    
    // --- حالة استقبال إجابة ---
    else if (action.type === 'answer') {
        const qaText = action.content; // "Question | Answer" stored or just answer? 
        // لتبسيط الأمر، سنفترض أننا نعرف السؤال الأخير محلياً أو نرسله
        // الأفضل: sendAction('answer', {q: question, a: answer})
        
        if (action.sender !== myPlayerNumber) {
            // الخصم أجاب على سؤالي
            addFeedback(`<strong>${textMap.opponentAnswered}</strong> ${action.content}`, 'question-attempt');
            isMyTurn = true; // عاد الدور لي (أو للخصم؟ حسب القواعد. عادة السؤال ينقل الدور)
            // *تصحيح*: في Guess Who، السائل يستمر إذا نعم؟ أم يتبدل؟
            // في الكود الأصلي: يتبدل الدور دائماً
            isMyTurn = true; // عاد الدور لي لأني سألت وهو أجاب؟ لا، الدور يتبدل
            // انتظر، إذا هو أجاب، يعني أنا كنت أسأل. إذاً انتهى دوري.
            // لكن إذا هو (المرسل للإجابة) يعني هو من سُئل.
            // Sender of Answer = The one who was asked.
            // So turn goes back to the Asker? Or allows Asker to continue?
            // سنلتزم بالكود الأصلي: تبديل الدور بعد كل سؤال.
            isMyTurn = true; 
        } else {
            // أنا أجبت -> يذهب الدور للخصم
            isMyTurn = false;
             addFeedback(`<strong>${textMap.youAsked}</strong> ... <strong>${textMap.opponentAnswered}</strong> ${action.content}`, 'question-attempt');
        }
        
        // تبديل الدور منطقياً (بناء على عدد الأدوار إذا أردنا دقة، لكن هنا بسيط)
        // إذا استقبلت إجابة (من الخصم)، يعني دوري انتهى سابقاً والآن يبدأ دوري الجديد؟
        // لا، اللاعب 1 يسأل -> اللاعب 2 يجيب -> دور اللاعب 2.
        if (action.sender !== myPlayerNumber) {
             // الخصم أجاب (اللاعب 2)، يعني الآن دور اللاعب 2 ليسأل
             isMyTurn = false; 
        } else {
             // أنا أجبت (اللاعب 2)، يعني الآن دوري لأسأل
             isMyTurn = true;
        }
        
        // *تعديل بسيط*: لنتجاهل التعقيد ونعتمد على:
        // السائل يرسل Question -> المجيب يرسل Answer -> الدور ينتقل للمجيب ليصبح سائلاً.
        if (action.sender === myPlayerNumber) {
            isMyTurn = true; // أنا أجبت، الآن دوري
        } else {
            isMyTurn = false; // هو أجاب، الآن دوره
        }
        updateGameStatus();
    }
    
    // --- حالة استقبال تخمين ---
    else if (action.type === 'guess') {
        if (action.sender !== myPlayerNumber) {
            addFeedback(`${textMap.opponentAnswered} تخمين: ${action.content}`, 'guess-attempt');
            // التحقق من الفوز يتم عبر المرسل، أو نرسل حدث End
        }
    }
    
    // --- حالة الفوز ---
    else if (action.type === 'end') {
        endGame(action.content.winner === myPlayerNumber, action.content.secret);
    }
}

function showAnswerModalUI(questionText) {
    const modal = document.getElementById('answer-modal');
    const qText = document.getElementById('modal-question-text');
    const btnYes = document.getElementById('btn-yes');
    const btnNo = document.getElementById('btn-no');
    const textMap = TEXTS[currentLang];

    qText.textContent = `${textMap.incomingQuestion} "${questionText}"`;
    btnYes.textContent = textMap.yes;
    btnNo.textContent = textMap.no;
    
    modal.style.display = 'flex';

    // تنظيف المستمعين القدامى
    const newYes = btnYes.cloneNode(true);
    const newNo = btnNo.cloneNode(true);
    btnYes.parentNode.replaceChild(newYes, btnYes);
    btnNo.parentNode.replaceChild(newNo, btnNo);

    newYes.addEventListener('click', () => submitAnswer(textMap.yes));
    newNo.addEventListener('click', () => submitAnswer(textMap.no));
}

function submitAnswer(answer) {
    document.getElementById('answer-modal').style.display = 'none';
    // إرسال الإجابة
    sendAction('answer', answer);
}


// ====== 6. Game Flow Functions ======

function updateUI() {
    const textMap = TEXTS[currentLang];
    elements.body.dir = (currentLang === 'العربية') ? 'rtl' : 'ltr';
    elements.langToggle.textContent = textMap.langToggle;
    elements.title.textContent = textMap.title;
    renderCategoryButtons();
}

function renderCategoryButtons() {
    const categories = GAME_DATA.categories[currentLang];
    elements.categoryButtonsContainer.innerHTML = '';
    for (const catName in categories) {
        const button = document.createElement('div');
        button.className = 'neon-button category-button';
        button.textContent = catName;
        button.dataset.category = catName;
        button.addEventListener('click', () => {
            document.querySelectorAll('.category-button').forEach(b => b.classList.remove('selected'));
            button.classList.add('selected');
            selectedCategory = catName;
        });
        elements.categoryButtonsContainer.appendChild(button);
    }
}

function hideAllScreens() {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => s.classList.add('hidden'));
}

// بدء اللعبة المحلية
function startLocalGame() {
    gameMode = 'local';
    myPlayerNumber = 1;
    hideAllScreens();
    elements.categorySelectionScreen.classList.remove('hidden');
}

// الانتقال بعد اختيار الفئة
function startGameAfterCategory() {
    if (!selectedCategory && gameMode === 'local') return alert("Please select a category");
    
    hideAllScreens();
    
    if (gameMode === 'local') {
        elements.player1SetupScreen.classList.remove('hidden');
    } else {
        // Online: Player 1 sets secret, Player 2 waits
        if (myPlayerNumber === 1) {
            elements.player1SetupScreen.classList.remove('hidden');
        } else {
            elements.waitingOpponentScreen.classList.remove('hidden');
            elements.waitingMessage.textContent = TEXTS[currentLang].waitingOpponentSetup;
        }
    }
}

// إعداد السر للاعب 1
async function player1SetSecret() {
    const secret = elements.player1SecretInput.value.trim();
    if (!secret) return;
    
    player1Secret = secret;
    elements.player1SecretInput.value = '';

    if (gameMode === 'local') {
        hideAllScreens();
        elements.player2SetupScreen.classList.remove('hidden');
    } else {
        // Online: Save to DB
        const gameRef = dbRef(database, `games/${gameId}`);
        await dbUpdate(gameRef, { p1Secret: secret });
        
        hideAllScreens();
        elements.waitingOpponentScreen.classList.remove('hidden');
        elements.waitingMessage.textContent = TEXTS[currentLang].waitingOpponent;
    }
}

// إعداد السر للاعب 2
async function player2SetSecret() {
    const secret = elements.player2SecretInput.value.trim();
    if (!secret) return;
    
    player2Secret = secret;
    elements.player2SecretInput.value = '';

    if (gameMode === 'local') {
        startGameScreen();
    } else {
        const gameRef = dbRef(database, `games/${gameId}`);
        await dbUpdate(gameRef, { p2Secret: secret });
        // اللعبة ستبدأ تلقائياً عبر المستمع (Listener)
        startGameScreen();
    }
}

function startGameScreen() {
    hideAllScreens();
    elements.gameScreen.classList.remove('hidden');
    gameActive = true;
    updateGameStatus();
}

function updateGameStatus() {
    const textMap = TEXTS[currentLang];
    
    if (gameMode === 'local') {
        elements.currentPlayer.textContent = textMap.playerName(currentPlayerTurn);
        elements.playerStatus.textContent = textMap.currentTurn;
    } else {
        // Online
        elements.currentPlayer.textContent = isMyTurn ? textMap.currentTurn : textMap.waitingOpponent;
        elements.playerStatus.style.color = isMyTurn ? '#e94560' : '#888';
        
        // تعطيل الإدخال إذا لم يكن دورك
        elements.questionInput.disabled = !isMyTurn;
        elements.askButton.disabled = !isMyTurn;
        elements.guessInput.disabled = !isMyTurn;
        elements.guessButton.disabled = !isMyTurn;
    }
    
    elements.questionInput.value = '';
    elements.guessInput.value = '';
}

function handleQuestion() {
    if (!gameActive) return;
    if (gameMode === 'online' && !isMyTurn) return;

    const question = elements.questionInput.value.trim();
    if (!question) return;

    // Check duplicate locally
    if (askedQuestions.includes(question.toLowerCase())) {
        elements.duplicateWarning.style.display = 'block';
        setTimeout(() => elements.duplicateWarning.style.display = 'none', 2000);
        return;
    }
    askedQuestions.push(question.toLowerCase());

    if (gameMode === 'local') {
        const answer = prompt(`${TEXTS[currentLang].answerQuestion}\n"${question}"`);
        if (answer) {
            addFeedback(`Q: ${question} <br> A: ${answer}`, 'question-attempt');
            currentPlayerTurn = currentPlayerTurn === 1 ? 2 : 1;
            updateGameStatus();
        }
    } else {
        // Online: Send Question Event
        sendAction('question', question);
        isMyTurn = false; // انتظر الإجابة
        updateGameStatus();
    }
}

function handleGuess() {
    if (!gameActive) return;
    if (gameMode === 'online' && !isMyTurn) return;

    const guess = elements.guessInput.value.trim();
    if (!guess) return;

    let targetSecret = '';
    if (gameMode === 'local') {
        targetSecret = currentPlayerTurn === 1 ? player2Secret : player1Secret;
    } else {
        targetSecret = myPlayerNumber === 1 ? player2Secret : player1Secret;
    }

    if (guess.toLowerCase() === targetSecret.toLowerCase()) {
        if (gameMode === 'local') {
            endGame(true, targetSecret);
        } else {
            // Online Win
            sendAction('end', { winner: myPlayerNumber, secret: targetSecret });
        }
    } else {
        // Wrong Guess
        const textMap = TEXTS[currentLang];
        if (gameMode === 'local') {
            addFeedback(`${textMap.wrongGuess}: ${guess}`, 'guess-attempt');
            currentPlayerTurn = currentPlayerTurn === 1 ? 2 : 1;
            updateGameStatus();
        } else {
            sendAction('guess', guess);
            isMyTurn = false; 
            updateGameStatus();
        }
    }
}

function addFeedback(html, type) {
    const div = document.createElement('div');
    div.className = `feedback-item ${type}`;
    div.innerHTML = html;
    elements.feedbackArea.prepend(div);
}

function endGame(isWin, secret) {
    gameActive = false;
    hideAllScreens();
    elements.resultScreen.classList.remove('hidden');
    const textMap = TEXTS[currentLang];
    
    if (isWin) {
        elements.resultHeader.textContent = textMap.winHeader;
        elements.resultMessage.textContent = textMap.winMessage;
    } else {
        elements.resultHeader.textContent = "Game Over"; // Or specific lose text
    }
    elements.resultDetails.textContent = `${textMap.guessingPlayer} ${secret}`;
}

function restartGame() {
    location.reload(); // أسهل طريقة لإعادة تعيين كل شيء
}

// ====== Events ======
elements.langToggle.addEventListener('click', () => {
    currentLang = currentLang === 'العربية' ? 'English' : 'العربية';
    updateUI();
});

elements.localGameButton.addEventListener('click', startLocalGame);
elements.onlineGameButton.addEventListener('click', async () => {
    gameMode = 'online';
    hideAllScreens();
    elements.onlineWaitingScreen.classList.remove('hidden');
    await createOnlineGame();
});

elements.joinGameButton.addEventListener('click', () => joinGame(elements.opponentCodeInput.value));
elements.startPVPButton.addEventListener('click', startGameAfterCategory);
elements.player1ConfirmButton.addEventListener('click', player1SetSecret);
elements.player2ConfirmButton.addEventListener('click', player2SetSecret);
elements.askButton.addEventListener('click', handleQuestion);
elements.guessButton.addEventListener('click', handleGuess);
elements.restartButton.addEventListener('click', restartGame);
elements.copyCodeButton.addEventListener('click', () => {
    navigator.clipboard.writeText(elements.gameCodeDisplay.textContent);
    alert("Copied!");
});

// Init
updateUI();
