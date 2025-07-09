/**
 * 3D 볼 밸런스 어드벤처 - 상용 품질 센서 게임
 * Three.js + CANNON-ES 물리 엔진 활용
 * 센서 게임 허브 v2.0 완전 호환
 */

class BallBalanceAdventure extends SensorGameSDK {
    constructor() {
        super({
            gameId: '3d-ball-balance',
            gameName: '3D 볼 밸런스 어드벤처',
            requestedSensors: ['orientation', 'accelerometer'],
            sensorSensitivity: {
                orientation: 1.2,
                accelerometer: 0.8
            },
            smoothingFactor: 4,
            deadzone: 0.08
        });
        
        // 게임 상태 초기화
        this.gameState = {
            score: 0,
            level: 1,
            health: 3,
            maxHealth: 3,
            time: 0,
            isPlaying: true,
            isPaused: false,
            gameStarted: false
        };
        
        // Three.js 및 물리 엔진 변수
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = null;
        this.ball = null;
        this.ballBody = null;
        
        // 게임 오브젝트
        this.platform = null;
        this.platformBody = null;
        this.goal = null;
        this.goalBody = null;
        this.obstacles = [];
        this.holes = [];
        this.collectibles = [];
        
        // 카메라 시스템
        this.cameraMode = 'follow'; // 'follow', 'overhead', 'free'
        this.cameraTarget = new THREE.Vector3();
        this.cameraOffset = new THREE.Vector3(0, 8, 8);
        
        // 파티클 시스템
        this.particleSystems = {
            trail: null,
            goal: null,
            collect: null,
            explosion: null
        };
        
        // 레벨 데이터
        this.levels = this.generateLevels();
        this.currentLevelData = null;
        
        // 사운드 시스템 (Web Audio API)
        this.audioContext = null;
        this.sounds = {};
        
        // 성능 최적화
        this.lastFrameTime = 0;
        this.deltaTime = 0;
        this.clock = new THREE.Clock();
        
        // 키보드 입력
        this.keys = {};
        
        // 물리 머티리얼
        this.materials = {
            physics: {},
            visual: {}
        };
        
        // 게임 초기화
        this.initializeGame();
    }
    
    /**
     * 게임 초기화 (필수 메서드)
     */
    async initializeGame() {
        console.log('🎮 3D 볼 밸런스 어드벤처 초기화 시작');
        
        try {
            // 로딩 화면 표시
            this.showLoadingScreen(true);
            
            // 라이브러리 로딩 대기
            await this.waitForLibraries();
            
            // Three.js 및 물리 엔진 초기화
            await this.initializeEngine();
            
            // 오디오 시스템 초기화
            await this.initializeAudio();
            
            // 첫 번째 레벨 로드
            await this.loadLevel(1);
            
            // 센서 콜백 등록
            this.setupSensorCallbacks();
            
            // 키보드 컨트롤 설정
            this.setupKeyboardControls();
            
            // UI 업데이트
            this.updateUI();
            
            // 게임 루프 시작
            this.startGameLoop();
            
            // 로딩 화면 숨기기
            setTimeout(() => this.showLoadingScreen(false), 1000);
            
            console.log('✅ 게임 초기화 완료');
            
        } catch (error) {
            console.error('❌ 게임 초기화 실패:', error);
            this.showErrorMessage('게임을 로드할 수 없습니다: ' + error.message);
        }
    }
    
    /**
     * 라이브러리 로딩 대기
     */
    async waitForLibraries() {
        const maxAttempts = 100; // 10초 대기
        let attempts = 0;
        
        console.log('🔄 라이브러리 로딩 대기 중...');
        
        while (attempts < maxAttempts) {
            const threeLoaded = typeof THREE !== 'undefined';
            const cannonLoaded = typeof CANNON !== 'undefined';
            
            console.log(`📚 THREE.js: ${threeLoaded ? '✅' : '❌'}, CANNON: ${cannonLoaded ? '✅' : '❌'}`);
            
            if (threeLoaded && cannonLoaded) {
                console.log('✅ 필수 라이브러리 로딩 완료');
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        // 최종 확인
        if (typeof THREE === 'undefined') {
            throw new Error('THREE.js 라이브러리 로딩 실패 - 네트워크 연결을 확인하세요');
        }
        
        if (typeof CANNON === 'undefined') {
            throw new Error('CANNON.js 라이브러리 로딩 실패 - 로컬 파일을 확인하세요');
        }
    }
    
    /**
     * Three.js 및 물리 엔진 초기화
     */
    async initializeEngine() {
        // 필수 라이브러리 체크
        if (typeof THREE === 'undefined') {
            throw new Error('Three.js 라이브러리가 로드되지 않았습니다.');
        }
        
        if (typeof CANNON === 'undefined') {
            throw new Error('CANNON.js 라이브러리가 로드되지 않았습니다.');
        }
        
        console.log('✅ CANNON.js 물리 엔진 사용');
        
        // 캔버스 설정
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            throw new Error('gameCanvas 요소를 찾을 수 없습니다.');
        }
        
        // Three.js 씬 생성
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x000428, 50, 200);
        
        // 카메라 설정
        this.camera = new THREE.PerspectiveCamera(
            60,
            800 / 600,
            0.1,
            1000
        );
        this.camera.position.set(0, 12, 12);
        this.camera.lookAt(0, 0, 0);
        
        // 렌더러 설정
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false,
            powerPreference: "high-performance"
        });
        
        // 초기 크기 설정
        const initialWidth = 800;
        const initialHeight = 600;
        this.renderer.setSize(initialWidth, initialHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        // 캔버스 크기 명시적 설정
        this.canvas.width = initialWidth;
        this.canvas.height = initialHeight;
        this.canvas.style.width = initialWidth + 'px';
        this.canvas.style.height = initialHeight + 'px';
        
        console.log(`📐 초기 캔버스 크기: ${initialWidth}x${initialHeight}`);
        
        // CANNON.js 물리 세계 초기화
        this.world = new CANNON.World();
        this.world.gravity.set(0, -20, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 10;
        this.world.defaultContactMaterial.friction = 0.3;
        this.world.defaultContactMaterial.restitution = 0.4;
        
        // 물리 머티리얼 설정
        this.setupPhysicsMaterials();
        
        // 시각 머티리얼 설정
        this.setupVisualMaterials();
        
        // 조명 설정
        this.setupLighting();
        
        // 환경 설정
        this.setupEnvironment();
        
        // 파티클 시스템 초기화
        this.initializeParticles();
        
        // 반응형 캔버스 설정
        this.setupResponsiveCanvas();
        
        console.log('✅ 엔진 초기화 완료');
    }
    
    /**
     * 물리 머티리얼 설정
     */
    setupPhysicsMaterials() {
        // 볼 머티리얼
        this.materials.physics.ball = new CANNON.Material("ball");
        this.materials.physics.ball.friction = 0.3;
        this.materials.physics.ball.restitution = 0.4;
        
        // 플랫폼 머티리얼
        this.materials.physics.platform = new CANNON.Material("platform");
        this.materials.physics.platform.friction = 0.5;
        this.materials.physics.platform.restitution = 0.3;
        
        // 목표 머티리얼
        this.materials.physics.goal = new CANNON.Material("goal");
        this.materials.physics.goal.friction = 0.1;
        this.materials.physics.goal.restitution = 0.8;
        
        // 장애물 머티리얼
        this.materials.physics.obstacle = new CANNON.Material("obstacle");
        this.materials.physics.obstacle.friction = 0.4;
        this.materials.physics.obstacle.restitution = 0.6;
        
        // 머티리얼 간 상호작용 정의
        const ballPlatformContact = new CANNON.ContactMaterial(
            this.materials.physics.ball,
            this.materials.physics.platform,
            {
                friction: 0.4,
                restitution: 0.3
            }
        );
        
        const ballObstacleContact = new CANNON.ContactMaterial(
            this.materials.physics.ball,
            this.materials.physics.obstacle,
            {
                friction: 0.3,
                restitution: 0.5
            }
        );
        
        const ballGoalContact = new CANNON.ContactMaterial(
            this.materials.physics.ball,
            this.materials.physics.goal,
            {
                friction: 0.1,
                restitution: 0.8
            }
        );
        
        // 물리 세계에 접촉 머티리얼 추가
        this.world.addContactMaterial(ballPlatformContact);
        this.world.addContactMaterial(ballObstacleContact);
        this.world.addContactMaterial(ballGoalContact);
        
        console.log('✅ 물리 머티리얼 설정 완료');
    }
    
    /**
     * 시각 머티리얼 설정
     */
    setupVisualMaterials() {
        this.materials.visual = {
            ball: new THREE.MeshPhysicalMaterial({
                color: 0x667eea,
                metalness: 0.1,
                roughness: 0.2,
                clearcoat: 1.0,
                clearcoatRoughness: 0.1,
                envMapIntensity: 1.0
            }),
            platform: new THREE.MeshLambertMaterial({
                color: 0x2c3e50,
                transparent: true,
                opacity: 0.9
            }),
            goal: new THREE.MeshPhysicalMaterial({
                color: 0xff6b6b,
                emissive: 0x330000,
                metalness: 0.0,
                roughness: 0.3,
                transparent: true,
                opacity: 0.9
            }),
            obstacle: new THREE.MeshLambertMaterial({
                color: 0x8e44ad,
                transparent: true,
                opacity: 0.8
            }),
            collectible: new THREE.MeshPhysicalMaterial({
                color: 0xf1c40f,
                metalness: 0.8,
                roughness: 0.1,
                emissive: 0x332200,
                transparent: true,
                opacity: 0.9
            })
        };
        
        console.log('✅ 시각 머티리얼 설정 완료');
    }
    
    /**
     * 조명 설정
     */
    setupLighting() {
        // 환경광
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        // 주 조명 (태양광)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 100;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        this.scene.add(directionalLight);
        
        // 보조 조명
        const pointLight = new THREE.PointLight(0x667eea, 0.5, 100);
        pointLight.position.set(0, 15, 0);
        this.scene.add(pointLight);
        
        // 스팟 조명 (볼 추적)
        const spotLight = new THREE.SpotLight(0xffffff, 0.8, 50, Math.PI / 6);
        spotLight.position.set(0, 20, 0);
        spotLight.castShadow = true;
        this.scene.add(spotLight);
        this.spotLight = spotLight;
        
        console.log('✅ 조명 설정 완료');
    }
    
    /**
     * 환경 설정
     */
    setupEnvironment() {
        // 스카이박스
        const skyboxGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyboxMaterial = new THREE.MeshBasicMaterial({
            color: 0x001122,
            side: THREE.BackSide,
            fog: false
        });
        const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
        this.scene.add(skybox);
        
        // 배경 별들
        this.createStars();
        
        console.log('✅ 환경 설정 완료');
    }
    
    /**
     * 배경 별 생성
     */
    createStars() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsCount = 10000;
        
        const positions = new Float32Array(starsCount * 3);
        const colors = new Float32Array(starsCount * 3);
        
        for (let i = 0; i < starsCount; i++) {
            // 구 표면에 균등하게 분포
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = 400 + Math.random() * 100;
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.cos(phi);
            positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
            
            // 별의 색상 (흰색 ~ 파란색)
            const brightness = 0.5 + Math.random() * 0.5;
            colors[i * 3] = brightness;
            colors[i * 3 + 1] = brightness;
            colors[i * 3 + 2] = brightness + Math.random() * 0.3;
        }
        
        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const starsMaterial = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });
        
        const stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(stars);
        
        console.log('✅ 배경 별 생성 완료');
    }
    
    /**
     * 파티클 시스템 초기화
     */
    initializeParticles() {
        this.particleSystems.trail = this.createTrailSystem();
        this.particleSystems.goal = this.createGoalParticles();
        this.particleSystems.collect = this.createCollectParticles();
        this.particleSystems.explosion = this.createExplosionParticles();
        
        console.log('✅ 파티클 시스템 초기화 완료');
    }
    
    /**
     * 볼 궤적 파티클 시스템
     */
    createTrailSystem() {
        const particleCount = 50;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            
            colors[i * 3] = 0.4;     // R
            colors[i * 3 + 1] = 0.5; // G
            colors[i * 3 + 2] = 0.9; // B
            
            sizes[i] = Math.random() * 0.5 + 0.1;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 0.3,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            sizeAttenuation: true
        });
        
        const trail = new THREE.Points(geometry, material);
        this.scene.add(trail);
        
        return {
            object: trail,
            positions: positions,
            particleCount: particleCount,
            currentIndex: 0
        };
    }
    
    /**
     * 목표 지점 파티클 효과
     */
    createGoalParticles() {
        const particleCount = 100;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const radius = Math.random() * 3 + 1;
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.cos(phi);
            positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
            
            colors[i * 3] = 1.0;     // R
            colors[i * 3 + 1] = 0.4; // G
            colors[i * 3 + 2] = 0.4; // B
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.2,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });
        
        return new THREE.Points(geometry, material);
    }
    
    /**
     * 수집 파티클 효과
     */
    createCollectParticles() {
        const particleCount = 50;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            
            colors[i * 3] = 0.9;     // R
            colors[i * 3 + 1] = 0.8; // G
            colors[i * 3 + 2] = 0.1; // B
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.4,
            vertexColors: true,
            transparent: true,
            opacity: 0.9
        });
        
        return new THREE.Points(geometry, material);
    }
    
    /**
     * 폭발 파티클 효과
     */
    createExplosionParticles() {
        const particleCount = 50;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            
            velocities[i * 3] = (Math.random() - 0.5) * 20;
            velocities[i * 3 + 1] = Math.random() * 10;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 20;
            
            colors[i * 3] = 1.0;     // R
            colors[i * 3 + 1] = 0.5; // G
            colors[i * 3 + 2] = 0.0; // B
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });
        
        const explosion = new THREE.Points(geometry, material);
        this.scene.add(explosion);
        
        return {
            object: explosion,
            positions: positions,
            velocities: velocities,
            active: false,
            timer: 0
        };
    }
    
    /**
     * 오디오 시스템 초기화
     */
    async initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            this.sounds = {
                ballRoll: this.createRollSound(),
                ballBounce: this.createBounceSound(),
                collect: this.createCollectSound(),
                goal: this.createGoalSound(),
                levelComplete: this.createLevelCompleteSound()
            };
            
            console.log('✅ 오디오 시스템 초기화 완료');
        } catch (error) {
            console.warn('오디오 초기화 실패:', error);
        }
    }
    
    /**
     * 볼 굴리기 사운드 생성
     */
    createRollSound() {
        return {
            play: (volume = 0.1) => {
                if (!this.audioContext) return;
                
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.type = 'brown';
                oscillator.frequency.setValueAtTime(60, this.audioContext.currentTime);
                
                gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.1);
            }
        };
    }
    
    /**
     * 볼 바운스 사운드 생성
     */
    createBounceSound() {
        return {
            play: (volume = 0.3) => {
                if (!this.audioContext) return;
                
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.2);
                
                gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.2);
            }
        };
    }
    
    /**
     * 수집 사운드 생성
     */
    createCollectSound() {
        return {
            play: (volume = 0.4) => {
                if (!this.audioContext) return;
                
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
                oscillator.frequency.linearRampToValueAtTime(880, this.audioContext.currentTime + 0.1);
                
                gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.3);
            }
        };
    }
    
    /**
     * 목표 도달 사운드 생성
     */
    createGoalSound() {
        return {
            play: (volume = 0.5) => {
                if (!this.audioContext) return;
                
                // 화음 구성
                const frequencies = [261.63, 329.63, 392.00]; // C, E, G
                
                frequencies.forEach((freq, index) => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                    
                    gainNode.gain.setValueAtTime(volume * 0.3, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1);
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    oscillator.start(this.audioContext.currentTime + index * 0.1);
                    oscillator.stop(this.audioContext.currentTime + 1);
                });
            }
        };
    }
    
    /**
     * 레벨 완료 사운드 생성
     */
    createLevelCompleteSound() {
        return {
            play: (volume = 0.4) => {
                if (!this.audioContext) return;
                
                const melody = [523.25, 587.33, 659.25, 698.46, 783.99]; // C5, D5, E5, F5, G5
                
                melody.forEach((freq, index) => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    oscillator.type = 'square';
                    oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
                    
                    gainNode.gain.setValueAtTime(volume * 0.2, this.audioContext.currentTime + index * 0.2);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + index * 0.2 + 0.3);
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    oscillator.start(this.audioContext.currentTime + index * 0.2);
                    oscillator.stop(this.audioContext.currentTime + index * 0.2 + 0.3);
                });
            }
        };
    }
    
    /**
     * 반응형 캔버스 설정
     */
    setupResponsiveCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    /**
     * 캔버스 크기 조정
     */
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
        
        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        console.log(`📐 캔버스 크기 조정: ${width}x${height}`);
    }
    
    /**
     * 레벨 데이터 생성
     */
    generateLevels() {
        return [
            {
                id: 1,
                name: "첫 걸음",
                description: "기본 조작을 익혀보세요",
                platformSize: { width: 20, height: 1, depth: 20 },
                ballStart: { x: 0, y: 2, z: 0 },
                goalPosition: { x: 8, y: 1.5, z: 0 },
                obstacles: [],
                holes: [],
                collectibles: [
                    { x: 0, y: 2, z: 0, value: 10 }
                ],
                timeLimit: 60,
                par: 15
            },
            {
                id: 2,
                name: "첫 번째 도전",
                description: "장애물을 피해 목표에 도달하세요",
                platformSize: { width: 25, height: 1, depth: 25 },
                ballStart: { x: -10, y: 2, z: -10 },
                goalPosition: { x: 10, y: 1.5, z: 10 },
                obstacles: [
                    { x: 0, y: 2, z: 0, size: { width: 2, height: 2, depth: 2 } },
                    { x: 5, y: 2, z: -5, size: { width: 1.5, height: 3, depth: 1.5 } }
                ],
                holes: [
                    { x: -3, y: 0.5, z: 3, radius: 1.5 }
                ],
                collectibles: [
                    { x: -5, y: 2, z: 0, value: 15 },
                    { x: 0, y: 2, z: 5, value: 20 }
                ],
                timeLimit: 90,
                par: 25
            },
            {
                id: 3,
                name: "미로의 시작",
                description: "복잡한 경로를 찾아 나가세요",
                platformSize: { width: 30, height: 1, depth: 30 },
                ballStart: { x: -12, y: 2, z: -12 },
                goalPosition: { x: 12, y: 1.5, z: 12 },
                obstacles: [
                    { x: -6, y: 2, z: -6, size: { width: 8, height: 2, depth: 2 } },
                    { x: 6, y: 2, z: 0, size: { width: 2, height: 2, depth: 8 } },
                    { x: 0, y: 2, z: 6, size: { width: 6, height: 2, depth: 2 } }
                ],
                holes: [
                    { x: -8, y: 0.5, z: 0, radius: 1.8 },
                    { x: 3, y: 0.5, z: -6, radius: 1.5 },
                    { x: 8, y: 0.5, z: 8, radius: 2.0 }
                ],
                collectibles: [
                    { x: -10, y: 2, z: 0, value: 25 },
                    { x: 0, y: 2, z: -10, value: 30 },
                    { x: 6, y: 2, z: 6, value: 35 }
                ],
                timeLimit: 120,
                par: 40
            },
            {
                id: 4,
                name: "좁은 길",
                description: "정밀한 조작이 필요한 구간입니다",
                platformSize: { width: 35, height: 1, depth: 15 },
                ballStart: { x: -15, y: 2, z: 0 },
                goalPosition: { x: 15, y: 1.5, z: 0 },
                obstacles: [
                    { x: -8, y: 2, z: 3, size: { width: 3, height: 2, depth: 6 } },
                    { x: -8, y: 2, z: -3, size: { width: 3, height: 2, depth: 6 } },
                    { x: 0, y: 2, z: 4, size: { width: 6, height: 2, depth: 2 } },
                    { x: 0, y: 2, z: -4, size: { width: 6, height: 2, depth: 2 } },
                    { x: 8, y: 2, z: 3, size: { width: 3, height: 2, depth: 6 } },
                    { x: 8, y: 2, z: -3, size: { width: 3, height: 2, depth: 6 } }
                ],
                holes: [
                    { x: -4, y: 0.5, z: 0, radius: 1.0 },
                    { x: 4, y: 0.5, z: 0, radius: 1.0 }
                ],
                collectibles: [
                    { x: -12, y: 2, z: 0, value: 40 },
                    { x: 12, y: 2, z: 0, value: 50 }
                ],
                timeLimit: 100,
                par: 35
            },
            {
                id: 5,
                name: "최종 도전",
                description: "모든 기술을 발휘해 보세요!",
                platformSize: { width: 40, height: 1, depth: 40 },
                ballStart: { x: -18, y: 2, z: -18 },
                goalPosition: { x: 18, y: 1.5, z: 18 },
                obstacles: [
                    { x: -10, y: 2, z: -10, size: { width: 4, height: 3, depth: 4 } },
                    { x: 0, y: 2, z: -15, size: { width: 10, height: 2, depth: 2 } },
                    { x: 10, y: 2, z: -5, size: { width: 3, height: 4, depth: 3 } },
                    { x: -15, y: 2, z: 5, size: { width: 2, height: 2, depth: 8 } },
                    { x: 5, y: 2, z: 10, size: { width: 8, height: 2, depth: 3 } }
                ],
                holes: [
                    { x: -5, y: 0.5, z: -5, radius: 2.0 },
                    { x: 5, y: 0.5, z: 0, radius: 1.8 },
                    { x: 0, y: 0.5, z: 8, radius: 2.2 },
                    { x: 12, y: 0.5, z: 12, radius: 1.5 }
                ],
                collectibles: [
                    { x: -15, y: 2, z: -8, value: 60 },
                    { x: -8, y: 2, z: 15, value: 70 },
                    { x: 8, y: 2, z: -8, value: 80 },
                    { x: 15, y: 2, z: 8, value: 100 }
                ],
                timeLimit: 180,
                par: 60
            }
        ];
    }
    
    /**
     * 레벨 로드
     */
    async loadLevel(levelNumber) {
        const levelData = this.levels[levelNumber - 1];
        if (!levelData) {
            console.error('레벨을 찾을 수 없습니다:', levelNumber);
            return;
        }
        
        this.currentLevelData = levelData;
        this.gameState.level = levelNumber;
        
        // 기존 레벨 오브젝트 제거
        this.clearLevel();
        
        // 플랫폼 생성
        this.createPlatform(levelData.platformSize);
        
        // 볼 생성
        this.createBall(levelData.ballStart);
        
        // 목표 지점 생성
        this.createGoal(levelData.goalPosition);
        
        // 장애물 생성
        levelData.obstacles.forEach(obstacle => {
            this.createObstacle(obstacle);
        });
        
        // 구멍 생성
        levelData.holes.forEach(hole => {
            this.createHole(hole);
        });
        
        // 수집 아이템 생성
        levelData.collectibles.forEach(collectible => {
            this.createCollectible(collectible);
        });
        
        // 카메라 위치 조정
        this.resetCamera();
        
        // 게임 상태 초기화
        this.gameState.time = 0;
        this.gameState.health = this.gameState.maxHealth;
        this.gameState.isPlaying = true;
        
        console.log(`✅ 레벨 ${levelNumber} "${levelData.name}" 로드 완료`);
    }
    
    /**
     * 기존 레벨 오브젝트 제거
     */
    clearLevel() {
        // Three.js 오브젝트 제거
        if (this.ball) {
            this.scene.remove(this.ball);
            this.ball = null;
        }
        
        if (this.platform) {
            this.scene.remove(this.platform);
            this.platform = null;
        }
        
        if (this.goal) {
            this.scene.remove(this.goal);
            this.goal = null;
        }
        
        // 장애물 제거
        this.obstacles.forEach(obstacle => {
            this.scene.remove(obstacle.mesh);
            if (obstacle.body) {
                this.world.remove(obstacle.body);
            }
        });
        this.obstacles = [];
        
        // 구멍 제거
        this.holes.forEach(hole => {
            this.scene.remove(hole.mesh);
            if (hole.ring) {
                this.scene.remove(hole.ring);
            }
        });
        this.holes = [];
        
        // 수집 아이템 제거
        this.collectibles.forEach(collectible => {
            this.scene.remove(collectible.mesh);
            if (collectible.body) {
                this.world.remove(collectible.body);
            }
        });
        this.collectibles = [];
        
        // 물리 바디 제거
        if (this.ballBody) {
            this.world.remove(this.ballBody);
            this.ballBody = null;
        }
        
        if (this.platformBody) {
            this.world.remove(this.platformBody);
            this.platformBody = null;
        }
        
        if (this.goalBody) {
            this.world.remove(this.goalBody);
            this.goalBody = null;
        }
    }
    
    /**
     * 플랫폼 생성
     */
    createPlatform(size) {
        // Three.js 메시
        const geometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
        this.platform = new THREE.Mesh(geometry, this.materials.visual.platform);
        this.platform.position.set(0, 0, 0);
        this.platform.receiveShadow = true;
        this.scene.add(this.platform);
        
        // 물리 바디
        const shape = new CANNON.Box(new CANNON.Vec3(size.width/2, size.height/2, size.depth/2));
        this.platformBody = new CANNON.Body({ 
            mass: 0, 
            material: this.materials.physics.platform 
        });
        this.platformBody.addShape(shape);
        this.platformBody.position.set(0, 0, 0);
        this.world.add(this.platformBody);
        
        // 플랫폼 테두리 발광 효과
        const edgeGeometry = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ 
            color: 0x667eea, 
            linewidth: 2,
            transparent: true,
            opacity: 0.8
        });
        const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        this.platform.add(edges);
    }
    
    /**
     * 볼 생성
     */
    createBall(startPos) {
        // Three.js 메시
        const geometry = new THREE.SphereGeometry(0.5, 32, 32);
        this.ball = new THREE.Mesh(geometry, this.materials.visual.ball);
        this.ball.position.set(startPos.x, startPos.y, startPos.z);
        this.ball.castShadow = true;
        this.scene.add(this.ball);
        
        // 물리 바디
        const shape = new CANNON.Sphere(0.5);
        this.ballBody = new CANNON.Body({ 
            mass: 1, 
            material: this.materials.physics.ball 
        });
        this.ballBody.addShape(shape);
        this.ballBody.position.set(startPos.x, startPos.y, startPos.z);
        this.ballBody.linearDamping = 0.1;
        this.ballBody.angularDamping = 0.1;
        this.world.add(this.ballBody);
        
        // 볼 발광 효과
        const glowGeometry = new THREE.SphereGeometry(0.7, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x667eea,
            transparent: true,
            opacity: 0.2
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.ball.add(glow);
        
        // 충돌 이벤트 리스너
        this.ballBody.addEventListener('collide', (event) => {
            const velocity = this.ballBody.velocity.length();
            if (velocity > 3) {
                this.sounds.ballBounce.play(Math.min(velocity / 15, 0.5));
            }
        });
    }
    
    /**
     * 목표 지점 생성
     */
    createGoal(goalPos) {
        // Three.js 메시
        const geometry = new THREE.CylinderGeometry(1.5, 1.5, 0.5, 32);
        this.goal = new THREE.Mesh(geometry, this.materials.visual.goal);
        this.goal.position.set(goalPos.x, goalPos.y, goalPos.z);
        this.scene.add(this.goal);
        
        // 물리 바디 (센서로 설정)
        const shape = new CANNON.Cylinder(1.5, 1.5, 0.5, 8);
        this.goalBody = new CANNON.Body({ 
            mass: 0, 
            material: this.materials.physics.goal,
            isTrigger: true
        });
        this.goalBody.addShape(shape);
        this.goalBody.position.set(goalPos.x, goalPos.y, goalPos.z);
        this.world.add(this.goalBody);
        
        // 목표 지점 파티클 추가
        const goalParticles = this.particleSystems.goal.clone();
        goalParticles.position.copy(this.goal.position);
        this.scene.add(goalParticles);
        
        // 목표 지점 발광 효과
        const glowGeometry = new THREE.CylinderGeometry(2.0, 2.0, 0.1, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6b6b,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.y = 0.3;
        this.goal.add(glow);
    }
    
    /**
     * 장애물 생성
     */
    createObstacle(obstacleData) {
        const { x, y, z } = obstacleData;
        const { width, height, depth } = obstacleData.size;
        
        // Three.js 메시
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const mesh = new THREE.Mesh(geometry, this.materials.visual.obstacle);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        
        // 물리 바디
        const shape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2));
        const body = new CANNON.Body({ 
            mass: 0, 
            material: this.materials.physics.obstacle 
        });
        body.addShape(shape);
        body.position.set(x, y, z);
        this.world.add(body);
        
        // 장애물 발광 효과
        const edgeGeometry = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ 
            color: 0x8e44ad, 
            transparent: true,
            opacity: 0.6
        });
        const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        mesh.add(edges);
        
        this.obstacles.push({ mesh, body });
    }
    
    /**
     * 구멍 생성
     */
    createHole(holeData) {
        const { x, y, z, radius } = holeData;
        
        // Three.js 메시 (시각적 표현)
        const geometry = new THREE.CylinderGeometry(radius, radius, 0.1, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.8
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        this.scene.add(mesh);
        
        // 구멍 테두리 효과
        const ringGeometry = new THREE.RingGeometry(radius * 0.9, radius * 1.1, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3838,
            transparent: true,
            opacity: 0.5
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(x, y + 0.05, z);
        this.scene.add(ring);
        
        this.holes.push({ 
            mesh, 
            ring, 
            position: new THREE.Vector3(x, y, z), 
            radius: radius * 1.2 // 충돌 감지용 반지름을 약간 크게
        });
    }
    
    /**
     * 수집 아이템 생성
     */
    createCollectible(collectibleData) {
        const { x, y, z, value } = collectibleData;
        
        // Three.js 메시
        const geometry = new THREE.OctahedronGeometry(0.3);
        const mesh = new THREE.Mesh(geometry, this.materials.visual.collectible);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        this.scene.add(mesh);
        
        // 물리 바디 (센서로 설정)
        const shape = new CANNON.Sphere(0.3);
        const body = new CANNON.Body({ 
            mass: 0,
            isTrigger: true
        });
        body.addShape(shape);
        body.position.set(x, y, z);
        this.world.add(body);
        
        // 회전 애니메이션을 위한 참조 저장
        const collectible = {
            mesh,
            body,
            value,
            collected: false,
            rotationSpeed: Math.random() * 0.02 + 0.01
        };
        
        this.collectibles.push(collectible);
    }
    
    /**
     * 카메라 리셋
     */
    resetCamera() {
        if (this.ball) {
            this.cameraTarget.copy(this.ball.position);
            this.camera.position.copy(this.cameraTarget).add(this.cameraOffset);
            this.camera.lookAt(this.cameraTarget);
        }
    }
    
    /**
     * 센서 콜백 설정
     */
    setupSensorCallbacks() {
        // 센서 데이터 콜백 등록 (필수)
        this.on('onSensorData', (gameInput) => {
            this.handleSensorInput(gameInput);
        });
        
        // 센서 상태 변경 콜백 등록 (필수)
        this.on('onSensorStatusChange', (status) => {
            this.updateSensorStatus(status.connected);
        });
    }
    
    /**
     * 센서 입력 처리 (필수 메서드)
     */
    handleSensorInput(gameInput) {
        if (!this.gameState.isPlaying || this.gameState.isPaused || !this.ballBody) return;
        
        const tiltSensitivity = 12.0;
        const maxTiltForce = 20.0;
        
        // 기울기 기반 중력 시뮬레이션
        if (gameInput.tilt) {
            const forceX = Math.max(-maxTiltForce, Math.min(maxTiltForce, gameInput.tilt.x * tiltSensitivity));
            const forceZ = Math.max(-maxTiltForce, Math.min(maxTiltForce, gameInput.tilt.y * tiltSensitivity));
            
            // CANNON.js 물리 엔진 사용
            this.ballBody.force.x += forceX;
            this.ballBody.force.z += forceZ;
            
            // 볼 굴리는 사운드 재생
            const velocity = this.ballBody.velocity.length();
            if (velocity > 2 && Math.random() < 0.05) {
                this.sounds.ballRoll.play(Math.min(velocity / 30, 0.15));
            }
        }
        
        // 흔들기 기반 점프
        if (gameInput.shake && gameInput.shake.detected && gameInput.shake.intensity > 15) {
            this.ballBody.velocity.y += 8;
            this.sounds.ballBounce.play(0.4);
        }
    }
    
    /**
     * 키보드 컨트롤 설정
     */
    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // 특수 키 처리
            if (e.key === ' ') {
                e.preventDefault();
                if (this.ballBody) {
                    this.ballBody.velocity.y += 8;
                    this.sounds.ballBounce.play(0.4);
                }
            }
            
            if (e.key === 'r' || e.key === 'R') {
                this.restart();
            }
            
            if (e.key === 'p' || e.key === 'P') {
                this.togglePause();
            }
            
            if (e.key === 'c' || e.key === 'C') {
                this.toggleCamera();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }
    
    /**
     * 키보드 입력 처리
     */
    handleKeyboardInput() {
        if (!this.gameState.isPlaying || this.gameState.isPaused || !this.ballBody || this.sensorConnected) return;
        
        let mockInput = { tilt: { x: 0, y: 0 }, shake: { detected: false, intensity: 0 } };
        const tiltStrength = 0.8;
        
        // WASD/화살표 키로 기울기 시뮬레이션
        if (this.keys['w'] || this.keys['arrowup']) mockInput.tilt.y = -tiltStrength;
        if (this.keys['s'] || this.keys['arrowdown']) mockInput.tilt.y = tiltStrength;
        if (this.keys['a'] || this.keys['arrowleft']) mockInput.tilt.x = -tiltStrength;
        if (this.keys['d'] || this.keys['arrowright']) mockInput.tilt.x = tiltStrength;
        
        // 시뮬레이션 입력이 있으면 센서 입력 처리
        if (mockInput.tilt.x !== 0 || mockInput.tilt.y !== 0) {
            this.handleSensorInput(mockInput);
        }
    }
    
    /**
     * 게임 루프 시작
     */
    startGameLoop() {
        this.lastFrameTime = performance.now();
        this.gameLoop();
    }
    
    /**
     * 게임 루프 (필수 메서드)
     */
    gameLoop(currentTime) {
        // 프레임 제한 (60fps)
        if (currentTime - this.lastFrameTime < 16.67) {
            requestAnimationFrame((ts) => this.gameLoop(ts));
            return;
        }
        
        this.deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;
        
        // NaN 방지
        if (isNaN(this.deltaTime) || this.deltaTime <= 0 || this.deltaTime > 1) {
            this.deltaTime = 1/60;
        }
        
        if (this.gameState.isPlaying && !this.gameState.isPaused) {
            this.update();
        }
        
        this.render();
        requestAnimationFrame((ts) => this.gameLoop(ts));
    }
    
    /**
     * 게임 업데이트 (필수 메서드)
     */
    update() {
        if (!this.ball || !this.ballBody || !this.gameState.isPlaying) return;
        
        // 키보드 입력 처리
        this.handleKeyboardInput();
        
        // 물리 시뮬레이션 업데이트
        this.world.step(1/60);
        
        // Three.js 오브젝트를 물리 바디에 동기화
        this.syncPhysicsToVisuals();
        
        // 게임 로직 업데이트
        this.updateGameLogic();
        
        // 카메라 업데이트
        this.updateCamera();
        
        // 파티클 시스템 업데이트
        this.updateParticles();
        
        // 애니메이션 업데이트
        this.updateAnimations();
        
        // UI 업데이트
        this.updateUI();
        
        // 시간 업데이트
        this.gameState.time += this.deltaTime;
    }
    
    /**
     * 물리 바디와 시각적 오브젝트 동기화
     */
    syncPhysicsToVisuals() {
        if (this.ball && this.ballBody) {
            this.ball.position.copy(this.ballBody.position);
            this.ball.quaternion.copy(this.ballBody.quaternion);
        }
        
        // 스팟 라이트가 볼을 추적
        if (this.spotLight && this.ball) {
            this.spotLight.target.position.copy(this.ball.position);
            this.spotLight.target.updateMatrixWorld();
        }
    }
    
    /**
     * 게임 로직 업데이트
     */
    updateGameLogic() {
        if (!this.ball || !this.ballBody) return;
        
        const ballPosition = this.ballBody.position;
        
        // 목표 지점 도달 확인
        if (this.goal && this.goalBody) {
            const distanceToGoal = ballPosition.distanceTo(this.goalBody.position);
            document.getElementById('distanceValue').textContent = Math.max(0, Math.floor(distanceToGoal * 10) / 10);
            
            if (distanceToGoal < 2.0) {
                this.completeLevel();
                return;
            }
        }
        
        // 구멍 빠짐 확인
        this.holes.forEach(hole => {
            const distanceToHole = new THREE.Vector2(ballPosition.x - hole.position.x, ballPosition.z - hole.position.z).length();
            if (distanceToHole < hole.radius && ballPosition.y > hole.position.y - 0.5) {
                this.fallIntoHole();
                return;
            }
        });
        
        // 플랫폼 이탈 확인
        if (this.currentLevelData) {
            const platform = this.currentLevelData.platformSize;
            const margin = 2;
            if (Math.abs(ballPosition.x) > platform.width/2 + margin || 
                Math.abs(ballPosition.z) > platform.depth/2 + margin ||
                ballPosition.y < -5) {
                this.fallOffPlatform();
                return;
            }
        }
        
        // 수집 아이템 충돌 확인
        this.collectibles.forEach((collectible, index) => {
            if (collectible.collected) return;
            
            const distance = ballPosition.distanceTo(collectible.body.position);
            if (distance < 0.8) {
                this.collectItem(index);
            }
        });
        
        // 제한 시간 확인
        if (this.currentLevelData && this.gameState.time > this.currentLevelData.timeLimit) {
            this.timeUp();
        }
    }
    
    /**
     * 카메라 업데이트
     */
    updateCamera() {
        if (!this.ball) return;
        
        const targetPosition = this.ball.position.clone();
        const lerpFactor = 0.05;
        
        // 카메라 타겟 부드럽게 이동
        this.cameraTarget.lerp(targetPosition, lerpFactor);
        
        // 카메라 모드에 따른 위치 조정
        switch (this.cameraMode) {
            case 'follow':
                const desiredPosition = this.cameraTarget.clone().add(this.cameraOffset);
                this.camera.position.lerp(desiredPosition, lerpFactor);
                break;
            case 'overhead':
                this.camera.position.set(this.cameraTarget.x, 25, this.cameraTarget.z);
                break;
            case 'free':
                // 자유 카메라 모드에서는 마우스 입력으로 제어
                break;
        }
        
        this.camera.lookAt(this.cameraTarget);
    }
    
    /**
     * 파티클 시스템 업데이트
     */
    updateParticles() {
        // 볼 궤적 파티클 업데이트
        if (this.ball && this.particleSystems.trail && this.ballBody) {
            const trail = this.particleSystems.trail;
            const ballPos = this.ballBody.position;
            
            // NaN 값 방지
            if (isNaN(ballPos.x) || isNaN(ballPos.y) || isNaN(ballPos.z)) {
                return;
            }
            
            // 새 파티클 위치 추가
            const index = trail.currentIndex % trail.particleCount;
            trail.positions[index * 3] = ballPos.x;
            trail.positions[index * 3 + 1] = ballPos.y;
            trail.positions[index * 3 + 2] = ballPos.z;
            
            trail.currentIndex++;
            trail.object.geometry.attributes.position.needsUpdate = true;
        }
        
        // 목표 지점 파티클 회전
        if (this.particleSystems.goal) {
            this.particleSystems.goal.rotation.y += 0.01;
        }
        
        // 폭발 파티클 업데이트
        if (this.particleSystems.explosion && this.particleSystems.explosion.active) {
            this.updateExplosionParticles();
        }
    }
    
    /**
     * 폭발 파티클 업데이트
     */
    updateExplosionParticles() {
        const explosion = this.particleSystems.explosion;
        
        explosion.timer += this.deltaTime;
        
        if (explosion.timer > 2.0) {
            explosion.active = false;
            explosion.object.visible = false;
            return;
        }
        
        // 파티클 위치 업데이트
        for (let i = 0; i < 50; i++) {
            explosion.positions[i * 3] += explosion.velocities[i * 3] * this.deltaTime;
            explosion.positions[i * 3 + 1] += explosion.velocities[i * 3 + 1] * this.deltaTime;
            explosion.positions[i * 3 + 2] += explosion.velocities[i * 3 + 2] * this.deltaTime;
            
            // 중력 적용
            explosion.velocities[i * 3 + 1] -= 9.8 * this.deltaTime;
        }
        
        explosion.object.geometry.attributes.position.needsUpdate = true;
    }
    
    /**
     * 애니메이션 업데이트
     */
    updateAnimations() {
        // 수집 아이템 회전
        this.collectibles.forEach(collectible => {
            if (!collectible.collected) {
                collectible.mesh.rotation.y += collectible.rotationSpeed;
                collectible.mesh.rotation.x += collectible.rotationSpeed * 0.5;
            }
        });
        
        // 목표 지점 펄스 효과
        if (this.goal) {
            const scale = 1 + Math.sin(this.gameState.time * 3) * 0.1;
            this.goal.scale.set(scale, 1, scale);
        }
    }
    
    /**
     * 게임 렌더링 (필수 메서드)
     */
    render() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    /**
     * UI 업데이트 (필수 메서드)
     */
    updateUI() {
        const scoreElement = document.getElementById('scoreValue');
        if (scoreElement) {
            scoreElement.textContent = this.gameState.score;
        }
        
        const levelElement = document.getElementById('levelValue');
        if (levelElement) {
            levelElement.textContent = this.gameState.level;
        }
        
        const timeElement = document.getElementById('timeValue');
        if (timeElement) {
            timeElement.textContent = Math.floor(this.gameState.time);
        }
        
        const healthElement = document.getElementById('healthValue');
        if (healthElement) {
            healthElement.textContent = this.gameState.health;
        }
    }
    
    /**
     * 센서 상태 업데이트 (필수 메서드)
     */
    updateSensorStatus(isConnected) {
        const statusElement = document.getElementById('sensorStatus');
        if (statusElement) {
            if (isConnected) {
                statusElement.textContent = '📱 센서 연결됨';
                statusElement.className = 'ui-element sensor-status connected';
            } else {
                statusElement.textContent = '⌨️ 키보드 시뮬레이션 (WASD/화살표)';
                statusElement.className = 'ui-element sensor-status disconnected';
            }
        }
    }
    
    /**
     * 레벨 완료 처리
     */
    completeLevel() {
        this.gameState.isPlaying = false;
        
        // 시간 보너스 계산
        const timeBonus = Math.max(0, (this.currentLevelData.par - this.gameState.time) * 10);
        
        // 체력 보너스 계산
        const healthBonus = this.gameState.health * 50;
        
        // 점수 업데이트
        this.gameState.score += 100 + timeBonus + healthBonus;
        
        // 사운드 재생
        this.sounds.goal.play();
        this.sounds.levelComplete.play();
        
        // 다음 레벨 또는 게임 완료 처리
        if (this.gameState.level < this.levels.length) {
            setTimeout(() => {
                this.nextLevel();
            }, 2000);
        } else {
            this.gameComplete();
        }
        
        console.log(`🎯 레벨 ${this.gameState.level} 완료! 점수: ${this.gameState.score}`);
    }
    
    /**
     * 구멍에 빠짐 처리
     */
    fallIntoHole() {
        this.gameState.health--;
        this.triggerExplosion();
        
        if (this.gameState.health <= 0) {
            this.gameOver();
        } else {
            this.respawnBall();
        }
    }
    
    /**
     * 플랫폼 이탈 처리
     */
    fallOffPlatform() {
        this.gameState.health--;
        this.triggerExplosion();
        
        if (this.gameState.health <= 0) {
            this.gameOver();
        } else {
            this.respawnBall();
        }
    }
    
    /**
     * 아이템 수집 처리
     */
    collectItem(index) {
        const collectible = this.collectibles[index];
        if (collectible.collected) return;
        
        collectible.collected = true;
        this.gameState.score += collectible.value;
        
        // 시각적 효과
        collectible.mesh.visible = false;
        this.world.remove(collectible.body);
        
        // 사운드 재생
        this.sounds.collect.play();
        
        console.log(`💰 아이템 수집! +${collectible.value} 점수`);
    }
    
    /**
     * 폭발 효과 트리거
     */
    triggerExplosion() {
        const explosion = this.particleSystems.explosion;
        if (explosion && this.ballBody) {
            explosion.active = true;
            explosion.timer = 0;
            explosion.object.visible = true;
            
            // 폭발 위치 설정
            const ballPos = this.ballBody.position;
            for (let i = 0; i < 50; i++) {
                explosion.positions[i * 3] = ballPos.x;
                explosion.positions[i * 3 + 1] = ballPos.y;
                explosion.positions[i * 3 + 2] = ballPos.z;
            }
        }
    }
    
    /**
     * 볼 리스폰
     */
    respawnBall() {
        if (this.ballBody && this.currentLevelData) {
            const startPos = this.currentLevelData.ballStart;
            this.ballBody.position.set(startPos.x, startPos.y, startPos.z);
            this.ballBody.velocity.set(0, 0, 0);
            this.ballBody.angularVelocity.set(0, 0, 0);
        }
    }
    
    /**
     * 게임 오버 처리
     */
    gameOver() {
        this.gameState.isPlaying = false;
        console.log('💀 게임 오버!');
        // 게임 오버 UI 표시 등
    }
    
    /**
     * 시간 초과 처리
     */
    timeUp() {
        this.gameState.isPlaying = false;
        console.log('⏰ 시간 초과!');
        // 시간 초과 UI 표시 등
    }
    
    /**
     * 다음 레벨 진행
     */
    nextLevel() {
        if (this.gameState.level < this.levels.length) {
            this.loadLevel(this.gameState.level + 1);
        }
    }
    
    /**
     * 게임 완료 처리
     */
    gameComplete() {
        console.log('🎉 게임 완료! 최종 점수:', this.gameState.score);
        // 게임 완료 UI 표시 등
    }
    
    /**
     * 게임 재시작 (권장 메서드)
     */
    restart() {
        this.gameState.score = 0;
        this.gameState.health = this.gameState.maxHealth;
        this.gameState.time = 0;
        this.gameState.isPlaying = true;
        this.gameState.isPaused = false;
        
        this.loadLevel(this.gameState.level);
        this.updateUI();
        
        console.log('🔄 게임 재시작');
    }
    
    /**
     * 게임 일시정지 토글
     */
    togglePause() {
        this.gameState.isPaused = !this.gameState.isPaused;
        console.log(this.gameState.isPaused ? '⏸️ 일시정지' : '▶️ 재생');
    }
    
    /**
     * 카메라 모드 전환
     */
    toggleCamera() {
        const modes = ['follow', 'overhead', 'free'];
        const currentIndex = modes.indexOf(this.cameraMode);
        this.cameraMode = modes[(currentIndex + 1) % modes.length];
        
        console.log(`📷 카메라 모드: ${this.cameraMode}`);
    }
    
    /**
     * 센서 재보정
     */
    calibrate() {
        console.log('🎯 센서 재보정');
        // 센서 재보정 로직
    }
    
    /**
     * 로딩 화면 표시/숨김
     */
    showLoadingScreen(show) {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            if (show) {
                loadingScreen.classList.remove('hidden');
            } else {
                loadingScreen.classList.add('hidden');
            }
        }
    }
    
    /**
     * 오류 메시지 표시
     */
    showErrorMessage(message) {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            const loadingText = loadingScreen.querySelector('.loading-text');
            if (loadingText) {
                loadingText.innerHTML = `
                    <div style="color: #ff6b6b;">⚠️ 오류 발생</div>
                    <div style="font-size: 0.9rem; margin-top: 10px;">${message}</div>
                    <div style="font-size: 0.8rem; margin-top: 10px; opacity: 0.7;">페이지를 새로고침해주세요</div>
                `;
            }
        }
    }
}

// 게임 인스턴스 생성 (필수)
document.addEventListener('DOMContentLoaded', () => {
    // 약간의 지연을 두어 모든 요소가 로드되도록 함
    setTimeout(() => {
        console.log('🎮 게임 인스턴스 생성 시작');
        window.game = new BallBalanceAdventure();
    }, 100);
});