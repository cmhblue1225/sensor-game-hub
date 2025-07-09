# 📚 센서 게임 허브 v2.0 - 개발자 가이드

## 🎯 개요

센서 게임 허브 v2.0은 개발자들이 모바일 센서(자이로스코프, 가속도계, 방향센서)를 활용한 게임을 쉽게 개발하고 배포할 수 있는 통합 플랫폼입니다.

## 🚀 빠른 시작

### 1. 개발 환경 설정

```bash
# 허브 플랫폼 클론
git clone https://github.com/your-username/sensor-game-hub.git
cd sensor-game-hub

# 의존성 설치
npm install

# HTTPS 인증서 생성 (iOS 센서 권한용)
./setup-ssl.sh

# 개발 서버 실행 (HTTP + HTTPS 동시 실행)
npm start
```

### 2. 첫 번째 게임 개발

```bash
# 게임 폴더 생성
mkdir games/my-first-game
cd games/my-first-game

# 기본 파일 생성
touch index.html game.js
```

### 3. 기본 게임 구조

```html
<!-- games/my-first-game/index.html -->
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>나의 첫 번째 센서 게임</title>
</head>
<body>
    <canvas id="gameCanvas" width="800" height="600"></canvas>
    
    <!-- 센서 게임 SDK 로드 -->
    <script src="../../sdk/sensor-game-sdk.js"></script>
    <script src="game.js"></script>
</body>
</html>
```

```javascript
// games/my-first-game/game.js
class MyFirstGame extends SensorGameSDK {
    constructor() {
        super({
            gameId: 'my-first-game',
            gameName: '나의 첫 번째 센서 게임',
            requestedSensors: ['orientation'],
            sensorSensitivity: {
                orientation: 1.0
            }
        });
        
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.player = { x: 400, y: 300 };
        
        this.setupGame();
    }
    
    setupGame() {
        // 센서 데이터 콜백 등록
        this.on('onSensorData', (gameInput, calibratedData, rawData) => {
            this.handleSensorInput(gameInput);
        });
        
        // 게임 루프 시작
        this.gameLoop();
    }
    
    handleSensorInput(gameInput) {
        // 기울기에 따라 플레이어 이동
        this.player.x += gameInput.tilt.x * 5;
        this.player.y += gameInput.tilt.y * 5;
        
        // 화면 경계 체크
        this.player.x = Math.max(0, Math.min(this.canvas.width, this.player.x));
        this.player.y = Math.max(0, Math.min(this.canvas.height, this.player.y));
    }
    
    gameLoop() {
        // 화면 지우기
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 플레이어 그리기
        this.ctx.fillStyle = '#667eea';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, 20, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 다음 프레임
        requestAnimationFrame(() => this.gameLoop());
    }
}

// 게임 시작
document.addEventListener('DOMContentLoaded', () => {
    new MyFirstGame();
});
```

## 📖 센서 게임 SDK 상세 가이드

### SDK 초기화

```javascript
class MyGame extends SensorGameSDK {
    constructor() {
        super({
            // 필수 설정
            gameId: 'unique-game-id',           // 고유한 게임 ID
            gameName: 'My Awesome Game',        // 게임 이름
            
            // 센서 설정
            requestedSensors: ['orientation', 'accelerometer', 'gyroscope'],
            sensorSensitivity: {
                orientation: 1.0,    // 방향 센서 감도 (0.1 ~ 2.0)
                accelerometer: 1.0,  // 가속도계 감도 (0.1 ~ 2.0)
                gyroscope: 1.0       // 자이로스코프 감도 (0.1 ~ 2.0)
            },
            
            // 데이터 처리 설정
            smoothingFactor: 3,      // 데이터 스무싱 정도 (1 ~ 10)
            deadzone: 0.1            // 데드존 크기 (0 ~ 0.5)
        });
    }
}
```

### 센서 데이터 처리

```javascript
// 기본 센서 데이터 콜백
this.on('onSensorData', (gameInput, calibratedData, rawData) => {
    // gameInput: 게임용으로 가공된 입력 데이터
    // calibratedData: 보정된 센서 데이터
    // rawData: 원본 센서 데이터
    
    console.log('기울기:', gameInput.tilt);        // { x: -1~1, y: -1~1 }
    console.log('흔들기:', gameInput.shake);       // { intensity: 0~20, detected: boolean }
    console.log('회전:', gameInput.rotation);      // { speed: 0~100, direction: 0~360 }
    console.log('제스처:', gameInput.gesture);     // { type: string, confidence: 0~1 }
});

// 연결 상태 변경
this.on('onConnectionChange', (isConnected) => {
    if (isConnected) {
        console.log('센서 연결됨');
    } else {
        console.log('센서 연결 끊김 - 시뮬레이션 모드');
    }
});

// 센서 보정 완료
this.on('onCalibration', (calibrationData) => {
    console.log('센서 보정 완료:', calibrationData);
});

// 제스처 감지
this.on('onGesture', (gesture) => {
    console.log('제스처 감지:', gesture.type, gesture.confidence);
});
```

### 커스텀 센서 처리

```javascript
class MyGame extends SensorGameSDK {
    // 센서 데이터를 게임 입력으로 변환하는 메서드 오버라이드
    convertToGameInput(calibratedData) {
        // 부모 클래스의 기본 처리 호출
        super.convertToGameInput(calibratedData);
        
        // 커스텀 처리 추가
        const { orientation, accelerometer } = calibratedData;
        
        if (orientation) {
            // 복잡한 기울기 처리
            const tiltMagnitude = Math.sqrt(
                orientation.beta ** 2 + orientation.gamma ** 2
            );
            
            if (tiltMagnitude > 20) {
                this.gameInput.customTilt = {
                    magnitude: tiltMagnitude,
                    angle: Math.atan2(orientation.beta, orientation.gamma)
                };
            }
        }
    }
    
    // 커스텀 제스처 감지
    detectGestures(calibratedData) {
        // 부모 클래스의 기본 제스처 감지 호출
        super.detectGestures(calibratedData);
        
        // 원형 회전 제스처 감지
        const { gyroscope } = calibratedData;
        if (gyroscope) {
            const rotationSpeed = Math.abs(gyroscope.alpha);
            if (rotationSpeed > 50) {
                this.gameInput.gesture = {
                    type: 'circular_rotation',
                    confidence: Math.min(rotationSpeed / 100, 1),
                    direction: gyroscope.alpha > 0 ? 'clockwise' : 'counterclockwise'
                };
                
                this.triggerCallback('onGesture', this.gameInput.gesture);
            }
        }
    }
}
```

## 🎮 게임 등록 시스템

### 자동 게임 등록

서버 시작 시 `games/` 폴더의 모든 게임이 자동으로 스캔되어 등록됩니다.

### 수동 게임 등록

```javascript
// server.js에서 게임 수동 등록
registerGame({
    id: 'my-awesome-game',
    name: '나의 멋진 게임',
    description: '센서로 조작하는 재미있는 게임입니다.',
    author: '개발자 이름',
    version: '1.0.0',
    category: 'action',        // puzzle, action, racing, sport, casual
    difficulty: 'medium',      // easy, medium, hard
    icon: '🎮',
    path: '/games/my-awesome-game',
    sensorTypes: ['orientation', 'accelerometer'],
    minPlayers: 1,
    maxPlayers: 1,
    features: ['singleplayer', 'physics', 'sound'],
    thumbnail: '/games/my-awesome-game/thumbnail.png'
});
```

### 게임 메타데이터 파일

각 게임 폴더에 `game.json` 파일을 생성하여 메타데이터를 정의할 수 있습니다:

```json
{
    "id": "my-awesome-game",
    "name": "나의 멋진 게임",
    "description": "센서로 조작하는 재미있는 게임입니다.",
    "author": "개발자 이름",
    "version": "1.0.0",
    "category": "action",
    "difficulty": "medium",
    "icon": "🎮",
    "sensorTypes": ["orientation", "accelerometer"],
    "minPlayers": 1,
    "maxPlayers": 1,
    "features": ["singleplayer", "physics", "sound"],
    "thumbnail": "thumbnail.png",
    "screenshots": ["screenshot1.png", "screenshot2.png"],
    "controls": {
        "orientation": "기울여서 이동",
        "shake": "흔들어서 점프"
    },
    "requirements": {
        "sensors": ["orientation"],
        "permissions": ["devicemotion"]
    }
}
```

## 🌐 API 참조

### 게임 목록 API

```javascript
// GET /api/games
// 등록된 모든 게임 목록 조회
fetch('/api/games')
    .then(response => response.json())
    .then(data => {
        console.log('게임 목록:', data.games);
    });
```

### 특정 게임 정보 API

```javascript
// GET /api/games/:gameId
// 특정 게임의 상세 정보 조회
fetch('/api/games/my-awesome-game')
    .then(response => response.json())
    .then(data => {
        console.log('게임 정보:', data.game);
    });
```

### 플레이 카운트 증가 API

```javascript
// POST /api/games/:gameId/play
// 게임 플레이 시 호출하여 통계 수집
fetch('/api/games/my-awesome-game/play', {
    method: 'POST'
})
.then(response => response.json())
.then(data => {
    console.log('플레이 카운트:', data.playCount);
});
```

### 서버 상태 API

```javascript
// GET /api/status
// 서버 상태 및 통계 조회
fetch('/api/status')
    .then(response => response.json())
    .then(data => {
        console.log('서버 상태:', data.status);
    });
```

## 🔒 HTTPS 설정 및 iOS 센서 권한

### HTTPS 인증서 설정

iOS 디바이스에서 센서 권한을 얻기 위해서는 HTTPS 연결이 필수입니다.

#### 자동 인증서 생성
```bash
# 프로젝트 루트에서 실행
./setup-ssl.sh
```

이 스크립트는 다음을 수행합니다:
- 자체 서명 SSL 인증서 생성 (cert.pem, key.pem)
- 로컬 IP 주소 자동 감지 및 SAN(Subject Alternative Names) 설정
- 1년 유효기간 설정
- 에러 처리 및 사용자 안내

#### 수동 인증서 생성
```bash
# 기본 인증서 생성
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"

# SAN이 포함된 고급 인증서 생성
cat > openssl.conf << EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = KR
ST = Seoul
L = Seoul
O = Sensor Game Hub
OU = Development
CN = localhost

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
IP.3 = YOUR_LOCAL_IP
EOF

openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -config openssl.conf -extensions v3_req
rm openssl.conf
```

### 서버 HTTPS 설정

서버는 자동으로 인증서 파일을 감지하고 HTTP(8080) + HTTPS(8443) 서버를 동시 실행합니다:

```javascript
// server.js에서 자동 HTTPS 설정
const fs = require('fs');
const https = require('https');

try {
    const certPath = path.join(__dirname, 'cert.pem');
    const keyPath = path.join(__dirname, 'key.pem');
    
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        const httpsOptions = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };
        const httpsServer = https.createServer(httpsOptions, app);
        httpsServer.listen(8443);
        console.log('🔒 HTTPS 서버: https://localhost:8443');
    }
} catch (error) {
    console.log('⚠️ HTTPS 설정 실패 - HTTP만 사용합니다.');
}
```

### iOS 센서 권한 처리

```javascript
// 센서 권한 요청 (iOS 13+)
async function requestSensorPermissions() {
    try {
        // DeviceOrientationEvent 권한 요청
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission !== 'granted') {
                throw new Error('방향 센서 권한이 거부되었습니다.');
            }
        }
        
        // DeviceMotionEvent 권한 요청
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
            const permission = await DeviceMotionEvent.requestPermission();
            if (permission !== 'granted') {
                throw new Error('모션 센서 권한이 거부되었습니다.');
            }
        }
        
        console.log('✅ 모든 센서 권한이 허용되었습니다.');
        
    } catch (error) {
        console.error('❌ 센서 권한 요청 실패:', error);
        
        // HTTPS 연결 확인
        if (location.protocol !== 'https:') {
            console.error('⚠️ iOS 센서 권한을 위해 HTTPS 연결이 필요합니다.');
        }
    }
}
```

### 브라우저별 HTTPS 접속 방법

#### iOS Safari
1. `https://[IP]:8443/sensor-client` 접속
2. "이 연결은 비공개 연결이 아닙니다" 경고 화면
3. "고급" 터치 → "xxx.xxx.xxx.xxx(안전하지 않음)로 이동" 터치
4. 센서 권한 요청 버튼 터치
5. "허용" 선택

#### Android Chrome
1. `https://[IP]:8443/sensor-client` 접속
2. "연결이 비공개로 설정되어 있지 않습니다" 경고
3. "고급" 클릭 → "xxx.xxx.xxx.xxx(안전하지 않음)로 이동" 클릭
4. 센서 데이터 자동 활성화

### 개발 환경별 설정

#### 로컬 개발
```bash
# HTTPS 인증서 생성
./setup-ssl.sh

# 서버 실행 (HTTP + HTTPS)
npm start

# 접속 URL
# HTTP: http://localhost:8080
# HTTPS: https://localhost:8443 (iOS 권장)
```

#### 네트워크 개발 (같은 WiFi)
```bash
# 로컬 IP 확인
ifconfig | grep "inet " | grep -v 127.0.0.1

# 접속 URL
# Android: http://[IP]:8080/sensor-client
# iOS: https://[IP]:8443/sensor-client
```

#### 프로덕션 배포
```bash
# Render, Vercel 등에서는 자동 HTTPS 제공
# 별도 인증서 설정 불필요
```

## 🛠️ 고급 기능

### 실시간 멀티플레이어

```javascript
class MultiplayerGame extends SensorGameSDK {
    constructor() {
        super({
            gameId: 'multiplayer-game',
            gameName: '멀티플레이어 게임'
        });
        
        this.players = new Map();
    }
    
    // 다른 플레이어에게 이벤트 전송
    sendPlayerAction(action, data) {
        this.sendGameEvent('player_action', {
            action: action,
            data: data,
            playerId: this.playerId
        }, true); // broadcast = true
    }
    
    // 게임 이벤트 수신
    setupEventListeners() {
        this.on('onGameEvent', (event) => {
            if (event.eventType === 'player_action') {
                this.handlePlayerAction(event.eventData);
            }
        });
    }
    
    handlePlayerAction(eventData) {
        // 다른 플레이어의 액션 처리
        const { playerId, action, data } = eventData;
        
        if (!this.players.has(playerId)) {
            this.players.set(playerId, { id: playerId, ...data });
        }
        
        const player = this.players.get(playerId);
        // 플레이어 상태 업데이트
    }
}
```

### 커스텀 물리 엔진 통합

```javascript
class PhysicsGame extends SensorGameSDK {
    constructor() {
        super({
            gameId: 'physics-game',
            gameName: '물리 게임'
        });
        
        this.world = this.createPhysicsWorld();
        this.bodies = [];
    }
    
    createPhysicsWorld() {
        // 물리 엔진 초기화 (예: Matter.js, Cannon.js 등)
        return {
            gravity: { x: 0, y: 0 },
            bodies: []
        };
    }
    
    handleSensorInput(gameInput) {
        // 센서 입력을 물리 세계의 중력으로 변환
        this.world.gravity.x = gameInput.tilt.x * 10;
        this.world.gravity.y = gameInput.tilt.y * 10;
        
        // 흔들기 감지 시 충격 효과
        if (gameInput.shake.detected) {
            this.applyShakeForce(gameInput.shake.intensity);
        }
    }
    
    applyShakeForce(intensity) {
        this.bodies.forEach(body => {
            const force = {
                x: (Math.random() - 0.5) * intensity,
                y: (Math.random() - 0.5) * intensity
            };
            // 물리 엔진에 힘 적용
        });
    }
}
```

### 오디오 시스템

```javascript
class AudioEnabledGame extends SensorGameSDK {
    constructor() {
        super({
            gameId: 'audio-game',
            gameName: '오디오 게임'
        });
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.sounds = new Map();
        
        this.loadSounds();
    }
    
    async loadSounds() {
        const soundFiles = {
            'move': 'sounds/move.mp3',
            'jump': 'sounds/jump.mp3',
            'collision': 'sounds/collision.mp3'
        };
        
        for (const [name, url] of Object.entries(soundFiles)) {
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.sounds.set(name, audioBuffer);
            } catch (error) {
                console.warn(`사운드 로드 실패: ${name}`, error);
            }
        }
    }
    
    playSound(soundName, volume = 1.0) {
        const audioBuffer = this.sounds.get(soundName);
        if (!audioBuffer) return;
        
        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        
        source.buffer = audioBuffer;
        gainNode.gain.value = volume;
        
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        source.start();
    }
    
    handleSensorInput(gameInput) {
        // 움직임에 따른 사운드 효과
        if (Math.abs(gameInput.tilt.x) > 0.3 || Math.abs(gameInput.tilt.y) > 0.3) {
            this.playSound('move', 0.3);
        }
        
        if (gameInput.shake.detected) {
            this.playSound('jump', 0.8);
        }
    }
}
```

## 📱 모바일 최적화

### 반응형 디자인

```css
/* 모바일 우선 CSS */
@media (max-width: 768px) {
    #gameCanvas {
        width: 100vw;
        height: 100vh;
        max-width: 100%;
    }
    
    .ui-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
    }
    
    .ui-element {
        pointer-events: auto;
        font-size: 1.2rem; /* 터치 친화적 크기 */
    }
}
```

### 배터리 최적화

```javascript
class OptimizedGame extends SensorGameSDK {
    constructor() {
        super({
            gameId: 'optimized-game',
            smoothingFactor: 5 // 더 많은 스무싱으로 CPU 부하 감소
        });
        
        this.isBackgroundMode = false;
        this.frameSkip = 0;
        
        this.setupPowerOptimization();
    }
    
    setupPowerOptimization() {
        // 백그라운드 모드 감지
        document.addEventListener('visibilitychange', () => {
            this.isBackgroundMode = document.hidden;
            
            if (this.isBackgroundMode) {
                // 백그라운드에서는 프레임 레이트 감소
                this.frameSkip = 3;
            } else {
                this.frameSkip = 0;
            }
        });
        
        // 배터리 API 지원 시 최적화
        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                if (battery.level < 0.2) {
                    // 배터리 부족 시 성능 모드로 전환
                    this.enableLowPowerMode();
                }
            });
        }
    }
    
    enableLowPowerMode() {
        // 프레임 레이트 감소
        this.frameSkip = 2;
        
        // 시각 효과 감소
        this.particleEffects = false;
        
        // 센서 감도 감소
        this.updateConfig({
            smoothingFactor: 8
        });
        
        console.log('저전력 모드 활성화');
    }
    
    gameLoop() {
        if (this.frameSkip > 0 && this.frameCount % this.frameSkip !== 0) {
            this.frameCount++;
            requestAnimationFrame(() => this.gameLoop());
            return;
        }
        
        // 일반 게임 루프 처리
        this.update();
        this.render();
        
        this.frameCount++;
        requestAnimationFrame(() => this.gameLoop());
    }
}
```

## 🐛 디버깅 및 테스트

### 센서 시뮬레이션

```javascript
// 개발 모드에서 센서 시뮬레이션 활성화
if (process.env.NODE_ENV === 'development') {
    // 키보드로 센서 데이터 시뮬레이션
    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowLeft':
                // 왼쪽 기울기 시뮬레이션
                this.simulateOrientation({ gamma: -45 });
                break;
            case 'ArrowRight':
                // 오른쪽 기울기 시뮬레이션
                this.simulateOrientation({ gamma: 45 });
                break;
            case ' ':
                // 흔들기 시뮬레이션
                this.simulateShake(20);
                break;
        }
    });
}
```

### 성능 모니터링

```javascript
class PerformanceMonitor {
    constructor(game) {
        this.game = game;
        this.fps = 0;
        this.lastTime = performance.now();
        this.frameCount = 0;
        
        this.startMonitoring();
    }
    
    startMonitoring() {
        setInterval(() => {
            this.fps = this.frameCount;
            this.frameCount = 0;
            
            const stats = this.game.getStats();
            console.log(`FPS: ${this.fps}, 지연시간: ${stats.averageLatency}ms`);
            
            // 성능 경고
            if (this.fps < 30) {
                console.warn('낮은 프레임 레이트 감지! 최적화가 필요합니다.');
            }
            
            if (stats.averageLatency > 100) {
                console.warn('높은 지연시간 감지! 네트워크 상태를 확인하세요.');
            }
        }, 1000);
    }
    
    recordFrame() {
        this.frameCount++;
    }
}

// 사용법
const monitor = new PerformanceMonitor(myGame);
```

## 🚀 배포 가이드

### Render 배포

1. **GitHub 저장소 생성**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/your-sensor-game.git
git push -u origin main
```

2. **Render 설정**
- Build Command: `npm install`
- Start Command: `npm start`
- Environment: `Node`

3. **환경 변수 설정** (필요시)
```
NODE_ENV=production
PORT=8080
```

### 도메인 설정

```javascript
// 프로덕션 환경에서 도메인 설정
const PRODUCTION_DOMAIN = 'your-app.onrender.com';

// WebSocket 연결 URL 수정
const wsUrl = window.location.hostname === 'localhost' 
    ? 'ws://localhost:8080'
    : `wss://${PRODUCTION_DOMAIN}`;
```

## 📋 체크리스트

### 게임 개발 완료 체크리스트

- [ ] 센서 입력이 정상적으로 작동하는가?
- [ ] 시뮬레이션 모드(키보드)가 작동하는가?
- [ ] 모바일에서 정상적으로 실행되는가?
- [ ] iOS Safari에서 센서 권한이 요청되는가?
- [ ] 게임이 부드럽게 실행되는가? (30fps 이상)
- [ ] 게임 메타데이터가 올바르게 설정되었는가?
- [ ] 에러 처리가 적절히 구현되었는가?
- [ ] 사용자 인터페이스가 직관적인가?

### 배포 전 체크리스트

- [ ] 모든 정적 파일이 올바른 경로에 있는가?
- [ ] HTTPS에서 정상 작동하는가?
- [ ] iOS Safari에서 센서 권한이 작동하는가?
- [ ] Android Chrome에서 센서가 작동하는가?
- [ ] SSL 인증서가 올바르게 설정되었는가?
- [ ] 다양한 기기에서 테스트했는가?
- [ ] 성능 최적화가 적용되었는가?
- [ ] 에러 로깅이 구현되었는가?
- [ ] 게임 스크린샷과 썸네일이 준비되었는가?

## 🆘 문제 해결

### 자주 발생하는 문제들

**Q: iOS에서 센서가 작동하지 않습니다.**
A: iOS 13+에서는 HTTPS와 사용자 제스처가 필요합니다. 권한 요청 버튼을 통해 센서를 활성화하세요.

**Q: HTTPS 인증서 오류가 발생합니다.**
A: `./setup-ssl.sh` 스크립트를 실행하여 인증서를 생성하고, 브라우저에서 보안 경고 시 "고급" → "안전하지 않음으로 이동"을 선택하세요.

**Q: 게임이 허브에 표시되지 않습니다.**
A: `game.json` 파일이 올바른 형식인지 확인하고, 서버를 재시작해보세요.

**Q: 센서 데이터가 너무 민감합니다.**
A: `sensorSensitivity` 값을 낮추거나 `deadzone` 값을 높여보세요.

**Q: 프레임 레이트가 낮습니다.**
A: `smoothingFactor`를 높이고, 불필요한 렌더링을 줄여보세요.

## 🔗 유용한 링크

- [MDN 센서 API 문서](https://developer.mozilla.org/ko/docs/Web/API/DeviceOrientationEvent)
- [WebSocket API 문서](https://developer.mozilla.org/ko/docs/Web/API/WebSocket)
- [Canvas API 문서](https://developer.mozilla.org/ko/docs/Web/API/Canvas_API)
- [Web Audio API 문서](https://developer.mozilla.org/ko/docs/Web/API/Web_Audio_API)

---

더 자세한 정보나 도움이 필요하시면 [GitHub Issues](https://github.com/your-username/sensor-game-hub/issues)에 문의해주세요!