class LabyrinthEscape extends SensorGameSDK {
    constructor() {
        super({
            gameId: 'labyrinth-escape',
            gameName: '미로 탈출',
            requestedSensors: ['orientation'],
            sensorSensitivity: {
                orientation: 0.8
            },
            smoothingFactor: 3,
            deadzone: 0.1
        });

        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.initializeGame();
    }

    initializeGame() {
        console.log('🎮 미로 탈출 게임 초기화');

        this.gameState = {
            score: 0,
            level: 1,
            isPlaying: true
        };

        this.player = {
            x: 50,
            y: 50,
            radius: 15,
            velocity: { x: 0, y: 0 }
        };

        this.maze = {
            tileSize: 40,
            layout: [
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
                [1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
                [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
                [1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1],
                [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
                [1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1],
                [1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
                [1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1],
                [1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1],
                [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
                [1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 1],
                [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
            ]
        };

        this.goal = { x: 0, y: 0 };
        this.setPlayerAndGoalPositions();

        this.on('onSensorData', (gameInput) => this.handleSensorInput(gameInput));
        this.on('onSensorStatusChange', (status) => this.updateSensorStatus(status.connected));

        this.updateUI();
        this.gameLoop();
    }

    setPlayerAndGoalPositions() {
        for (let row = 0; row < this.maze.layout.length; row++) {
            for (let col = 0; col < this.maze.layout[row].length; col++) {
                if (this.maze.layout[row][col] === 2) {
                    this.goal.x = col * this.maze.tileSize + this.maze.tileSize / 2;
                    this.goal.y = row * this.maze.tileSize + this.maze.tileSize / 2;
                }
            }
        }
        // Player start position is hardcoded for this maze
        this.player.x = 1.5 * this.maze.tileSize;
        this.player.y = 1.5 * this.maze.tileSize;
    }

    handleSensorInput(gameInput) {
        if (!this.gameState.isPlaying) return;

        if (gameInput.tilt) {
            const force = 0.3;
            this.player.velocity.x += gameInput.tilt.x * force;
            this.player.velocity.y += gameInput.tilt.y * force;
        }
    }

    update() {
        if (!this.gameState.isPlaying) return;

        this.player.x += this.player.velocity.x;
        this.player.y += this.player.velocity.y;

        this.handleCollision();

        this.player.velocity.x *= 0.98; // Friction
        this.player.velocity.y *= 0.98;

        this.checkWinCondition();
    }

    handleCollision() {
        const { x, y, radius } = this.player;
        const { tileSize } = this.maze;

        for (let row = 0; row < this.maze.layout.length; row++) {
            for (let col = 0; col < this.maze.layout[row].length; col++) {
                if (this.maze.layout[row][col] === 1) {
                    const wall = { x: col * tileSize, y: row * tileSize, width: tileSize, height: tileSize };
                    
                    // Find the closest point on the wall to the circle's center
                    let closestX = Math.max(wall.x, Math.min(x, wall.x + wall.width));
                    let closestY = Math.max(wall.y, Math.min(y, wall.y + wall.height));

                    // Calculate the distance between the circle's center and this closest point
                    let distanceX = x - closestX;
                    let distanceY = y - closestY;
                    let distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

                    // If the distance is less than the circle's radius, there's a collision
                    if (distanceSquared < (radius * radius)) {
                        let overlap = radius - Math.sqrt(distanceSquared);
                        let normal = { x: distanceX, y: distanceY };
                        let length = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
                        if (length > 0) {
                            normal.x /= length;
                            normal.y /= length;
                        }

                        // Move the player out of the wall
                        this.player.x += normal.x * overlap;
                        this.player.y += normal.y * overlap;

                        // Reflect the velocity
                        let dotProduct = (this.player.velocity.x * normal.x) + (this.player.velocity.y * normal.y);
                        this.player.velocity.x -= 2 * dotProduct * normal.x;
                        this.player.velocity.y -= 2 * dotProduct * normal.y;
                    }
                }
            }
        }
    }

    checkWinCondition() {
        const dx = this.player.x - this.goal.x;
        const dy = this.player.y - this.goal.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.player.radius) {
            this.gameState.isPlaying = false;
            this.gameState.score += 100;
            this.updateUI();
            alert('미로 탈출 성공! (You escaped the maze!)');
        }
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.renderMaze();
        this.renderGoal();
        this.renderPlayer();
    }

    renderMaze() {
        const { tileSize } = this.maze;
        this.ctx.fillStyle = '#4a4a7f';
        for (let row = 0; row < this.maze.layout.length; row++) {
            for (let col = 0; col < this.maze.layout[row].length; col++) {
                if (this.maze.layout[row][col] === 1) {
                    this.ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
                }
            }
        }
    }

    renderGoal() {
        this.ctx.fillStyle = '#00ff88';
        this.ctx.beginPath();
        this.ctx.arc(this.goal.x, this.goal.y, this.maze.tileSize / 3, 0, Math.PI * 2);
        this.ctx.fill();
    }

    renderPlayer() {
        this.ctx.fillStyle = '#667eea';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    gameLoop() {
        if (this.gameState.isPlaying) {
            this.update();
        }
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }

    updateUI() {
        const scoreElement = document.getElementById('scoreValue');
        if (scoreElement) {
            scoreElement.textContent = this.gameState.score;
        }
    }

    updateSensorStatus(isConnected) {
        const statusElement = document.getElementById('sensorStatus');
        if (statusElement) {
            if (isConnected) {
                statusElement.textContent = '📱 센서 연결됨';
                statusElement.style.color = '#00ff88';
            } else {
                statusElement.textContent = '⌨️ 시뮬레이션 모드 (WASD/화살표)';
                statusElement.style.color = '#ffaa00';
            }
        }
    }

    restart() {
        this.gameState.isPlaying = true;
        this.gameState.score = 0;
        this.player.velocity = { x: 0, y: 0 };
        this.setPlayerAndGoalPositions();
        this.updateUI();
    }

    calibrate() {
        // The SDK handles calibration, but we can provide feedback
        super.calibrate();
        alert('센서가 보정되었습니다. 현재 위치가 새로운 중앙값으로 설정됩니다.');
    }
}

// 게임 인스턴스 생성 (필수)
document.addEventListener('DOMContentLoaded', () => {
    window.game = new LabyrinthEscape();
});