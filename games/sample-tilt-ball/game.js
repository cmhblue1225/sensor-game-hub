/**
 * 기울기 볼 굴리기 게임
 * 센서 게임 허브 v2.0 샘플 게임
 */

class TiltBallGame extends SensorGameSDK {
    constructor() {
        super({
            gameId: 'sample-tilt-ball',
            gameName: '기울기 볼 굴리기',
            requestedSensors: ['orientation'],
            sensorSensitivity: {
                orientation: 0.8  // 부드러운 조작감
            },
            smoothingFactor: 3,
            deadzone: 0.05
        });
        
        // 게임 상태 (초기화 실패 여부와 관계없이 항상 설정)
        this.gameState = {
            score: 0,
            level: 1,
            isPlaying: true,
            showInstructions: true
        };
        
        console.log('gameState 초기화됨:', this.gameState);
        
        // 게임 오브젝트 (초기화 실패 여부와 관계없이 항상 설정)
        this.ball = {
            x: 100,
            y: 200,
            radius: 15,
            velocity: { x: 0, y: 0 },
            color: '#667eea',
            trail: []
        };
        
        this.target = {
            x: 500,
            y: 200,
            radius: 30,
            color: '#00ff88',
            pulsePhase: 0
        };
        
        this.obstacles = [
            { x: 250, y: 150, width: 20, height: 100, color: '#ff4757' },
            { x: 350, y: 250, width: 100, height: 20, color: '#ff4757' },
            { x: 450, y: 100, width: 20, height: 80, color: '#ff4757' }
        ];
        
        // 물리 설정
        this.physics = {
            gravity: 0.3,
            friction: 0.95,
            bounce: 0.7,
            maxSpeed: 8
        };
        
        // 파티클 시스템
        this.particles = [];
        
        // 키보드 상태 (시뮬레이션 모드용)
        this.keys = {};
        
        // 세션 관리 (v2.0)
        this.sessionId = null;
        this.matchedSensorId = null;
        
        // 게임 요소
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            console.error('gameCanvas 요소를 찾을 수 없습니다. HTML에 id="gameCanvas"인 canvas 요소가 있는지 확인하세요.');
            this.initializationFailed = true;
        } else {
            this.ctx = this.canvas.getContext('2d');
            this.initializationFailed = false;
        }
        
        // 명시적으로 게임 초기화 호출
        this.initializeGame();
    }
    
    /**
     * 부모 클래스의 init() 메서드 오버라이드 (빈 구현)
     */
    init() {
        // 부모 클래스의 자동 초기화를 막음
        console.log('부모 클래스 init() 호출됨 - 무시');
    }
    
    /**
     * 게임 초기화
     */
    initializeGame() {
        console.log('🎱 기울기 볼 굴리기 게임 시작');
        
        // 센서 데이터 콜백 등록
        this.on('onSensorData', (gameInput, calibratedData, rawData) => {
            console.log('센서 데이터 수신:', gameInput, calibratedData, rawData);
            this.handleSensorInput(gameInput);
        });
        
        // 연결 상태 변경 콜백
        this.on('onConnectionChange', (isConnected) => {
            console.log('센서 연결 상태 변경:', isConnected);
            this.updateSensorStatus(isConnected);
        });
        
        // SDK WebSocket 연결 상태 확인
        console.log('SDK WebSocket 상태:', this.ws ? this.ws.readyState : 'undefined');
        
        // WebSocket 연결이 없으면 수동으로 연결
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.log('WebSocket 연결 시도...');
            this.connectWebSocket();
        }
        
        // 캔버스 설정 (실패해도 계속 진행)
        this.setupCanvas();
        
        // 스케일링 변수 기본값 설정 (캔버스 설정 실패 시 대비)
        if (!this.scaleX || !this.scaleY) {
            this.scaleX = 1;
            this.scaleY = 1;
        }
        
        // 키보드 입력 리스너 추가 (시뮬레이션 모드)
        this.setupKeyboardControls();
        
        // 초기 UI 업데이트
        this.updateUI();
        
        // 초기화 실패가 아닌 경우에만 게임 루프 시작
        if (!this.initializationFailed) {
            this.gameLoop();
        } else {
            console.warn('캔버스가 없어 게임 루프를 시작하지 않습니다.');
        }
    }
    
    /**
     * WebSocket 연결 설정
     */
    connectWebSocket() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}`;
            
            console.log('WebSocket 연결 시도:', wsUrl);
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = (event) => {
                console.log('WebSocket 연결 성공');
                // 게임 클라이언트로 등록
                this.ws.send(JSON.stringify({
                    type: 'register_game_client',
                    gameId: 'sample-tilt-ball',
                    gameName: '기울기 볼 굴리기',
                    requestedSensors: ['orientation']
                }));
                
                // 센서 매칭 요청 (1초 후)
                setTimeout(() => {
                    console.log('센서 매칭 요청 전송');
                    this.ws.send(JSON.stringify({
                        type: 'request_sensor_match',
                        gameId: 'sample-tilt-ball',
                        timestamp: Date.now()
                    }));
                }, 1000);
            };
            
            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log('WebSocket 메시지 수신:', data);
                
                switch (data.type) {
                    case 'sensor_device_connected':
                        console.log('센서 디바이스 연결됨');
                        this.updateSensorStatus(true);
                        break;
                    case 'sensor_device_disconnected':
                        console.log('센서 디바이스 연결 해제됨');
                        this.updateSensorStatus(false);
                        break;
                    case 'sensor_matched':
                        console.log('🎯 센서 매칭 성공:', data.deviceId);
                        this.matchedSensorId = data.deviceId;
                        this.sessionId = data.sessionId;
                        this.updateSensorStatus(true);
                        break;
                    case 'sensor_match_failed':
                        console.log('⚠️ 센서 매칭 실패:', data.message);
                        this.updateSensorStatus(false);
                        break;
                    case 'sensor_data':
                        // 세션 ID 확인 후 센서 데이터 처리
                        if (data.sessionId === this.sessionId) {
                            console.log('센서 데이터 수신:', data.sensorData);
                            this.processSensorData(data.sensorData);
                        }
                        break;
                }
            };
            
            this.ws.onclose = (event) => {
                console.log('WebSocket 연결 종료');
                this.updateSensorStatus(false);
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket 오류:', error);
                this.updateSensorStatus(false);
            };
        } catch (error) {
            console.error('WebSocket 연결 실패:', error);
            this.updateSensorStatus(false);
        }
    }
    
    /**
     * 센서 데이터 처리
     */
    processSensorData(sensorData) {
        console.log('processSensorData 호출됨:', sensorData);
        
        if (!sensorData) {
            console.log('센서 데이터가 없습니다.');
            return;
        }
        
        // 센서 데이터 구조 확인
        console.log('센서 데이터 구조:', {
            orientation: sensorData.orientation,
            accelerometer: sensorData.accelerometer,
            gyroscope: sensorData.gyroscope
        });
        
        // orientation 데이터가 있는지 확인
        if (sensorData.orientation) {
            const gameInput = {
                tilt: {
                    x: sensorData.orientation.gamma || 0,  // 좌우 기울기
                    y: sensorData.orientation.beta || 0    // 앞뒤 기울기
                }
            };
            
            console.log('게임 입력 생성:', gameInput);
            this.handleSensorInput(gameInput);
        } else {
            console.log('orientation 데이터가 없습니다.');
        }
    }
    
    /**
     * 캔버스 반응형 설정
     */
    setupCanvas() {
        // 캔버스가 존재하지 않으면 에러 처리하지만 계속 진행
        if (!this.canvas) {
            console.error('gameCanvas 요소를 찾을 수 없습니다.');
            // 기본 스케일링 설정
            this.scaleX = 1;
            this.scaleY = 1;
            return;
        }
        
        const container = this.canvas.parentElement;
        if (!container) {
            console.error('캔버스의 부모 요소를 찾을 수 없습니다.');
            // 기본 스케일링 설정
            this.scaleX = 1;
            this.scaleY = 1;
            return;
        }
        
        const maxWidth = Math.min(container.clientWidth - 40, 800);
        const maxHeight = Math.min(container.clientHeight - 200, 600);
        
        // 가로세로 비율 유지
        const aspectRatio = 600 / 400;
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
        
        // 게임 오브젝트 위치 스케일링
        this.scaleX = width / 600;
        this.scaleY = height / 400;
        
        // 윈도우 리사이즈 이벤트
        window.addEventListener('resize', () => this.setupCanvas());
    }
    
    /**
     * 키보드 컨트롤 설정 (시뮬레이션 모드)
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
     * 키보드 입력 처리 (시뮬레이션 모드)
     */
    handleKeyboardInput() {
        if (!this.gameState.isPlaying) return;
        
        let forceX = 0;
        let forceY = 0;
        
        // WASD 키 입력
        if (this.keys['w'] || this.keys['arrowup']) forceY -= 0.3;
        if (this.keys['s'] || this.keys['arrowdown']) forceY += 0.3;
        if (this.keys['a'] || this.keys['arrowleft']) forceX -= 0.3;
        if (this.keys['d'] || this.keys['arrowright']) forceX += 0.3;
        
        // 키보드 입력이 있으면 공에 힘 적용
        if (forceX !== 0 || forceY !== 0) {
            this.ball.velocity.x += forceX;
            this.ball.velocity.y += forceY;
            
            // 최대 속도 제한
            const speed = Math.sqrt(this.ball.velocity.x ** 2 + this.ball.velocity.y ** 2);
            if (speed > this.physics.maxSpeed) {
                this.ball.velocity.x = (this.ball.velocity.x / speed) * this.physics.maxSpeed;
                this.ball.velocity.y = (this.ball.velocity.y / speed) * this.physics.maxSpeed;
            }
        }
    }
    
    /**
     * 센서 입력 처리
     */
    handleSensorInput(gameInput) {
        if (!this.gameState.isPlaying) {
            console.log('게임이 플레이 중이 아니므로 센서 입력 무시');
            return;
        }
        
        if (!gameInput || !gameInput.tilt) {
            console.log('유효하지 않은 센서 입력:', gameInput);
            return;
        }
        
        // 기울기를 물리력으로 변환 (각도를 라디안으로 변환하고 감도 적용)
        const forceX = (gameInput.tilt.x / 90) * 0.5;  // gamma: -90~90도를 -1~1로 정규화
        const forceY = (gameInput.tilt.y / 90) * 0.5;  // beta: -90~90도를 -1~1로 정규화
        
        console.log('센서 입력 처리:', {
            tilt: gameInput.tilt,
            forceX: forceX,
            forceY: forceY,
            currentVelocity: this.ball.velocity
        });
        
        // 공에 힘 적용
        this.ball.velocity.x += forceX;
        this.ball.velocity.y += forceY;
        
        // 최대 속도 제한
        const speed = Math.sqrt(this.ball.velocity.x ** 2 + this.ball.velocity.y ** 2);
        if (speed > this.physics.maxSpeed) {
            this.ball.velocity.x = (this.ball.velocity.x / speed) * this.physics.maxSpeed;
            this.ball.velocity.y = (this.ball.velocity.y / speed) * this.physics.maxSpeed;
        }
    }
    
    /**
     * 게임 업데이트
     */
    update() {
        if (this.initializationFailed || !this.gameState || !this.gameState.isPlaying) return;
        
        // 키보드 입력 처리 (시뮬레이션 모드)
        this.handleKeyboardInput();
        
        // 물리 계산
        this.updatePhysics();
        
        // 충돌 감지
        this.checkCollisions();
        
        // 목표 도달 체크
        this.checkTargetReached();
        
        // 파티클 업데이트
        this.updateParticles();
        
        // 트레일 업데이트
        this.updateTrail();
        
        // 목표 펄스 애니메이션
        this.target.pulsePhase += 0.1;
    }
    
    /**
     * 물리 시뮬레이션
     */
    updatePhysics() {
        // 마찰 적용
        this.ball.velocity.x *= this.physics.friction;
        this.ball.velocity.y *= this.physics.friction;
        
        // 위치 업데이트
        this.ball.x += this.ball.velocity.x;
        this.ball.y += this.ball.velocity.y;
        
        // 화면 경계 충돌
        const scaledRadius = this.ball.radius * Math.min(this.scaleX, this.scaleY);
        
        if (this.ball.x - scaledRadius < 0) {
            this.ball.x = scaledRadius;
            this.ball.velocity.x *= -this.physics.bounce;
            this.createImpactParticles(this.ball.x, this.ball.y);
        }
        
        if (this.ball.x + scaledRadius > this.canvas.width / this.scaleX) {
            this.ball.x = (this.canvas.width / this.scaleX) - scaledRadius;
            this.ball.velocity.x *= -this.physics.bounce;
            this.createImpactParticles(this.ball.x, this.ball.y);
        }
        
        if (this.ball.y - scaledRadius < 0) {
            this.ball.y = scaledRadius;
            this.ball.velocity.y *= -this.physics.bounce;
            this.createImpactParticles(this.ball.x, this.ball.y);
        }
        
        if (this.ball.y + scaledRadius > this.canvas.height / this.scaleY) {
            this.ball.y = (this.canvas.height / this.scaleY) - scaledRadius;
            this.ball.velocity.y *= -this.physics.bounce;
            this.createImpactParticles(this.ball.x, this.ball.y);
        }
    }
    
    /**
     * 충돌 감지
     */
    checkCollisions() {
        this.obstacles.forEach(obstacle => {
            if (this.checkRectCircleCollision(obstacle, this.ball)) {
                this.handleObstacleCollision(obstacle);
            }
        });
    }
    
    /**
     * 사각형-원 충돌 감지
     */
    checkRectCircleCollision(rect, circle) {
        const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
        const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
        
        const distance = Math.sqrt((circle.x - closestX) ** 2 + (circle.y - closestY) ** 2);
        return distance < circle.radius;
    }
    
    /**
     * 장애물 충돌 처리
     */
    handleObstacleCollision(obstacle) {
        // 충돌 방향 계산
        const centerX = obstacle.x + obstacle.width / 2;
        const centerY = obstacle.y + obstacle.height / 2;
        
        const dx = this.ball.x - centerX;
        const dy = this.ball.y - centerY;
        
        // 충돌면에 따른 반사
        if (Math.abs(dx / obstacle.width) > Math.abs(dy / obstacle.height)) {
            this.ball.velocity.x *= -this.physics.bounce;
            this.ball.x = dx > 0 ? obstacle.x + obstacle.width + this.ball.radius : obstacle.x - this.ball.radius;
        } else {
            this.ball.velocity.y *= -this.physics.bounce;
            this.ball.y = dy > 0 ? obstacle.y + obstacle.height + this.ball.radius : obstacle.y - this.ball.radius;
        }
        
        // 충돌 파티클 생성
        this.createImpactParticles(this.ball.x, this.ball.y, '#ff4757');
        
        // 점수 감소
        this.gameState.score = Math.max(0, this.gameState.score - 10);
        this.updateUI();
    }
    
    /**
     * 목표 도달 체크
     */
    checkTargetReached() {
        const distance = Math.sqrt(
            (this.ball.x - this.target.x) ** 2 + (this.ball.y - this.target.y) ** 2
        );
        
        if (distance < this.target.radius) {
            this.handleTargetReached();
        }
    }
    
    /**
     * 목표 도달 처리
     */
    handleTargetReached() {
        // 점수 증가
        this.gameState.score += 100;
        this.gameState.level++;
        
        // 성공 파티클
        this.createSuccessParticles(this.target.x, this.target.y);
        
        // 새 레벨 생성
        this.generateNewLevel();
        
        // UI 업데이트
        this.updateUI();
        
        console.log(`레벨 ${this.gameState.level} 클리어! 점수: ${this.gameState.score}`);
    }
    
    /**
     * 새 레벨 생성
     */
    generateNewLevel() {
        // 공 위치 초기화
        this.ball.x = 100;
        this.ball.y = 200;
        this.ball.velocity = { x: 0, y: 0 };
        this.ball.trail = [];
        
        // 새 목표 위치
        this.target.x = 450 + Math.random() * 100;
        this.target.y = 150 + Math.random() * 100;
        
        // 장애물 랜덤 배치
        this.obstacles = [];
        const obstacleCount = Math.min(2 + Math.floor(this.gameState.level / 2), 6);
        
        for (let i = 0; i < obstacleCount; i++) {
            this.obstacles.push({
                x: 200 + Math.random() * 200,
                y: 100 + Math.random() * 200,
                width: 20 + Math.random() * 60,
                height: 20 + Math.random() * 60,
                color: '#ff4757'
            });
        }
    }
    
    /**
     * 트레일 업데이트
     */
    updateTrail() {
        // 트레일 포인트 추가
        this.ball.trail.push({ x: this.ball.x, y: this.ball.y, alpha: 1.0 });
        
        // 트레일 길이 제한
        if (this.ball.trail.length > 15) {
            this.ball.trail.shift();
        }
        
        // 트레일 페이드 아웃
        this.ball.trail.forEach((point, index) => {
            point.alpha = index / this.ball.trail.length;
        });
    }
    
    /**
     * 파티클 시스템
     */
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.2; // 중력
            particle.alpha -= 0.02;
            particle.size *= 0.98;
            
            if (particle.alpha <= 0 || particle.size < 1) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    /**
     * 충돌 파티클 생성
     */
    createImpactParticles(x, y, color = '#ffffff') {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                size: 3 + Math.random() * 3,
                alpha: 1.0,
                color: color
            });
        }
    }
    
    /**
     * 성공 파티클 생성
     */
    createSuccessParticles(x, y) {
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 12,
                vy: (Math.random() - 0.5) * 12,
                size: 4 + Math.random() * 4,
                alpha: 1.0,
                color: '#00ff88'
            });
        }
    }
    
    /**
     * 렌더링
     */
    render() {
        // 초기화 실패 시 렌더링 건너뛰기
        if (this.initializationFailed || !this.ctx || !this.canvas) return;
        
        // 화면 지우기
        this.ctx.fillStyle = 'rgba(15, 15, 35, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 변환 행렬 설정
        this.ctx.save();
        this.ctx.scale(this.scaleX || 1, this.scaleY || 1);
        
        // 트레일 그리기
        this.renderTrail();
        
        // 장애물 그리기
        this.renderObstacles();
        
        // 목표 그리기
        this.renderTarget();
        
        // 공 그리기
        this.renderBall();
        
        // 파티클 그리기
        this.renderParticles();
        
        this.ctx.restore();
    }
    
    /**
     * 트레일 렌더링
     */
    renderTrail() {
        if (!this.ctx || !this.ball || !this.ball.trail) return;
        
        this.ball.trail.forEach((point, index) => {
            this.ctx.globalAlpha = point.alpha * 0.6;
            this.ctx.fillStyle = this.ball.color;
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, (index / this.ball.trail.length) * this.ball.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1.0;
    }
    
    /**
     * 장애물 렌더링
     */
    renderObstacles() {
        if (!this.ctx || !this.obstacles) return;
        
        this.obstacles.forEach(obstacle => {
            // 그림자
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.fillRect(obstacle.x + 2, obstacle.y + 2, obstacle.width, obstacle.height);
            
            // 장애물
            this.ctx.fillStyle = obstacle.color;
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
            // 하이라이트
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, 3);
        });
    }
    
    /**
     * 목표 렌더링
     */
    renderTarget() {
        if (!this.ctx || !this.target) return;
        
        const pulseSize = this.target.radius + Math.sin(this.target.pulsePhase) * 5;
        
        // 펄스 링
        this.ctx.strokeStyle = this.target.color;
        this.ctx.lineWidth = 3;
        this.ctx.globalAlpha = 0.5;
        this.ctx.beginPath();
        this.ctx.arc(this.target.x, this.target.y, pulseSize, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // 목표
        this.ctx.globalAlpha = 1.0;
        this.ctx.fillStyle = this.target.color;
        this.ctx.beginPath();
        this.ctx.arc(this.target.x, this.target.y, this.target.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 목표 중앙 점
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(this.target.x, this.target.y, 5, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    /**
     * 공 렌더링
     */
    renderBall() {
        if (!this.ctx || !this.ball) return;
        
        // 그림자
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x + 3, this.ball.y + 3, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 공
        const gradient = this.ctx.createRadialGradient(
            this.ball.x - 5, this.ball.y - 5, 0,
            this.ball.x, this.ball.y, this.ball.radius
        );
        gradient.addColorStop(0, '#889bfc');
        gradient.addColorStop(1, this.ball.color);
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 하이라이트
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x - 5, this.ball.y - 5, 4, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    /**
     * 파티클 렌더링
     */
    renderParticles() {
        if (!this.ctx || !this.particles) return;
        
        this.particles.forEach(particle => {
            this.ctx.globalAlpha = particle.alpha;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1.0;
    }
    
    /**
     * 게임 루프
     */
    gameLoop() {
        if (this.initializationFailed) return;
        
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    /**
     * UI 업데이트
     */
    updateUI() {
        if (!this.gameState) {
            console.error('gameState가 초기화되지 않았습니다.');
            return;
        }
        
        const scoreElement = document.getElementById('scoreValue');
        if (scoreElement) {
            scoreElement.textContent = this.gameState.score;
        }
    }
    
    /**
     * 센서 상태 업데이트
     */
    updateSensorStatus(isConnected) {
        console.log('센서 상태 업데이트:', isConnected);
        const statusElement = document.getElementById('sensorStatus');
        console.log('statusElement 찾음:', statusElement);
        
        if (statusElement) {
            if (isConnected) {
                statusElement.textContent = '📱 센서 연결됨';
                statusElement.style.color = '#00ff88';
                console.log('센서 연결됨 상태로 UI 업데이트');
            } else {
                statusElement.textContent = '⌨️ 시뮬레이션 모드 (WASD/화살표)';
                statusElement.style.color = '#ffaa00';
                console.log('센서 연결 안됨 상태로 UI 업데이트');
            }
        } else {
            console.error('sensorStatus 요소를 찾을 수 없습니다.');
        }
    }
    
    /**
     * 게임 재시작
     */
    restart() {
        this.gameState.score = 0;
        this.gameState.level = 1;
        this.ball.x = 100;
        this.ball.y = 200;
        this.ball.velocity = { x: 0, y: 0 };
        this.ball.trail = [];
        this.particles = [];
        
        this.target.x = 500;
        this.target.y = 200;
        
        this.obstacles = [
            { x: 250, y: 150, width: 20, height: 100, color: '#ff4757' },
            { x: 350, y: 250, width: 100, height: 20, color: '#ff4757' },
            { x: 450, y: 100, width: 20, height: 80, color: '#ff4757' }
        ];
        
        this.updateUI();
        console.log('게임 재시작');
    }
    
    /**
     * 설명 숨기기
     */
    hideInstructions() {
        const instructionsElement = document.getElementById('instructions');
        if (instructionsElement) {
            instructionsElement.classList.add('hidden');
        }
        this.gameState.showInstructions = false;
    }
    
    /**
     * 센서 보정
     */
    calibrate() {
        super.calibrate();
        console.log('센서 보정 완료');
        
        // 보정 완료 알림
        this.createSuccessParticles(this.ball.x, this.ball.y);
    }
}

// 게임 인스턴스 생성
let game;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎱 기울기 볼 굴리기 게임 로딩 완료');
    
    // 게임 초기화 시도
    try {
        game = new TiltBallGame();
        
        // 초기화가 성공한 경우에만 전역 객체로 등록
        if (!game.initializationFailed) {
            window.game = game;
        } else {
            console.error('게임 초기화 실패');
            window.game = null;
        }
    } catch (error) {
        console.error('게임 생성 중 오류:', error);
        window.game = null;
    }
});