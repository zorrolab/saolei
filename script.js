// 游戏状态管理
class MinesweeperGame {
    constructor() {
        this.board = [];
        this.width = 10;
        this.height = 10;
        this.mineCount = 10;
        this.gameState = 'ready'; // ready, playing, won, lost, paused
        this.revealedCount = 0;
        this.flaggedCount = 0;
        this.timer = 0;
        this.timerInterval = null;
        this.firstClick = true;
        
        this.initializeDOM();
        this.bindEvents();
        this.createBoard();
    }

    // 初始化DOM元素引用
    initializeDOM() {
        this.boardElement = document.getElementById('game-board');
        this.mineCountElement = document.getElementById('mine-count');
        this.timerElement = document.getElementById('timer');
        this.gameStatusElement = document.getElementById('game-status');
        this.overlayElement = document.getElementById('game-overlay');
        this.overlayIconElement = document.getElementById('overlay-icon');
        this.overlayTitleElement = document.getElementById('overlay-title');
        this.overlayMessageElement = document.getElementById('overlay-message');
        this.difficultySelect = document.getElementById('difficulty');
        this.customSettings = document.getElementById('custom-settings');
    }

    // 绑定事件监听器
    bindEvents() {
        document.getElementById('new-game-btn').addEventListener('click', () => this.startNewGame());
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        document.getElementById('reset-btn').addEventListener('click', () => this.resetGame());
        
        this.difficultySelect.addEventListener('change', (e) => this.changeDifficulty(e.target.value));
        
        // 自定义设置输入验证
        ['custom-width', 'custom-height', 'custom-mines'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => this.validateCustomSettings());
        });
    }

    // 切换难度设置
    changeDifficulty(difficulty) {
        const settings = {
            easy: { width: 10, height: 10, mines: 10 },
            medium: { width: 16, height: 16, mines: 40 },
            hard: { width: 30, height: 16, mines: 99 },
            custom: null
        };

        if (difficulty === 'custom') {
            this.customSettings.style.display = 'block';
            this.validateCustomSettings();
        } else {
            this.customSettings.style.display = 'none';
            const config = settings[difficulty];
            this.width = config.width;
            this.height = config.height;
            this.mineCount = config.mines;
            this.createBoard();
        }
    }

    // 验证自定义设置
    validateCustomSettings() {
        const width = parseInt(document.getElementById('custom-width').value);
        const height = parseInt(document.getElementById('custom-height').value);
        const mines = parseInt(document.getElementById('custom-mines').value);
        
        const maxMines = Math.floor((width * height) * 0.8);
        
        if (mines > maxMines) {
            document.getElementById('custom-mines').value = maxMines;
        }
        
        this.width = Math.max(5, Math.min(30, width));
        this.height = Math.max(5, Math.min(30, height));
        this.mineCount = Math.max(1, Math.min(maxMines, mines));
        
        this.createBoard();
    }

    // 创建游戏棋盘
    createBoard() {
        this.resetGameState();
        this.board = [];
        
        // 初始化棋盘数据
        for (let y = 0; y < this.height; y++) {
            this.board[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.board[y][x] = {
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    neighborMines: 0,
                    element: null
                };
            }
        }
        
        this.renderBoard();
        this.updateUI();
    }

    // 渲染棋盘DOM
    renderBoard() {
        this.boardElement.innerHTML = '';
        this.boardElement.style.gridTemplateColumns = `repeat(${this.width}, 1fr)`;
        this.boardElement.style.gridTemplateRows = `repeat(${this.height}, 1fr)`;
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                
                cell.addEventListener('click', (e) => this.handleCellClick(e, x, y));
                cell.addEventListener('contextmenu', (e) => this.handleCellRightClick(e, x, y));
                
                this.boardElement.appendChild(cell);
                this.board[y][x].element = cell;
            }
        }
    }

    // 布置地雷（首次点击后）
    placeMines(firstClickX, firstClickY) {
        let minesPlaced = 0;
        const safeCells = this.getSafeCells(firstClickX, firstClickY);
        
        while (minesPlaced < this.mineCount) {
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);
            
            if (!this.board[y][x].isMine && !safeCells.some(cell => cell.x === x && cell.y === y)) {
                this.board[y][x].isMine = true;
                minesPlaced++;
            }
        }
        
        this.calculateNeighborMines();
    }

    // 获取首次点击周围的安全区域
    getSafeCells(centerX, centerY) {
        const safeCells = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                if (this.isValidCell(x, y)) {
                    safeCells.push({ x, y });
                }
            }
        }
        return safeCells;
    }

    // 计算每个格子周围的地雷数量
    calculateNeighborMines() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (!this.board[y][x].isMine) {
                    this.board[y][x].neighborMines = this.countNeighborMines(x, y);
                }
            }
        }
    }

    // 计算指定位置周围的地雷数量
    countNeighborMines(x, y) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (this.isValidCell(nx, ny) && this.board[ny][nx].isMine) {
                    count++;
                }
            }
        }
        return count;
    }

    // 检查坐标是否有效
    isValidCell(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    // 处理格子点击
    handleCellClick(e, x, y) {
        e.preventDefault();
        
        if (this.gameState !== 'playing' && this.gameState !== 'ready') return;
        
        const cell = this.board[y][x];
        if (cell.isRevealed || cell.isFlagged) return;
        
        // 首次点击
        if (this.firstClick) {
            this.placeMines(x, y);
            this.firstClick = false;
            this.gameState = 'playing';
            this.startTimer();
        }
        
        this.revealCell(x, y);
    }

    // 处理右键点击（标记/取消标记）
    handleCellRightClick(e, x, y) {
        e.preventDefault();
        
        if (this.gameState !== 'playing') return;
        
        const cell = this.board[y][x];
        if (cell.isRevealed) return;
        
        this.toggleFlag(x, y);
    }

    // 揭开格子
    revealCell(x, y) {
        const cell = this.board[y][x];
        
        if (cell.isRevealed || cell.isFlagged) return;
        
        cell.isRevealed = true;
        this.revealedCount++;
        
        const cellElement = cell.element;
        cellElement.classList.add('revealed');
        
        if (cell.isMine) {
            this.triggerGameOver(x, y);
            return;
        }
        
        if (cell.neighborMines > 0) {
            cellElement.textContent = cell.neighborMines;
            cellElement.setAttribute('data-count', cell.neighborMines);
        } else {
            // 自动揭开周围的空白格子
            this.revealNeighbors(x, y);
        }
        
        this.checkWinCondition();
        this.updateUI();
    }

    // 递归揭开相邻的空白格子
    revealNeighbors(x, y) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (this.isValidCell(nx, ny)) {
                    const neighbor = this.board[ny][nx];
                    if (!neighbor.isRevealed && !neighbor.isFlagged) {
                        this.revealCell(nx, ny);
                    }
                }
            }
        }
    }

    // 切换标记状态
    toggleFlag(x, y) {
        const cell = this.board[y][x];
        
        if (cell.isFlagged) {
            cell.isFlagged = false;
            cell.element.classList.remove('flagged');
            cell.element.innerHTML = '';
            this.flaggedCount--;
        } else {
            cell.isFlagged = true;
            cell.element.classList.add('flagged');
            cell.element.innerHTML = '<i class="fas fa-flag"></i>';
            this.flaggedCount++;
        }
        
        this.updateUI();
    }

    // 触发游戏结束
    triggerGameOver(triggerX, triggerY) {
        this.gameState = 'lost';
        this.stopTimer();
        
        // 显示所有地雷
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.board[y][x];
                if (cell.isMine) {
                    cell.element.classList.add('mine');
                    cell.element.innerHTML = '<i class="fas fa-bomb"></i>';
                    
                    if (x === triggerX && y === triggerY) {
                        cell.element.classList.add('triggered');
                    }
                }
            }
        }
        
        this.showGameOverOverlay('<i class="fas fa-skull-crossbones"></i>', 'Game Over!', '很遗憾，您踩到了地雷！');
        this.updateUI();
    }

    // 检查胜利条件
    checkWinCondition() {
        const totalCells = this.width * this.height;
        const nonMineCells = totalCells - this.mineCount;
        
        if (this.revealedCount === nonMineCells) {
            this.gameState = 'won';
            this.stopTimer();
            this.showGameOverOverlay('<i class="fas fa-trophy"></i>', 'Congratulations! You Win!', `恭喜您获得胜利！用时 ${this.formatTime(this.timer)} 秒`);
            this.updateUI();
        }
    }

    // 显示游戏结束覆盖层
    showGameOverOverlay(icon, title, message) {
        this.overlayIconElement.innerHTML = icon;
        this.overlayTitleElement.textContent = title;
        this.overlayMessageElement.textContent = message;
        this.overlayElement.style.display = 'flex';
    }

    // 隐藏游戏结束覆盖层
    hideGameOverOverlay() {
        this.overlayElement.style.display = 'none';
    }

    // 开始新游戏
    startNewGame() {
        this.hideGameOverOverlay();
        this.createBoard();
    }

    // 重置游戏状态
    resetGameState() {
        this.gameState = 'ready';
        this.revealedCount = 0;
        this.flaggedCount = 0;
        this.timer = 0;
        this.firstClick = true;
        this.stopTimer();
    }

    // 重置游戏
    resetGame() {
        this.hideGameOverOverlay();
        this.resetGameState();
        this.renderBoard();
        this.updateUI();
    }

    // 切换暂停状态
    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.stopTimer();
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.startTimer();
        }
        this.updateUI();
    }

    // 开始计时器
    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timer++;
            this.updateTimer();
        }, 1000);
    }

    // 停止计时器
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    // 更新计时器显示
    updateTimer() {
        this.timerElement.textContent = this.formatTime(this.timer);
    }

    // 格式化时间显示
    formatTime(seconds) {
        return seconds.toString();
    }

    // 更新UI显示
    updateUI() {
        // 更新地雷计数
        const remainingMines = this.mineCount - this.flaggedCount;
        this.mineCountElement.textContent = remainingMines;
        
        // 更新游戏状态
        const statusMap = {
            ready: '准备开始',
            playing: '游戏中',
            paused: '已暂停',
            won: '游戏获胜',
            lost: '游戏失败'
        };
        
        this.gameStatusElement.textContent = statusMap[this.gameState];
        this.gameStatusElement.className = `value game-status-${this.gameState}`;
        
        // 更新按钮状态
        const pauseBtn = document.getElementById('pause-btn');
        if (this.gameState === 'paused') {
            pauseBtn.innerHTML = '<i class="fas fa-play"></i> 继续';
        } else {
            pauseBtn.innerHTML = '<i class="fas fa-pause"></i> 暂停';
        }
        
        // 更新按钮可用性
        pauseBtn.disabled = this.gameState === 'ready' || this.gameState === 'won' || this.gameState === 'lost';
        
        this.updateTimer();
    }
}

let game;

function startNewGame() {
    game.startNewGame();
}

// 初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    game = new MinesweeperGame();
    
    // 添加键盘快捷键
    document.addEventListener('keydown', (e) => {
        switch(e.code) {
            case 'F2':
                e.preventDefault();
                game.startNewGame();
                break;
            case 'Space':
                if (e.target.tagName !== 'INPUT') {
                    e.preventDefault();
                    game.togglePause();
                }
                break;
        }
    });
    
    // 禁用右键菜单（在游戏板上）
    document.getElementById('game-board').addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    console.log('扫雷游戏已加载！');
    console.log('快捷键：F2 = 新游戏，空格 = 暂停/继续');
}); 