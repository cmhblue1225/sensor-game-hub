/**
 * 센서 게임 SDK v2.0
 * 개발자들이 센서 기반 게임을 쉽게 개발할 수 있도록 도와주는 JavaScript SDK
 * 
 * 사용법:
 * 1. HTML에서 이 파일을 로드: <script src="sdk/sensor-game-sdk.js"></script>
 * 2. SensorGameSDK 클래스를 상속받아 게임 개발
 * 3. processSensorData 메서드를 오버라이드하여 센서 데이터 처리
 */

class SensorGameSDK {
    constructor(gameConfig = {}) {
        // 게임 설정
        this.gameConfig = {
            gameId: gameConfig.gameId || 'unnamed-game',
            gameName: gameConfig.gameName || 'Unnamed Game',
            requestedSensors: gameConfig.requestedSensors || ['orientation'],
            sensorSensitivity: gameConfig.sensorSensitivity || {
                orientation: 1.0,
                accelerometer: 1.0,
                gyroscope: 1.0
            },
            smoothingFactor: gameConfig.smoothingFactor || 3,
            deadzone: gameConfig.deadzone || 0.1,
            ...gameConfig
        };
        
        // 연결 상태
        this.socket = null;
        this.isConnected = false;
        this.deviceId = null;
        
        // 센서 데이터
        this.sensorData = {
            orientation: { alpha: 0, beta: 0, gamma: 0 },
            accelerometer: { x: 0, y: 0, z: 0 },
            gyroscope: { alpha: 0, beta: 0, gamma: 0 },
            timestamp: 0
        };
        
        // 처리된 게임 입력
        this.gameInput = {
            tilt: { x: 0, y: 0 },
            shake: { intensity: 0, detected: false },
            rotation: { speed: 0, direction: 0 },
            gesture: { type: 'none', confidence: 0 }
        };
        
        // 데이터 스무싱을 위한 히스토리
        this.dataHistory = {
            orientation: [],
            accelerometer: [],
            gyroscope: []
        };
        
        // 보정값
        this.calibration = {
            orientation: { alpha: 0, beta: 0, gamma: 0 },
            accelerometer: { x: 0, y: 0, z: 0 }
        };
        
        // 콜백 함수들
        this.callbacks = {
            onSensorData: [],
            onConnectionChange: [],
            onCalibration: [],
            onGesture: []
        };
        
        // 시뮬레이션 모드
        this.simulationMode = false;
        this.simulationKeys = {};
        
        // 통계
        this.stats = {
            packetsReceived: 0,
            lastPacketTime: 0,
            averageLatency: 0,
            connectionUptime: 0
        };
        
        this.init();
    }
    
    /**
     * SDK 초기화
     */
    init() {
        console.log(`🎮 센서 게임 SDK v2.0 초기화: ${this.gameConfig.gameName}`);
        
        // 서버 연결
        this.connectToServer();
        
        // 시뮬레이션 모드 설정
        this.setupSimulationMode();
        
        // 자동 보정 설정
        this.setupAutoCalibration();
    }
    
    /**
     * 서버 연결
     */
    connectToServer() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}`;
            
            this.socket = new WebSocket(wsUrl);
            
            this.socket.onopen = () => {
                this.isConnected = true;
                this.stats.connectionUptime = Date.now();
                console.log(`✅ ${this.gameConfig.gameName} 서버 연결 성공`);
                
                // 게임 클라이언트로 등록
                this.socket.send(JSON.stringify({
                    type: 'register_game_client',
                    gameId: this.gameConfig.gameId,
                    gameName: this.gameConfig.gameName,
                    requestedSensors: this.gameConfig.requestedSensors,
                    clientVersion: '2.0.0',
                    timestamp: Date.now()
                }));
                
                this.triggerCallback('onConnectionChange', true);
                
                // 센서 매칭 요청 (1초 후)
                setTimeout(() => {
                    this.requestSensorMatch();
                }, 1000);
            };
            
            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleServerMessage(data);
                } catch (error) {
                    console.error('메시지 처리 오류:', error);
                }
            };
            
            this.socket.onclose = () => {
                this.isConnected = false;
                console.log(`🔌 ${this.gameConfig.gameName} 서버 연결 끊김`);
                this.triggerCallback('onConnectionChange', false);
                
                // 재연결 시도
                setTimeout(() => this.connectToServer(), 3000);
            };
            
            this.socket.onerror = (error) => {
                console.error('WebSocket 오류:', error);
                this.enableSimulationMode();
            };
            
        } catch (error) {
            console.error('서버 연결 실패:', error);
            this.enableSimulationMode();
        }
    }
    
    /**
     * 서버 메시지 처리
     */
    handleServerMessage(data) {
        switch (data.type) {
            case 'registration_success':
                console.log('게임 클라이언트 등록 성공:', data);
                break;
                
            case 'sensor_data':
                // 세션 ID 확인 후 센서 데이터 처리
                if (data.sessionId === this.sessionId) {
                    this.processSensorData(data.sensorData);
                    this.deviceId = data.deviceId;
                }
                break;
                
            case 'sensor_matched':
                console.log(`🎯 센서 매칭 성공: ${data.deviceId}`);
                this.matchedSensorId = data.deviceId;
                this.sessionId = data.sessionId;
                this.triggerCallback('onSensorStatusChange', { 
                    connected: true, 
                    deviceId: data.deviceId,
                    sessionId: data.sessionId
                });
                break;
                
            case 'sensor_match_failed':
                console.warn('⚠️ 센서 매칭 실패:', data.message);
                this.triggerCallback('onSensorStatusChange', { 
                    connected: false, 
                    reason: data.reason,
                    message: data.message
                });
                break;
                
            case 'sensor_device_connected':
                console.log('센서 디바이스 연결됨:', data.deviceId);
                break;
                
            case 'sensor_device_disconnected':
                if (data.sessionId === this.sessionId) {
                    console.log('📱 연결된 센서 디바이스 연결 해제됨');
                    this.matchedSensorId = null;
                    this.sessionId = null;
                    this.triggerCallback('onSensorStatusChange', { 
                        connected: false,
                        reason: 'sensor_disconnected'
                    });
                }
                break;
                
            case 'pong':
                this.updateLatencyStats(data);
                break;
        }
    }
    
    /**
     * 센서 데이터 처리 (핵심 메서드)
     */
    processSensorData(data) {
        if (!data) return;
        
        this.stats.packetsReceived++;
        this.stats.lastPacketTime = Date.now();
        
        // 원본 센서 데이터 저장
        if (data.orientation) {
            this.addToHistory('orientation', data.orientation);
            this.sensorData.orientation = data.orientation;
        }
        
        if (data.accelerometer) {
            this.addToHistory('accelerometer', data.accelerometer);
            this.sensorData.accelerometer = data.accelerometer;
        }
        
        if (data.gyroscope) {
            this.addToHistory('gyroscope', data.gyroscope);
            this.sensorData.gyroscope = data.gyroscope;
        }
        
        this.sensorData.timestamp = data.timestamp || Date.now();
        
        // 스무싱된 데이터 계산
        const smoothedData = this.getSmoothedData();
        
        // 보정값 적용
        const calibratedData = this.applyCalibration(smoothedData);
        
        // 게임 입력으로 변환
        this.convertToGameInput(calibratedData);
        
        // 제스처 감지
        this.detectGestures(calibratedData);
        
        // 콜백 호출
        this.triggerCallback('onSensorData', this.gameInput, calibratedData, this.sensorData);
    }
    
    /**
     * 게임 입력으로 변환 (오버라이드 가능)
     */
    convertToGameInput(calibratedData) {
        const { orientation, accelerometer, gyroscope } = calibratedData;
        const sensitivity = this.gameConfig.sensorSensitivity;
        
        // 기울기 입력 (orientation)
        if (orientation) {
            this.gameInput.tilt.x = this.applyDeadzone(
                (orientation.gamma / 45) * sensitivity.orientation
            );
            this.gameInput.tilt.y = this.applyDeadzone(
                (orientation.beta / 45) * sensitivity.orientation
            );
        }
        
        // 흔들기 감지 (accelerometer)
        if (accelerometer) {
            const magnitude = Math.sqrt(
                accelerometer.x ** 2 + 
                accelerometer.y ** 2 + 
                accelerometer.z ** 2
            );
            
            this.gameInput.shake.intensity = magnitude;
            this.gameInput.shake.detected = magnitude > 15;
        }
        
        // 회전 감지 (gyroscope)
        if (gyroscope) {
            const rotationSpeed = Math.sqrt(
                gyroscope.alpha ** 2 + 
                gyroscope.beta ** 2 + 
                gyroscope.gamma ** 2
            );
            
            this.gameInput.rotation.speed = rotationSpeed * sensitivity.gyroscope;
            this.gameInput.rotation.direction = Math.atan2(gyroscope.beta, gyroscope.alpha);
        }
    }
    
    /**
     * 제스처 감지
     */
    detectGestures(data) {
        // 기본 제스처: 스와이프, 탭, 롱프레스 등
        // 개발자가 오버라이드하여 커스텀 제스처 구현 가능
        
        const { accelerometer } = data;
        if (!accelerometer) return;
        
        // 스와이프 감지 (간단한 예시)
        if (Math.abs(accelerometer.x) > 10) {
            this.gameInput.gesture.type = accelerometer.x > 0 ? 'swipe_right' : 'swipe_left';
            this.gameInput.gesture.confidence = Math.min(Math.abs(accelerometer.x) / 20, 1);
            this.triggerCallback('onGesture', this.gameInput.gesture);
        } else {
            this.gameInput.gesture.type = 'none';
            this.gameInput.gesture.confidence = 0;
        }
    }
    
    /**
     * 데이터 히스토리 관리
     */
    addToHistory(type, data) {
        if (!this.dataHistory[type]) this.dataHistory[type] = [];
        
        this.dataHistory[type].push({ ...data, timestamp: Date.now() });
        
        // 히스토리 크기 제한
        const maxSize = this.gameConfig.smoothingFactor;
        if (this.dataHistory[type].length > maxSize) {
            this.dataHistory[type].shift();
        }
    }
    
    /**
     * 스무싱된 데이터 계산
     */
    getSmoothedData() {
        const result = {
            orientation: this.calculateAverage('orientation'),
            accelerometer: this.calculateAverage('accelerometer'),
            gyroscope: this.calculateAverage('gyroscope')
        };
        
        return result;
    }
    
    /**
     * 평균값 계산
     */
    calculateAverage(type) {
        const history = this.dataHistory[type];
        if (!history || history.length === 0) return null;
        
        const keys = Object.keys(history[0]).filter(key => key !== 'timestamp');
        const result = {};
        
        keys.forEach(key => {
            result[key] = history.reduce((sum, data) => sum + (data[key] || 0), 0) / history.length;
        });
        
        return result;
    }
    
    /**
     * 보정값 적용
     */
    applyCalibration(data) {
        const result = {};
        
        if (data.orientation && this.calibration.orientation) {
            result.orientation = {
                alpha: data.orientation.alpha - this.calibration.orientation.alpha,
                beta: data.orientation.beta - this.calibration.orientation.beta,
                gamma: data.orientation.gamma - this.calibration.orientation.gamma
            };
        }
        
        if (data.accelerometer && this.calibration.accelerometer) {
            result.accelerometer = {
                x: data.accelerometer.x - this.calibration.accelerometer.x,
                y: data.accelerometer.y - this.calibration.accelerometer.y,
                z: data.accelerometer.z - this.calibration.accelerometer.z
            };
        }
        
        if (data.gyroscope) {
            result.gyroscope = data.gyroscope; // 자이로스코프는 보정하지 않음
        }
        
        return result;
    }
    
    /**
     * 데드존 적용
     */
    applyDeadzone(value) {
        const deadzone = this.gameConfig.deadzone;
        if (Math.abs(value) < deadzone) return 0;
        
        // 데드존 밖의 값을 0-1 범위로 재매핑
        const sign = Math.sign(value);
        const absValue = Math.abs(value);
        return sign * Math.max(0, (absValue - deadzone) / (1 - deadzone));
    }
    
    /**
     * 센서 보정
     */
    calibrate() {
        const currentData = this.getSmoothedData();
        
        if (currentData.orientation) {
            this.calibration.orientation = { ...currentData.orientation };
        }
        
        if (currentData.accelerometer) {
            this.calibration.accelerometer = { ...currentData.accelerometer };
        }
        
        console.log('센서 보정 완료:', this.calibration);
        this.triggerCallback('onCalibration', this.calibration);
    }
    
    /**
     * 센서 매칭 요청
     */
    requestSensorMatch() {
        if (this.isConnected && this.socket) {
            this.socket.send(JSON.stringify({
                type: 'request_sensor_match',
                gameId: this.gameConfig.gameId,
                timestamp: Date.now()
            }));
            console.log('🔍 센서 매칭 요청 전송');
        }
    }
    
    /**
     * 센서 연결 해제
     */
    disconnectSensor() {
        if (this.isConnected && this.socket && this.sessionId) {
            this.socket.send(JSON.stringify({
                type: 'disconnect_sensor',
                sessionId: this.sessionId,
                timestamp: Date.now()
            }));
            console.log('🔌 센서 연결 해제 요청');
        }
    }
    
    /**
     * 시뮬레이션 모드 설정
     */
    setupSimulationMode() {
        document.addEventListener('keydown', (e) => {
            this.simulationKeys[e.code] = true;
            this.updateSimulation();
        });
        
        document.addEventListener('keyup', (e) => {
            this.simulationKeys[e.code] = false;
            this.updateSimulation();
        });
        
        // 보정 키 (R)
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyR') {
                this.calibrate();
            }
        });
    }
    
    /**
     * 시뮬레이션 모드 활성화
     */
    enableSimulationMode() {
        if (this.simulationMode) return;
        
        this.simulationMode = true;
        console.log('🎮 시뮬레이션 모드 활성화 (WASD/화살표 키)');
        
        // 시뮬레이션 업데이트 루프
        this.simulationInterval = setInterval(() => {
            this.updateSimulation();
        }, 16); // 60fps
        
        this.triggerCallback('onConnectionChange', false);
    }
    
    /**
     * 시뮬레이션 업데이트
     */
    updateSimulation() {
        if (!this.simulationMode) return;
        
        // 키보드 입력을 센서 데이터로 변환
        let tiltX = 0, tiltY = 0;
        let shakeIntensity = 0;
        
        // WASD 또는 화살표 키
        if (this.simulationKeys['KeyA'] || this.simulationKeys['ArrowLeft']) tiltX = -1;
        if (this.simulationKeys['KeyD'] || this.simulationKeys['ArrowRight']) tiltX = 1;
        if (this.simulationKeys['KeyW'] || this.simulationKeys['ArrowUp']) tiltY = -1;
        if (this.simulationKeys['KeyS'] || this.simulationKeys['ArrowDown']) tiltY = 1;
        
        // 스페이스바로 흔들기 시뮬레이션
        if (this.simulationKeys['Space']) shakeIntensity = 20;
        
        // 게임 입력 업데이트
        this.gameInput.tilt.x = tiltX;
        this.gameInput.tilt.y = tiltY;
        this.gameInput.shake.intensity = shakeIntensity;
        this.gameInput.shake.detected = shakeIntensity > 0;
        
        // 콜백 호출
        this.triggerCallback('onSensorData', this.gameInput, null, null);
    }
    
    /**
     * 자동 보정 설정
     */
    setupAutoCalibration() {
        // 5초 후 자동 보정
        setTimeout(() => {
            if (this.dataHistory.orientation.length > 0) {
                this.calibrate();
            }
        }, 5000);
    }
    
    /**
     * 지연시간 통계 업데이트
     */
    updateLatencyStats(data) {
        const latency = Date.now() - data.timestamp;
        this.stats.averageLatency = (this.stats.averageLatency + latency) / 2;
    }
    
    /**
     * 콜백 등록
     */
    on(eventType, callback) {
        if (this.callbacks[eventType]) {
            this.callbacks[eventType].push(callback);
        }
    }
    
    /**
     * 콜백 호출
     */
    triggerCallback(eventType, ...args) {
        if (this.callbacks[eventType]) {
            this.callbacks[eventType].forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`콜백 오류 (${eventType}):`, error);
                }
            });
        }
    }
    
    /**
     * 지연시간 측정
     */
    measureLatency() {
        if (this.isConnected && this.socket) {
            this.socket.send(JSON.stringify({
                type: 'ping',
                timestamp: Date.now()
            }));
        }
    }
    
    /**
     * 게임 이벤트 전송
     */
    sendGameEvent(eventType, eventData = {}, broadcast = false) {
        if (this.isConnected && this.socket) {
            this.socket.send(JSON.stringify({
                type: 'game_event',
                gameId: this.gameConfig.gameId,
                eventType: eventType,
                eventData: eventData,
                broadcast: broadcast,
                timestamp: Date.now()
            }));
        }
    }
    
    /**
     * 통계 반환
     */
    getStats() {
        return {
            ...this.stats,
            isConnected: this.isConnected,
            simulationMode: this.simulationMode,
            uptime: this.stats.connectionUptime ? Date.now() - this.stats.connectionUptime : 0
        };
    }
    
    /**
     * 현재 센서 데이터 반환
     */
    getSensorData() {
        return { ...this.sensorData };
    }
    
    /**
     * 현재 게임 입력 반환
     */
    getGameInput() {
        return { ...this.gameInput };
    }
    
    /**
     * 설정 업데이트
     */
    updateConfig(newConfig) {
        this.gameConfig = { ...this.gameConfig, ...newConfig };
    }
    
    /**
     * SDK 정리
     */
    destroy() {
        if (this.socket) {
            this.socket.close();
        }
        
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
        }
        
        console.log('센서 게임 SDK 정리 완료');
    }
}

// 유틸리티 함수들
class SensorGameUtils {
    /**
     * 각도를 -180 ~ 180 범위로 정규화
     */
    static normalizeAngle(angle) {
        while (angle > 180) angle -= 360;
        while (angle < -180) angle += 360;
        return angle;
    }
    
    /**
     * 값을 특정 범위로 클램프
     */
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    
    /**
     * 선형 보간
     */
    static lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    /**
     * 벡터 크기 계산
     */
    static magnitude(vector) {
        if (vector.x !== undefined) {
            return Math.sqrt(vector.x ** 2 + vector.y ** 2 + (vector.z || 0) ** 2);
        }
        return 0;
    }
    
    /**
     * 두 벡터 간의 거리
     */
    static distance(v1, v2) {
        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;
        const dz = (v1.z || 0) - (v2.z || 0);
        return Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2);
    }
    
    /**
     * 디바이스 타입 감지
     */
    static detectDevice() {
        const ua = navigator.userAgent;
        return {
            isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
            isIOS: /iPad|iPhone|iPod/.test(ua),
            isAndroid: /Android/.test(ua),
            isSafari: /Safari/.test(ua) && !/Chrome/.test(ua)
        };
    }
}

// 전역 객체로 등록
if (typeof window !== 'undefined') {
    window.SensorGameSDK = SensorGameSDK;
    window.SensorGameUtils = SensorGameUtils;
}

// 모듈 내보내기 (Node.js 환경)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SensorGameSDK, SensorGameUtils };
}