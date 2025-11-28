// ====== 0. Firebase Modular imports (for browser modules) ======
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

// ====== 2. الترجمات (Text Mapping) ======
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
        waitingOpponentSetup: "ينتظر الخصم لإدخال عنصره السري"
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
        waitingOpponentSetup: "Waiting for opponent to enter secret item"
    }
};

// ====== 3. حالة اللعبة الشاملة ======
let currentLang = 'العربية';
let gameMode = null; // 'local' أو 'online'
let selectedCategory = '';
let player1Secret = '';
let player2Secret = '';
let currentPlayerTurn = 1;
let gameActive = false;
let isMyTurn = true;
let myPlayerNumber = 1;
let gameId = null;
let askedQuestions = []; // قائمة الأسئلة المسؤول عنها
let opponentAskedQuestions = []; // قائمة أسئلة الخصم

// ====== 4.5. Firebase helpers: generate game code + create game in DB ======
function generateGameCode() {
    // 6-character alphanumeric uppercase code
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function createOnlineGame() {
    try {
        const gameCode = generateGameCode();
        const gameRef = dbRef(database, `games/${gameCode}`);

        // Initialize room with players object (empty initially)
        await dbSet(gameRef, {
            players: {},           // Important: initialize as empty object, not array
            questions: [],
            createdAt: Date.now()
        });

        // Update UI elements: input and big display
        const codeInput = document.getElementById('gameCodeInput');
        const bigDisplay = document.getElementById('game-code');
        if (codeInput) codeInput.value = gameCode;
        if (bigDisplay) bigDisplay.textContent = gameCode;

        // Remember current game id locally
        gameId = gameCode;
        myPlayerNumber = 1;  // Creator is player 1

        // Start real-time listener for 2nd player joining
        listenToGameChanges(gameCode);

        return gameCode;
    } catch (err) {
        console.error('Error creating online game:', err);
        throw err;
    }
}

// ====== 3.5. Firebase join game function ======
async function joinGame(opponentCode) {
    try {
        const code = opponentCode.trim().toUpperCase();
        if (!code) {
            alert(TEXTS[currentLang].enterOpponentCode || "Please enter opponent's game code");
            return;
        }

        const gameRef = dbRef(database, `games/${code}`);
        const snapshot = await dbGet(gameRef);

        if (!snapshot.exists()) {
            alert(currentLang === 'العربية' ? "رمز اللعبة غير صحيح!" : "Invalid game code!");
            return;
        }

        const gameData = snapshot.val();
        const players = gameData.players || {};
        const playerCount = Object.keys(players).length;

        // Only allow 2 players max
        if (playerCount >= 2) {
            alert(currentLang === 'العربية' ? "العبة ممتلئة بالفعل!" : "Game is full!");
            return;
        }

        // Prepare new player entry (compute but do not overwrite globals yet)
        const newPlayerNumber = playerCount + 1;  // 1 or 2
        const playerId = `player${Date.now()}`;
        players[playerId] = {
            playerNumber: newPlayerNumber,
            joinedAt: Date.now()
        };

        // 🛑 MUST await update so host sees the new player immediately
        await dbUpdate(gameRef, { players });

        // Set local state after DB update
        gameId = code;
        myPlayerNumber = newPlayerNumber;
        elements.opponentCodeInput.value = '';

        // Start real-time listener AFTER the DB update so it catches the change immediately
        listenToGameChanges(code);

        // Show waiting lobby; listener will move the UI forward when appropriate
        hideAllScreens();
        elements.onlineWaitingScreen.classList.remove('hidden');

        if (elements.gameCodeDisplay) elements.gameCodeDisplay.textContent = code;
        if (elements.copyCodeButton) elements.copyCodeButton.style.display = 'none';

        const headerEl = document.getElementById('online-waiting-header') || elements.onlineWaitingScreen.querySelector('h2');
        if (headerEl) headerEl.textContent = (currentLang === 'العربية') ? "في انتظار تزامن اللعبة..." : "Waiting for game sync...";

        return code;
    } catch (err) {
        console.error('Error joining game:', err);
        alert(currentLang === 'العربية' ? "حدث خطأ أثناء الانضمام للعبة" : "Error joining game");
    }
}

// ====== 3.6. Firebase real-time listener for game changes ======
let gameListener = null;  // Store listener reference for cleanup
let lastProcessedTimestamp = 0;

function listenToGameChanges(code) {
    const gameRef = dbRef(database, `games/${code}`);

    // Remove old listener if exists
    if (gameListener) gameListener();

    // Set up real-time listener
    gameListener = dbOnValue(gameRef, async (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        const players = data.players || {};
        const playerCount = Object.keys(players).length;

        // Debug
        console.log(`🎮 Game ${code}: ${playerCount} player(s) connected`);

        // 1. Move from waiting lobby to category selection when 2 players connected
        if (playerCount >= 2 && !data.selectedCategory && gameMode === 'online') {
            // If client still on waiting screen or still on main menu, show category selection
            if (!elements.onlineWaitingScreen.classList.contains('hidden') || !elements.mainMenuScreen.classList.contains('hidden')) {
                hideAllScreens();
                elements.categorySelectionScreen.classList.remove('hidden');
            }

            // Lock or unlock the category UI depending on host/guest
            if (myPlayerNumber === 2) {
                elements.catHeader.textContent = TEXTS[currentLang].catHeader + " - " + (currentLang === 'العربية' ? "انتظر المضيف" : "Waiting for Host");
                elements.categoryButtonsContainer.style.pointerEvents = "none";
                elements.categoryButtonsContainer.style.opacity = "0.5";
                elements.startPVPButton.style.display = "none";
            } else if (myPlayerNumber === 1) {
                elements.catHeader.textContent = TEXTS[currentLang].catHeader;
                elements.categoryButtonsContainer.style.pointerEvents = "auto";
                elements.categoryButtonsContainer.style.opacity = "1";
                elements.startPVPButton.style.display = "block";
            }
        }

        // 2. Sync selected category from host to clients
        if (data.selectedCategory && data.selectedCategory !== selectedCategory) {
            selectedCategory = data.selectedCategory;
            // update UI to reflect selected category
            selectCategory(selectedCategory);

            // If you're player 2 and p1Secret is not yet set, move to player2 secret entry
            if (myPlayerNumber === 2 && !data.p1Secret) {
                hideAllScreens();
                elements.player2SetupScreen.classList.remove('hidden');
            }
        }

        // 3. Sync secrets
        player1Secret = data.p1Secret || '';
        player2Secret = data.p2Secret || '';

        // 4. Start the game when both secrets are present and game not active
        if (player1Secret && player2Secret && !gameActive) {
            // Stop listening to avoid duplicate triggers; gameplay may re-subscribe later if needed
            // but keep listener until restart to allow in-game sync improvements later
            startGameScreen();
        }

        // 5. Place to add further turn/answers synchronization later
        // 5.1 Synchronize turn (authoritative source from Firebase)
        // This ensures each player knows if it's their turn
        if (data.currentTurn !== undefined && data.currentTurn !== null) {
            const turnFromDB = data.currentTurn;
            if (gameMode === 'online') {
                const newIsMyTurn = (myPlayerNumber === turnFromDB);
                // Only update if turn state changed to avoid unnecessary re-renders
                if (newIsMyTurn !== isMyTurn) {
                    isMyTurn = newIsMyTurn;
                    updateGameStatus();
                }
            }
        }

        // 5.2 If it's my turn and there's a pending lastQuestion from opponent, prompt and answer
        // 🛡️ Guard: Only responder (whose turn it is) should answer question from opponent
        if (gameMode === 'online' && isMyTurn && data.lastQuestion && data.lastQuestion.player !== myPlayerNumber) {
            const lastQ = data.lastQuestion;

            // Prevent double answers by checking if we've already answered THIS question
            const lastLocalAnsweredQ = opponentAskedQuestions[opponentAskedQuestions.length - 1];
            if (lastLocalAnsweredQ === lastQ.question) {
                // already answered locally — do NOT prompt again
            } else {
                const textMap = TEXTS[currentLang];
                const answer = prompt(`${textMap.answerQuestion} (للرد على الخصم)\n"${lastQ.question}"`);

                if (answer !== null) {
                    try {
                        const gameRef = dbRef(database, `games/${code}`);
                        const existingQuestions = Array.isArray(data.questions) ? data.questions : [];

                        const newQuestionEntry = {
                            player: lastQ.player,
                            question: lastQ.question,
                            answer: answer,
                            timestamp: lastQ.timestamp || Date.now()
                        };

                        const updatedQuestions = existingQuestions.concat(newQuestionEntry);

                        // Next turn goes back to the original asker
                        const nextTurn = lastQ.player;

                        await dbUpdate(gameRef, {
                            questions: updatedQuestions,
                            currentTurn: nextTurn,
                            lastQuestion: null
                        });

                        // Local UI updates for responder
                        addFeedback(`<strong>Q:</strong> ${lastQ.question}<br><strong>A:</strong> ${answer} (ردي)`, 'question-response');
                        if (!opponentAskedQuestions.includes(lastQ.question)) opponentAskedQuestions.push(lastQ.question);
                        
                        // 💡 CRITICAL: Set responder's isMyTurn to false IMMEDIATELY after answering
                        // This prevents further prompts and ensures clean turn handoff to questioner
                        isMyTurn = false;
                        updateAskedQuestionsDisplay();
                    } catch (err) {
                        console.error('Error syncing answer/turn:', err);
                    }
                }
            }
        }

        // 5.3 Use data.questions as the authoritative history of completed Q/A pairs
        if (Array.isArray(data.questions)) {
            const allLocalQuestions = [...askedQuestions, ...opponentAskedQuestions];
            const newQuestions = data.questions.filter(q => !allLocalQuestions.includes(q.question));

            if (newQuestions.length > 0) {
                newQuestions.forEach(q => {
                    if (q.player === myPlayerNumber) {
                        // My previous question has been answered by opponent
                        addFeedback(`<strong>Q:</strong> ${q.question}<br><strong>A:</strong> ${q.answer} (رد الخصم)`, 'opponent-question');
                        if (!askedQuestions.includes(q.question)) askedQuestions.push(q.question);
                    } else {
                        // A question I answered (should already have been handled), but ensure it's tracked
                        if (!opponentAskedQuestions.includes(q.question)) opponentAskedQuestions.push(q.question);
                    }
                });
                updateAskedQuestionsDisplay();
            }
        }

        // 6. Sync end-of-game and winner (if set by other player)
        if (data.status === 'ended' && data.winner && gameActive) {
            if (data.winner !== myPlayerNumber) {
                // Opponent won — show result
                gameActive = false;
                hideAllScreens();
                elements.resultScreen.classList.remove('hidden');

                const textMap = TEXTS[currentLang];
                elements.resultHeader.textContent = textMap.winHeader;
                elements.resultMessage.textContent = `${textMap.playerName(data.winner)} ${textMap.winMessage}`;

                const loserSecret = myPlayerNumber === 1 ? player1Secret : player2Secret;
                elements.resultDetails.textContent = `${textMap.guessingPlayer} ${loserSecret}`;
            }
        }
    }, (error) => {
        console.error('Listener error:', error);
    });
}

// ====== 3.7. Cleanup listener on game end ======
function stopGameListener() {
    if (gameListener) {
        gameListener();
        gameListener = null;
        console.log('🎮 Game listener stopped');
    }
}

// ====== 4. العناصر الأساسية (DOM Elements) ======
const elements = {
    body: document.body,
    langToggle: document.getElementById('lang-toggle'),
    title: document.getElementById('title'),
    
    // Main Menu
    mainMenuScreen: document.getElementById('main-menu-screen'),
    localGameButton: document.getElementById('local-game-button'),
    onlineGameButton: document.getElementById('online-game-button'),
    
    // Category Selection
    categorySelectionScreen: document.getElementById('category-selection'),
    catHeader: document.getElementById('cat-header'),
    categoryButtonsContainer: document.getElementById('category-buttons'),
    startPVPButton: document.getElementById('start-pvp-button'),
    backToMenuButton: document.getElementById('back-to-menu-button'),
    
    // Online Waiting
    onlineWaitingScreen: document.getElementById('online-waiting-screen'),
    gameCodeDisplay: document.getElementById('game-code'),
    copyCodeButton: document.getElementById('copy-code-button'),
    opponentCodeInput: document.getElementById('opponent-code-input'),
    joinGameButton: document.getElementById('join-game-button'),
    cancelOnlineButton: document.getElementById('cancel-online-button'),
    
    // Player Setup
    player1SetupScreen: document.getElementById('player1-setup-screen'),
    p1Header: document.getElementById('p1-header'),
    p1Instruction: document.getElementById('p1-instruction'),
    player1SecretInput: document.getElementById('player1-secret-input'),
    player1ConfirmButton: document.getElementById('player1-confirm-button'),
    
    player2SetupScreen: document.getElementById('player2-setup-screen'),
    p2Header: document.getElementById('p2-header'),
    p2Instruction: document.getElementById('p2-instruction'),
    player2SecretInput: document.getElementById('player2-secret-input'),
    player2ConfirmButton: document.getElementById('player2-confirm-button'),
    
    // Game Screen
    gameScreen: document.getElementById('game-screen'),
    gameHeader: document.getElementById('game-header'),
    currentPlayer: document.getElementById('current-player'),
    playerStatus: document.getElementById('player-status'),
    instructionText: document.getElementById('instruction-text'),
    questionInput: document.getElementById('question-input'),
    askButton: document.getElementById('ask-button'),
    guessInput: document.getElementById('guess-input'),
    guessButton: document.getElementById('guess-button'),
    feedbackArea: document.getElementById('feedback-area'),
    duplicateWarning: document.getElementById('duplicate-warning'),
    askedQuestionsWarning: document.getElementById('asked-questions-warning'),
    
    // Result Screen
    resultScreen: document.getElementById('result-screen'),
    resultHeader: document.getElementById('result-header'),
    resultMessage: document.getElementById('result-message'),
    resultDetails: document.getElementById('result-details'),
    restartButton: document.getElementById('restart-button'),
    
    // Waiting for Opponent
    waitingOpponentScreen: document.getElementById('waiting-opponent-screen'),
    waitingMessage: document.getElementById('waiting-message')
};

// ====== 5. الوظائف الأساسية ======

function updateUI() {
    const textMap = TEXTS[currentLang];
    elements.body.dir = (currentLang === 'العربية') ? 'rtl' : 'ltr';
    
    elements.langToggle.textContent = textMap.langToggle;
    elements.title.textContent = textMap.title;
    
    renderCategoryButtons();
}

function hideAllScreens() {
    elements.mainMenuScreen.classList.add('hidden');
    elements.categorySelectionScreen.classList.add('hidden');
    elements.onlineWaitingScreen.classList.add('hidden');
    elements.player1SetupScreen.classList.add('hidden');
    elements.player2SetupScreen.classList.add('hidden');
    elements.gameScreen.classList.add('hidden');
    elements.resultScreen.classList.add('hidden');
    elements.waitingOpponentScreen.classList.add('hidden');
}

function renderCategoryButtons() {
    const categories = GAME_DATA.categories[currentLang];
    elements.categoryButtonsContainer.innerHTML = '';

    for (const catName in categories) {
        const button = document.createElement('div');
        button.className = 'neon-button category-button';
        button.textContent = catName;
        button.dataset.category = catName;
        
        if (catName === selectedCategory) {
            button.classList.add('selected');
        }

        button.addEventListener('click', () => selectCategory(catName));
        elements.categoryButtonsContainer.appendChild(button);
    }
}

function selectCategory(catName) {
    selectedCategory = catName;
    const buttons = elements.categoryButtonsContainer.querySelectorAll('.category-button');
    buttons.forEach(btn => {
        btn.classList.remove('selected');
        if (btn.dataset.category === catName) {
            btn.classList.add('selected');
        }
    });
}

function toggleLanguage() {
    currentLang = (currentLang === 'العربية') ? 'English' : 'العربية';
    updateUI();
}

// ====== 6. وظائف اللعبة المحلية ======

function startLocalGame() {
    gameMode = 'local';
    myPlayerNumber = 1;
    hideAllScreens();
    elements.categorySelectionScreen.classList.remove('hidden');
}

function startGameAfterCategory() {
    if (!selectedCategory) {
        alert(currentLang === 'العربية' ? "الرجاء اختيار فئة أولاً!" : "Please select a category first!");
        return;
    }
    // Local mode: direct transition
    if (gameMode === 'local') {
        hideAllScreens();
        elements.player1SetupScreen.classList.remove('hidden');
        return;
    }

    // Online mode: only host (player 1) writes the selected category to Firebase
    if (gameMode === 'online') {
        if (myPlayerNumber === 1) {
            if (!gameId) {
                console.error('No gameId set for online game');
                return;
            }
            const gameRef = dbRef(database, `games/${gameId}`);
            // set selectedCategory and reset secrets to ensure a clean start
            dbUpdate(gameRef, { selectedCategory: selectedCategory, p1Secret: null, p2Secret: null })
                .then(() => {
                    hideAllScreens();
                    elements.player1SetupScreen.classList.remove('hidden');
                })
                .catch(err => console.error('Error setting category:', err));
        }
        // Player 2 will be navigated by the realtime listener when `selectedCategory` appears in DB
    }
}

function player1SetSecret() {
    const secret = elements.player1SecretInput.value.trim();
    if (!secret) {
        alert(currentLang === 'العربية' ? "الرجاء إدخال العنصر أولاً!" : "Please enter an item first!");
        return;
    }
    
    player1Secret = secret;
    elements.player1SecretInput.value = '';

    if (gameMode === 'online') {
        if (!gameId) {
            console.error('No gameId set when submitting p1Secret');
            return;
        }
        const gameRef = dbRef(database, `games/${gameId}`);
        // send p1Secret to Firebase and wait for player 2
        dbUpdate(gameRef, { p1Secret: secret })
            .then(() => {
                hideAllScreens();
                elements.waitingOpponentScreen.classList.remove('hidden');
                elements.waitingMessage.textContent = TEXTS[currentLang].waitingOpponentSetup;
            })
            .catch(err => console.error('Error sending p1Secret:', err));
    } else {
        // local flow
        hideAllScreens();
        elements.player2SetupScreen.classList.remove('hidden');
    }
}

function player2SetSecret() {
    const secret = elements.player2SecretInput.value.trim();
    if (!secret) {
        alert(currentLang === 'العربية' ? "الرجاء إدخال العنصر أولاً!" : "Please enter an item first!");
        return;
    }
    
    player2Secret = secret;
    elements.player2SecretInput.value = '';

    if (gameMode === 'online') {
        if (!gameId) {
            console.error('No gameId set when submitting p2Secret');
            return;
        }
        const gameRef = dbRef(database, `games/${gameId}`);
        dbUpdate(gameRef, { p2Secret: secret })
            .catch(err => console.error('Error sending p2Secret:', err));
        // Do not navigate here; listener will start the game when both secrets are present
    } else {
        // local flow
        startGameScreen();
    }
}

function startGameScreen() {
    hideAllScreens();
    elements.gameScreen.classList.remove('hidden');
    gameActive = true;
    currentPlayerTurn = 1;
    askedQuestions = [];
    opponentAskedQuestions = [];
    updateGameStatus();
}

function updateGameStatus() {
    const textMap = TEXTS[currentLang];
    const playerNum = currentPlayerTurn;
    
    if (gameMode === 'local') {
        elements.currentPlayer.textContent = `${textMap.playerName(playerNum)}`;
        if (currentPlayerTurn === 1) {
            elements.playerStatus.textContent = `${textMap.currentTurn}`;
        } else {
            elements.playerStatus.textContent = `${textMap.currentTurn}`;
        }
    } else if (gameMode === 'online') {
        if (isMyTurn) {
            elements.currentPlayer.textContent = textMap.currentTurn;
            elements.playerStatus.textContent = `${textMap.currentTurn}`;
        } else {
            elements.currentPlayer.textContent = textMap.waitingOpponent;
            elements.playerStatus.textContent = textMap.waitingOpponent;
        }
    }
    
    updateAskedQuestionsDisplay();
    elements.questionInput.value = '';
    elements.guessInput.value = '';
}

function updateAskedQuestionsDisplay() {
    const textMap = TEXTS[currentLang];
    if (askedQuestions.length > 0) {
        elements.askedQuestionsWarning.textContent = `${textMap.alreadyAsked} ${askedQuestions.join(', ')}`;
        elements.askedQuestionsWarning.style.display = 'block';
    } else {
        elements.askedQuestionsWarning.style.display = 'none';
    }
}

function addFeedback(message, type = 'default') {
    const div = document.createElement('div');
    div.className = `feedback-item ${type}`;
    div.innerHTML = message;
    elements.feedbackArea.prepend(div);
}

async function handleQuestion() {
    if (!gameActive || !isMyTurn) return;

    const question = elements.questionInput.value.trim().toLowerCase();
    if (!question) return;

    const textMap = TEXTS[currentLang];

    // ✅ التحقق من تكرار السؤال
    if (askedQuestions.some(q => q.toLowerCase() === question)) {
        elements.duplicateWarning.textContent = textMap.duplicateQuestion;
        elements.duplicateWarning.style.display = 'block';
        setTimeout(() => {
            elements.duplicateWarning.style.display = 'none';
        }, 3000);
        return;
    }

    // إضافة السؤال للقائمة (محلياً)
    if (!askedQuestions.includes(question)) askedQuestions.push(question);
    elements.duplicateWarning.style.display = 'none';

    // الحصول على إجابة
    const answer = prompt(`${textMap.answerQuestion}\n"${question}"`);

    if (answer === null) return;

    addFeedback(`<strong>Q:</strong> ${question}<br><strong>A:</strong> ${answer}`, 'question-attempt');

    // 🛑 التزامن: عند اللعب أونلاين نرسل السؤال إلى الخصم (lastQuestion) ونعين الدور التالي في Firebase
    if (gameMode === 'online' && gameId) {
        try {
            const gameRef = dbRef(database, `games/${gameId}`);

            // For online: publish lastQuestion so the responder gets prompted,
            // and hand the turn to the opponent.
            const nextTurn = myPlayerNumber === 1 ? 2 : 1;

            await dbUpdate(gameRef, {
                lastQuestion: {
                    player: myPlayerNumber,
                    question: question,
                    timestamp: Date.now()
                },
                currentTurn: nextTurn
            });

            // Locally switch turn state
            isMyTurn = false;
            addFeedback(`<strong>Q:</strong> ${question} (في انتظار الرد...)`, 'question-attempt');
        } catch (err) {
            console.error('Error syncing question/turn:', err);
        }
    } else if (gameMode === 'local') {
        currentPlayerTurn = currentPlayerTurn === 1 ? 2 : 1;
    }

    updateGameStatus();
    elements.questionInput.value = '';
}

function handleGuess() {
    if (!gameActive || !isMyTurn) return;
    
    const guess = elements.guessInput.value.trim();
    if (!guess) return;
    
    const textMap = TEXTS[currentLang];
    let targetSecret = '';
    
    if (gameMode === 'local') {
        targetSecret = currentPlayerTurn === 1 ? player2Secret : player1Secret;
    } else if (gameMode === 'online') {
        targetSecret = myPlayerNumber === 1 ? player2Secret : player1Secret;
    }
    
    if (guess.toLowerCase() === targetSecret.toLowerCase()) {
        // Correct guess
        if (gameMode === 'online' && gameId) {
            // Publish winner to Firebase
            dbUpdate(dbRef(database, `games/${gameId}`), {
                winner: myPlayerNumber,
                status: 'ended'
            }).catch(err => console.error('Error setting winner:', err));
        }
        endGame(true);
    } else {
        addFeedback(`<strong>❌ ${textMap.wrongGuess}:</strong> "${guess}"`, 'guess-attempt');
        
        if (gameMode === 'local') {
            currentPlayerTurn = currentPlayerTurn === 1 ? 2 : 1;
        } else if (gameMode === 'online') {
            // Wrong guess: hand turn to opponent and persist it
            isMyTurn = false;
            if (gameId) {
                const nextTurn = myPlayerNumber === 1 ? 2 : 1;
                dbUpdate(dbRef(database, `games/${gameId}`), {
                    currentTurn: nextTurn
                }).catch(err => console.error('Error switching turn after wrong guess:', err));
            }
        }
        
        updateGameStatus();
        elements.guessInput.value = '';
    }
}

function endGame(isWin) {
    gameActive = false;
    hideAllScreens();
    elements.resultScreen.classList.remove('hidden');
    
    const textMap = TEXTS[currentLang];
    let winner, winnerSecret;
    
    if (gameMode === 'local') {
        winner = currentPlayerTurn;
        winnerSecret = currentPlayerTurn === 1 ? player1Secret : player2Secret;
    } else if (gameMode === 'online') {
        winner = myPlayerNumber;
        winnerSecret = myPlayerNumber === 1 ? player1Secret : player2Secret;
    }
    
    elements.resultHeader.textContent = textMap.winHeader;
    elements.resultMessage.textContent = `${textMap.playerName(winner)} ${textMap.winMessage}`;
    elements.resultDetails.textContent = `${textMap.guessingPlayer} ${winnerSecret}`;
}

function restartGame() {
    player1Secret = '';
    player2Secret = '';
    selectedCategory = '';
    currentPlayerTurn = 1;
    gameActive = false;
    askedQuestions = [];
    opponentAskedQuestions = [];
    
    // Stop listener before leaving
    stopGameListener();
    
    if (gameMode === 'local') {
        hideAllScreens();
        elements.mainMenuScreen.classList.remove('hidden');
        gameMode = null;
    } else if (gameMode === 'online') {
        hideAllScreens();
        elements.mainMenuScreen.classList.remove('hidden');
        gameMode = null;
    }
}

// ====== 7. ربط الأحداث (Event Listeners) ======

elements.langToggle.addEventListener('click', toggleLanguage);

// Main Menu
elements.localGameButton.addEventListener('click', startLocalGame);
elements.onlineGameButton.addEventListener('click', async () => {
    gameMode = 'online';
    hideAllScreens();
    elements.onlineWaitingScreen.classList.remove('hidden');
    try {
        await createOnlineGame();
    } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء إنشاء رمز اللعبة. تحقق من إعدادات Firebase.');
        // return to menu
        gameMode = null;
        hideAllScreens();
        elements.mainMenuScreen.classList.remove('hidden');
    }
});

// Back buttons
elements.backToMenuButton.addEventListener('click', () => {
    hideAllScreens();
    elements.mainMenuScreen.classList.remove('hidden');
});

elements.cancelOnlineButton.addEventListener('click', () => {
    gameMode = null;
    hideAllScreens();
    elements.mainMenuScreen.classList.remove('hidden');
});

// Join Game
elements.joinGameButton.addEventListener('click', async () => {
    const opponentCode = elements.opponentCodeInput.value.trim();
    if (!opponentCode) {
        alert(TEXTS[currentLang].enterOpponentCode || "Please enter opponent's game code");
        return;
    }
    try {
        await joinGame(opponentCode);
    } catch (err) {
        console.error(err);
    }
});

// Category Selection
elements.startPVPButton.addEventListener('click', startGameAfterCategory);

// Player Setup
elements.player1ConfirmButton.addEventListener('click', player1SetSecret);
elements.player2ConfirmButton.addEventListener('click', player2SetSecret);

// Game
elements.askButton.addEventListener('click', handleQuestion);
elements.questionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleQuestion();
});

elements.guessButton.addEventListener('click', handleGuess);
elements.guessInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleGuess();
});

// Result
elements.restartButton.addEventListener('click', restartGame);

// Copy Code
elements.copyCodeButton.addEventListener('click', () => {
    const input = document.getElementById('gameCodeInput');
    const code = (input && input.value) ? input.value : elements.gameCodeDisplay.textContent;
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
        const button = elements.copyCodeButton;
        const originalText = button.textContent;
        button.textContent = TEXTS[currentLang].copying;
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    });
});

// ====== 8. التهيئة الأولية ======
document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    hideAllScreens();
    elements.mainMenuScreen.classList.remove('hidden');
});
