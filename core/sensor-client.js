/**
 * 센서 클라이언트 JavaScript
 * 모바일 디바이스의 센서 데이터를 수집하고 서버로 전송
 */

class SensorClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.deviceId = 'sensor-' + Math.random().toString(36).substr(2, 9);
        this.isTransmitting = false;
        
        // 센서 데이터
        this.sensorData = {
            orientation: { alpha: 0, beta: 0, gamma: 0 },
            accelerometer: { x: 0, y: 0, z: 0 },
            gyroscope: { alpha: 0, beta: 0, gamma: 0 }
        };
        
        // 센서 지원 여부
        this.sensorSupport = {
            orientation: false,
            accelerometer: false,
            gyroscope: false
        };
        
        // 전송 통계
        this.stats = {
            totalPackets: 0,
            packetsPerSecond: 0,
            lastSecondPackets: 0,
            lastSecondTime: Date.now()
        };
        
        // 보정값
        this.calibration = {
            orientation: { alpha: 0, beta: 0, gamma: 0 },
            accelerometer: { x: 0, y: 0, z: 0 }
        };
        
        this.init();
    }
    
    /**
     * 클라이언트 초기화
     */
    init() {
        console.log('📱 센서 클라이언트 초기화');
        
        // UI 업데이트
        this.updateDeviceInfo();
        
        // 센서 지원 여부 확인
        this.checkSensorSupport();
        
        // 이벤트 리스너 설정
        this.setupEventListeners();
        
        // 자동 연결 시도 (HTTPS인 경우)
        if (window.location.protocol === 'https:') {
            setTimeout(() => this.connectToServer(), 1000);
        }
    }
    
    /**
     * 센서 지원 여부 확인
     */
    checkSensorSupport() {
        // DeviceOrientationEvent 지원 확인
        if ('DeviceOrientationEvent' in window) {
            this.sensorSupport.orientation = true;
        }
        
        // DeviceMotionEvent 지원 확인
        if ('DeviceMotionEvent' in window) {
            this.sensorSupport.accelerometer = true;
            this.sensorSupport.gyroscope = true;
        }
        
        // 지원 센서 목록 업데이트
        const supportedList = [];
        if (this.sensorSupport.orientation) supportedList.push('방향');
        if (this.sensorSupport.accelerometer) supportedList.push('가속도');
        if (this.sensorSupport.gyroscope) supportedList.push('자이로');
        
        document.getElementById('supportedSensors').textContent = 
            supportedList.length > 0 ? supportedList.join(', ') : '지원되지 않음';
    }
    
    /**
     * 디바이스 정보 업데이트
     */
    updateDeviceInfo() {
        document.getElementById('deviceId').textContent = this.deviceId;
        document.getElementById('userAgent').textContent = this.getBrowserInfo();
    }
    
    /**
     * 브라우저 정보 추출
     */
    getBrowserInfo() {
        const ua = navigator.userAgent;
        if (ua.includes('iPhone')) return 'iPhone Safari';
        if (ua.includes('iPad')) return 'iPad Safari';
        if (ua.includes('Android')) {
            if (ua.includes('Chrome')) return 'Android Chrome';
            return 'Android Browser';
        }
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Firefox')) return 'Firefox';
        return 'Unknown';
    }
    
    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 연결 버튼 - 작동하는 방식으로 수정
        document.getElementById('connectBtn').onclick = () => {
            this.requestSensorPermissions();
        };
        
        // 보정 버튼
        document.getElementById('calibrateBtn').addEventListener('click', () => {
            this.calibrateSensors();
        });
        
        // 센서 이벤트 (권한 허용 후 등록됨)
        this.setupSensorListeners();
        
        // 통계 업데이트
        setInterval(() => this.updateStats(), 1000);
    }
    
    /**
     * 센서 권한 요청 (작동하는 방식으로 재작성)
     */
    async requestSensorPermissions() {
        console.log('🔐 센서 권한 요청 시작 (사용자 제스처 컨텍스트)');
        console.log('User Agent:', navigator.userAgent);
        console.log('Protocol:', window.location.protocol);
        console.log('보안 컨텍스트:', window.isSecureContext);
        console.log('DeviceMotionEvent.requestPermission:', typeof DeviceMotionEvent.requestPermission);
        console.log('DeviceOrientationEvent.requestPermission:', typeof DeviceOrientationEvent.requestPermission);
        
        const connectBtn = document.getElementById('connectBtn');
        const originalText = connectBtn.textContent;
        
        try {
            connectBtn.disabled = true;
            connectBtn.textContent = '권한 요청 중...';
            
            let motionPermissionGranted = false;
            let orientationPermissionGranted = false;
            
            // iOS 13+ DeviceMotionEvent 권한 요청
            if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
                console.log('📱 DeviceMotionEvent.requestPermission 사용 가능');
                
                connectBtn.textContent = '모션 센서 권한 허용해주세요';
                const motionPermission = await DeviceMotionEvent.requestPermission();
                console.log('📍 모션 권한 결과:', motionPermission);
                
                if (motionPermission === 'granted') {
                    motionPermissionGranted = true;
                    this.showSuccess('모션 센서 권한 허용됨!');
                } else {
                    console.log('❌ 모션 센서 권한 거부됨');
                }
            } else {
                console.log('⚠️ DeviceMotionEvent.requestPermission 사용 불가능');
                motionPermissionGranted = true; // 오래된 iOS 버전에서는 권한 불필요
            }

            // iOS 13+ DeviceOrientationEvent 권한 요청
            if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                console.log('📱 DeviceOrientationEvent.requestPermission 사용 가능');
                
                connectBtn.textContent = '방향 센서 권한 허용해주세요';
                const orientationPermission = await DeviceOrientationEvent.requestPermission();
                console.log('📍 방향 권한 결과:', orientationPermission);
                
                if (orientationPermission === 'granted') {
                    orientationPermissionGranted = true;
                    this.showSuccess('방향 센서 권한 허용됨!');
                } else {
                    console.log('❌ 방향 센서 권한 거부됨');
                }
            } else {
                console.log('⚠️ DeviceOrientationEvent.requestPermission 사용 불가능');
                orientationPermissionGranted = true; // 오래된 iOS 버전에서는 권한 불필요
            }
            
            // 권한 확인 및 연결 진행
            if (motionPermissionGranted || orientationPermissionGranted) {
                connectBtn.textContent = '서버 연결 중...';
                console.log('✅ 센서 권한 획득 완료, 서버 연결 시작');
                console.log('모션 센서:', motionPermissionGranted ? '허용' : '거부');
                console.log('방향 센서:', orientationPermissionGranted ? '허용' : '거부');
                
                // 센서 이벤트 등록
                this.setupSensorListeners();
                
                // 서버 연결
                setTimeout(() => {
                    this.connectToServer();
                }, 500);
                
            } else {
                throw new Error('센서 권한이 필요합니다. Safari 설정에서 권한을 허용해주세요.');
            }
            
        } catch (error) {
            console.error('❌ 센서 권한 요청 실패:', error);
            
            // 버튼 상태 복구
            connectBtn.disabled = false;
            connectBtn.textContent = originalText;
            
            // 에러 메시지 표시
            let errorMessage = error.message || '센서 권한 요청 중 오류가 발생했습니다.';
            
            // iOS 특별 안내
            if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
                errorMessage += '\n\n📱 iOS 사용자 안내:\n';
                errorMessage += '• Safari 브라우저를 사용해주세요\n';
                errorMessage += '• 설정 > Safari > 개인정보 보호 및 보안 > 동작 및 방향 접근 허용\n';
                errorMessage += '• 페이지를 새로고침 후 다시 시도해주세요';
            }
            
            this.showError(errorMessage);
        }
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
                console.log('✅ 서버 연결 성공');
                this.updateConnectionStatus('connected');
                
                // 센서 디바이스로 등록
                this.socket.send(JSON.stringify({
                    type: 'register_sensor_device',
                    deviceId: this.deviceId,
                    deviceType: this.getDeviceType(),
                    userAgent: navigator.userAgent,
                    capabilities: this.getCapabilities(),
                    timestamp: Date.now()
                }));
                
                // 센서 데이터 전송 시작
                this.startSensorTransmission();
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
                this.isTransmitting = false;
                console.log('🔌 서버 연결 끊김');
                this.updateConnectionStatus('disconnected');
                
                // 재연결 시도
                setTimeout(() => this.connectToServer(), 3000);
            };
            
            this.socket.onerror = (error) => {
                console.error('WebSocket 오류:', error);
                this.showError('서버 연결 중 오류가 발생했습니다.');
            };
            
        } catch (error) {
            console.error('서버 연결 실패:', error);
            this.showError('서버에 연결할 수 없습니다.');
        }
    }
    
    /**
     * 서버 메시지 처리
     */
    handleServerMessage(data) {
        switch (data.type) {
            case 'registration_success':
                console.log('센서 디바이스 등록 성공:', data);
                break;
        }
    }
    
    /**
     * 센서 리스너 설정
     */
    setupSensorListeners() {
        // 방향 센서
        if (this.sensorSupport.orientation) {
            window.addEventListener('deviceorientation', (event) => {
                this.sensorData.orientation = {
                    alpha: event.alpha || 0,
                    beta: event.beta || 0,
                    gamma: event.gamma || 0
                };
                this.updateOrientationUI();
                this.updateTiltIndicator();
            });
        }
        
        // 모션 센서 (가속도계, 자이로스코프)
        if (this.sensorSupport.accelerometer || this.sensorSupport.gyroscope) {
            window.addEventListener('devicemotion', (event) => {
                if (event.acceleration) {
                    this.sensorData.accelerometer = {
                        x: event.acceleration.x || 0,
                        y: event.acceleration.y || 0,
                        z: event.acceleration.z || 0
                    };
                }
                
                if (event.rotationRate) {
                    this.sensorData.gyroscope = {
                        alpha: event.rotationRate.alpha || 0,
                        beta: event.rotationRate.beta || 0,
                        gamma: event.rotationRate.gamma || 0
                    };
                }
                
                this.updateMotionUI();
            });
        }
    }
    
    /**
     * 센서 데이터 전송 시작
     */
    startSensorTransmission() {
        if (this.isTransmitting) return;
        
        this.isTransmitting = true;
        console.log('📡 센서 데이터 전송 시작');
        
        // 30fps로 센서 데이터 전송
        this.transmissionInterval = setInterval(() => {
            this.transmitSensorData();
        }, 33); // ~30fps
        
        // UI 업데이트
        document.getElementById('connectBtn').disabled = true;
        document.getElementById('calibrateBtn').disabled = false;
    }
    
    /**
     * 센서 데이터 전송
     */
    transmitSensorData() {
        if (!this.isConnected || !this.socket) return;
        
        try {
            // 보정값 적용
            const calibratedData = this.applyCalibratedData();
            
            this.socket.send(JSON.stringify({
                type: 'sensor_data',
                deviceId: this.deviceId,
                sensorData: calibratedData,
                timestamp: Date.now()
            }));
            
            this.stats.totalPackets++;
            this.stats.lastSecondPackets++;
            
        } catch (error) {
            console.error('센서 데이터 전송 오류:', error);
        }
    }
    
    /**
     * 보정값 적용
     */
    applyCalibratedData() {
        return {
            orientation: {
                alpha: this.sensorData.orientation.alpha - this.calibration.orientation.alpha,
                beta: this.sensorData.orientation.beta - this.calibration.orientation.beta,
                gamma: this.sensorData.orientation.gamma - this.calibration.orientation.gamma
            },
            accelerometer: {
                x: this.sensorData.accelerometer.x - this.calibration.accelerometer.x,
                y: this.sensorData.accelerometer.y - this.calibration.accelerometer.y,
                z: this.sensorData.accelerometer.z - this.calibration.accelerometer.z
            },
            gyroscope: this.sensorData.gyroscope
        };
    }
    
    /**
     * 센서 보정
     */
    calibrateSensors() {
        this.calibration.orientation = { ...this.sensorData.orientation };
        this.calibration.accelerometer = { ...this.sensorData.accelerometer };
        
        console.log('센서 보정 완료:', this.calibration);
        this.showSuccess('센서가 보정되었습니다.');
    }
    
    /**
     * UI 업데이트 메서드들
     */
    updateConnectionStatus(status) {
        const statusIcon = document.getElementById('statusIcon');
        const statusText = document.getElementById('statusText');
        const connectionState = document.getElementById('connectionState');
        
        switch (status) {
            case 'connected':
                statusIcon.textContent = '🟢';
                statusText.textContent = '연결됨';
                connectionState.textContent = '연결됨';
                break;
            case 'disconnected':
                statusIcon.textContent = '🔴';
                statusText.textContent = '연결 끊김';
                connectionState.textContent = '연결 끊김';
                break;
            case 'connecting':
                statusIcon.textContent = '🟡';
                statusText.textContent = '연결 중...';
                connectionState.textContent = '연결 중';
                break;
        }
    }
    
    updateOrientationUI() {
        document.getElementById('orientationAlpha').textContent = 
            this.sensorData.orientation.alpha.toFixed(1) + '°';
        document.getElementById('orientationBeta').textContent = 
            this.sensorData.orientation.beta.toFixed(1) + '°';
        document.getElementById('orientationGamma').textContent = 
            this.sensorData.orientation.gamma.toFixed(1) + '°';
    }
    
    updateMotionUI() {
        document.getElementById('accelerometerX').textContent = 
            this.sensorData.accelerometer.x.toFixed(2);
        document.getElementById('accelerometerY').textContent = 
            this.sensorData.accelerometer.y.toFixed(2);
        document.getElementById('accelerometerZ').textContent = 
            this.sensorData.accelerometer.z.toFixed(2);
        
        document.getElementById('gyroscopeAlpha').textContent = 
            this.sensorData.gyroscope.alpha.toFixed(2);
        document.getElementById('gyroscopeBeta').textContent = 
            this.sensorData.gyroscope.beta.toFixed(2);
        document.getElementById('gyroscopeGamma').textContent = 
            this.sensorData.gyroscope.gamma.toFixed(2);
    }
    
    updateTiltIndicator() {
        const tiltDot = document.getElementById('tiltDot');
        const maxOffset = 35; // 최대 이동 거리
        
        // gamma: 좌우 기울기, beta: 앞뒤 기울기
        const x = (this.sensorData.orientation.gamma / 45) * maxOffset;
        const y = (this.sensorData.orientation.beta / 45) * maxOffset;
        
        tiltDot.style.transform = `translate(${x}px, ${y}px)`;
    }
    
    updateStats() {
        document.getElementById('totalPackets').textContent = this.stats.totalPackets;
        document.getElementById('packetsPerSecond').textContent = this.stats.lastSecondPackets;
        
        // 초당 패킷 수 리셋
        this.stats.lastSecondPackets = 0;
    }
    
    /**
     * 유틸리티 메서드들
     */
    getDeviceType() {
        const ua = navigator.userAgent;
        if (ua.includes('iPhone')) return 'iPhone';
        if (ua.includes('iPad')) return 'iPad';
        if (ua.includes('Android')) return 'Android';
        return 'Mobile';
    }
    
    getCapabilities() {
        const capabilities = [];
        if (this.sensorSupport.orientation) capabilities.push('orientation');
        if (this.sensorSupport.accelerometer) capabilities.push('accelerometer');
        if (this.sensorSupport.gyroscope) capabilities.push('gyroscope');
        return capabilities;
    }
    
    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        
        // 줄바꿈 문자를 <br>로 변환하여 HTML로 표시
        errorDiv.innerHTML = message.replace(/\n/g, '<br>');
        errorDiv.style.display = 'block';
        
        // 에러 메시지를 콘솔에도 출력
        console.error('🚨 센서 클라이언트 에러:', message);
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 8000); // 더 긴 시간 표시
    }
    
    showSuccess(message) {
        // 성공 메시지를 위한 임시 요소 생성
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;
        successDiv.style.cssText = `
            background: var(--success-color);
            color: var(--background-color);
            padding: 1rem;
            border-radius: var(--border-radius);
            margin-bottom: 1rem;
            font-weight: 600;
        `;
        
        document.querySelector('.container').insertBefore(
            successDiv, 
            document.querySelector('.status-card')
        );
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }
}

// iOS 감지 및 권한 안내 표시
if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    document.getElementById('permissionInfo').style.display = 'block';
}

// 센서 클라이언트 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.sensorClient = new SensorClient();
});