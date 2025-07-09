/**
 * 센서 게임 플랫폼 - 공통 센서 관리자 기본 클래스
 * 모든 게임에서 공통으로 사용되는 센서 관리 기능을 제공
 */
class BaseSensorManager {
    constructor(gameType, devicePrefix = 'Game') {
        this.gameType = gameType;
        this.deviceId = `${devicePrefix}-${gameType}-${Math.random().toString(36).substr(2, 9)}`;
        
        // WebSocket 연결 관리
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
        
        // 센서 데이터 저장소
        this.sensorData = {
            orientation: { alpha: 0, beta: 0, gamma: 0 },
            accelerometer: { x: 0, y: 0, z: 0 },
            gyroscope: { alpha: 0, beta: 0, gamma: 0 },
            timestamp: Date.now()
        };
        
        // 데이터 스무딩을 위한 히스토리
        this.dataHistory = {
            orientation: [],
            accelerometer: [],
            gyroscope: []
        };
        this.historySize = 5;
        
        // 콜백 함수들
        this.callbacks = [];
        this.uiCallbacks = [];
        
        // 시뮬레이션 모드 설정
        this.simulationMode = false;
        this.simulationInterval = null;
        this.keys = {};
        
        // 게임별 입력 (하위 클래스에서 정의)
        this.gameInput = {};
        
        // 초기화
        this.init();
    }
    
    /**
     * 센서 관리자 초기화
     */
    init() {
        console.log(`🎮 [${this.gameType}] 센서 관리자 초기화`);
        this.connectToServer();
        this.setupKeyboardListeners();
    }
    
    /**
     * WebSocket 서버 연결
     */
    connectToServer() {
        try {
            const serverHost = window.location.hostname || 'localhost';
            const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
            const serverPort = protocol === 'wss' ? '8443' : '8080';
            
            this.socket = new WebSocket(`${protocol}://${serverHost}:${serverPort}`);
            
            this.socket.onopen = () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                console.log(`🎮 [${this.gameType}] 센서 시스템 연결 성공`);
                
                // 게임 클라이언트 등록
                this.registerGameClient();
                
                // UI 업데이트
                this.updateConnectionStatus(true);
            };
            
            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'sensor_data') {
                        this.processSensorData(data.data);
                    }
                } catch (error) {
                    console.error('센서 데이터 처리 오류:', error);
                }
            };
            
            this.socket.onclose = () => {
                this.isConnected = false;
                this.updateConnectionStatus(false);
                console.log(`🎮 [${this.gameType}] 센서 연결 끊김`);
                
                // 재연결 시도
                this.attemptReconnect();
            };
            
            this.socket.onerror = (error) => {
                console.error(`🎮 [${this.gameType}] 센서 연결 오류:`, error);
                this.attemptReconnect();
            };
            
        } catch (error) {
            console.error(`🎮 [${this.gameType}] 센서 서버 연결 실패:`, error);
            this.startSimulationMode();
        }
    }
    
    /**
     * 게임 클라이언트 등록
     */
    registerGameClient() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'game_client_register',
                deviceId: this.deviceId,
                gameType: this.gameType,
                capabilities: ['orientation', 'accelerometer', 'gyroscope']
            }));
        }
    }
    
    /**
     * 재연결 시도
     */
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🎮 [${this.gameType}] 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            
            setTimeout(() => {
                this.connectToServer();
            }, this.reconnectDelay);
        } else {
            console.warn(`🎮 [${this.gameType}] 최대 재연결 시도 초과. 시뮬레이션 모드로 전환`);
            this.startSimulationMode();
        }
    }
    
    /**
     * 센서 데이터 처리 (공통 로직)
     */
    processSensorData(data) {
        // 타임스탬프 업데이트
        this.sensorData.timestamp = Date.now();
        
        // 센서 데이터 유효성 검사 및 저장
        if (data.orientation && this.isValidOrientation(data.orientation)) {
            this.addToHistory('orientation', data.orientation);
            this.sensorData.orientation = this.getSmoothedData('orientation');
        }
        
        if (data.accelerometer && this.isValidVector(data.accelerometer)) {
            this.addToHistory('accelerometer', data.accelerometer);
            this.sensorData.accelerometer = this.getSmoothedData('accelerometer');
        }
        
        if (data.gyroscope && this.isValidVector(data.gyroscope)) {
            this.addToHistory('gyroscope', data.gyroscope);
            this.sensorData.gyroscope = this.getSmoothedData('gyroscope');
        }
        
        // 게임 입력으로 변환 (하위 클래스에서 구현)
        this.convertToGameInput();
        
        // 콜백 호출
        this.notifyCallbacks();
    }
    
    /**
     * 센서 데이터를 게임 입력으로 변환 (하위 클래스에서 오버라이드)
     */
    convertToGameInput() {
        // 기본 구현 - 하위 클래스에서 재정의 필요
        console.warn(`[${this.gameType}] convertToGameInput() 메서드를 오버라이드하세요`);
    }
    
    /**
     * 데이터 히스토리에 추가
     */
    addToHistory(type, data) {
        if (!this.dataHistory[type]) {
            this.dataHistory[type] = [];
        }
        
        this.dataHistory[type].push(data);
        
        // 히스토리 크기 제한
        if (this.dataHistory[type].length > this.historySize) {
            this.dataHistory[type].shift();
        }
    }
    
    /**
     * 스무딩된 데이터 가져오기
     */
    getSmoothedData(type) {
        const history = this.dataHistory[type];
        if (!history || history.length === 0) {
            return type === 'orientation' ? 
                { alpha: 0, beta: 0, gamma: 0 } : 
                { x: 0, y: 0, z: 0 };
        }
        
        // 평균값 계산
        const avg = history.reduce((acc, curr) => {
            if (type === 'orientation') {
                return {
                    alpha: acc.alpha + curr.alpha,
                    beta: acc.beta + curr.beta,
                    gamma: acc.gamma + curr.gamma
                };
            } else {
                return {
                    x: acc.x + curr.x,
                    y: acc.y + curr.y,
                    z: acc.z + curr.z
                };
            }
        }, type === 'orientation' ? 
            { alpha: 0, beta: 0, gamma: 0 } : 
            { x: 0, y: 0, z: 0 });
        
        const count = history.length;
        if (type === 'orientation') {
            return {
                alpha: avg.alpha / count,
                beta: avg.beta / count,
                gamma: avg.gamma / count
            };
        } else {
            return {
                x: avg.x / count,
                y: avg.y / count,
                z: avg.z / count
            };
        }
    }
    
    /**
     * 시뮬레이션 모드 시작
     */
    startSimulationMode() {
        if (this.simulationMode) return;
        
        this.simulationMode = true;
        this.isConnected = false;
        this.updateConnectionStatus(false);
        
        console.warn(`🎮 [${this.gameType}] 시뮬레이션 모드 시작`);
        
        // 시뮬레이션 루프 시작
        this.simulationInterval = setInterval(() => {
            this.updateSimulation();
        }, 16); // 60fps
    }
    
    /**
     * 시뮬레이션 업데이트 (하위 클래스에서 오버라이드)
     */
    updateSimulation() {
        // 기본 구현 - 하위 클래스에서 재정의 필요
        console.warn(`[${this.gameType}] updateSimulation() 메서드를 오버라이드하세요`);
    }
    
    /**
     * 키보드 리스너 설정
     */
    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            this.onKeyDown(e);
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.onKeyUp(e);
        });
    }
    
    /**
     * 키 다운 이벤트 (하위 클래스에서 오버라이드)
     */
    onKeyDown(event) {
        // 기본 구현 - 하위 클래스에서 재정의 가능
    }
    
    /**
     * 키 업 이벤트 (하위 클래스에서 오버라이드)
     */
    onKeyUp(event) {
        // 기본 구현 - 하위 클래스에서 재정의 가능
    }
    
    /**
     * 연결 상태 UI 업데이트
     */
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('sensorConnection');
        if (statusElement) {
            if (connected) {
                statusElement.textContent = '📡 센서 연결됨';
                statusElement.style.color = '#4CAF50';
            } else {
                statusElement.textContent = this.simulationMode ? 
                    '⌨️ 시뮬레이션 모드' : '📡 센서 연결 안됨';
                statusElement.style.color = this.simulationMode ? '#FF9800' : '#f44336';
            }
        }
        
        // UI 콜백 호출
        this.uiCallbacks.forEach(callback => callback(connected, this.simulationMode));
    }
    
    /**
     * 콜백 알림
     */
    notifyCallbacks() {
        this.callbacks.forEach(callback => {
            try {
                callback(this.gameInput, this.sensorData);
            } catch (error) {
                console.error('콜백 실행 오류:', error);
            }
        });
    }
    
    /**
     * 센서 데이터 콜백 등록
     */
    onSensorData(callback) {
        if (typeof callback === 'function') {
            this.callbacks.push(callback);
        }
    }
    
    /**
     * UI 상태 변경 콜백 등록
     */
    onUIUpdate(callback) {
        if (typeof callback === 'function') {
            this.uiCallbacks.push(callback);
        }
    }
    
    /**
     * 게임 입력 가져오기
     */
    getGameInput() {
        return { ...this.gameInput };
    }
    
    /**
     * 센서 데이터 가져오기
     */
    getSensorData() {
        return { ...this.sensorData };
    }
    
    /**
     * 리소스 정리
     */
    destroy() {
        // WebSocket 연결 해제
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        
        // 시뮬레이션 모드 정리
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
        
        // 콜백 정리
        this.callbacks = [];
        this.uiCallbacks = [];
        
        console.log(`🎮 [${this.gameType}] 센서 관리자 정리 완료`);
    }
    
    // === 유틸리티 메서드들 ===
    
    /**
     * 값 범위 제한
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    
    /**
     * 선형 보간
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    }
    
    /**
     * 안전한 곱셈 (NaN 방지)
     */
    safeMultiply(a, b) {
        if (isNaN(a) || isNaN(b) || !isFinite(a) || !isFinite(b)) {
            return 0;
        }
        return a * b;
    }
    
    /**
     * 안전한 덧셈 (NaN 방지)
     */
    safeAdd(a, b) {
        if (isNaN(a) || isNaN(b) || !isFinite(a) || !isFinite(b)) {
            return 0;
        }
        return a + b;
    }
    
    /**
     * 극값 필터링
     */
    filterExtreme(value, threshold = 1000) {
        if (Math.abs(value) > threshold) {
            return 0;
        }
        return value;
    }
    
    /**
     * 벡터 유효성 검사
     */
    isValidVector(vector) {
        return vector && 
               typeof vector.x === 'number' && isFinite(vector.x) && !isNaN(vector.x) &&
               typeof vector.y === 'number' && isFinite(vector.y) && !isNaN(vector.y) &&
               typeof vector.z === 'number' && isFinite(vector.z) && !isNaN(vector.z);
    }
    
    /**
     * 방향 데이터 유효성 검사
     */
    isValidOrientation(orientation) {
        return orientation && 
               typeof orientation.alpha === 'number' && isFinite(orientation.alpha) && !isNaN(orientation.alpha) &&
               typeof orientation.beta === 'number' && isFinite(orientation.beta) && !isNaN(orientation.beta) &&
               typeof orientation.gamma === 'number' && isFinite(orientation.gamma) && !isNaN(orientation.gamma);
    }
    
    /**
     * 각도 정규화 (-180 ~ 180)
     */
    normalizeAngle(angle) {
        while (angle > 180) angle -= 360;
        while (angle < -180) angle += 360;
        return angle;
    }
    
    /**
     * 벡터 크기 계산
     */
    vectorMagnitude(vector) {
        return Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
    }
}

// 모듈 내보내기 (ES6 모듈 방식)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseSensorManager;
}