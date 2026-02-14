// ===== 人生ゲーム =====

// --- マスの定義 ---
const TILE_TYPES = {
    START: 'start',
    SALARY: 'salary',
    EVENT: 'event',
    LUCKY: 'lucky',
    UNLUCKY: 'unlucky',
    CHOICE: 'choice',
    JOB: 'job',
    MARRIAGE: 'marriage',
    HOUSE: 'house',
    GOAL: 'goal',
};

const TILE_COLORS = {
    [TILE_TYPES.START]: '#4CAF50',
    [TILE_TYPES.SALARY]: '#2196F3',
    [TILE_TYPES.EVENT]: '#9C27B0',
    [TILE_TYPES.LUCKY]: '#FFD700',
    [TILE_TYPES.UNLUCKY]: '#F44336',
    [TILE_TYPES.CHOICE]: '#FF9800',
    [TILE_TYPES.JOB]: '#00BCD4',
    [TILE_TYPES.MARRIAGE]: '#E91E63',
    [TILE_TYPES.HOUSE]: '#8BC34A',
    [TILE_TYPES.GOAL]: '#FF5722',
};

const PLAYER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'];

// --- マスデータ ---
function createBoard() {
    return [
        { type: TILE_TYPES.START, name: 'スタート', description: '人生の始まり！' },
        { type: TILE_TYPES.JOB, name: '就職活動', description: '職業を選ぼう！',
            choices: [
                { text: '会社員（給料日+$3000）', job: '会社員', salary: 3000 },
                { text: 'エンジニア（給料日+$4000）', job: 'エンジニア', salary: 4000 },
                { text: 'アーティスト（給料日+$2000〜$6000）', job: 'アーティスト', salary: 2000, salaryMax: 6000 },
            ]
        },
        { type: TILE_TYPES.SALARY, name: '給料日', description: '給料をもらった！' },
        { type: TILE_TYPES.LUCKY, name: '宝くじ当選！', description: '$5000ゲット！', money: 5000 },
        { type: TILE_TYPES.EVENT, name: '資格取得', description: '資格を取って給料アップ！給料+$500', salaryBonus: 500 },
        { type: TILE_TYPES.UNLUCKY, name: '交通事故', description: '修理代 $2000...', money: -2000 },
        { type: TILE_TYPES.SALARY, name: '給料日', description: '給料をもらった！' },
        { type: TILE_TYPES.CHOICE, name: '投資チャンス', description: '投資する？',
            choices: [
                { text: '株式投資する（50%で$8000獲得、50%で$4000損失）', successMoney: 8000, failMoney: -4000, chance: 0.5 },
                { text: '投資しない（何も起きない）', successMoney: 0, failMoney: 0, chance: 1.0 },
            ]
        },
        { type: TILE_TYPES.LUCKY, name: 'ボーナス！', description: '特別ボーナス$3000！', money: 3000 },
        { type: TILE_TYPES.MARRIAGE, name: '結婚', description: '結婚式を挙げよう！',
            choices: [
                { text: '豪華な式（-$5000、幸福度UP）', money: -5000, happiness: 3 },
                { text: 'シンプルな式（-$1000）', money: -1000, happiness: 1 },
            ]
        },
        { type: TILE_TYPES.SALARY, name: '給料日', description: '給料をもらった！' },
        { type: TILE_TYPES.EVENT, name: '子供誕生！', description: 'おめでとう！出産祝い$2000', money: 2000 },
        { type: TILE_TYPES.UNLUCKY, name: '病気', description: '入院費$3000...', money: -3000 },
        { type: TILE_TYPES.HOUSE, name: 'マイホーム', description: '家を買おう！',
            choices: [
                { text: '豪邸を買う（-$20000、ゴール時+$30000）', money: -20000, goalBonus: 30000 },
                { text: 'マンション（-$10000、ゴール時+$15000）', money: -10000, goalBonus: 15000 },
                { text: '賃貸のまま（変化なし）', money: 0, goalBonus: 0 },
            ]
        },
        { type: TILE_TYPES.SALARY, name: '給料日', description: '給料をもらった！' },
        { type: TILE_TYPES.LUCKY, name: '遺産相続', description: 'おじいちゃんから$8000！', money: 8000 },
        { type: TILE_TYPES.CHOICE, name: '転職チャンス', description: '転職する？',
            choices: [
                { text: '起業する（給料日+$6000、ただしリスクあり）', job: '起業家', salary: 6000, risk: true },
                { text: '今の仕事を続ける', job: null },
            ]
        },
        { type: TILE_TYPES.SALARY, name: '給料日', description: '給料をもらった！' },
        { type: TILE_TYPES.UNLUCKY, name: '自然災害', description: '修繕費$4000...', money: -4000 },
        { type: TILE_TYPES.EVENT, name: '副業成功', description: '副業で$5000稼いだ！', money: 5000 },
        { type: TILE_TYPES.SALARY, name: '給料日', description: '給料をもらった！' },
        { type: TILE_TYPES.LUCKY, name: '株価高騰！', description: '持ち株が上がった！$6000獲得！', money: 6000 },
        { type: TILE_TYPES.CHOICE, name: '海外旅行', description: '旅行に行く？',
            choices: [
                { text: '世界一周（-$8000、思い出プライスレス）', money: -8000, happiness: 5 },
                { text: '国内旅行（-$2000）', money: -2000, happiness: 2 },
                { text: '旅行しない', money: 0, happiness: 0 },
            ]
        },
        { type: TILE_TYPES.UNLUCKY, name: '詐欺被害', description: '$5000騙し取られた...', money: -5000 },
        { type: TILE_TYPES.SALARY, name: '給料日', description: '給料をもらった！' },
        { type: TILE_TYPES.EVENT, name: '昇進！', description: '昇進して給料+$1000！', salaryBonus: 1000 },
        { type: TILE_TYPES.LUCKY, name: '懸賞当選', description: '豪華賞品$4000相当！', money: 4000 },
        { type: TILE_TYPES.SALARY, name: '給料日', description: '給料をもらった！' },
        { type: TILE_TYPES.CHOICE, name: '老後の備え', description: '年金プランを選ぼう',
            choices: [
                { text: '手厚い年金（-$5000、ゴール時+$10000）', money: -5000, goalBonus: 10000 },
                { text: '普通の年金（-$2000、ゴール時+$4000）', money: -2000, goalBonus: 4000 },
            ]
        },
        { type: TILE_TYPES.GOAL, name: 'ゴール！', description: '人生の集大成！お疲れ様でした！' },
    ];
}

// --- ゲーム状態 ---
let gameState = {
    players: [],
    currentPlayerIndex: 0,
    board: [],
    phase: 'title', // title, playing, finished
    rolling: false,
};

// --- Canvas描画 ---
const canvas = document.getElementById('board-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

function resizeCanvas() {
    if (!canvas) return;
    const container = document.getElementById('board-container');
    const w = Math.min(container.clientWidth - 20, 1100);
    canvas.width = w;
    canvas.height = 500;
}

function getBoardPositions() {
    const board = gameState.board;
    const total = board.length;
    const w = canvas.width;
    const h = canvas.height;
    const margin = 50;
    const tileSize = 55;

    // 蛇行パスを作成
    const cols = Math.floor((w - margin * 2) / (tileSize + 10));
    const positions = [];
    let row = 0;
    let col = 0;
    let direction = 1; // 1=right, -1=left

    for (let i = 0; i < total; i++) {
        const x = margin + col * (tileSize + 10) + tileSize / 2;
        const y = margin + row * (tileSize + 24) + tileSize / 2;
        positions.push({ x, y, size: tileSize });

        col += direction;
        if (col >= cols || col < 0) {
            col = Math.max(0, Math.min(col, cols - 1));
            row++;
            direction *= -1;
        }
    }
    return positions;
}

function drawBoard() {
    if (!ctx) return;
    resizeCanvas();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const positions = getBoardPositions();
    const board = gameState.board;

    // パス線を描画
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < positions.length; i++) {
        if (i === 0) ctx.moveTo(positions[i].x, positions[i].y);
        else ctx.lineTo(positions[i].x, positions[i].y);
    }
    ctx.stroke();

    // マスを描画
    for (let i = 0; i < board.length; i++) {
        const tile = board[i];
        const pos = positions[i];
        if (!pos) continue;
        const s = pos.size;

        // マスの背景
        ctx.fillStyle = TILE_COLORS[tile.type] || '#555';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        roundRect(ctx, pos.x - s / 2, pos.y - s / 2, s, s, 8);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // マスの枠
        ctx.strokeStyle = TILE_COLORS[tile.type] || '#555';
        ctx.lineWidth = 2;
        ctx.beginPath();
        roundRect(ctx, pos.x - s / 2, pos.y - s / 2, s, s, 8);
        ctx.stroke();

        // マス番号
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(i === 0 ? 'S' : i === board.length - 1 ? 'G' : i, pos.x, pos.y - s / 2 + 4);

        // マス名（短縮）
        ctx.font = '10px sans-serif';
        ctx.textBaseline = 'middle';
        const shortName = tile.name.length > 4 ? tile.name.slice(0, 4) + '..' : tile.name;
        ctx.fillText(shortName, pos.x, pos.y + 8);
    }

    // プレイヤー駒を描画
    const playerPositions = {};
    gameState.players.forEach((p, pi) => {
        const tileIdx = p.position;
        if (!playerPositions[tileIdx]) playerPositions[tileIdx] = [];
        playerPositions[tileIdx].push(pi);
    });

    gameState.players.forEach((player, pi) => {
        const tileIdx = player.position;
        const pos = positions[tileIdx];
        if (!pos) return;

        const samePos = playerPositions[tileIdx];
        const offsetIndex = samePos.indexOf(pi);
        const offsets = [
            { dx: -10, dy: -14 },
            { dx: 10, dy: -14 },
            { dx: -10, dy: 0 },
            { dx: 10, dy: 0 },
        ];
        const off = offsets[offsetIndex] || { dx: 0, dy: 0 };

        // 駒
        ctx.fillStyle = PLAYER_COLORS[pi];
        ctx.beginPath();
        ctx.arc(pos.x + off.dx, pos.y + off.dy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // プレイヤー番号
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pi + 1, pos.x + off.dx, pos.y + off.dy);
    });
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
}

// --- UI更新 ---
function updatePlayerStats() {
    const container = document.getElementById('player-stats');
    container.innerHTML = gameState.players.map((p, i) => {
        const isActive = i === gameState.currentPlayerIndex && gameState.phase === 'playing';
        return `
            <div class="player-stat ${isActive ? 'active' : ''}" style="border-left: 4px solid ${PLAYER_COLORS[i]}">
                <div class="name" style="color: ${PLAYER_COLORS[i]}">${escapeHtml(p.name)}</div>
                <div class="money">$${p.money.toLocaleString()}</div>
                <div class="job">${p.job || '無職'}</div>
            </div>
        `;
    }).join('');
}

function updateTurnInfo() {
    const el = document.getElementById('turn-info');
    const player = gameState.players[gameState.currentPlayerIndex];
    if (player) {
        el.textContent = `${player.name} のターン`;
        el.style.color = PLAYER_COLORS[gameState.currentPlayerIndex];
    }
}

function setEventLog(html) {
    document.getElementById('event-log').innerHTML = `<p>${html}</p>`;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// --- プレイヤー名入力の生成 ---
function generatePlayerNameInputs() {
    const count = parseInt(document.getElementById('player-count').value);
    const container = document.getElementById('player-names');
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const div = document.createElement('div');
        div.className = 'player-name-input';
        div.innerHTML = `
            <span class="color-dot" style="background: ${PLAYER_COLORS[i]}"></span>
            <input type="text" id="pname-${i}" placeholder="プレイヤー${i + 1}" maxlength="10">
        `;
        container.appendChild(div);
    }
}

// --- ゲーム開始 ---
function startGame() {
    const count = parseInt(document.getElementById('player-count').value);
    const players = [];
    for (let i = 0; i < count; i++) {
        const input = document.getElementById(`pname-${i}`);
        const name = input.value.trim() || `プレイヤー${i + 1}`;
        players.push({
            name,
            money: 10000,
            position: 0,
            job: null,
            salary: 0,
            goalBonus: 0,
            happiness: 0,
            finished: false,
        });
    }

    gameState.players = players;
    gameState.currentPlayerIndex = 0;
    gameState.board = createBoard();
    gameState.phase = 'playing';
    gameState.rolling = false;

    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    document.getElementById('result-screen').classList.add('hidden');

    updatePlayerStats();
    updateTurnInfo();
    drawBoard();
    setEventLog('サイコロを回してスタート！');
}

// --- サイコロ ---
function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}

async function animateDice() {
    const diceEl = document.getElementById('dice');
    diceEl.classList.add('rolling');

    for (let i = 0; i < 10; i++) {
        diceEl.textContent = rollDice();
        await sleep(80);
    }

    const result = rollDice();
    diceEl.textContent = result;
    diceEl.classList.remove('rolling');
    return result;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// --- メインターン処理 ---
async function handleTurn() {
    if (gameState.rolling || gameState.phase !== 'playing') return;
    gameState.rolling = true;

    const rollBtn = document.getElementById('roll-btn');
    rollBtn.disabled = true;

    const player = gameState.players[gameState.currentPlayerIndex];

    // サイコロアニメーション
    const diceResult = await animateDice();
    setEventLog(`${escapeHtml(player.name)} は ${diceResult} を出した！`);
    await sleep(500);

    // 移動
    const maxPos = gameState.board.length - 1;
    const newPos = Math.min(player.position + diceResult, maxPos);

    // アニメーション付き移動
    for (let p = player.position + 1; p <= newPos; p++) {
        player.position = p;
        drawBoard();
        await sleep(200);
    }

    // マスの効果を処理
    await processTile(player);

    // ゴールチェック
    if (player.position >= maxPos) {
        player.finished = true;
        player.money += player.goalBonus;
        if (player.goalBonus > 0) {
            setEventLog(`${escapeHtml(player.name)} がゴール！<br>住宅・年金ボーナス: +$${player.goalBonus.toLocaleString()}`);
        } else {
            setEventLog(`${escapeHtml(player.name)} がゴール！`);
        }
        await sleep(1500);
    }

    updatePlayerStats();
    drawBoard();

    // 全員ゴールしたかチェック
    if (gameState.players.every(p => p.finished)) {
        endGame();
        return;
    }

    // 次のプレイヤー（ゴール済みはスキップ）
    do {
        gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    } while (gameState.players[gameState.currentPlayerIndex].finished);

    updateTurnInfo();
    updatePlayerStats();
    setEventLog('サイコロを回してください！');

    gameState.rolling = false;
    rollBtn.disabled = false;
}

// --- マスの効果処理 ---
async function processTile(player) {
    const tile = gameState.board[player.position];

    switch (tile.type) {
        case TILE_TYPES.START:
            setEventLog('人生のスタート！頑張ろう！');
            break;

        case TILE_TYPES.SALARY:
            if (player.salary > 0) {
                let amount = player.salary;
                // アーティストのランダム給料
                if (player.job === 'アーティスト') {
                    const min = player.salary;
                    const max = player.salaryMax || player.salary * 3;
                    amount = min + Math.floor(Math.random() * (max - min + 1));
                }
                // 起業家のリスク
                if (player.risk && Math.random() < 0.2) {
                    amount = -2000;
                    setEventLog(`${escapeHtml(player.name)}: 給料日！<br>しかし事業が不調... $${Math.abs(amount).toLocaleString()}の損失`);
                } else {
                    setEventLog(`${escapeHtml(player.name)}: 給料日！<br>+$${amount.toLocaleString()}`);
                }
                player.money += amount;
            } else {
                setEventLog(`${escapeHtml(player.name)}: 給料日だが、まだ仕事がない...`);
            }
            break;

        case TILE_TYPES.LUCKY:
            player.money += tile.money;
            setEventLog(`${escapeHtml(player.name)}: ${tile.name}<br>${tile.description}`);
            break;

        case TILE_TYPES.UNLUCKY:
            player.money += tile.money;
            setEventLog(`${escapeHtml(player.name)}: ${tile.name}<br>${tile.description}`);
            break;

        case TILE_TYPES.EVENT:
            if (tile.money) {
                player.money += tile.money;
            }
            if (tile.salaryBonus) {
                player.salary += tile.salaryBonus;
            }
            setEventLog(`${escapeHtml(player.name)}: ${tile.name}<br>${tile.description}`);
            break;

        case TILE_TYPES.JOB:
        case TILE_TYPES.MARRIAGE:
        case TILE_TYPES.HOUSE:
        case TILE_TYPES.CHOICE:
            await handleChoice(player, tile);
            break;

        case TILE_TYPES.GOAL:
            break;
    }

    await sleep(1000);
}

// --- 選択肢処理 ---
function handleChoice(player, tile) {
    return new Promise((resolve) => {
        const modal = document.getElementById('choice-modal');
        const titleEl = document.getElementById('choice-title');
        const descEl = document.getElementById('choice-description');
        const buttonsEl = document.getElementById('choice-buttons');

        titleEl.textContent = tile.name;
        descEl.textContent = tile.description;
        buttonsEl.innerHTML = '';

        tile.choices.forEach((choice, idx) => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-choice';
            btn.textContent = choice.text;
            btn.addEventListener('click', () => {
                modal.classList.add('hidden');
                applyChoice(player, choice);
                resolve();
            });
            buttonsEl.appendChild(btn);
        });

        modal.classList.remove('hidden');
    });
}

function applyChoice(player, choice) {
    let msg = '';

    // 職業変更
    if (choice.job) {
        player.job = choice.job;
        player.salary = choice.salary || 0;
        if (choice.salaryMax) player.salaryMax = choice.salaryMax;
        if (choice.risk) player.risk = true;
        msg += `職業: ${choice.job}に決定！ `;
    }

    // お金の変動
    if (choice.money !== undefined && choice.money !== 0) {
        player.money += choice.money;
        if (choice.money > 0) msg += `+$${choice.money.toLocaleString()} `;
        else msg += `-$${Math.abs(choice.money).toLocaleString()} `;
    }

    // ギャンブル系
    if (choice.successMoney !== undefined && choice.chance !== undefined && choice.chance < 1.0) {
        if (Math.random() < choice.chance) {
            player.money += choice.successMoney;
            msg += `成功！ +$${choice.successMoney.toLocaleString()} `;
        } else {
            player.money += choice.failMoney;
            msg += `失敗... $${Math.abs(choice.failMoney).toLocaleString()}の損失 `;
        }
    }

    // ゴールボーナス
    if (choice.goalBonus) {
        player.goalBonus += choice.goalBonus;
        msg += `ゴール時ボーナス+$${choice.goalBonus.toLocaleString()} `;
    }

    // 幸福度
    if (choice.happiness) {
        player.happiness += choice.happiness;
    }

    setEventLog(`${escapeHtml(player.name)}: ${msg || '何も起きなかった'}`);
}

// --- ゲーム終了 ---
function endGame() {
    gameState.phase = 'finished';

    // 最終資産でソート
    const ranked = [...gameState.players].sort((a, b) => b.money - a.money);

    const rankingsEl = document.getElementById('rankings');
    const medals = ['🥇', '🥈', '🥉', ''];
    rankingsEl.innerHTML = ranked.map((p, i) => {
        const pi = gameState.players.indexOf(p);
        return `
            <div class="rank-item ${i === 0 ? 'first' : ''}">
                <span class="rank-number">${medals[i] || (i + 1) + '位'}</span>
                <span class="rank-name" style="color: ${PLAYER_COLORS[pi]}">${escapeHtml(p.name)}</span>
                <span class="rank-money">$${p.money.toLocaleString()}</span>
            </div>
        `;
    }).join('');

    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.remove('hidden');
}

// --- イベントリスナー ---
document.addEventListener('DOMContentLoaded', () => {
    generatePlayerNameInputs();

    document.getElementById('player-count').addEventListener('change', generatePlayerNameInputs);

    document.getElementById('start-btn').addEventListener('click', startGame);

    document.getElementById('roll-btn').addEventListener('click', handleTurn);

    document.getElementById('restart-btn').addEventListener('click', () => {
        document.getElementById('result-screen').classList.add('hidden');
        document.getElementById('title-screen').classList.remove('hidden');
        document.getElementById('dice').textContent = '?';
        generatePlayerNameInputs();
    });

    window.addEventListener('resize', () => {
        if (gameState.phase === 'playing') {
            drawBoard();
        }
    });
});
