/**
 * {{GAME_NAME}} 게임 클래스
 * 센서 게임 SDK를 확장하여 구현
 */
class {{GAME_CLASS_NAME}} extends SensorGameSDK {
    constructor() {
        super({
            gameId: '{{GAME_ID}}',
            gameName: '{{GAME_NAME}}',
            requestedSensors: ['orientation'], // 필요한 센서: orientation, accelerometer, gyroscope
            sensorSensitivity: {
                orientation: 0.8,
                accelerometer: 0.5,
                gyroscope: 0.3
            },
            smoothingFactor: 3
        });
        
        // 게임 요소들
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.score = 0;
        this.gameRunning = false;
        
        // 게임 오브젝트들
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            radius: 20,
            color: '#667eea'
        };
        
        this.setupGame();
    }
    
    /**
     * 게임 초기 설정
     */
    setupGame() {
        // 센서 데이터 처리
        this.on('onSensorData', (gameInput) => {
            if (this.gameRunning) {
                this.handleSensorInput(gameInput);
            }
        });
        
        // 시뮬레이션 모드 처리
        this.on('onSimulationInput', (input) => {
            if (this.gameRunning) {
                this.handleSimulationInput(input);
            }
        });
        
        // 센서 연결 상태 변경
        this.on('onSensorStatusChange', (status) => {
            document.getElementById('sensorStatus').textContent = 
                status.connected ? '센서 연결됨' : '센서 연결 대기중...';
        });
        
        // 게임 시작
        this.startGame();
    }
    
    /**
     * 센서 입력 처리
     */
    handleSensorInput(gameInput) {
        // 기울기로 플레이어 이동
        this.player.x += gameInput.tilt.x * 3;
        this.player.y += gameInput.tilt.y * 3;
        
        // 화면 경계 처리
        this.constrainPlayer();
        
        // 흔들기 감지 시 특별 액션
        if (gameInput.shake.detected) {
            this.handleShake();
        }
    }
    
    /**
     * 시뮬레이션 입력 처리 (키보드)
     */
    handleSimulationInput(input) {
        const speed = 5;
        
        if (input.keys.w || input.keys.ArrowUp) this.player.y -= speed;
        if (input.keys.s || input.keys.ArrowDown) this.player.y += speed;
        if (input.keys.a || input.keys.ArrowLeft) this.player.x -= speed;
        if (input.keys.d || input.keys.ArrowRight) this.player.x += speed;
        
        this.constrainPlayer();
    }
    
    /**
     * 플레이어 위치 제한
     */
    constrainPlayer() {
        const margin = this.player.radius;
        this.player.x = Math.max(margin, Math.min(this.canvas.width - margin, this.player.x));
        this.player.y = Math.max(margin, Math.min(this.canvas.height - margin, this.player.y));
    }
    
    /**
     * 흔들기 처리
     */
    handleShake() {
        // 흔들기 시 실행할 로직
        console.log('흔들기 감지!');
    }
    
    /**
     * 게임 시작
     */
    startGame() {
        this.gameRunning = true;
        this.gameLoop();
    }
    
    /**
     * 게임 루프
     */
    gameLoop() {
        if (!this.gameRunning) return;
        
        // 게임 로직 업데이트
        this.update();
        
        // 화면 렌더링
        this.render();
        
        // 다음 프레임 요청
        requestAnimationFrame(() => this.gameLoop());
    }
    
    /**
     * 게임 로직 업데이트
     */
    update() {
        // 여기에 게임 로직 추가
        // 예: 충돌 검사, 점수 업데이트 등
    }
    
    /**
     * 화면 렌더링
     */
    render() {
        // 화면 지우기
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 플레이어 그리기
        this.ctx.fillStyle = this.player.color;
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 점수 업데이트
        document.getElementById('scoreValue').textContent = this.score;
    }
    
    /**
     * 게임 재시작
     */
    restart() {
        this.score = 0;
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height / 2;
        this.gameRunning = true;
    }
    
    /**
     * 센서 보정
     */
    calibrate() {
        this.calibrateSensors();
        console.log('센서 보정 완료');
    }
}

// 게임 인스턴스 생성
document.addEventListener('DOMContentLoaded', () => {
    window.game = new {{GAME_CLASS_NAME}}();
});