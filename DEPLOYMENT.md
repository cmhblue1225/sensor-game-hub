# 🚀 센서 게임 허브 배포 가이드

## 📋 배포 준비사항

### 1. GitHub 저장소 생성
```bash
# 로컬 저장소 초기화
git init
git add .
git commit -m "Initial commit: Sensor Game Hub v2.0"

# GitHub 저장소 연결
git remote add origin https://github.com/YOUR_USERNAME/sensor-game-hub.git
git push -u origin main
```

### 2. Render 계정 설정
1. [Render.com](https://render.com) 가입
2. GitHub 계정 연결
3. 새 Web Service 생성

## 🔧 Render 배포 설정

### 자동 배포 설정
1. **Repository**: GitHub 저장소 선택
2. **Branch**: `main`
3. **Root Directory**: (비워둠)
4. **Build Command**: `npm install`
5. **Start Command**: `npm start`

### 환경 변수 설정
```
NODE_ENV=production
PORT=8443
```

### 도메인 설정 (선택사항)
- 커스텀 도메인 연결 가능
- 자동 HTTPS 인증서 제공

## 🎮 게임 개발 워크플로우

### 새 게임 생성
```bash
# 게임 생성 도구 사용
node scripts/create-game.js

# 수동 생성
mkdir games/my-new-game
cd games/my-new-game
# 템플릿 파일들 복사 및 수정
```

### 게임 파일 구조
```
games/my-new-game/
├── index.html      # 게임 메인 페이지
├── game.js         # 게임 로직 (SensorGameSDK 확장)
├── game.json       # 게임 메타데이터
├── style.css       # 게임별 스타일 (선택사항)
└── assets/         # 게임 에셋 (선택사항)
    ├── images/
    ├── sounds/
    └── models/
```

### 게임 메타데이터 (game.json)
```json
{
    "id": "my-new-game",
    "name": "나의 새 게임",
    "description": "센서를 이용한 멋진 게임",
    "author": "개발자 이름",
    "version": "1.0.0",
    "category": "puzzle",
    "difficulty": "easy",
    "icon": "🎮",
    "sensorTypes": ["orientation"],
    "features": ["singleplayer", "sensor-control"]
}
```

## 🔄 지속적 배포 (CI/CD)

### GitHub Actions 설정
자동으로 설정된 워크플로우:
- `main` 브랜치 push 시 자동 배포
- 게임 JSON 파일 유효성 검사
- 의존성 설치 및 테스트

### 보안 설정
GitHub 저장소 Settings → Secrets에서 설정:
```
RENDER_SERVICE_ID=your-render-service-id
RENDER_API_KEY=your-render-api-key
```

## 🎯 게임 배포 과정

### 1. 로컬 개발
```bash
# 서버 시작
npm start

# 새 게임 생성
node scripts/create-game.js

# 게임 테스트
# https://localhost:8443/games/your-game-id
```

### 2. 버전 관리
```bash
# 변경사항 커밋
git add .
git commit -m "Add new game: My Awesome Game"

# 원격 저장소 푸시
git push origin main
```

### 3. 자동 배포
- GitHub Actions가 자동 실행
- 테스트 및 유효성 검사
- Render에 자동 배포

## 🌍 배포 후 확인사항

### 1. 기본 기능 테스트
- [ ] 메인 허브 페이지 로딩
- [ ] 모바일/데스크톱 모드 전환
- [ ] 센서 클라이언트 연결
- [ ] 게임 목록 표시

### 2. 센서 기능 테스트
- [ ] 모바일 센서 권한 요청
- [ ] 센서 데이터 전송
- [ ] 게임 내 센서 반응

### 3. 성능 모니터링
- [ ] WebSocket 연결 안정성
- [ ] 센서 데이터 지연시간
- [ ] 메모리 사용량

## 🛠️ 트러블슈팅

### 일반적인 문제들

1. **센서 권한 오류**
   - HTTPS 인증서 확인
   - 브라우저 권한 설정

2. **WebSocket 연결 실패**
   - 방화벽 설정 확인
   - 포트 설정 확인

3. **게임 로드 실패**
   - game.json 파일 유효성 확인
   - 파일 경로 확인

### 로그 확인
```bash
# Render 대시보드에서 실시간 로그 확인
# 또는 로컬 개발 시:
npm start
```

## 📊 모니터링 도구

### 내장 대시보드
- URL: `https://your-app.onrender.com/dashboard`
- 실시간 센서 상태 모니터링
- 게임 플레이 통계

### 외부 모니터링
- Render 대시보드: 서버 상태, 메모리, CPU
- Google Analytics: 사용자 추적 (선택사항)

## 🎉 배포 완료!

배포가 완료되면:
1. 🌐 **메인 허브**: https://your-app-name.onrender.com
2. 📱 **모바일 센서**: https://your-app-name.onrender.com/sensor-client
3. 📊 **대시보드**: https://your-app-name.onrender.com/dashboard

이제 전 세계 어디서든 모바일 센서를 이용한 게임을 즐길 수 있습니다! 🎮✨