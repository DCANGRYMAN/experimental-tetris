class TetrisCastle {
    constructor() {
        this.COLS = 8;
        this.ROWS = 21;
        this.BLOCK_SIZE = 28;
        this.GRID_GAP = 2;

        // Tetris pieces - 5 formatos diferentes
        this.PIECES = [
            {
                name: 'I',
                shape: [[1, 1, 1, 1]],
            },
            {
                name: 'O',
                shape: [[1, 1], [1, 1]],
            },
            {
                name: 'T',
                shape: [[0, 1, 0], [1, 1, 1]],
            },
            {
                name: 'L',
                shape: [[1, 0], [1, 0], [1, 1]],
            },
            {
                name: 'S',
                shape: [[0, 1, 1], [1, 1, 0]],
            }
        ];

        this.grid = Array(this.ROWS * this.COLS).fill(0);
        this.currentPiece = null;
        this.nextPieces = [];
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameSpeed = 800;
        this.gameRunning = true;
        this.levelUpTimer = 0;
        this.levelUpInterval = 30000; // 30 segundos
        this.lastLevelUpTime = Date.now();

        this.init();
    }

    init() {
        this.createGrid();
        this.generateNextPieces();
        this.spawnNewPiece();
        this.setupEventListeners();
        this.startGameLoop();
        this.startLevelUpTimer();
        this.updatePreview();
        this.updateLevelDisplay();
    }

    createGrid() {
        const board = document.getElementById('gameBoard');
        board.innerHTML = '';
        for (let i = 0; i < this.ROWS * this.COLS; i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.index = i;
            board.appendChild(cell);
        }
    }

    generateNextPieces() {
        while (this.nextPieces.length < 2) {
            this.nextPieces.push(JSON.parse(JSON.stringify(this.PIECES[Math.floor(Math.random() * this.PIECES.length)])));
        }
    }

    spawnNewPiece() {
        this.currentPiece = this.nextPieces.shift();
        this.generateNextPieces();
        this.currentPiece.x = Math.floor((this.COLS - this.currentPiece.shape[0].length) / 2);
        this.currentPiece.y = 0;
        this.updatePreview();

        if (this.checkCollision(this.currentPiece.x, this.currentPiece.y, this.currentPiece.shape)) {
            this.gameRunning = false;
            setTimeout(() => {
                alert(`GAME OVER!\n\nSCORE: ${this.score}\nLEVEL: ${this.level}\nLINES: ${this.lines}`);
                location.reload();
            }, 100);
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (!this.gameRunning) return;

            switch(e.key.toLowerCase()) {
                case 'arrowleft':
                    e.preventDefault();
                    this.movePiece(-1, 0);
                    break;
                case 'arrowright':
                    e.preventDefault();
                    this.movePiece(1, 0);
                    break;
                case 'arrowdown':
                    e.preventDefault();
                    this.movePiece(0, 1);
                    this.score += 1;
                    this.updateStats();
                    break;
                case ' ':
                    e.preventDefault();
                    this.hardDrop();
                    break;
            }
        });

        document.addEventListener('click', (e) => {
            if (!this.gameRunning) return;
            const board = document.getElementById('gameBoard');
            if (board.contains(e.target)) {
                this.rotatePiece();
            }
        });
    }

    movePiece(dx, dy) {
        const newX = this.currentPiece.x + dx;
        const newY = this.currentPiece.y + dy;

        if (!this.checkCollision(newX, newY, this.currentPiece.shape)) {
            this.currentPiece.x = newX;
            this.currentPiece.y = newY;
            this.render();
            return true;
        }
        return false;
    }

    rotatePiece() {
        const rotated = this.rotateCW(this.currentPiece.shape);
        if (!this.checkCollision(this.currentPiece.x, this.currentPiece.y, rotated)) {
            this.currentPiece.shape = rotated;
            this.render();
        }
    }

    rotateCW(shape) {
        const rows = shape.length;
        const cols = shape[0].length;
        const rotated = Array(cols).fill(null).map(() => Array(rows).fill(0));

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                rotated[j][rows - 1 - i] = shape[i][j];
            }
        }
        return rotated;
    }

    hardDrop() {
        while (this.movePiece(0, 1)) {
            this.score += 2;
        }
        this.lockPiece();
    }

    checkCollision(x, y, shape) {
        for (let i = 0; i < shape.length; i++) {
            for (let j = 0; j < shape[i].length; j++) {
                if (!shape[i][j]) continue;

                const gridX = x + j;
                const gridY = y + i;

                if (gridX < 0 || gridX >= this.COLS || gridY >= this.ROWS) {
                    return true;
                }

                if (gridY >= 0 && this.grid[gridY * this.COLS + gridX]) {
                    return true;
                }
            }
        }
        return false;
    }

    lockPiece() {
        for (let i = 0; i < this.currentPiece.shape.length; i++) {
            for (let j = 0; j < this.currentPiece.shape[i].length; j++) {
                if (!this.currentPiece.shape[i][j]) continue;

                const gridX = this.currentPiece.x + j;
                const gridY = this.currentPiece.y + i;

                if (gridY >= 0) {
                    this.grid[gridY * this.COLS + gridX] = 1;
                }
            }
        }
        this.clearLines();
        this.spawnNewPiece();
    }

    clearLines() {
        let cleared = 0;
        const linesToClear = [];

        for (let row = this.ROWS - 1; row >= 0; row--) {
            let fullLine = true;
            for (let col = 0; col < this.COLS; col++) {
                if (!this.grid[row * this.COLS + col]) {
                    fullLine = false;
                    break;
                }
            }

            if (fullLine) {
                cleared++;
                linesToClear.push(row);
            }
        }

        if (cleared > 0) {
            linesToClear.forEach(row => {
                for (let i = row * this.COLS; i < (row + 1) * this.COLS; i++) {
                    const cell = document.querySelector(`[data-index="${i}"]`);
                    if (cell) cell.classList.add('line-clear');
                }
            });

            setTimeout(() => {
                linesToClear.forEach(row => {
                    this.grid.splice(row * this.COLS, this.COLS);
                    this.grid.unshift(...Array(this.COLS).fill(0));
                });
                this.render();
            }, 300);

            this.lines += cleared;
            const points = [40, 100, 300, 1200];
            this.score += points[Math.min(cleared - 1, 3)] * this.level;
            this.showCombo(cleared);
            this.updateStats();
        }
    }

    showCombo(count) {
        const combos = ['SINGLE', 'DOUBLE', 'TRIPLE', 'TETRIS'];
        const combo = document.createElement('div');
        combo.className = 'combo-text';
        combo.textContent = combos[Math.min(count - 1, 3)];
        document.getElementById('gameBoard').appendChild(combo);

        setTimeout(() => combo.remove(), 1000);
    }

    render() {
        const board = document.getElementById('gameBoard');
        board.querySelectorAll('.castle-block').forEach(block => block.remove());

        // Renderizar peças colocadas
        for (let i = 0; i < this.grid.length; i++) {
            if (this.grid[i]) {
                const row = Math.floor(i / this.COLS);
                const col = i % this.COLS;
                this.renderBlock(row, col, true);
            }
        }

        // Renderizar peça caindo
        if (this.currentPiece) {
            for (let i = 0; i < this.currentPiece.shape.length; i++) {
                for (let j = 0; j < this.currentPiece.shape[i].length; j++) {
                    if (this.currentPiece.shape[i][j]) {
                        const row = this.currentPiece.y + i;
                        const col = this.currentPiece.x + j;
                        if (row >= 0) {
                            this.renderBlock(row, col, false);
                        }
                    }
                }
            }
        }
    }

    renderBlock(row, col, isPlaced) {
        const board = document.getElementById('gameBoard');
        const block = document.createElement('div');
        block.className = `castle-block ${isPlaced ? 'placed' : ''}`;
        if (!isPlaced) block.classList.add('falling');

        const topOffset = this.GRID_GAP + row * (this.BLOCK_SIZE + this.GRID_GAP);
        const leftOffset = this.GRID_GAP + col * (this.BLOCK_SIZE + this.GRID_GAP);

        block.style.top = topOffset + 'px';
        block.style.left = leftOffset + 'px';

        if (isPlaced) {
            block.classList.add('lock');
        }

        board.appendChild(block);
    }

    startGameLoop() {
        let lastMoveTime = Date.now();
        
        const gameLoopInterval = setInterval(() => {
            if (!this.gameRunning) {
                clearInterval(gameLoopInterval);
                return;
            }

            const currentTime = Date.now();
            const elapsedTime = currentTime - lastMoveTime;

            // Movimento suave baseado no gameSpeed
            if (elapsedTime >= this.gameSpeed) {
                if (!this.movePiece(0, 1)) {
                    this.lockPiece();
                }
                this.render();
                lastMoveTime = currentTime;
            }
        }, 16); // ~60 FPS
    }

    startLevelUpTimer() {
        setInterval(() => {
            if (!this.gameRunning) return;

            const currentTime = Date.now();
            const timeSinceLastLevelUp = currentTime - this.lastLevelUpTime;
            const progress = Math.min((timeSinceLastLevelUp / this.levelUpInterval) * 100, 100);

            document.getElementById('levelProgress').style.width = progress + '%';

            if (timeSinceLastLevelUp >= this.levelUpInterval) {
                this.levelUp();
            }
        }, 100);
    }

    levelUp() {
        this.level++;
        this.lastLevelUpTime = Date.now();
        this.gameSpeed = Math.max(200, 800 - this.level * 50);

        const levelNumber = document.getElementById('levelNumber');
        levelNumber.classList.add('level-pulse');

        setTimeout(() => {
            levelNumber.classList.remove('level-pulse');
        }, 600);

        this.updateLevelDisplay();
    }

    updateStats() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('lines').textContent = this.lines;
    }

    updateLevelDisplay() {
        document.getElementById('levelNumber').textContent = this.level;
    }

    updatePreview() {
        const preview = document.getElementById('nextPieces');
        preview.innerHTML = '';

        this.nextPieces.forEach(piece => {
            const item = document.createElement('div');
            item.className = 'preview-item';
            
            const height = piece.shape.length;
            const width = piece.shape[0].length;

            for (let i = 0; i < height; i++) {
                for (let j = 0; j < width; j++) {
                    const block = document.createElement('div');
                    if (piece.shape[i][j]) {
                        block.className = 'preview-block';
                    } else {
                        block.style.opacity = '0';
                        block.style.pointerEvents = 'none';
                    }
                    item.appendChild(block);
                }
            }
            preview.appendChild(item);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TetrisCastle();
});