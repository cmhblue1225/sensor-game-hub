# 🎮 센서 게임 허브 v2.0 (HTTPS 전용)

모바일 센서(자이로스코프, 가속도계, 방향센서)를 활용한 게임 개발 및 배포 플랫폼입니다. 안드로이드와 아이폰 모든 기기에서 센서를 사용할 수 있도록 HTTPS 전용으로 구성되었습니다.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/your-username/sensor-game-hub)

## ✨ 주요 특징

- 🔒 **HTTPS 전용**: 안드로이드/아이폰 모든 기기에서 센서 사용 가능
- 👥 **멀티 유저 지원**: 여러 사용자가 동시에 독립적으로 게임 플레이
- 🎯 **세션 기반 매칭**: 센서와 게임의 1:1 자동 매칭 시스템
- 📱 **스마트 디바이스 감지**: 모바일/PC 자동 구분 및 최적화된 UX
- 🎮 **쉬운 게임 개발**: JavaScript SDK로 센서 게임을 빠르게 개발
- 🌐 **실시간 센서 연동**: WebSocket 기반 모바일 센서 데이터 수집
- 🛠️ **자동 SSL 설정**: 인증서 자동 생성 및 시스템 신뢰 설정
- 🚀 **클라우드 배포**: Render 플랫폼 최적화
- 📊 **실시간 모니터링**: 센서 상태, 성능 통계 제공

## 🚀 빠른 시작

### 1. 저장소 클론
```bash
git clone https://github.com/your-username/sensor-game-hub.git
cd sensor-game-hub
```

### 2. 의존성 설치
```bash
npm install
```

### 3. HTTPS 인증서 생성 및 설정
```bash
# 자동 인증서 생성 및 시스템 신뢰 설정
./setup-ssl.sh
```

### 4. 개발 서버 실행
```bash
# 서버 시작 (HTTPS 전용)
npm start
```

⚡️ **완전 자동화**: 서버 시작 시 인증서 자동 생성, 시스템 신뢰 설정, 방화벽 안내까지 모든 과정이 자동화되어 있습니다!

### 5. 접속
- **메인 허브**: https://localhost:8443
- **센서 클라이언트**: https://localhost:8443/sensor-client
- **대시보드**: https://localhost:8443/dashboard

💡 **새로운 사용자 경험**: 접속 시 자동으로 디바이스를 감지하고 모바일/PC에 최적화된 인터페이스를 제공합니다.

## 📱 모바일 센서 연결 방법

### 🔒 HTTPS 설정 (iOS 센서 권한 필수)

1. **SSL 인증서 생성**:
   ```bash
   # 자동 생성 (권장)
   ./setup-ssl.sh
   
   # 수동 생성
   openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"
   ```

2. **서버 실행**:
   ```bash
   npm start
   ```
   인증서가 있으면 자동으로 HTTP(8080) + HTTPS(8443) 동시 실행

### 📱 모바일 연결 단계

1. **컴퓨터에서 서버 실행**
2. **네트워크 IP 확인**:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
3. **모바일에서 센서 클라이언트 접속**:
   - 같은 WiFi 네트워크 연결
   - **Android**: `http://[컴퓨터IP]:8080/sensor-client`
   - **iOS**: `https://[컴퓨터IP]:8443/sensor-client` ⭐ **HTTPS 필수**

4. **iOS 보안 경고 해결**:
   - 브라우저 보안 경고 시 "고급" → "안전하지 않음으로 이동"
   - 설정 → 일반 → VPN 및 기기 관리 → 인증서 신뢰 설정

5. **센서 권한 허용** (iOS에서 필요)
6. **게임 플레이**: 메인 허브에서 원하는 게임 선택
7. **자동 매칭**: 게임 시작 시 자동으로 센서와 매칭

## 🎮 첫 번째 게임 개발하기

### 1. 게임 폴더 생성
```bash
mkdir games/my-first-game
cd games/my-first-game
```

### 2. 기본 파일 생성

**index.html**:
```html
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>나의 첫 번째 센서 게임</title>
</head>
<body>
    <canvas id="gameCanvas" width="800" height="600"></canvas>
    
    <script src="../../sdk/sensor-game-sdk.js"></script>
    <script src="game.js"></script>
</body>
</html>
```

**game.js**:
```javascript
class MyFirstGame extends SensorGameSDK {
    constructor() {
        super({
            gameId: 'my-first-game',
            gameName: '나의 첫 번째 센서 게임',
            requestedSensors: ['orientation']
        });
        
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.player = { x: 400, y: 300 };
        
        this.setupGame();
    }
    
    setupGame() {
        // 센서 데이터 처리
        this.on('onSensorData', (gameInput) => {
            // 기울기에 따라 플레이어 이동
            this.player.x += gameInput.tilt.x * 5;
            this.player.y += gameInput.tilt.y * 5;
        });
        
        // 센서 상태 변경 처리
        this.on('onSensorStatusChange', (status) => {
            console.log('센서 상태:', status.connected ? '연결됨' : '연결 해제됨');
        });
        
        this.gameLoop();
    }
    
    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 플레이어 그리기
        this.ctx.fillStyle = '#667eea';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, 20, 0, Math.PI * 2);
        this.ctx.fill();
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MyFirstGame();
});
```

**game.json** (선택사항):
```json
{
    "id": "my-first-game",
    "name": "나의 첫 번째 센서 게임",
    "description": "기울여서 조작하는 간단한 게임",
    "author": "개발자 이름",
    "version": "1.0.0",
    "category": "casual",
    "difficulty": "easy",
    "icon": "🎮",
    "sensorTypes": ["orientation"]
}
```

### 3. 게임 테스트
1. 서버 재시작: `npm start`
2. 허브에서 게임 확인: http://localhost:8080
3. 모바일 센서 연결 후 테스트

## 📚 문서

- **[개발자 가이드](docs/developer-guide.md)**: 상세한 개발 방법
- **[AI 개발자 프롬프트](docs/ai-developer-prompt.md)**: Claude/Gemini CLI용 가이드
- **SDK API 문서**: `/sdk/sensor-game-sdk.js` 파일 내 JSDoc 주석 참조

## 🎯 센서 활용 방법

### 지원 센서 타입
- **방향 센서 (orientation)**: 기기 기울기 감지
- **가속도계 (accelerometer)**: 흔들기, 급격한 움직임 감지  
- **자이로스코프 (gyroscope)**: 회전 속도 감지

### 센서 데이터 활용 예시
```javascript
// 센서 데이터 처리
this.on('onSensorData', (gameInput) => {
    // 기울기 (좌우: -1~1, 앞뒤: -1~1)
    console.log('기울기:', gameInput.tilt.x, gameInput.tilt.y);
    
    // 흔들기 감지
    if (gameInput.shake.detected) {
        console.log('흔들기 감지! 강도:', gameInput.shake.intensity);
    }
    
    // 회전 감지
    if (gameInput.rotation.speed > 30) {
        console.log('빠른 회전 감지!');
    }
});

// 센서 상태 변경 처리
this.on('onSensorStatusChange', (status) => {
    if (status.connected) {
        console.log(`센서 연결됨: ${status.deviceId}`);
    } else {
        console.log('센서 연결 해제됨:', status.reason);
    }
});
```

## 🛠️ 아키텍처

```
sensor-game-hub-v2/
├── server.js                 # Express + WebSocket 서버 (세션 관리)
├── index.html                # 메인 허브 페이지 (스마트 디바이스 감지)
├── core/                     # 핵심 시스템
│   ├── styles.css           # 공통 스타일
│   ├── hub.js               # 허브 UI 로직
│   ├── sensor-client.html   # 모바일 센서 클라이언트
│   └── sensor-client.js     # 센서 수집 로직
├── sdk/                     # 개발자 SDK
│   └── sensor-game-sdk.js   # 센서 게임 개발 SDK (자동 매칭)
├── games/                   # 게임들이 저장되는 폴더
│   └── sample-tilt-ball/    # 샘플 게임
├── scripts/                 # 개발 도구
│   └── create-game.js       # 게임 생성 도구
├── templates/               # 개발 템플릿
├── docs/                    # 문서
└── .github/workflows/       # CI/CD 파이프라인
```

### 🔄 세션 기반 매칭 시스템
```
[모바일 센서] ↔ [WebSocket Server] ↔ [게임 클라이언트]
     📱              🔗 세션 ID             💻
     
여러 사용자 동시 지원:
세션 A: 모바일1 ↔ 게임1
세션 B: 모바일2 ↔ 게임2
세션 C: 모바일3 ↔ 게임3
```

## 🌐 배포하기

### Render 배포 (권장)

1. **GitHub에 코드 업로드**:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Render에서 새 Web Service 생성**:
   - Repository: GitHub 저장소 연결
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: `Node`

3. **환경 변수 설정** (필요시):
   - `NODE_ENV=production`
   - `PORT=8080` (자동 설정됨)

4. **배포 완료**: 자동으로 HTTPS URL 제공

### 로컬 HTTPS 설정 (iOS 센서 권한용)

#### 방법 1: 자동 스크립트 (권장)
```bash
# 자동 인증서 생성 및 설정
./setup-ssl.sh

# 서버 실행 (HTTP + HTTPS 동시 실행)
npm start
```

#### 방법 2: 수동 설정
```bash
# 자체 서명 인증서 생성
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"

# 서버 실행
npm start
```

#### HTTPS 접속 URL
- **메인 허브**: https://localhost:8443
- **센서 클라이언트**: https://localhost:8443/sensor-client
- **대시보드**: https://localhost:8443/dashboard

> **⚠️ 중요**: iOS에서 센서 권한을 얻으려면 반드시 HTTPS 연결이 필요합니다.

## 📊 API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/` | 메인 허브 페이지 |
| `GET` | `/api/games` | 게임 목록 조회 |
| `GET` | `/api/games/:id` | 특정 게임 정보 |
| `POST` | `/api/games/:id/play` | 플레이 카운트 증가 |
| `GET` | `/api/status` | 서버 상태 및 통계 |
| `GET` | `/sensor-client` | 모바일 센서 클라이언트 |
| `GET` | `/dashboard` | 센서 모니터링 대시보드 |

## 🎮 게임 카테고리

- **puzzle**: 퍼즐/논리 게임
- **action**: 액션/어드벤처 게임
- **racing**: 레이싱/드라이빙 게임
- **sport**: 스포츠 게임
- **casual**: 캐주얼 게임
- **arcade**: 아케이드 게임

## 🔧 개발 환경

### 시스템 요구사항
- **Node.js**: 14.0 이상
- **OpenSSL**: HTTPS 인증서 생성용 (macOS/Linux 기본 설치)
- **브라우저**: Chrome, Safari, Firefox, Edge
- **모바일**: iOS Safari, Android Chrome
- **개발 도구**: VS Code, WebStorm 등

### 네트워크 설정
- **로컬 개발**: HTTP(8080) + HTTPS(8443) 동시 지원
- **iOS 센서 권한**: HTTPS 필수
- **방화벽**: 8080, 8443 포트 허용 필요
- **WiFi**: 모바일과 개발 서버 동일 네트워크 연결

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🆘 지원

- **이슈 리포트**: [GitHub Issues](https://github.com/your-username/sensor-game-hub/issues)
- **토론**: [GitHub Discussions](https://github.com/your-username/sensor-game-hub/discussions)
- **문서**: [개발자 가이드](docs/developer-guide.md)

## 🎯 로드맵

### v2.1 (계획)
- [ ] 멀티플레이어 게임 지원
- [ ] 게임 스토어 기능
- [ ] 사용자 계정 시스템
- [ ] 게임 리뷰 및 평점

### v2.2 (계획)
- [ ] VR/AR 센서 지원
- [ ] 음성 인식 통합
- [ ] AI 기반 게임 추천
- [ ] 실시간 스트리밍

---

**센서 게임의 새로운 세계를 만들어보세요! 🎮✨**