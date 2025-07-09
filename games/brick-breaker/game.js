/**
 * 센서 게임 허브 v2.0 호환 게임: 벽돌깨기
 * 필수: SensorGameSDK 상속 + 센서 매칭 시스템
 */

class BrickBreaker extends SensorGameSDK {
    constructor() {
        super({
            gameId: 'brick-breaker',           // 폴더명과 동일
            gameName: '벽돌깨기',
            requestedSensors: ['orientation'],   // 'accelerometer', 'gyroscope'
            sensorSensitivity: {
                orientation: 1.2,               // 0.1~2.0 (낮을수록 둔감)
            },
            smoothingFactor: 2,                 // 1~10 (높을수록 부드러움)
            deadzone: 0.05                       // 0~0.5 (작은 움직임 무시)
        });
        
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.initializeGame();
    }
    
    initializeGame() {
        console.log('🎮 벽돌깨기 게임 초기화 시작');
        
        this.on('onSensorData', (gameInput) => {
            this.handleSensorInput(gameInput);
        });
        
        this.on('onSensorStatusChange', (status) => {
            this.updateSensorStatus(status.connected);
        });
        
        this.restart();
        this.gameLoop();
    }

    restart() {
        this.gameState = { score: 0, lives: 3, isPlaying: true };
        this.paddle = { x: this.canvas.width / 2 - 50, y: this.canvas.height - 30, width: 100, height: 10, speed: 0 };
        this.ball = { x: this.canvas.width / 2, y: this.canvas.height - 50, radius: 8, dx: 2, dy: -2 };
        this.bricks = [];
        this.createBricks();
        this.updateUI();
    }

    createBricks() {
        const brickRowCount = 5;
        const brickColumnCount = 8;
        const brickWidth = 75;
        const brickHeight = 20;
        const brickPadding = 10;
        const brickOffsetTop = 30;
        const brickOffsetLeft = 30;

        for (let c = 0; c < brickColumnCount; c++) {
            this.bricks[c] = [];
            for (let r = 0; r < brickRowCount; r++) {
                this.bricks[c][r] = { x: 0, y: 0, status: 1 };
                this.bricks[c][r].x = (c * (brickWidth + brickPadding)) + brickOffsetLeft;
                this.bricks[c][r].y = (r * (brickHeight + brickPadding)) + brickOffsetTop;
            }
        }
    }
    
    handleSensorInput(gameInput) {
        if (!this.gameState.isPlaying) return;
        
        if (gameInput.tilt) {
            this.paddle.speed = gameInput.tilt.x * 15;
        }
    }
    
    update() {
        if (!this.gameState.isPlaying) return;

        // Paddle movement
        this.paddle.x += this.paddle.speed;
        if (this.paddle.x < 0) this.paddle.x = 0;
        if (this.paddle.x + this.paddle.width > this.canvas.width) {
            this.paddle.x = this.canvas.width - this.paddle.width;
        }

        // Ball movement
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;

        // Wall collision
        if (this.ball.x + this.ball.radius > this.canvas.width || this.ball.x - this.ball.radius < 0) {
            this.ball.dx = -this.ball.dx;
        }
        if (this.ball.y - this.ball.radius < 0) {
            this.ball.dy = -this.ball.dy;
        }

        // Paddle collision
        if (this.ball.y + this.ball.radius > this.paddle.y && 
            this.ball.x > this.paddle.x && 
            this.ball.x < this.paddle.x + this.paddle.width) {
            this.ball.dy = -this.ball.dy;
        }

        // Bottom wall (lose life)
        if (this.ball.y + this.ball.radius > this.canvas.height) {
            this.gameState.lives--;
            if (this.gameState.lives <= 0) {
                this.gameState.isPlaying = false;
                // Game Over logic here
            } else {
                this.ball.x = this.canvas.width / 2;
                this.ball.y = this.canvas.height - 50;
                this.ball.dx = 2;
                this.ball.dy = -2;
            }
        }

        // Brick collision
        this.brickCollision();
        this.updateUI();
    }

    brickCollision() {
        for (let c = 0; c < this.bricks.length; c++) {
            for (let r = 0; r < this.bricks[c].length; r++) {
                const b = this.bricks[c][r];
                if (b.status === 1) {
                    if (this.ball.x > b.x && this.ball.x < b.x + 75 && this.ball.y > b.y && this.ball.y < b.y + 20) {
                        this.ball.dy = -this.ball.dy;
                        b.status = 0;
                        this.gameState.score += 10;
                    }
                }
            }
        }
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw paddle
        this.ctx.fillStyle = '#667eea';
        this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);

        // Draw ball
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fill();
        this.ctx.closePath();

        // Draw bricks
        this.renderBricks();
    }

    renderBricks() {
        for (let c = 0; c < this.bricks.length; c++) {
            for (let r = 0; r < this.bricks[c].length; r++) {
                if (this.bricks[c][r].status === 1) {
                    this.ctx.fillStyle = '#ff7f50';
                    this.ctx.fillRect(this.bricks[c][r].x, this.bricks[c][r].y, 75, 20);
                }
            }
        }
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    updateUI() {
        document.getElementById('scoreValue').textContent = this.gameState.score;
    }
    
    updateSensorStatus(isConnected) {
        const statusElement = document.getElementById('sensorStatus');
        if (statusElement) {
            if (isConnected) {
                statusElement.textContent = '📱 센서 연결됨';
                statusElement.style.color = '#00ff88';
            } else {
                statusElement.textContent = '⌨️ 시뮬레이션 모드 (←/→)';
                statusElement.style.color = '#ffaa00';
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.game = new BrickBreaker();
});