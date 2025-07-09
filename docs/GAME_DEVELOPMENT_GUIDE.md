# 🎮 게임 개발 가이드라인 v2.0

> **멀티 유저 지원 및 세션 기반 매칭 시스템**

## 📋 개발 기준

### 1. **게임 메타데이터 (game.json)**

모든 게임은 다음 메타데이터를 포함해야 합니다:

```json
{
    "id": "unique-game-id",
    "name": "게임 이름",
    "description": "게임 설명",
    "author": "개발자 이름",
    "version": "1.0.0",
    "category": "puzzle|action|racing|sport|casual|arcade",
    "difficulty": "easy|medium|hard",
    "icon": "🎮",
    "sensorTypes": ["orientation", "accelerometer", "gyroscope"],
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

### 2. **SDK 사용 규칙**

#### 기본 구조
```javascript
class YourGame extends SensorGameSDK {
    constructor() {
        super({
            gameId: 'your-game-id',
            gameName: '게임 이름',
            requestedSensors: ['orientation', 'accelerometer'],
            sensorSensitivity: {
                orientation: 0.8,
                accelerometer: 0.5
            }
        });
        
        this.setupGame();
    }
}
```

#### 필수 이벤트 처리
```javascript
// 센서 데이터 처리
this.on('onSensorData', (gameInput) => {
    // 게임 로직 구현
});

// 센서 상태 변경 처리 (v2.0 필수)
this.on('onSensorStatusChange', (status) => {
    if (status.connected) {
        console.log(`센서 연결됨: ${status.deviceId}`);
        this.handleSensorConnected(status);
    } else {
        console.log('센서 연결 해제됨:', status.reason);
        this.handleSensorDisconnected(status);
    }
});
```

#### 직접 WebSocket 구현 시 필수 사항
**⚠️ 중요**: SDK 없이 직접 WebSocket을 구현할 때는 반드시 다음 단계를 따라야 합니다:

```javascript
// WebSocket 연결 후 필수 시퀀스
ws.onopen = () => {
    // 1. 게임 클라이언트 등록
    ws.send(JSON.stringify({
        type: 'register_game_client',
        gameId: 'your-game-id',
        gameName: '게임 이름',
        requestedSensors: ['orientation']
    }));
    
    // 2. 센서 매칭 요청 (필수!)
    setTimeout(() => {
        ws.send(JSON.stringify({
            type: 'request_sensor_match',
            gameId: 'your-game-id',
            timestamp: Date.now()
        }));
    }, 1000);
};

// 메시지 처리에서 필수 이벤트들
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
        case 'sensor_matched':
            console.log('🎯 센서 매칭 성공:', data.deviceId);
            this.sessionId = data.sessionId;
            this.matchedSensorId = data.deviceId;
            break;
            
        case 'sensor_match_failed':
            console.log('⚠️ 센서 매칭 실패:', data.message);
            break;
            
        case 'sensor_data':
            // 반드시 세션 ID 확인 후 처리
            if (data.sessionId === this.sessionId) {
                this.processSensorData(data.sensorData);
            }
            break;
    }
};
```

### 3. **멀티 유저 지원 가이드라인**

#### 세션 관리
- 게임은 **자동으로 센서 매칭**을 처리합니다
- 여러 사용자가 동시에 플레이할 수 있도록 설계하세요
- 세션 기반 상태 관리를 고려하세요

#### 권장 사항
```javascript
class MultiUserGame extends SensorGameSDK {
    constructor() {
        super({
            gameId: 'multi-user-game',
            // ... 기본 설정
        });
        
        this.sessionId = null;
        this.playerId = null;
        this.gameState = {
            active: false,
            score: 0,
            level: 1
        };
    }
    
    handleSensorConnected(status) {
        this.sessionId = status.sessionId;
        this.playerId = status.deviceId;
        this.gameState.active = true;
        
        // 게임 시작 처리
        this.startGame();
    }
    
    handleSensorDisconnected(status) {
        this.gameState.active = false;
        
        // 게임 일시정지 또는 종료 처리
        this.pauseGame();
    }
}
```

### 4. **파일 구조 표준**

```
games/your-game-id/
├── index.html          # 게임 메인 페이지
├── game.js             # 게임 로직 (SensorGameSDK 확장)
├── game.json           # 게임 메타데이터
├── style.css           # 게임 스타일 (선택사항)
├── README.md           # 게임 설명서
└── assets/             # 게임 에셋 (선택사항)
    ├── images/
    ├── sounds/
    └── models/
```

### 5. **UI/UX 가이드라인**

#### 센서 상태 표시
```html
<div class="sensor-status" id="sensorStatus">
    <span class="status-icon">🔴</span>
    <span class="status-text">센서 연결 대기중...</span>
</div>
```

#### 게임 컨트롤
```html
<div class="game-controls">
    <button onclick="window.game.calibrate()">센서 보정</button>
    <button onclick="window.game.restart()">다시 시작</button>
    <button onclick="window.open('/', '_blank')">🏠 허브로</button>
</div>
```

### 6. **성능 최적화**

#### 센서 데이터 처리
- 불필요한 계산 최소화
- 데이터 스무딩 활용
- 프레임 드랍 방지

```javascript
processSensorData(gameInput) {
    // 데드존 적용
    const tiltX = Math.abs(gameInput.tilt.x) > 0.1 ? gameInput.tilt.x : 0;
    const tiltY = Math.abs(gameInput.tilt.y) > 0.1 ? gameInput.tilt.y : 0;
    
    // 부드러운 움직임
    this.player.velocityX += tiltX * 0.5;
    this.player.velocityY += tiltY * 0.5;
    
    // 감쇠 적용
    this.player.velocityX *= 0.9;
    this.player.velocityY *= 0.9;
}
```

### 7. **테스트 요구사항**

#### 단일 사용자 테스트
- [ ] 센서 연결/해제
- [ ] 게임 플레이 기능
- [ ] 화면 회전 대응
- [ ] 성능 최적화

#### 멀티 유저 테스트
- [ ] 동시 접속 (2명 이상)
- [ ] 세션 독립성
- [ ] 센서 데이터 분리
- [ ] 연결 해제 처리

### 8. **배포 체크리스트**

#### 코드 품질
- [ ] ESLint 통과
- [ ] 코드 주석 작성
- [ ] 에러 처리 구현
- [ ] 성능 최적화

#### 메타데이터
- [ ] game.json 완성
- [ ] README.md 작성
- [ ] 스크린샷 추가
- [ ] 아이콘 설정

#### 기능 테스트
- [ ] 모든 센서 타입 테스트
- [ ] 다양한 기기 테스트
- [ ] 멀티 유저 시나리오 테스트
- [ ] 에러 상황 테스트

### 9. **보안 가이드라인**

#### 데이터 보호
- 개인정보 수집 금지
- 센서 데이터 암호화 (필요시)
- 세션 타임아웃 설정

#### 코드 보안
- XSS 공격 방지
- 입력 검증 구현
- 안전한 DOM 조작

### 10. **문서화 요구사항**

#### 게임 README.md
```markdown
# 게임 이름

## 설명
게임에 대한 간단한 설명

## 조작 방법
- 센서 조작법 설명
- 키보드 시뮬레이션 (개발용)

## 개발자 정보
- 이름: 개발자 이름
- 연락처: 이메일 또는 GitHub
- 라이센스: MIT
```

## 🎯 게임 개발 플로우

1. **기획** → game.json 작성
2. **개발** → SDK 사용하여 구현
3. **테스트** → 단일/멀티 유저 테스트
4. **문서화** → README.md 작성
5. **배포** → git push로 자동 배포

## 🤝 커뮤니티 가이드라인

### 기여 방법
1. Fork the repository
2. Create feature branch
3. Develop your game
4. Write tests and documentation
5. Submit pull request

### 코드 리뷰 기준
- 코드 품질 및 가독성
- 성능 최적화
- 멀티 유저 호환성
- 보안 검토

이 가이드라인을 따라 개발하면 고품질의 센서 게임을 쉽게 만들 수 있습니다! 🎮✨