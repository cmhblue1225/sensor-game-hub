# 🤖 LLM을 위한 센서 게임 개발 완전 가이드

> **Claude Code, Gemini CLI 등 AI 개발 어시스턴트 전용 프롬프트 문서**

## 🎯 프로젝트 개요

**센서 게임 허브 v2.0**은 모바일 센서를 활용한 게임 개발 플랫폼입니다. 여러 사용자가 동시에 독립적으로 게임을 플레이할 수 있는 **세션 기반 매칭 시스템**이 핵심입니다.

### 🔄 시스템 아키텍처
```
[모바일 센서] ↔ [WebSocket Server] ↔ [게임 클라이언트]
     📱        세션 ID 기반 1:1 매칭        💻

멀티 유저 지원:
세션 A: 모바일1 ↔ 게임1
세션 B: 모바일2 ↔ 게임2  
세션 C: 모바일3 ↔ 게임3
```

## 📂 프로젝트 구조

```
sensor-game-hub-v2/
├── server.js                     # Express + WebSocket 서버 (세션 관리)
├── games/                        # 게임 폴더 (여기에 새 게임 생성)
│   └── your-game-name/
│       ├── index.html            # 게임 메인 페이지
│       ├── game.js              # 게임 로직 (필수)
│       └── game.json            # 게임 메타데이터 (선택)
├── sdk/
│   └── sensor-game-sdk.js       # 센서 게임 SDK (자동 매칭)
└── core/
    ├── sensor-client.html       # 모바일 센서 클라이언트
    └── sensor-client.js         # 센서 수집 로직
```

## 🛠️ 게임 개발 필수 구조

### 1. HTML 템플릿 (index.html)
```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>게임 이름</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background: #0f0f23;
            color: white;
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
        }
        
        #gameCanvas {
            border: 2px solid #333;
            border-radius: 10px;
            background: #1a1a2e;
        }
        
        .game-ui {
            margin: 20px 0;
            display: flex;
            gap: 20px;
            align-items: center;
            flex-wrap: wrap;
            justify-content: center;
        }
        
        .sensor-status {
            padding: 10px 15px;
            border-radius: 20px;
            background: #333;
            font-weight: bold;
        }
        
        button {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            background: #667eea;
            color: white;
            cursor: pointer;
            font-size: 14px;
        }
        
        button:hover {
            background: #5a6fd8;
        }
    </style>
</head>
<body>
    <h1>게임 이름</h1>
    
    <div class="game-ui">
        <div class="sensor-status" id="sensorStatus">센서 연결 대기중...</div>
        <div>점수: <span id="scoreValue">0</span></div>
        <button onclick="window.game && window.game.restart()">다시 시작</button>
        <button onclick="window.game && window.game.calibrate()">센서 보정</button>
        <button onclick="window.open('/', '_blank')">🏠 허브로</button>
    </div>
    
    <canvas id="gameCanvas" width="800" height="600"></canvas>
    
    <!-- SDK 로드 (필수) -->
    <script src="../../sdk/sensor-game-sdk.js"></script>
    <script src="game.js"></script>
</body>
</html>
```

### 2. JavaScript 게임 로직 템플릿 (game.js)

**⚠️ 중요: 반드시 이 구조를 따라야 함**

```javascript
/**
 * 센서 게임 허브 v2.0 호환 게임
 * 필수: SensorGameSDK 상속 + 센서 매칭 시스템
 */

class YourGameName extends SensorGameSDK {
    constructor() {
        super({
            gameId: 'your-game-name',           // 폴더명과 동일
            gameName: '게임 이름',
            requestedSensors: ['orientation'],   // 'accelerometer', 'gyroscope'
            sensorSensitivity: {
                orientation: 0.8,               // 0.1~2.0 (낮을수록 둔감)
                accelerometer: 1.0,
                gyroscope: 1.0
            },
            smoothingFactor: 3,                 // 1~10 (높을수록 부드러움)
            deadzone: 0.1                       // 0~0.5 (작은 움직임 무시)
        });
        
        // 게임 상태 초기화
        this.gameState = {
            score: 0,
            level: 1,
            isPlaying: true
        };
        
        // 게임 오브젝트 초기화
        this.player = {
            x: 400,
            y: 300,
            velocity: { x: 0, y: 0 }
        };
        
        // 캔버스 설정
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 게임 초기화
        this.initializeGame();
    }
    
    /**
     * 게임 초기화 (필수 메서드)
     */
    initializeGame() {
        console.log('🎮 게임 초기화 시작');
        
        // 센서 데이터 콜백 등록 (필수)
        this.on('onSensorData', (gameInput) => {
            this.handleSensorInput(gameInput);
        });
        
        // 센서 상태 변경 콜백 등록 (필수)
        this.on('onSensorStatusChange', (status) => {
            this.updateSensorStatus(status.connected);
        });
        
        // UI 업데이트
        this.updateUI();
        
        // 게임 루프 시작
        this.gameLoop();
    }
    
    /**
     * 센서 입력 처리 (필수 메서드)
     * @param {Object} gameInput - 센서 데이터
     * @param {Object} gameInput.tilt - 기울기 {x: -1~1, y: -1~1}
     * @param {Object} gameInput.shake - 흔들기 {detected: boolean, intensity: 0~20}
     * @param {Object} gameInput.rotation - 회전 {speed: 0~100, direction: 0~360}
     */
    handleSensorInput(gameInput) {
        if (!this.gameState.isPlaying) return;
        
        // 기울기 기반 이동 (가장 일반적)
        if (gameInput.tilt) {
            this.player.velocity.x += gameInput.tilt.x * 0.5;
            this.player.velocity.y += gameInput.tilt.y * 0.5;
        }
        
        // 흔들기 기반 액션
        if (gameInput.shake && gameInput.shake.detected) {
            if (gameInput.shake.intensity > 15) {
                this.handleShakeAction();
            }
        }
        
        // 회전 기반 조작
        if (gameInput.rotation && gameInput.rotation.speed > 30) {
            this.handleRotationAction(gameInput.rotation.direction);
        }
    }
    
    /**
     * 게임 업데이트 (필수 메서드)
     */
    update() {
        if (!this.gameState.isPlaying) return;
        
        // 물리 계산
        this.player.x += this.player.velocity.x;
        this.player.y += this.player.velocity.y;
        
        // 마찰 적용
        this.player.velocity.x *= 0.95;
        this.player.velocity.y *= 0.95;
        
        // 화면 경계 처리
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x > this.canvas.width) this.player.x = this.canvas.width;
        if (this.player.y < 0) this.player.y = 0;
        if (this.player.y > this.canvas.height) this.player.y = this.canvas.height;
        
        // 게임 로직 업데이트
        this.updateGameLogic();
    }
    
    /**
     * 게임 렌더링 (필수 메서드)
     */
    render() {
        // 화면 지우기
        this.ctx.fillStyle = 'rgba(15, 15, 35, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 플레이어 그리기
        this.ctx.fillStyle = '#667eea';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, 20, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 추가 게임 오브젝트 렌더링
        this.renderGameObjects();
    }
    
    /**
     * 게임 루프 (필수 메서드)
     */
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    /**
     * UI 업데이트 (필수 메서드)
     */
    updateUI() {
        const scoreElement = document.getElementById('scoreValue');
        if (scoreElement) {
            scoreElement.textContent = this.gameState.score;
        }
    }
    
    /**
     * 센서 상태 업데이트 (필수 메서드)
     */
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
    
    /**
     * 게임 재시작 (권장 메서드)
     */
    restart() {
        this.gameState.score = 0;
        this.gameState.level = 1;
        this.player.x = 400;
        this.player.y = 300;
        this.player.velocity = { x: 0, y: 0 };
        this.updateUI();
    }
    
    // === 여기서부터 게임별 커스텀 로직 구현 ===
    
    updateGameLogic() {
        // 게임별 로직 구현
    }
    
    renderGameObjects() {
        // 게임별 렌더링 구현
    }
    
    handleShakeAction() {
        // 흔들기 액션 처리
    }
    
    handleRotationAction(direction) {
        // 회전 액션 처리
    }
}

// 게임 인스턴스 생성 (필수)
document.addEventListener('DOMContentLoaded', () => {
    window.game = new YourGameName();
});
```

### 3. 게임 메타데이터 (game.json) - 선택사항

```json
{
    "id": "your-game-name",
    "name": "게임 이름",
    "description": "게임에 대한 간단한 설명",
    "author": "개발자 이름",
    "version": "1.0.0",
    "category": "puzzle",
    "difficulty": "easy",
    "icon": "🎮",
    "sensorTypes": ["orientation"],
    "features": ["singleplayer", "sensor-control", "session-based"],
    "requirements": {
        "sensors": ["orientation"],
        "permissions": ["devicemotion", "deviceorientation"]
    },
    "settings": {
        "autoMatch": true,
        "maxPlayers": 1,
        "sessionTimeout": 300000
    }
}
```

## 📱 센서 데이터 활용 가이드

### 사용 가능한 센서

1. **방향 센서 (orientation)** - 가장 안정적
   - `gameInput.tilt.x`: 좌우 기울기 (-1 ~ 1)
   - `gameInput.tilt.y`: 앞뒤 기울기 (-1 ~ 1)

2. **가속도계 (accelerometer)** - 흔들기 감지
   - `gameInput.shake.detected`: 흔들기 감지 (boolean)
   - `gameInput.shake.intensity`: 흔들기 강도 (0 ~ 20)

3. **자이로스코프 (gyroscope)** - 회전 감지
   - `gameInput.rotation.speed`: 회전 속도 (0 ~ 100)
   - `gameInput.rotation.direction`: 회전 방향 (0 ~ 360)

### 게임 타입별 활용 패턴

#### 퍼즐/미로 게임
```javascript
handleSensorInput(gameInput) {
    // 부드러운 중력 시뮬레이션
    const gravity = 0.3;
    this.ball.velocity.x += gameInput.tilt.x * gravity;
    this.ball.velocity.y += gameInput.tilt.y * gravity;
    
    // 마찰 적용
    this.ball.velocity.x *= 0.95;
    this.ball.velocity.y *= 0.95;
}
```

#### 액션/슈팅 게임
```javascript
handleSensorInput(gameInput) {
    // 빠른 플레이어 이동
    this.player.x += gameInput.tilt.x * 8;
    
    // 흔들기로 발사
    if (gameInput.shake.detected && gameInput.shake.intensity > 15) {
        this.fireWeapon();
    }
}
```

#### 레이싱 게임
```javascript
handleSensorInput(gameInput) {
    // 핸들링
    this.car.steeringAngle = gameInput.tilt.x * 30; // 최대 30도
    
    // 앞뒤 기울기로 가속/브레이크
    if (gameInput.tilt.y < -0.3) {
        this.car.accelerate();
    } else if (gameInput.tilt.y > 0.3) {
        this.car.brake();
    }
}
```

## 🎨 반응형 캔버스 구현

```javascript
setupResponsiveCanvas() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
}

resizeCanvas() {
    const container = this.canvas.parentElement;
    const maxWidth = Math.min(container.clientWidth - 40, 800);
    const maxHeight = Math.min(container.clientHeight - 200, 600);
    
    // 4:3 비율 유지
    const aspectRatio = 4/3;
    let width = maxWidth;
    let height = width / aspectRatio;
    
    if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
    }
    
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    
    // 스케일링 계산
    this.scaleX = width / 800;
    this.scaleY = height / 600;
}
```

## 🔧 개발/테스트용 키보드 시뮬레이션

```javascript
setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
        this.keys[e.key.toLowerCase()] = true;
    });
    
    document.addEventListener('keyup', (e) => {
        this.keys[e.key.toLowerCase()] = false;
    });
}

handleKeyboardInput() {
    if (!this.gameState.isPlaying) return;
    
    let mockInput = { tilt: { x: 0, y: 0 }, shake: { detected: false, intensity: 0 } };
    
    // WASD/화살표 키로 기울기 시뮬레이션
    if (this.keys['w'] || this.keys['arrowup']) mockInput.tilt.y = -1;
    if (this.keys['s'] || this.keys['arrowdown']) mockInput.tilt.y = 1;
    if (this.keys['a'] || this.keys['arrowleft']) mockInput.tilt.x = -1;
    if (this.keys['d'] || this.keys['arrowright']) mockInput.tilt.x = 1;
    
    // 스페이스바로 흔들기 시뮬레이션
    if (this.keys[' ']) {
        mockInput.shake.detected = true;
        mockInput.shake.intensity = 20;
    }
    
    // 센서 입력이 없을 때만 키보드 입력 사용
    if (!this.sensorConnected) {
        this.handleSensorInput(mockInput);
    }
}
```

## ⚠️ 필수 주의사항

### 1. SDK 사용 (필수)
- 반드시 `SensorGameSDK`를 상속받아야 함
- 직접 WebSocket 구현 금지 (호환성 문제)

### 2. 세션 기반 매칭 (v2.0 필수)
- SDK가 자동으로 센서 매칭 처리
- 개발자는 센서 매칭 코드 작성 불필요

### 3. 폴더 구조 (필수)
```
games/your-game-name/
├── index.html    # 필수
├── game.js       # 필수  
└── game.json     # 선택
```

### 4. 센서 상태 표시 (필수)
- 센서 연결 상태를 사용자에게 명확히 표시
- 시뮬레이션 모드 안내 제공

### 5. 에러 처리 (권장)
```javascript
constructor() {
    try {
        super(config);
        this.initializeGame();
    } catch (error) {
        console.error('게임 초기화 실패:', error);
        this.showErrorMessage('게임을 로드할 수 없습니다.');
    }
}
```

## 📊 성능 최적화

### 1. 프레임 제한
```javascript
gameLoop(timestamp) {
    if (timestamp - this.lastFrameTime < 16.67) { // 60fps
        requestAnimationFrame((ts) => this.gameLoop(ts));
        return;
    }
    
    this.update();
    this.render();
    this.lastFrameTime = timestamp;
    requestAnimationFrame((ts) => this.gameLoop(ts));
}
```

### 2. 객체 풀링
```javascript
class ParticlePool {
    constructor(size = 100) {
        this.pool = [];
        this.active = [];
        for (let i = 0; i < size; i++) {
            this.pool.push(this.createParticle());
        }
    }
    
    get() {
        return this.pool.pop() || this.createParticle();
    }
    
    release(particle) {
        this.resetParticle(particle);
        this.pool.push(particle);
    }
}
```

## 🎮 게임 카테고리별 예제

### Puzzle 게임
- 기울기로 볼 굴리기
- 미로 탈출
- 블록 쌓기

### Action 게임  
- 기울기 슈팅
- 장애물 피하기
- 플랫폼 점프

### Racing 게임
- 기울기 레이싱
- 드리프트 게임
- 비행 시뮬레이터

### Casual 게임
- 흔들기 주사위
- 기울기 그림 그리기
- 리듬 게임

## ✅ 개발 완료 체크리스트

### 필수 구현
- [ ] SensorGameSDK 상속
- [ ] 필수 메서드 구현 (initializeGame, handleSensorInput, update, render)
- [ ] 센서 상태 UI 표시
- [ ] 반응형 캔버스 구현
- [ ] 키보드 시뮬레이션 모드

### 호환성 테스트
- [ ] 센서 연결/해제 정상 작동
- [ ] 멀티 유저 환경에서 독립적 작동
- [ ] 모바일/데스크톱 모든 환경에서 작동
- [ ] 에러 상황에서 안정적 작동

### 최적화
- [ ] 60fps 유지
- [ ] 메모리 누수 없음
- [ ] 부드러운 센서 반응

이 가이드를 정확히 따라 개발하면 센서 게임 허브 v2.0과 100% 호환되는 게임을 만들 수 있습니다. 🎮✨