# 🎮 센서 게임 허브 v2.0 완전 개발 가이드

> **개발자를 위한 통합 문서 - 설치부터 배포까지 모든 과정을 포함**

## 🌟 프로젝트 소개

센서 게임 허브 v2.0은 모바일 센서(자이로스코프, 가속도계, 방향센서)를 활용한 게임 개발 및 배포 플랫폼입니다. **여러 사용자가 동시에 독립적으로 게임을 플레이할 수 있는 세션 기반 매칭 시스템**이 핵심 특징입니다.

### ✨ 주요 특징

- 🔒 **HTTPS 전용**: iOS/Android 모든 기기에서 센서 권한 지원
- 👥 **멀티 유저**: 여러 사용자가 동시에 독립적으로 플레이
- 🎯 **세션 기반 매칭**: 센서와 게임의 1:1 자동 매칭
- 📱 **스마트 디바이스 감지**: 모바일/PC 자동 구분 및 최적화
- 🎮 **쉬운 개발**: JavaScript SDK로 빠른 게임 개발
- 🚀 **클라우드 배포**: Render 플랫폼 최적화

## 🚀 빠른 시작

### 1. 환경 설정

#### 시스템 요구사항
- **Node.js**: 14.0 이상
- **OpenSSL**: HTTPS 인증서 생성 (macOS/Linux 기본 설치)
- **브라우저**: Chrome, Safari, Firefox, Edge 최신 버전
- **네트워크**: 모바일과 개발 서버가 동일 WiFi 연결

#### 프로젝트 설치
```bash
# 1. 저장소 클론
git clone https://github.com/your-username/sensor-game-hub.git
cd sensor-game-hub

# 2. 의존성 설치
npm install

# 3. HTTPS 인증서 생성 및 설정 (iOS 센서 권한 필수)
./setup-ssl.sh

# 4. 개발 서버 실행
npm start
```

### 2. 접속 확인

서버 실행 후 다음 URL로 접속:
- **메인 허브**: https://localhost:8443
- **센서 클라이언트**: https://localhost:8443/sensor-client
- **대시보드**: https://localhost:8443/dashboard

## 📱 모바일 센서 연결

### HTTPS 설정 (iOS 필수)

iOS 13+ 디바이스에서 센서 권한을 얻으려면 **반드시 HTTPS 연결**이 필요합니다.

```bash
# 자동 인증서 생성 및 시스템 신뢰 설정
./setup-ssl.sh

# 서버 시작 (HTTP + HTTPS 동시 실행)
npm start
```

### 연결 단계

1. **컴퓨터에서 서버 실행**: `npm start`
2. **네트워크 IP 확인**:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
3. **모바일에서 접속**:
   - **Android**: `http://[IP]:8080/sensor-client`
   - **iOS**: `https://[IP]:8443/sensor-client` ⭐ **HTTPS 필수**

4. **iOS 보안 경고 해결**:
   - "이 연결은 비공개 연결이 아닙니다" → "고급" → "안전하지 않음으로 이동"
   - 센서 권한 요청 시 "허용" 선택

5. **센서 권한 허용** 후 게임 플레이

## 🎮 첫 번째 게임 개발

### 1. 게임 폴더 생성

```bash
mkdir games/my-first-game
cd games/my-first-game
```

### 2. 기본 파일 구조

모든 게임은 다음 구조를 따라야 합니다:

```
games/my-first-game/
├── index.html              # 게임 메인 페이지 (필수)
├── game.js                # 게임 로직 (필수)
├── game.json              # 게임 메타데이터 (선택)
└── assets/                # 게임 리소스 (선택)
    ├── images/
    ├── sounds/
    └── models/
```

### 3. HTML 템플릿 (index.html)

```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>나의 첫 번째 센서 게임</title>
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
            max-width: 100%;
            height: auto;
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
        
        .score {
            font-size: 18px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <h1>🎮 나의 첫 번째 센서 게임</h1>
    
    <div class="game-ui">
        <div class="sensor-status" id="sensorStatus">센서 연결 대기중...</div>
        <div class="score">점수: <span id="scoreValue">0</span></div>
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

### 4. JavaScript 게임 로직 (game.js)

```javascript
/**
 * 나의 첫 번째 센서 게임
 * 기울여서 조작하는 간단한 볼 게임
 */

class MyFirstGame extends SensorGameSDK {
    constructor() {
        super({
            gameId: 'my-first-game',
            gameName: '나의 첫 번째 센서 게임',
            requestedSensors: ['orientation'],
            sensorSensitivity: {
                orientation: 0.8  // 부드러운 조작감
            },
            smoothingFactor: 3,
            deadzone: 0.1
        });
        
        // 게임 상태 초기화
        this.gameState = {
            score: 0,
            level: 1,
            isPlaying: true
        };
        
        // 게임 오브젝트
        this.ball = {
            x: 400,
            y: 300,
            radius: 20,
            velocity: { x: 0, y: 0 },
            color: '#667eea'
        };
        
        this.target = {
            x: 600,
            y: 200,
            radius: 30,
            color: '#00ff88'
        };
        
        // 키보드 상태 (시뮬레이션 모드)
        this.keys = {};
        
        // 캔버스 설정
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 게임 초기화
        this.initializeGame();
    }
    
    /**
     * 게임 초기화
     */
    initializeGame() {
        console.log('🎮 게임 초기화 시작');
        
        // 센서 데이터 콜백 등록
        this.on('onSensorData', (gameInput) => {
            this.handleSensorInput(gameInput);
        });
        
        // 센서 상태 변경 콜백
        this.on('onSensorStatusChange', (status) => {
            this.updateSensorStatus(status.connected);
        });
        
        // 반응형 캔버스 설정
        this.setupResponsiveCanvas();
        
        // 키보드 컨트롤 설정 (개발/테스트용)
        this.setupKeyboardControls();
        
        // UI 업데이트
        this.updateUI();
        
        // 게임 루프 시작
        this.gameLoop();
    }
    
    /**
     * 반응형 캔버스 설정
     */
    setupResponsiveCanvas() {
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
        
        // 게임 오브젝트 스케일링
        this.scaleX = width / 800;
        this.scaleY = height / 600;
    }
    
    /**
     * 키보드 컨트롤 설정 (개발/테스트용)
     */
    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }
    
    /**
     * 센서 입력 처리
     */
    handleSensorInput(gameInput) {
        if (!this.gameState.isPlaying) return;
        
        // 기울기를 물리력으로 변환
        const forceX = gameInput.tilt.x * 0.5;
        const forceY = gameInput.tilt.y * 0.5;
        
        // 공에 힘 적용
        this.ball.velocity.x += forceX;
        this.ball.velocity.y += forceY;
        
        // 최대 속도 제한
        const maxSpeed = 8;
        const speed = Math.sqrt(this.ball.velocity.x ** 2 + this.ball.velocity.y ** 2);
        if (speed > maxSpeed) {
            this.ball.velocity.x = (this.ball.velocity.x / speed) * maxSpeed;
            this.ball.velocity.y = (this.ball.velocity.y / speed) * maxSpeed;
        }
    }
    
    /**
     * 키보드 입력 처리 (시뮬레이션 모드)
     */
    handleKeyboardInput() {
        if (!this.gameState.isPlaying) return;
        
        let mockInput = { tilt: { x: 0, y: 0 } };
        
        // WASD/화살표 키
        if (this.keys['w'] || this.keys['arrowup']) mockInput.tilt.y = -1;
        if (this.keys['s'] || this.keys['arrowdown']) mockInput.tilt.y = 1;
        if (this.keys['a'] || this.keys['arrowleft']) mockInput.tilt.x = -1;
        if (this.keys['d'] || this.keys['arrowright']) mockInput.tilt.x = 1;
        
        // 센서가 연결되지 않았을 때만 키보드 입력 사용
        if (mockInput.tilt.x !== 0 || mockInput.tilt.y !== 0) {
            this.handleSensorInput(mockInput);
        }
    }
    
    /**
     * 게임 업데이트
     */
    update() {
        if (!this.gameState.isPlaying) return;
        
        // 키보드 입력 처리 (시뮬레이션 모드)
        this.handleKeyboardInput();
        
        // 물리 계산
        this.updatePhysics();
        
        // 목표 도달 체크
        this.checkTargetReached();
    }
    
    /**
     * 물리 시뮬레이션
     */
    updatePhysics() {
        // 마찰 적용
        this.ball.velocity.x *= 0.95;
        this.ball.velocity.y *= 0.95;
        
        // 위치 업데이트
        this.ball.x += this.ball.velocity.x;
        this.ball.y += this.ball.velocity.y;
        
        // 화면 경계 충돌
        const canvas = this.canvas;
        const radius = this.ball.radius;
        
        if (this.ball.x - radius < 0) {
            this.ball.x = radius;
            this.ball.velocity.x *= -0.7;
        }
        if (this.ball.x + radius > canvas.width / (this.scaleX || 1)) {
            this.ball.x = (canvas.width / (this.scaleX || 1)) - radius;
            this.ball.velocity.x *= -0.7;
        }
        if (this.ball.y - radius < 0) {
            this.ball.y = radius;
            this.ball.velocity.y *= -0.7;
        }
        if (this.ball.y + radius > canvas.height / (this.scaleY || 1)) {
            this.ball.y = (canvas.height / (this.scaleY || 1)) - radius;
            this.ball.velocity.y *= -0.7;
        }
    }
    
    /**
     * 목표 도달 체크
     */
    checkTargetReached() {
        const distance = Math.sqrt(
            (this.ball.x - this.target.x) ** 2 + (this.ball.y - this.target.y) ** 2
        );
        
        if (distance < this.target.radius) {
            this.gameState.score += 100;
            this.generateNewTarget();
            this.updateUI();
        }
    }
    
    /**
     * 새 목표 생성
     */
    generateNewTarget() {
        const canvas = this.canvas;
        const margin = 50;
        
        this.target.x = margin + Math.random() * ((canvas.width / (this.scaleX || 1)) - margin * 2);
        this.target.y = margin + Math.random() * ((canvas.height / (this.scaleY || 1)) - margin * 2);
    }
    
    /**
     * 게임 렌더링
     */
    render() {
        const ctx = this.ctx;
        const canvas = this.canvas;
        
        // 화면 지우기
        ctx.fillStyle = 'rgba(15, 15, 35, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 스케일링 적용
        ctx.save();
        ctx.scale(this.scaleX || 1, this.scaleY || 1);
        
        // 목표 그리기
        ctx.fillStyle = this.target.color;
        ctx.beginPath();
        ctx.arc(this.target.x, this.target.y, this.target.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 목표 중앙 점
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.target.x, this.target.y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // 공 그리기 (그라디언트 효과)
        const gradient = ctx.createRadialGradient(
            this.ball.x - 5, this.ball.y - 5, 0,
            this.ball.x, this.ball.y, this.ball.radius
        );
        gradient.addColorStop(0, '#889bfc');
        gradient.addColorStop(1, this.ball.color);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // 하이라이트
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(this.ball.x - 5, this.ball.y - 5, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    /**
     * 게임 루프
     */
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    /**
     * UI 업데이트
     */
    updateUI() {
        const scoreElement = document.getElementById('scoreValue');
        if (scoreElement) {
            scoreElement.textContent = this.gameState.score;
        }
    }
    
    /**
     * 센서 상태 업데이트
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
     * 게임 재시작
     */
    restart() {
        this.gameState.score = 0;
        this.ball.x = 400;
        this.ball.y = 300;
        this.ball.velocity = { x: 0, y: 0 };
        this.generateNewTarget();
        this.updateUI();
    }
}

// 게임 인스턴스 생성
document.addEventListener('DOMContentLoaded', () => {
    window.game = new MyFirstGame();
});
```

### 5. 게임 메타데이터 (game.json) - 선택사항

```json
{
    "id": "my-first-game",
    "name": "나의 첫 번째 센서 게임",
    "description": "기울여서 조작하는 간단한 볼 게임",
    "author": "개발자 이름",
    "version": "1.0.0",
    "category": "casual",
    "difficulty": "easy",
    "icon": "🎮",
    "sensorTypes": ["orientation"],
    "features": ["singleplayer", "sensor-control", "session-based"],
    "requirements": {
        "sensors": ["orientation"],
        "permissions": ["devicemotion", "deviceorientation"]
    }
}
```

### 6. 게임 테스트

```bash
# 서버 재시작
npm start

# 브라우저에서 확인
# 1. 메인 허브: https://localhost:8443
# 2. 게임 목록에서 "나의 첫 번째 센서 게임" 확인
# 3. 모바일 센서 연결 후 테스트
```

## 📚 센서 활용 가이드

### 지원 센서 타입

1. **방향 센서 (orientation)** - 가장 안정적
   - `gameInput.tilt.x`: 좌우 기울기 (-1 ~ 1)
   - `gameInput.tilt.y`: 앞뒤 기울기 (-1 ~ 1)

2. **가속도계 (accelerometer)** - 흔들기 감지
   - `gameInput.shake.detected`: 흔들기 감지 (boolean)
   - `gameInput.shake.intensity`: 흔들기 강도 (0 ~ 20)

3. **자이로스코프 (gyroscope)** - 회전 감지
   - `gameInput.rotation.speed`: 회전 속도 (0 ~ 100)
   - `gameInput.rotation.direction`: 회전 방향 (0 ~ 360)

### 게임 타입별 센서 활용

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

#### 캐주얼 게임
```javascript
handleSensorInput(gameInput) {
    // 흔들기 강도에 따른 액션
    if (gameInput.shake.detected) {
        const intensity = Math.min(gameInput.shake.intensity / 20, 1);
        this.player.performAction(intensity);
    }
    
    // 회전으로 아이템 선택
    if (gameInput.rotation.speed > 30) {
        this.selectNextItem();
    }
}
```

## 🎨 고급 개발 기법

### 1. 성능 최적화

#### 프레임 제한
```javascript
constructor() {
    super(config);
    this.lastFrameTime = 0;
    this.frameRate = 60; // 목표 FPS
}

gameLoop(timestamp) {
    const frameInterval = 1000 / this.frameRate;
    
    if (timestamp - this.lastFrameTime < frameInterval) {
        requestAnimationFrame((ts) => this.gameLoop(ts));
        return;
    }
    
    this.update();
    this.render();
    
    this.lastFrameTime = timestamp;
    requestAnimationFrame((ts) => this.gameLoop(ts));
}
```

#### 객체 풀링
```javascript
class ParticlePool {
    constructor(size = 100) {
        this.pool = [];
        this.active = [];
        
        for (let i = 0; i < size; i++) {
            this.pool.push(this.createParticle());
        }
    }
    
    createParticle() {
        return {
            x: 0, y: 0, vx: 0, vy: 0,
            size: 0, alpha: 1, color: '#fff',
            active: false
        };
    }
    
    get() {
        const particle = this.pool.pop() || this.createParticle();
        this.active.push(particle);
        particle.active = true;
        return particle;
    }
    
    release(particle) {
        const index = this.active.indexOf(particle);
        if (index !== -1) {
            this.active.splice(index, 1);
            particle.active = false;
            this.pool.push(particle);
        }
    }
    
    updateAll() {
        for (let i = this.active.length - 1; i >= 0; i--) {
            const particle = this.active[i];
            
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.alpha -= 0.02;
            particle.size *= 0.98;
            
            if (particle.alpha <= 0 || particle.size < 1) {
                this.release(particle);
            }
        }
    }
    
    renderAll(ctx) {
        this.active.forEach(particle => {
            ctx.globalAlpha = particle.alpha;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;
    }
}
```

### 2. 고급 센서 처리

#### 센서 데이터 스무딩
```javascript
constructor() {
    super(config);
    this.sensorHistory = [];
    this.historySize = 5;
}

handleSensorInput(gameInput) {
    // 센서 히스토리 관리
    this.sensorHistory.push(gameInput);
    if (this.sensorHistory.length > this.historySize) {
        this.sensorHistory.shift();
    }
    
    // 평균값 계산
    const smoothedInput = this.smoothSensorData();
    this.applyGameLogic(smoothedInput);
}

smoothSensorData() {
    if (this.sensorHistory.length === 0) return { tilt: { x: 0, y: 0 } };
    
    let sumX = 0, sumY = 0;
    this.sensorHistory.forEach(input => {
        sumX += input.tilt.x;
        sumY += input.tilt.y;
    });
    
    return {
        tilt: {
            x: sumX / this.sensorHistory.length,
            y: sumY / this.sensorHistory.length
        }
    };
}
```

#### 센서 보정
```javascript
constructor() {
    super(config);
    this.calibration = { x: 0, y: 0 };
    this.isCalibrating = false;
}

calibrate() {
    super.calibrate(); // SDK 보정 호출
    
    // 게임별 추가 보정
    this.isCalibrating = true;
    setTimeout(() => {
        this.isCalibrating = false;
        console.log('게임 센서 보정 완료');
    }, 2000);
}

handleSensorInput(gameInput) {
    if (this.isCalibrating) return;
    
    // 보정값 적용
    const calibratedInput = {
        tilt: {
            x: gameInput.tilt.x - this.calibration.x,
            y: gameInput.tilt.y - this.calibration.y
        }
    };
    
    this.applyGameLogic(calibratedInput);
}
```

### 3. 시각적 효과

#### 파티클 시스템
```javascript
constructor() {
    super(config);
    this.particlePool = new ParticlePool(200);
}

createExplosion(x, y, color = '#ff6b6b') {
    for (let i = 0; i < 20; i++) {
        const particle = this.particlePool.get();
        
        particle.x = x;
        particle.y = y;
        particle.vx = (Math.random() - 0.5) * 10;
        particle.vy = (Math.random() - 0.5) * 10;
        particle.size = 3 + Math.random() * 5;
        particle.alpha = 1.0;
        particle.color = color;
    }
}

update() {
    super.update();
    this.particlePool.updateAll();
}

render() {
    // 게임 오브젝트 렌더링
    this.renderGameObjects();
    
    // 파티클 렌더링
    this.particlePool.renderAll(this.ctx);
}
```

#### 화면 효과
```javascript
addScreenShake(intensity = 10, duration = 500) {
    this.screenShake = {
        intensity: intensity,
        duration: duration,
        startTime: Date.now()
    };
}

render() {
    const ctx = this.ctx;
    
    // 화면 흔들림 효과
    if (this.screenShake) {
        const elapsed = Date.now() - this.screenShake.startTime;
        if (elapsed < this.screenShake.duration) {
            const progress = elapsed / this.screenShake.duration;
            const intensity = this.screenShake.intensity * (1 - progress);
            
            const offsetX = (Math.random() - 0.5) * intensity;
            const offsetY = (Math.random() - 0.5) * intensity;
            
            ctx.save();
            ctx.translate(offsetX, offsetY);
        } else {
            this.screenShake = null;
        }
    }
    
    // 게임 렌더링
    this.renderGame();
    
    if (this.screenShake) {
        ctx.restore();
    }
}
```

## ⚡ 자동 게임 등록 시스템

**센서 게임 허브 v2.0**은 강력한 **자동 게임 감지 및 등록** 시스템을 제공합니다. 더 이상 수동으로 게임을 등록할 필요가 없습니다!

### 🔍 작동 방식

1. **서버 시작 시 자동 스캔**
   - `games/` 폴더의 모든 하위 폴더 검색
   - `index.html`이 있는 폴더만 게임으로 인식
   - `game.json`이 있으면 메타데이터 로드, 없으면 기본값 생성

2. **런타임 재스캔**
   - 새 게임 추가 후 서버 재시작 없이 재스캔 가능
   - API: `POST /api/games/rescan`

3. **자동 메타데이터 생성**
   - 폴더명을 기반으로 게임 ID 및 이름 자동 생성
   - 기본 설정값으로 바로 플레이 가능

### 📁 게임 폴더 구조

```
games/
├── my-first-game/           # 게임 ID: my-first-game
│   ├── index.html          # 필수: 게임 진입점
│   ├── game.js             # 필수: 게임 로직
│   ├── game.json           # 선택: 메타데이터
│   └── thumbnail.png       # 선택: 썸네일 이미지
├── space-adventure/         # 게임 ID: space-adventure
│   ├── index.html          # 필수
│   ├── game.js             # 필수
│   └── assets/             # 선택: 게임 리소스
└── puzzle-game/            # 게임 ID: puzzle-game
    ├── index.html          # 필수
    ├── game.js             # 필수
    └── game.json           # 선택
```

### 🔧 자동 생성되는 기본값

`game.json`이 없을 때 자동으로 생성되는 메타데이터:

```javascript
{
  id: "folder-name",                              // 폴더명
  name: "Folder Name",                            // 폴더명을 타이틀 케이스로 변환
  description: "folder-name 게임",                // 기본 설명
  author: "Unknown",                              // 기본 작성자
  version: "1.0.0",                              // 기본 버전
  category: "casual",                            // 기본 카테고리
  difficulty: "medium",                          // 기본 난이도
  icon: "🎮",                                    // 기본 아이콘
  path: "/games/folder-name",                    // 자동 생성된 경로
  sensorTypes: ["orientation"],                  // 기본 센서
  minPlayers: 1,                                 // 기본 플레이어 수
  maxPlayers: 1,
  features: ["singleplayer", "sensor-control", "session-based"],
  thumbnail: "/games/folder-name/thumbnail.png"  // 기본 썸네일 경로
}
```

### 🚀 개발 워크플로우

```bash
# 1. 새 게임 폴더 생성
mkdir games/my-awesome-game
cd games/my-awesome-game

# 2. 필수 파일 생성
touch index.html game.js

# 3. 기본 코드 작성 (LLM 도구 활용 가능)
# index.html에 기본 HTML 구조
# game.js에 SensorGameSDK 기반 게임 로직

# 4. 서버 재시작 → 자동 등록!
npm start
```

### 📊 게임 재스캔 API

개발 중에 새로운 게임을 추가했을 때 서버 재시작 없이 재스캔:

```bash
# 게임 재스캔 요청
curl -X POST http://localhost:8443/api/games/rescan

# 응답 예시
{
  "success": true,
  "message": "3개 게임이 재스캔되었습니다.",
  "games": [
    {
      "id": "my-first-game",
      "name": "My First Game",
      "playCount": 5,
      "registeredAt": "2024-01-01T00:00:00.000Z"
    },
    // ... 더 많은 게임들
  ]
}
```

### ⚠️ 주의사항

1. **필수 파일**: `index.html`이 없는 폴더는 무시됩니다
2. **게임 ID**: 폴더명이 게임 ID가 되므로 고유해야 합니다
3. **JSON 문법**: `game.json`에 문법 오류가 있으면 기본값을 사용합니다
4. **실시간 반영**: 파일 변경 후 브라우저 새로고침 필요

### 🎯 LLM 도구와 연동

이 자동 등록 시스템은 **Claude Code, Gemini CLI** 등 AI 개발 도구와 완벽하게 연동됩니다:

```
1. LLM에게 게임 개발 요청
2. games/폴더에 파일 생성
3. 서버 재시작 → 자동 등록 완료!
```

## 🌐 배포하기

### Render 배포 (권장)

1. **GitHub에 코드 업로드**:
```bash
git add .
git commit -m "Add new game: My First Game"
git push origin main
```

2. **Render 설정**:
   - Repository: GitHub 저장소 연결
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: `Node`

3. **환경 변수 설정**:
   - `NODE_ENV=production`
   - `PORT=8080` (자동 설정)

### 로컬 배포 테스트

```bash
# 프로덕션 모드로 실행
NODE_ENV=production npm start

# 다른 기기에서 접속 테스트
# http://[IP]:8080 (HTTP)
# https://[IP]:8443 (HTTPS)
```

## 🛠️ 트러블슈팅

### 일반적인 문제들

#### 1. 센서 권한 오류 (iOS)
**문제**: iOS에서 센서가 작동하지 않음
**해결**:
- 반드시 HTTPS 연결 사용 (`https://[IP]:8443/sensor-client`)
- `./setup-ssl.sh`로 인증서 생성
- 브라우저 보안 경고 시 "고급" → "안전하지 않음으로 이동"

#### 2. 센서 연결되지만 게임 반응 없음
**문제**: 센서 상태는 "연결됨"이지만 게임 오브젝트가 움직이지 않음
**원인**: 센서 매칭 누락 (v2.0에서 필수)
**해결**: SDK를 올바르게 사용하면 자동 해결. 직접 WebSocket 구현 시:
```javascript
// 게임 클라이언트 등록 후 센서 매칭 요청 필수
ws.send(JSON.stringify({
    type: 'request_sensor_match',
    gameId: 'your-game-id',
    timestamp: Date.now()
}));
```

#### 3. 프레임 드롭 발생
**문제**: 게임이 끊어지거나 느려짐
**해결**:
- 프레임 제한 구현 (60fps)
- 객체 풀링 사용
- 불필요한 렌더링 최소화

#### 4. 센서 과민반응
**문제**: 게임이 너무 민감하게 반응
**해결**:
- `sensorSensitivity` 값 낮추기 (0.5 ~ 0.8)
- `deadzone` 값 높이기 (0.1 ~ 0.3)
- `smoothingFactor` 값 높이기 (5 ~ 10)

### 디버깅 방법

#### 콘솔 로그 확인
```javascript
handleSensorInput(gameInput) {
    console.log('센서 데이터:', gameInput);
    
    // 센서 값 범위 확인
    if (Math.abs(gameInput.tilt.x) > 1 || Math.abs(gameInput.tilt.y) > 1) {
        console.warn('센서 값이 범위를 벗어남:', gameInput.tilt);
    }
}
```

#### 시각적 디버깅
```javascript
renderDebugInfo() {
    const ctx = this.ctx;
    
    // 센서 값 표시
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    ctx.fillText(`Tilt X: ${this.lastTilt.x.toFixed(2)}`, 10, 30);
    ctx.fillText(`Tilt Y: ${this.lastTilt.y.toFixed(2)}`, 10, 50);
    ctx.fillText(`FPS: ${this.fps}`, 10, 70);
}
```

## 📊 성능 모니터링

### FPS 측정
```javascript
constructor() {
    super(config);
    this.fps = 0;
    this.frameCount = 0;
    this.lastFpsUpdate = Date.now();
}

gameLoop() {
    this.frameCount++;
    
    const now = Date.now();
    if (now - this.lastFpsUpdate >= 1000) {
        this.fps = this.frameCount;
        this.frameCount = 0;
        this.lastFpsUpdate = now;
    }
    
    this.update();
    this.render();
    requestAnimationFrame(() => this.gameLoop());
}
```

### 메모리 사용량 체크
```javascript
checkMemoryUsage() {
    if (performance.memory) {
        const memory = performance.memory;
        console.log({
            used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + ' MB',
            total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + ' MB',
            limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
        });
    }
}
```

## ✅ 개발 완료 체크리스트

### 필수 구현
- [ ] SensorGameSDK 상속 및 필수 메서드 구현
- [ ] 센서 입력 처리 (`handleSensorInput`)
- [ ] 게임 루프 구현 (`update`, `render`, `gameLoop`)
- [ ] 센서 상태 UI 표시
- [ ] 반응형 캔버스 구현
- [ ] 키보드 시뮬레이션 모드 (개발/테스트용)

### 호환성 테스트
- [ ] 센서 연결/해제 정상 작동
- [ ] iOS HTTPS 환경에서 센서 권한 정상 작동
- [ ] Android HTTP/HTTPS 환경에서 정상 작동
- [ ] 멀티 유저 환경에서 독립적 작동
- [ ] 데스크톱 키보드 시뮬레이션 모드 작동

### 성능 최적화
- [ ] 60fps 유지 (모바일 기기에서)
- [ ] 메모리 누수 없음
- [ ] 부드러운 센서 반응
- [ ] 에러 상황에서 안정적 작동

### 사용자 경험
- [ ] 직관적인 게임 조작
- [ ] 명확한 센서 상태 표시
- [ ] 적절한 센서 감도 설정
- [ ] 게임 재시작/보정 기능

## 🎯 고급 기능 구현

### 멀티 레벨 시스템
```javascript
class MultiLevelGame extends SensorGameSDK {
    constructor() {
        super(config);
        this.level = 1;
        this.levelConfig = {
            1: { enemies: 3, speed: 1.0 },
            2: { enemies: 5, speed: 1.2 },
            3: { enemies: 8, speed: 1.5 }
        };
    }
    
    nextLevel() {
        this.level++;
        const config = this.levelConfig[this.level];
        if (config) {
            this.setupLevel(config);
        } else {
            this.gameComplete();
        }
    }
}
```

### 사운드 시스템
```javascript
class AudioManager {
    constructor() {
        this.sounds = {};
        this.enabled = true;
    }
    
    loadSound(name, url) {
        return new Promise((resolve) => {
            const audio = new Audio(url);
            audio.addEventListener('canplaythrough', resolve);
            this.sounds[name] = audio;
        });
    }
    
    play(name, volume = 1.0) {
        if (!this.enabled || !this.sounds[name]) return;
        
        const sound = this.sounds[name].cloneNode();
        sound.volume = volume;
        sound.play().catch(console.warn);
    }
}
```

### 로컬 저장소
```javascript
class SaveManager {
    constructor(gameId) {
        this.gameId = gameId;
        this.storageKey = `sensor-game-${gameId}`;
    }
    
    save(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.warn('저장 실패:', error);
        }
    }
    
    load() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.warn('로드 실패:', error);
            return null;
        }
    }
}
```

## 🤝 커뮤니티 기여

### 게임 제출 방법

1. **Fork the repository**
2. **Create feature branch**:
   ```bash
   git checkout -b game/my-awesome-game
   ```
3. **Develop your game** (이 가이드 따르기)
4. **Test thoroughly** (체크리스트 확인)
5. **Submit pull request** with:
   - 게임 설명
   - 스크린샷
   - 테스트 결과

### 코드 품질 기준
- ESLint 통과
- 명확한 주석
- 에러 처리 구현
- 성능 최적화
- 반응형 디자인

---

이 가이드를 따라 개발하면 센서 게임 허브 v2.0과 완벽하게 호환되는 고품질 게임을 만들 수 있습니다! 🎮✨

## 📞 지원

- **이슈 리포트**: [GitHub Issues](https://github.com/your-username/sensor-game-hub/issues)
- **토론**: [GitHub Discussions](https://github.com/your-username/sensor-game-hub/discussions)
- **문서**: 이 가이드 및 프로젝트 문서들