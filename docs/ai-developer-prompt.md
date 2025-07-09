# 🤖 AI 개발자를 위한 센서 게임 개발 프롬프트 v2.0

> **최신 업데이트**: 멀티 유저 지원 및 세션 기반 매칭 시스템

이 문서는 Claude, Gemini 등 AI 개발 어시스턴트가 센서 게임 허브 플랫폼에서 게임을 개발할 때 사용할 수 있는 완벽한 가이드입니다.

## 🎯 프로젝트 개요

**센서 게임 허브 v2.0**은 모바일 센서(자이로스코프, 가속도계, 방향센서)를 활용한 게임 개발 플랫폼입니다. 여러 사용자가 동시에 독립적으로 게임을 플레이할 수 있는 멀티 유저 지원 시스템이 핵심 특징입니다.

## 🏗️ 아키텍처 개요

```
sensor-game-hub-v2/
├── server.js                     # Express + WebSocket 서버 (세션 관리)
├── index.html                    # 메인 허브 페이지 (스마트 디바이스 감지)
├── core/                         # 핵심 시스템
│   ├── styles.css               # 공통 스타일
│   ├── hub.js                   # 허브 UI 로직
│   ├── sensor-client.html       # 모바일 센서 클라이언트
│   └── sensor-client.js         # 센서 수집 로직
├── sdk/                         # 개발자 SDK
│   └── sensor-game-sdk.js       # 센서 게임 개발 SDK (자동 매칭)
├── games/                       # 게임들이 저장되는 폴더
│   └── sample-tilt-ball/        # 샘플 게임
├── scripts/                     # 개발 도구
│   └── create-game.js           # 게임 생성 도구
├── templates/                   # 개발 템플릿
├── docs/                        # 문서
└── .github/workflows/           # CI/CD 파이프라인
```

### 🔄 세션 기반 매칭 시스템 (v2.0)
```
[모바일 센서] ↔ [WebSocket Server] ↔ [게임 클라이언트]
     📱              🔗 세션 ID             💻
     
여러 사용자 동시 지원:
세션 A: 모바일1 ↔ 게임1
세션 B: 모바일2 ↔ 게임2
세션 C: 모바일3 ↔ 게임3
```

## 🛠️ 개발 요구사항

### 필수 구현 사항

1. **SensorGameSDK 클래스 상속**
   - 모든 게임은 `SensorGameSDK`를 상속받아야 함
   - `convertToGameInput()` 메서드를 오버라이드하여 센서 데이터 처리

2. **게임 폴더 구조**
   ```
   games/your-game-name/
   ├── index.html           # 게임 메인 페이지
   ├── game.js             # 게임 로직
   ├── game.json           # 게임 메타데이터 (선택사항)
   └── assets/             # 게임 리소스 (선택사항)
   ```

3. **필수 HTML 구조**
   ```html
   <!DOCTYPE html>
   <html lang="ko">
   <head>
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <title>게임 이름</title>
   </head>
   <body>
       <canvas id="gameCanvas" width="800" height="600"></canvas>
       
       <!-- SDK 로드 -->
       <script src="../../sdk/sensor-game-sdk.js"></script>
       <script src="game.js"></script>
   </body>
   </html>
   ```

4. **필수 JavaScript 구조**
   ```javascript
   class YourGame extends SensorGameSDK {
       constructor() {
           super({
               gameId: 'your-game-name',
               gameName: '게임 이름',
               requestedSensors: ['orientation'], // 'accelerometer', 'gyroscope'
               sensorSensitivity: { orientation: 1.0 }
           });
           
           this.setupGame();
       }
       
       setupGame() {
           this.on('onSensorData', (gameInput) => {
               this.handleSensorInput(gameInput);
           });
           
           this.gameLoop();
       }
       
       handleSensorInput(gameInput) {
           // gameInput.tilt.x: 좌우 기울기 (-1 ~ 1)
           // gameInput.tilt.y: 앞뒤 기울기 (-1 ~ 1)
           // gameInput.shake.detected: 흔들기 감지 (boolean)
           // gameInput.shake.intensity: 흔들기 강도 (0 ~ 20)
       }
       
       gameLoop() {
           // 게임 업데이트 및 렌더링
           requestAnimationFrame(() => this.gameLoop());
       }
   }
   
   document.addEventListener('DOMContentLoaded', () => {
       new YourGame();
   });
   ```

## 📋 센서 데이터 가이드

### 사용 가능한 센서 타입

1. **방향 센서 (orientation)**
   - `gameInput.tilt.x`: 좌우 기울기 (-1 ~ 1)
   - `gameInput.tilt.y`: 앞뒤 기울기 (-1 ~ 1)
   - 가장 안정적이고 모든 기기에서 지원

2. **가속도계 (accelerometer)**
   - `gameInput.shake.detected`: 흔들기 감지 (boolean)
   - `gameInput.shake.intensity`: 흔들기 강도 (0 ~ 20)
   - 급격한 움직임 감지에 적합

3. **자이로스코프 (gyroscope)**
   - `gameInput.rotation.speed`: 회전 속도 (0 ~ 100)
   - `gameInput.rotation.direction`: 회전 방향 (0 ~ 360)
   - 빠른 회전 동작 감지

### 센서 활용 패턴

```javascript
// 기울기 기반 이동 (가장 일반적)
handleSensorInput(gameInput) {
    this.player.x += gameInput.tilt.x * this.moveSpeed;
    this.player.y += gameInput.tilt.y * this.moveSpeed;
}

// 흔들기 기반 액션
handleSensorInput(gameInput) {
    if (gameInput.shake.detected && gameInput.shake.intensity > 15) {
        this.player.jump();
    }
}

// 회전 기반 조작
handleSensorInput(gameInput) {
    if (gameInput.rotation.speed > 30) {
        this.player.rotate(gameInput.rotation.direction);
    }
}
```

## 🎮 게임 타입별 개발 가이드

### 1. 퍼즐 게임 (기울기 미로, 볼 굴리기)
```javascript
class TiltMazeGame extends SensorGameSDK {
    constructor() {
        super({
            gameId: 'tilt-maze',
            gameName: '기울기 미로',
            requestedSensors: ['orientation'],
            sensorSensitivity: { orientation: 0.8 }, // 부드러운 조작
            deadzone: 0.1 // 작은 기울기 무시
        });
    }
    
    handleSensorInput(gameInput) {
        // 중력 시뮬레이션
        this.ball.velocity.x += gameInput.tilt.x * 0.5;
        this.ball.velocity.y += gameInput.tilt.y * 0.5;
        
        // 마찰 적용
        this.ball.velocity.x *= 0.95;
        this.ball.velocity.y *= 0.95;
    }
}
```

### 2. 액션 게임 (슈팅, 어드벤처)
```javascript
class TiltShooterGame extends SensorGameSDK {
    constructor() {
        super({
            gameId: 'tilt-shooter',
            gameName: '기울기 슈터',
            requestedSensors: ['orientation', 'accelerometer'],
            sensorSensitivity: { 
                orientation: 1.2, // 빠른 반응
                accelerometer: 1.0 
            }
        });
    }
    
    handleSensorInput(gameInput) {
        // 플레이어 이동 (좌우만)
        this.player.x += gameInput.tilt.x * 8;
        
        // 흔들기로 발사
        if (gameInput.shake.detected) {
            this.player.shoot();
        }
    }
}
```

### 3. 레이싱 게임
```javascript
class TiltRacingGame extends SensorGameSDK {
    constructor() {
        super({
            gameId: 'tilt-racing',
            gameName: '기울기 레이싱',
            requestedSensors: ['orientation'],
            sensorSensitivity: { orientation: 1.5 }, // 민감한 조작
            smoothingFactor: 2 // 빠른 반응
        });
    }
    
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
}
```

### 4. 캐주얼 게임 (점프, 리듬)
```javascript
class ShakeJumpGame extends SensorGameSDK {
    constructor() {
        super({
            gameId: 'shake-jump',
            gameName: '흔들어 점프',
            requestedSensors: ['accelerometer'],
            sensorSensitivity: { accelerometer: 1.0 }
        });
    }
    
    handleSensorInput(gameInput) {
        // 흔들기 강도에 따른 점프
        if (gameInput.shake.detected) {
            const jumpPower = Math.min(gameInput.shake.intensity / 20, 1);
            this.player.jump(jumpPower);
        }
    }
}
```

## 📱 모바일 최적화 필수사항

### 반응형 캔버스
```javascript
class ResponsiveGame extends SensorGameSDK {
    constructor() {
        super(config);
        this.setupResponsiveCanvas();
    }
    
    setupResponsiveCanvas() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const aspect = 4/3; // 원하는 비율
        
        let width = container.clientWidth;
        let height = width / aspect;
        
        if (height > container.clientHeight) {
            height = container.clientHeight;
            width = height * aspect;
        }
        
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
    }
}
```

### iOS 센서 권한 및 HTTPS 처리

#### HTTPS 요구사항
iOS 13+ 디바이스에서 센서 권한을 얻기 위해서는 **반드시 HTTPS 연결**이 필요합니다.

```bash
# 개발 환경에서 HTTPS 설정
# 1. 프로젝트 루트에서 SSL 인증서 생성
./setup-ssl.sh

# 2. 서버 시작 (HTTP + HTTPS 동시 실행)
npm start

# 3. iOS에서 접속
https://[IP]:8443/sensor-client  # HTTPS 필수!
```

#### iOS 센서 권한 처리
```javascript
// iOS에서 센서 사용 전 자동 권한 요청
class iOSCompatibleGame extends SensorGameSDK {
    async setupGame() {
        // HTTPS 연결 확인
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
            this.showHTTPSError();
            return;
        }
        
        // iOS 권한 요청
        if (SensorGameUtils.detectDevice().isIOS) {
            try {
                // DeviceOrientationEvent 권한 요청
                if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                    const permission = await DeviceOrientationEvent.requestPermission();
                    if (permission !== 'granted') {
                        this.showPermissionError('방향 센서 권한이 거부되었습니다.');
                        return;
                    }
                }
                
                // DeviceMotionEvent 권한 요청
                if (typeof DeviceMotionEvent.requestPermission === 'function') {
                    const permission = await DeviceMotionEvent.requestPermission();
                    if (permission !== 'granted') {
                        this.showPermissionError('모션 센서 권한이 거부되었습니다.');
                        return;
                    }
                }
                
                console.log('✅ iOS 센서 권한이 허용되었습니다.');
                
            } catch (error) {
                console.error('❌ 센서 권한 요청 실패:', error);
                this.showPermissionError('센서 권한 요청 중 오류가 발생했습니다.');
                return;
            }
        }
        
        // 게임 시작
        this.startGame();
    }
    
    showHTTPSError() {
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="text-align: center; padding: 20px; background: #ff4757; color: white; border-radius: 10px; margin: 20px;">
                <h3>⚠️ HTTPS 연결 필요</h3>
                <p>iOS 센서 권한을 위해 HTTPS 연결이 필요합니다.</p>
                <p><strong>https://[IP]:8443/sensor-client</strong>로 접속해주세요.</p>
            </div>
        `;
        document.body.insertBefore(errorDiv, document.body.firstChild);
    }
    
    showPermissionError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="text-align: center; padding: 20px; background: #ff6b6b; color: white; border-radius: 10px; margin: 20px;">
                <h3>❌ 센서 권한 오류</h3>
                <p>${message}</p>
                <button onclick="location.reload()" style="padding: 10px 20px; background: white; color: #ff6b6b; border: none; border-radius: 5px; cursor: pointer;">
                    다시 시도
                </button>
            </div>
        `;
        document.body.insertBefore(errorDiv, document.body.firstChild);
    }
}
```

#### 브라우저별 HTTPS 접속 방법

**iOS Safari:**
1. `https://[IP]:8443/sensor-client` 접속
2. "이 연결은 비공개 연결이 아닙니다" 경고 화면
3. "고급" 터치 → "xxx.xxx.xxx.xxx(안전하지 않음)로 이동" 터치
4. 센서 권한 요청 버튼 터치
5. "허용" 선택

**Android Chrome:**
1. `https://[IP]:8443/sensor-client` 접속
2. "연결이 비공개로 설정되어 있지 않습니다" 경고
3. "고급" 클릭 → "xxx.xxx.xxx.xxx(안전하지 않음)로 이동" 클릭
4. 센서 데이터 자동 활성화

## 🎨 UI/UX 가이드라인

### 필수 UI 요소
```html
<!-- 게임 상태 표시 -->
<div class="game-ui">
    <div class="score">점수: <span id="score">0</span></div>
    <div class="sensor-status" id="sensorStatus">센서 연결 대기중...</div>
    <button onclick="game.calibrate()">센서 보정</button>
</div>

<!-- 로딩 화면 -->
<div class="loading-screen" id="loadingScreen">
    <h2>게임 로딩 중...</h2>
    <p>센서 연결을 확인하세요</p>
</div>
```

### 센서 상태 표시
```javascript
// 연결 상태 UI 업데이트
this.on('onConnectionChange', (isConnected) => {
    const statusElement = document.getElementById('sensorStatus');
    if (isConnected) {
        statusElement.textContent = '📱 센서 연결됨';
        statusElement.style.color = '#00ff88';
    } else {
        statusElement.textContent = '⌨️ 시뮬레이션 모드 (WASD)';
        statusElement.style.color = '#ffaa00';
    }
});
```

## 🎯 게임 메타데이터 (game.json)

모든 게임은 다음과 같은 메타데이터 파일을 포함해야 합니다:

```json
{
    "id": "your-game-id",
    "name": "게임 이름",
    "description": "게임에 대한 간단한 설명 (한국어)",
    "author": "개발자 이름",
    "version": "1.0.0",
    "category": "puzzle",
    "difficulty": "easy",
    "icon": "🎮",
    "sensorTypes": ["orientation"],
    "minPlayers": 1,
    "maxPlayers": 1,
    "features": ["singleplayer", "physics"],
    "controls": {
        "orientation": "기울여서 조작",
        "shake": "흔들어서 액션"
    },
    "instructions": "게임 방법에 대한 설명"
}
```

### 카테고리 옵션
- `puzzle`: 퍼즐/논리
- `action`: 액션/어드벤처  
- `racing`: 레이싱/드라이빙
- `sport`: 스포츠
- `casual`: 캐주얼
- `arcade`: 아케이드

### 난이도 옵션
- `easy`: 쉬움
- `medium`: 보통
- `hard`: 어려움

## ⚡ 성능 최적화 팁

### 1. 효율적인 렌더링
```javascript
class OptimizedGame extends SensorGameSDK {
    constructor() {
        super(config);
        this.frameSkip = 0;
        this.lastRenderTime = 0;
    }
    
    gameLoop(timestamp) {
        // 60fps 제한
        if (timestamp - this.lastRenderTime < 16.67) {
            requestAnimationFrame((ts) => this.gameLoop(ts));
            return;
        }
        
        this.update();
        this.render();
        
        this.lastRenderTime = timestamp;
        requestAnimationFrame((ts) => this.gameLoop(ts));
    }
    
    render() {
        // 더티 렉트만 다시 그리기
        this.ctx.clearRect(this.dirtyRect.x, this.dirtyRect.y, 
                          this.dirtyRect.width, this.dirtyRect.height);
    }
}
```

### 2. 메모리 관리
```javascript
// 객체 풀링 사용
class GameObjectPool {
    constructor(createFn, resetFn, size = 100) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.pool = [];
        this.active = [];
        
        // 미리 객체 생성
        for (let i = 0; i < size; i++) {
            this.pool.push(this.createFn());
        }
    }
    
    get() {
        const obj = this.pool.pop() || this.createFn();
        this.active.push(obj);
        return obj;
    }
    
    release(obj) {
        const index = this.active.indexOf(obj);
        if (index !== -1) {
            this.active.splice(index, 1);
            this.resetFn(obj);
            this.pool.push(obj);
        }
    }
}
```

## 🧪 테스트 가이드

### 시뮬레이션 모드 테스트
```javascript
// 개발 중 키보드로 센서 시뮬레이션
class TestableGame extends SensorGameSDK {
    constructor() {
        super(config);
        
        if (process.env.NODE_ENV === 'development') {
            this.setupTestControls();
        }
    }
    
    setupTestControls() {
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowLeft':
                    this.simulateInput({ tilt: { x: -1, y: 0 } });
                    break;
                case 'ArrowRight':
                    this.simulateInput({ tilt: { x: 1, y: 0 } });
                    break;
                case ' ':
                    this.simulateInput({ shake: { detected: true, intensity: 20 } });
                    break;
            }
        });
    }
    
    simulateInput(mockInput) {
        this.handleSensorInput(mockInput);
    }
}
```

### 성능 모니터링
```javascript
// FPS 및 지연시간 모니터링
class PerformanceMonitor {
    constructor() {
        this.fps = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        
        setInterval(() => {
            this.fps = this.frameCount;
            this.frameCount = 0;
            console.log(`FPS: ${this.fps}`);
        }, 1000);
    }
    
    frame() {
        this.frameCount++;
    }
}
```

## 🚀 배포 체크리스트

### 배포 전 확인사항
- [ ] 모든 센서 타입에서 정상 작동
- [ ] **HTTPS 연결에서 정상 작동** (필수)
- [ ] **iOS Safari에서 센서 권한 요청 정상 작동** (필수)
- [ ] Android Chrome에서 센서 정상 작동
- [ ] 시뮬레이션 모드 (키보드) 정상 작동
- [ ] 다양한 화면 크기에서 UI 정상 표시
- [ ] 게임 메타데이터 (game.json) 작성 완료
- [ ] 성능 최적화 적용 (30fps 이상 유지)
- [ ] 에러 처리 및 사용자 안내 메시지 구현
- [ ] SSL 인증서 오류 처리 구현

### 제출 형식
게임 완성 후 다음과 같이 제출:

```
games/your-game-name/
├── index.html              # 메인 게임 파일
├── game.js                # 게임 로직
├── game.json              # 메타데이터
├── thumbnail.png          # 썸네일 (300x200px)
└── README.md             # 게임 설명 (선택사항)
```

## 💡 개발 팁

1. **센서 감도 조절**: 게임 타입에 맞게 `sensorSensitivity` 값 조정
2. **데드존 활용**: 작은 움직임 무시하여 안정성 향상
3. **시각적 피드백**: 센서 입력에 대한 즉각적인 시각적 반응 제공
4. **점진적 향상**: 기본 기능부터 구현하고 점차 고급 기능 추가
5. **크로스 플랫폼**: 데스크톱에서도 키보드로 플레이 가능하도록 구현

## 🆘 문제 해결

### 자주 발생하는 이슈

**Q: 센서 데이터가 불안정합니다.**
A: `smoothingFactor`를 높이고 `deadzone`을 적절히 설정하세요.

**Q: iOS에서 센서가 작동하지 않습니다.**
A: 반드시 HTTPS 연결(`https://[IP]:8443/sensor-client`)이 필요하며, 사용자 제스처 후 권한 요청이 필요합니다. `./setup-ssl.sh`로 인증서를 생성하세요.

**Q: HTTPS 인증서 오류가 발생합니다.**
A: 브라우저에서 보안 경고 시 "고급" → "안전하지 않음으로 이동"을 선택하세요.

**Q: 게임이 너무 민감하게 반응합니다.**
A: `sensorSensitivity` 값을 낮추세요 (0.5 ~ 0.8).

**Q: 프레임 드롭이 발생합니다.**
A: 렌더링 최적화와 객체 풀링을 적용하세요.

---

이 가이드를 참고하여 혁신적인 센서 게임을 개발해보세요! 🎮✨