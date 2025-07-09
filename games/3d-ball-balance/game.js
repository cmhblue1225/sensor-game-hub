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
                orientation: 0.8,
                accelerometer: 0.5
            },
            smoothingFactor: 6,
            deadzone: 0.1
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
        
        // 상태 관리 플래그
        this.isProcessingBallLoss = false;
        
        // 벽 메쉬 및 바디 배열
        this.wallMeshes = [];
        this.wallBodies = [];
        
        // 충돌 소리 쿨다운
        this.lastCollisionSoundTime = 0;
        
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
            
            // Three.js 및 CANNON-ES 초기화
            this.initializeThreeJS();
            this.initializePhysics();
            this.initializeAudio();
            this.initializeMaterials();
            this.initializeParticles();
            
            // 첫 번째 레벨 로드
            this.loadLevel(1);
            
            // 이벤트 리스너 등록
            this.setupEventListeners();
            
            // 게임 루프 시작
            this.startGameLoop();
            
            // 로딩 화면 숨기기
            this.showLoadingScreen(false);
            
            console.log('✅ 게임 초기화 완료');
            
        } catch (error) {
            console.error('❌ 게임 초기화 실패:', error);
            this.showError('게임 초기화에 실패했습니다: ' + error.message);
        }
    }
    
    /**
     * 라이브러리 로딩 대기
     */
    async waitForLibraries() {
        console.log('📚 라이브러리 로딩 대기 중...');
        
        // THREE.js 로딩 대기
        await new Promise((resolve) => {
            const checkTHREE = () => {
                if (typeof THREE !== 'undefined') {
                    console.log('✅ THREE.js 로딩 완료');
                    resolve();
                } else {
                    setTimeout(checkTHREE, 100);
                }
            };
            checkTHREE();
        });
        
        // CANNON-ES 로딩 대기
        await new Promise((resolve) => {
            const checkCANNON = () => {
                if (typeof CANNON !== 'undefined') {
                    console.log('✅ CANNON-ES 로딩 완료');
                    resolve();
                } else {
                    setTimeout(checkCANNON, 100);
                }
            };
            checkCANNON();
        });
    }
    
    /**
     * Three.js 초기화
     */
    initializeThreeJS() {
        console.log('🎨 Three.js 초기화 중...');
        
        // 캔버스 및 컨테이너 설정
        const canvas = document.getElementById('gameCanvas');
        const container = document.getElementById('gameContainer');
        
        // 렌더러 생성
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true,
            alpha: false
        });
        
        // 캔버스 크기 설정
        const containerWidth = Math.min(800, window.innerWidth - 40);
        const containerHeight = Math.min(600, window.innerHeight - 200);
        
        this.renderer.setSize(containerWidth, containerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        // 씬 생성
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x001122);
        this.scene.fog = new THREE.Fog(0x001122, 20, 100);
        
        // 카메라 생성
        this.camera = new THREE.PerspectiveCamera(
            75,
            containerWidth / containerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 10, 10);
        this.camera.lookAt(0, 0, 0);
        
        // 조명 설정
        this.setupLighting();
        
        console.log('✅ Three.js 초기화 완료');
    }
    
    /**
     * 조명 설정
     */
    setupLighting() {
        // 주변광
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);
        
        // 방향광 (태양광)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        
        // 그림자 맵 설정
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        
        this.scene.add(directionalLight);
        
        // 포인트 라이트 (볼 주변)
        const pointLight = new THREE.PointLight(0x00ff88, 0.5, 10);
        pointLight.position.set(0, 5, 0);
        this.scene.add(pointLight);
        
        // 골 라이트
        const goalLight = new THREE.PointLight(0xff4444, 0.8, 8);
        goalLight.position.set(0, 2, 0);
        this.scene.add(goalLight);
        this.goalLight = goalLight;
    }
    
    /**
     * 물리 엔진 초기화
     */
    initializePhysics() {
        console.log('⚛️ CANNON-ES 물리 엔진 초기화 중...');
        
        // 물리 월드 생성
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 10;
        
        // 물리 머티리얼 생성
        this.materials.physics.ball = new CANNON.Material('ball');
        this.materials.physics.platform = new CANNON.Material('platform');
        this.materials.physics.goal = new CANNON.Material('goal');
        this.materials.physics.obstacle = new CANNON.Material('obstacle');
        
        // 접촉 머티리얼 설정 (부드러운 물리 반응)
        const ballPlatformContact = new CANNON.ContactMaterial(
            this.materials.physics.ball,
            this.materials.physics.platform,
            {
                friction: 0.6,
                restitution: 0.1
            }
        );
        
        const ballGoalContact = new CANNON.ContactMaterial(
            this.materials.physics.ball,
            this.materials.physics.goal,
            {
                friction: 0.3,
                restitution: 0.05
            }
        );
        
        const ballObstacleContact = new CANNON.ContactMaterial(
            this.materials.physics.ball,
            this.materials.physics.obstacle,
            {
                friction: 0.4,
                restitution: 0.2
            }
        );
        
        this.world.addContactMaterial(ballPlatformContact);
        this.world.addContactMaterial(ballGoalContact);
        this.world.addContactMaterial(ballObstacleContact);
        
        console.log('✅ 물리 엔진 초기화 완료');
    }
    
    /**
     * 오디오 시스템 초기화
     */
    initializeAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createSounds();
            console.log('🔊 오디오 시스템 초기화 완료');
        } catch (error) {
            console.warn('⚠️ 오디오 시스템 초기화 실패:', error);
        }
    }
    
    /**
     * 사운드 생성 (프로시저럴 오디오)
     */
    createSounds() {
        if (!this.audioContext) return;
        
        // 볼 굴러가는 소리
        this.sounds.roll = this.createRollSound();
        
        // 골 도달 소리
        this.sounds.goal = this.createGoalSound();
        
        // 충돌 소리
        this.sounds.collision = this.createCollisionSound();
        
        // 수집 소리
        this.sounds.collect = this.createCollectSound();
    }
    
    /**
     * 굴러가는 소리 생성
     */
    createRollSound() {
        return () => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(60, this.audioContext.currentTime);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(200, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0.05, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.3);
        };
    }
    
    /**
     * 골 소리 생성
     */
    createGoalSound() {
        return () => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(880, this.audioContext.currentTime + 0.3);
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.5);
        };
    }
    
    /**
     * 충돌 소리 생성
     */
    createCollisionSound() {
        return () => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
            
            gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.1);
        };
    }
    
    /**
     * 수집 소리 생성
     */
    createCollectSound() {
        return () => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(880, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1320, this.audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.3);
        };
    }
    
    /**
     * 머티리얼 초기화
     */
    initializeMaterials() {
        // 볼 머티리얼
        this.materials.visual.ball = new THREE.MeshPhongMaterial({
            color: 0x00ff88,
            shininess: 100,
            specular: 0x004422
        });
        
        // 플랫폼 머티리얼
        this.materials.visual.platform = new THREE.MeshLambertMaterial({
            color: 0x4444aa,
            transparent: true,
            opacity: 0.8
        });
        
        // 골 머티리얼
        this.materials.visual.goal = new THREE.MeshPhongMaterial({
            color: 0xff4444,
            emissive: 0x440000,
            shininess: 100
        });
        
        // 장애물 머티리얼
        this.materials.visual.obstacle = new THREE.MeshPhongMaterial({
            color: 0x666666,
            shininess: 50
        });
        
        // 구멍 머티리얼
        this.materials.visual.hole = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.9
        });
        
        // 수집 아이템 머티리얼
        this.materials.visual.collectible = new THREE.MeshPhongMaterial({
            color: 0xffff00,
            emissive: 0x444400,
            shininess: 100
        });
    }
    
    /**
     * 파티클 시스템 초기화
     */
    initializeParticles() {
        // 볼 트레일 파티클
        this.createTrailParticles();
        
        // 골 파티클
        this.createGoalParticles();
        
        // 수집 파티클
        this.createCollectParticles();
        
        // 폭발 파티클
        this.createExplosionParticles();
    }
    
    /**
     * 트레일 파티클 생성
     */
    createTrailParticles() {
        const particleCount = 100;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            
            colors[i * 3] = 0;
            colors[i * 3 + 1] = 1;
            colors[i * 3 + 2] = 0.5;
            
            sizes[i] = 0.1;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 0.05,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        this.particleSystems.trail = new THREE.Points(geometry, material);
        this.scene.add(this.particleSystems.trail);
    }
    
    /**
     * 골 파티클 생성
     */
    createGoalParticles() {
        const particleCount = 50;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const radius = Math.random() * 2;
            
            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = Math.random() * 2;
            positions[i * 3 + 2] = Math.sin(angle) * radius;
            
            colors[i * 3] = 1;
            colors[i * 3 + 1] = 0.2;
            colors[i * 3 + 2] = 0.2;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        this.particleSystems.goal = new THREE.Points(geometry, material);
    }
    
    /**
     * 수집 파티클 생성
     */
    createCollectParticles() {
        const particleCount = 20;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 2;
            positions[i * 3 + 1] = Math.random() * 2;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
            
            colors[i * 3] = 1;
            colors[i * 3 + 1] = 1;
            colors[i * 3 + 2] = 0;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.05,
            vertexColors: true,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending
        });
        
        this.particleSystems.collect = new THREE.Points(geometry, material);
    }
    
    /**
     * 폭발 파티클 생성
     */
    createExplosionParticles() {
        const particleCount = 30;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            
            colors[i * 3] = 1;
            colors[i * 3 + 1] = Math.random() * 0.5;
            colors[i * 3 + 2] = 0;
            
            velocities[i * 3] = (Math.random() - 0.5) * 10;
            velocities[i * 3 + 1] = Math.random() * 10;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 10;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        this.particleSystems.explosion = new THREE.Points(geometry, material);
    }
    
    /**
     * 레벨 데이터 생성
     */
    generateLevels() {
        return [
            {
                level: 1,
                name: '튜토리얼',
                platformSize: { width: 20, height: 0.5, depth: 20 },
                ballStart: { x: 0, y: 2, z: 8 },
                goalPosition: { x: 0, y: 0.5, z: -8 },
                obstacles: [],
                holes: [],
                collectibles: [
                    { x: 3, y: 0.5, z: 3 },
                    { x: -3, y: 0.5, z: -3 }
                ],
                timeLimit: 60,
                description: '기본 조작법을 익혀보세요!'
            },
            {
                level: 2,
                name: '장애물 코스',
                platformSize: { width: 25, height: 0.5, depth: 25 },
                ballStart: { x: 0, y: 2, z: 10 },
                goalPosition: { x: 0, y: 0.5, z: -10 },
                obstacles: [
                    { x: 0, y: 1, z: 0, size: { width: 2, height: 2, depth: 2 } },
                    { x: 5, y: 1, z: 3, size: { width: 1.5, height: 1.5, depth: 1.5 } },
                    { x: -5, y: 1, z: -3, size: { width: 1.5, height: 1.5, depth: 1.5 } }
                ],
                holes: [
                    { x: 2, y: 0, z: 5, radius: 1.5 },
                    { x: -2, y: 0, z: -5, radius: 1.5 }
                ],
                collectibles: [
                    { x: 8, y: 0.5, z: 8 },
                    { x: -8, y: 0.5, z: -8 },
                    { x: 8, y: 0.5, z: -8 }
                ],
                timeLimit: 90,
                description: '장애물을 피해 골에 도달하세요!'
            },
            {
                level: 3,
                name: '구멍 지대',
                platformSize: { width: 30, height: 0.5, depth: 30 },
                ballStart: { x: 0, y: 2, z: 12 },
                goalPosition: { x: 0, y: 0.5, z: -12 },
                obstacles: [
                    { x: 3, y: 1, z: 6, size: { width: 1, height: 1, depth: 1 } },
                    { x: -3, y: 1, z: -6, size: { width: 1, height: 1, depth: 1 } }
                ],
                holes: [
                    { x: 0, y: 0, z: 3, radius: 2 },
                    { x: 5, y: 0, z: 0, radius: 1.5 },
                    { x: -5, y: 0, z: 0, radius: 1.5 },
                    { x: 0, y: 0, z: -6, radius: 1.8 }
                ],
                collectibles: [
                    { x: 10, y: 0.5, z: 10 },
                    { x: -10, y: 0.5, z: 10 },
                    { x: 10, y: 0.5, z: -10 },
                    { x: -10, y: 0.5, z: -10 }
                ],
                timeLimit: 120,
                description: '구멍에 빠지지 않도록 주의하세요!'
            },
            {
                level: 4,
                name: '미로 탈출',
                platformSize: { width: 35, height: 0.5, depth: 35 },
                ballStart: { x: 0, y: 2, z: 15 },
                goalPosition: { x: 0, y: 0.5, z: -15 },
                obstacles: [
                    { x: -5, y: 1, z: 10, size: { width: 10, height: 2, depth: 1 } },
                    { x: 5, y: 1, z: 5, size: { width: 1, height: 2, depth: 10 } },
                    { x: -5, y: 1, z: -5, size: { width: 10, height: 2, depth: 1 } },
                    { x: 3, y: 1, z: -10, size: { width: 1, height: 2, depth: 6 } }
                ],
                holes: [
                    { x: 8, y: 0, z: 8, radius: 1.2 },
                    { x: -8, y: 0, z: -8, radius: 1.2 }
                ],
                collectibles: [
                    { x: 12, y: 0.5, z: 12 },
                    { x: -12, y: 0.5, z: 12 },
                    { x: 12, y: 0.5, z: -12 },
                    { x: -12, y: 0.5, z: -12 },
                    { x: 0, y: 0.5, z: 0 }
                ],
                timeLimit: 150,
                description: '미로를 통과해 골에 도달하세요!'
            },
            {
                level: 5,
                name: '챔피언 챌린지',
                platformSize: { width: 40, height: 0.5, depth: 40 },
                ballStart: { x: 0, y: 2, z: 18 },
                goalPosition: { x: 0, y: 0.5, z: -18 },
                obstacles: [
                    { x: 0, y: 1, z: 10, size: { width: 8, height: 1, depth: 1 } },
                    { x: 8, y: 1, z: 6, size: { width: 1, height: 1, depth: 8 } },
                    { x: -8, y: 1, z: 6, size: { width: 1, height: 1, depth: 8 } },
                    { x: 0, y: 1, z: 0, size: { width: 12, height: 1, depth: 1 } },
                    { x: 6, y: 1, z: -6, size: { width: 1, height: 1, depth: 6 } },
                    { x: -6, y: 1, z: -6, size: { width: 1, height: 1, depth: 6 } },
                    { x: 0, y: 1, z: -12, size: { width: 8, height: 1, depth: 1 } }
                ],
                holes: [
                    { x: 4, y: 0, z: 12, radius: 1 },
                    { x: -4, y: 0, z: 12, radius: 1 },
                    { x: 12, y: 0, z: 2, radius: 1 },
                    { x: -12, y: 0, z: 2, radius: 1 },
                    { x: 3, y: 0, z: -3, radius: 1 },
                    { x: -3, y: 0, z: -3, radius: 1 },
                    { x: 8, y: 0, z: -15, radius: 1 },
                    { x: -8, y: 0, z: -15, radius: 1 }
                ],
                collectibles: [
                    { x: 15, y: 0.5, z: 15 },
                    { x: -15, y: 0.5, z: 15 },
                    { x: 15, y: 0.5, z: -15 },
                    { x: -15, y: 0.5, z: -15 },
                    { x: 0, y: 0.5, z: 8 },
                    { x: 0, y: 0.5, z: -8 }
                ],
                timeLimit: 180,
                description: '최고의 실력을 보여주세요!'
            }
        ];
    }
    
    /**
     * 레벨 로드
     */
    loadLevel(levelNumber) {
        console.log(`🎯 레벨 ${levelNumber} 로딩 중...`);
        
        // 기존 오브젝트 제거
        this.clearLevel();
        
        // 레벨 데이터 가져오기
        this.currentLevelData = this.levels[levelNumber - 1];
        if (!this.currentLevelData) {
            console.error('레벨 데이터를 찾을 수 없습니다:', levelNumber);
            return;
        }
        
        // 게임 상태 업데이트
        this.gameState.level = levelNumber;
        this.gameState.time = 0;
        this.gameState.health = this.gameState.maxHealth;
        
        // 플랫폼 생성
        this.createPlatform();
        
        // 볼 생성
        this.createBall();
        
        // 골 생성
        this.createGoal();
        
        // 장애물 생성
        this.createObstacles();
        
        // 구멍 생성
        this.createHoles();
        
        // 수집 아이템 생성
        this.createCollectibles();
        
        // 골 파티클 위치 설정
        if (this.particleSystems.goal) {
            this.particleSystems.goal.position.copy(this.goal.position);
            this.scene.add(this.particleSystems.goal);
        }
        
        // 골 라이트 위치 설정
        if (this.goalLight) {
            this.goalLight.position.set(
                this.currentLevelData.goalPosition.x,
                this.currentLevelData.goalPosition.y + 2,
                this.currentLevelData.goalPosition.z
            );
        }
        
        // UI 업데이트
        this.updateUI();
        
        console.log(`✅ 레벨 ${levelNumber} 로딩 완료`);
    }
    
    /**
     * 기존 레벨 오브젝트 제거
     */
    clearLevel() {
        // 물리 오브젝트 제거
        if (this.ballBody) {
            this.world.removeBody(this.ballBody);
            this.ballBody = null;
        }
        
        if (this.platformBody) {
            this.world.removeBody(this.platformBody);
            this.platformBody = null;
        }
        
        if (this.goalBody) {
            this.world.removeBody(this.goalBody);
            this.goalBody = null;
        }
        
        // 장애물 제거
        this.obstacles.forEach(obstacle => {
            this.world.removeBody(obstacle.body);
            this.scene.remove(obstacle.mesh);
        });
        this.obstacles = [];
        
        // 구멍 제거
        this.holes.forEach(hole => {
            this.scene.remove(hole.mesh);
        });
        this.holes = [];
        
        // 수집 아이템 제거
        this.collectibles.forEach(collectible => {
            this.world.removeBody(collectible.body);
            this.scene.remove(collectible.mesh);
        });
        this.collectibles = [];
        
        // 시각적 오브젝트 제거
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
        
        // 파티클 시스템 제거
        if (this.particleSystems.goal) {
            this.scene.remove(this.particleSystems.goal);
        }
        
        // 벽 메쉬 및 바디 제거
        if (this.wallMeshes) {
            this.wallMeshes.forEach(mesh => {
                this.scene.remove(mesh);
            });
            this.wallMeshes = [];
        }
        
        if (this.wallBodies) {
            this.wallBodies.forEach(body => {
                this.world.removeBody(body);
            });
            this.wallBodies = [];
        }
    }
    
    /**
     * 플랫폼 생성
     */
    createPlatform() {
        const { width, height, depth } = this.currentLevelData.platformSize;
        
        // 시각적 플랫폼
        const platformGeometry = new THREE.BoxGeometry(width, height, depth);
        this.platform = new THREE.Mesh(platformGeometry, this.materials.visual.platform);
        this.platform.position.set(0, 0, 0);
        this.platform.receiveShadow = true;
        this.scene.add(this.platform);
        
        // 물리 플랫폼
        const platformShape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2));
        this.platformBody = new CANNON.Body({
            mass: 0,
            shape: platformShape,
            material: this.materials.physics.platform
        });
        this.platformBody.position.set(0, 0, 0);
        this.world.addBody(this.platformBody);
        
        // 플랫폼 경계 벽 생성
        this.createPlatformWalls(width, height, depth);
    }
    
    /**
     * 플랫폼 경계 벽 생성
     */
    createPlatformWalls(width, height, depth) {
        const wallHeight = 1; // 벽 높이를 낮춤
        const wallThickness = 0.2; // 벽 두께를 얇게
        
        // 경계 벽 생성 (시각적 표시를 위한 메쉬도 함께)
        const wallMaterial = new THREE.MeshPhongMaterial({
            color: 0x888888,
            transparent: true,
            opacity: 0.3
        });
        
        // 앞쪽 벽
        const frontWallShape = new CANNON.Box(new CANNON.Vec3(width/2, wallHeight/2, wallThickness/2));
        const frontWallBody = new CANNON.Body({
            mass: 0,
            shape: frontWallShape,
            material: this.materials.physics.obstacle
        });
        frontWallBody.position.set(0, wallHeight/2, depth/2 + wallThickness/2);
        this.world.addBody(frontWallBody);
        
        // 시각적 벽 (앞쪽)
        const frontWallGeometry = new THREE.BoxGeometry(width, wallHeight, wallThickness);
        const frontWallMesh = new THREE.Mesh(frontWallGeometry, wallMaterial);
        frontWallMesh.position.copy(frontWallBody.position);
        this.scene.add(frontWallMesh);
        
        // 뒤쪽 벽
        const backWallShape = new CANNON.Box(new CANNON.Vec3(width/2, wallHeight/2, wallThickness/2));
        const backWallBody = new CANNON.Body({
            mass: 0,
            shape: backWallShape,
            material: this.materials.physics.obstacle
        });
        backWallBody.position.set(0, wallHeight/2, -depth/2 - wallThickness/2);
        this.world.addBody(backWallBody);
        
        // 시각적 벽 (뒤쪽)
        const backWallGeometry = new THREE.BoxGeometry(width, wallHeight, wallThickness);
        const backWallMesh = new THREE.Mesh(backWallGeometry, wallMaterial);
        backWallMesh.position.copy(backWallBody.position);
        this.scene.add(backWallMesh);
        
        // 왼쪽 벽
        const leftWallShape = new CANNON.Box(new CANNON.Vec3(wallThickness/2, wallHeight/2, depth/2));
        const leftWallBody = new CANNON.Body({
            mass: 0,
            shape: leftWallShape,
            material: this.materials.physics.obstacle
        });
        leftWallBody.position.set(-width/2 - wallThickness/2, wallHeight/2, 0);
        this.world.addBody(leftWallBody);
        
        // 시각적 벽 (왼쪽)
        const leftWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, depth);
        const leftWallMesh = new THREE.Mesh(leftWallGeometry, wallMaterial);
        leftWallMesh.position.copy(leftWallBody.position);
        this.scene.add(leftWallMesh);
        
        // 오른쪽 벽
        const rightWallShape = new CANNON.Box(new CANNON.Vec3(wallThickness/2, wallHeight/2, depth/2));
        const rightWallBody = new CANNON.Body({
            mass: 0,
            shape: rightWallShape,
            material: this.materials.physics.obstacle
        });
        rightWallBody.position.set(width/2 + wallThickness/2, wallHeight/2, 0);
        this.world.addBody(rightWallBody);
        
        // 시각적 벽 (오른쪽)
        const rightWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, depth);
        const rightWallMesh = new THREE.Mesh(rightWallGeometry, wallMaterial);
        rightWallMesh.position.copy(rightWallBody.position);
        this.scene.add(rightWallMesh);
        
        // 벽 메쉬들을 저장해서 나중에 제거할 수 있도록
        this.wallMeshes = [frontWallMesh, backWallMesh, leftWallMesh, rightWallMesh];
        this.wallBodies = [frontWallBody, backWallBody, leftWallBody, rightWallBody];
    }
    
    /**
     * 볼 생성
     */
    createBall() {
        const ballRadius = 0.5;
        const { x, y, z } = this.currentLevelData.ballStart;
        
        // 시각적 볼
        const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
        this.ball = new THREE.Mesh(ballGeometry, this.materials.visual.ball);
        this.ball.position.set(x, y, z);
        this.ball.castShadow = true;
        this.scene.add(this.ball);
        
        // 물리 볼 (더 무겁게 해서 안정성 향상)
        const ballShape = new CANNON.Sphere(ballRadius);
        this.ballBody = new CANNON.Body({
            mass: 2,
            shape: ballShape,
            material: this.materials.physics.ball
        });
        this.ballBody.linearDamping = 0.1;
        this.ballBody.angularDamping = 0.1;
        this.ballBody.position.set(x, y, z);
        this.world.addBody(this.ballBody);
        
        // 충돌 이벤트 리스너
        this.ballBody.addEventListener('collide', (event) => {
            this.onBallCollision(event);
        });
    }
    
    /**
     * 골 생성
     */
    createGoal() {
        const goalRadius = 1.5;
        const goalHeight = 0.2;
        const { x, y, z } = this.currentLevelData.goalPosition;
        
        // 시각적 골
        const goalGeometry = new THREE.CylinderGeometry(goalRadius, goalRadius, goalHeight, 32);
        this.goal = new THREE.Mesh(goalGeometry, this.materials.visual.goal);
        this.goal.position.set(x, y, z);
        this.goal.receiveShadow = true;
        this.scene.add(this.goal);
        
        // 물리 골
        const goalShape = new CANNON.Cylinder(goalRadius, goalRadius, goalHeight, 8);
        this.goalBody = new CANNON.Body({
            mass: 0,
            shape: goalShape,
            material: this.materials.physics.goal,
            isTrigger: true
        });
        this.goalBody.position.set(x, y, z);
        this.world.addBody(this.goalBody);
        
        // 골 트리거 이벤트
        this.goalBody.addEventListener('collide', (event) => {
            if (event.target === this.ballBody || event.body === this.ballBody) {
                this.onGoalReached();
            }
        });
    }
    
    /**
     * 장애물 생성
     */
    createObstacles() {
        this.currentLevelData.obstacles.forEach(obstacleData => {
            const { x, y, z, size } = obstacleData;
            
            // 시각적 장애물
            const obstacleGeometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
            const obstacleMesh = new THREE.Mesh(obstacleGeometry, this.materials.visual.obstacle);
            obstacleMesh.position.set(x, y, z);
            obstacleMesh.castShadow = true;
            obstacleMesh.receiveShadow = true;
            this.scene.add(obstacleMesh);
            
            // 물리 장애물
            const obstacleShape = new CANNON.Box(new CANNON.Vec3(size.width/2, size.height/2, size.depth/2));
            const obstacleBody = new CANNON.Body({
                mass: 0,
                shape: obstacleShape,
                material: this.materials.physics.obstacle
            });
            obstacleBody.position.set(x, y, z);
            this.world.addBody(obstacleBody);
            
            this.obstacles.push({
                mesh: obstacleMesh,
                body: obstacleBody
            });
        });
    }
    
    /**
     * 구멍 생성
     */
    createHoles() {
        this.currentLevelData.holes.forEach(holeData => {
            const { x, y, z, radius } = holeData;
            
            // 시각적 구멍
            const holeGeometry = new THREE.CylinderGeometry(radius, radius, 0.1, 32);
            const holeMesh = new THREE.Mesh(holeGeometry, this.materials.visual.hole);
            holeMesh.position.set(x, y, z);
            this.scene.add(holeMesh);
            
            this.holes.push({
                mesh: holeMesh,
                position: { x, y, z },
                radius: radius
            });
        });
    }
    
    /**
     * 수집 아이템 생성
     */
    createCollectibles() {
        this.currentLevelData.collectibles.forEach(collectibleData => {
            const { x, y, z } = collectibleData;
            const collectibleSize = 0.3;
            
            // 시각적 수집 아이템
            const collectibleGeometry = new THREE.SphereGeometry(collectibleSize, 16, 16);
            const collectibleMesh = new THREE.Mesh(collectibleGeometry, this.materials.visual.collectible);
            collectibleMesh.position.set(x, y, z);
            collectibleMesh.castShadow = true;
            this.scene.add(collectibleMesh);
            
            // 물리 수집 아이템
            const collectibleShape = new CANNON.Sphere(collectibleSize);
            const collectibleBody = new CANNON.Body({
                mass: 0,
                shape: collectibleShape,
                material: this.materials.physics.goal,
                isTrigger: true
            });
            collectibleBody.position.set(x, y, z);
            this.world.addBody(collectibleBody);
            
            // 수집 이벤트 (중복 방지를 위한 throttle 적용)
            let lastCollisionTime = 0;
            collectibleBody.addEventListener('collide', (event) => {
                const currentTime = Date.now();
                if (currentTime - lastCollisionTime > 500) { // 500ms 쿨다운
                    if (event.target === this.ballBody || event.body === this.ballBody) {
                        this.onCollectibleCollected(collectibleMesh, collectibleBody);
                        lastCollisionTime = currentTime;
                    }
                }
            });
            
            this.collectibles.push({
                mesh: collectibleMesh,
                body: collectibleBody,
                collected: false
            });
        });
    }
    
    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 키보드 이벤트
        document.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
            
            // 특별 키 처리
            if (event.code === 'Space') {
                event.preventDefault();
                this.togglePause();
            }
            if (event.code === 'KeyR') {
                this.restart();
            }
        });
        
        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
        });
        
        // 윈도우 리사이즈 이벤트
        window.addEventListener('resize', () => {
            this.onWindowResize();
        });
        
        // 터치 이벤트 (모바일 지원)
        document.addEventListener('touchstart', (event) => {
            event.preventDefault();
        });
    }
    
    /**
     * 게임 루프 시작
     */
    startGameLoop() {
        this.gameState.gameStarted = true;
        this.animate();
    }
    
    /**
     * 게임 루프 (메인 애니메이션)
     */
    animate() {
        if (!this.gameState.gameStarted) return;
        
        requestAnimationFrame(() => this.animate());
        
        // 델타 타임 계산
        this.deltaTime = this.clock.getDelta();
        
        // 게임 일시정지 또는 게임 오버 확인
        if (this.gameState.isPaused || !this.gameState.isPlaying) {
            // 렌더링만 계속 (정지 화면 표시)
            this.renderer.render(this.scene, this.camera);
            this.updateUI();
            return;
        }
        
        // 물리 업데이트
        this.updatePhysics();
        
        // 입력 처리
        this.handleInput();
        
        // 게임 로직 업데이트
        this.updateGameLogic();
        
        // 파티클 업데이트
        this.updateParticles();
        
        // 카메라 업데이트
        this.updateCamera();
        
        // 렌더링
        this.renderer.render(this.scene, this.camera);
        
        // UI 업데이트
        this.updateUI();
    }
    
    /**
     * 물리 업데이트
     */
    updatePhysics() {
        if (!this.world) return;
        
        // 물리 시뮬레이션 스텝
        this.world.step(1/60, this.deltaTime, 3);
        
        // 물리 오브젝트와 시각적 오브젝트 동기화
        if (this.ball && this.ballBody) {
            this.ball.position.copy(this.ballBody.position);
            this.ball.quaternion.copy(this.ballBody.quaternion);
        }
        
        // 장애물 동기화
        this.obstacles.forEach(obstacle => {
            if (obstacle.mesh && obstacle.body) {
                obstacle.mesh.position.copy(obstacle.body.position);
                obstacle.mesh.quaternion.copy(obstacle.body.quaternion);
            }
        });
        
        // 수집 아이템 회전 애니메이션
        this.collectibles.forEach(collectible => {
            if (collectible.mesh && !collectible.collected) {
                collectible.mesh.rotation.y += this.deltaTime * 2;
                collectible.mesh.position.y = collectible.body.position.y + Math.sin(Date.now() * 0.003) * 0.1;
            }
        });
    }
    
    /**
     * 입력 처리
     */
    handleInput() {
        if (!this.ballBody) return;
        
        const force = new CANNON.Vec3();
        const forceStrength = 6; // 힘 강도 적절히 조정
        
        // 센서 입력 처리
        if (this.sensorData) {
            const { orientation, accelerometer } = this.sensorData;
            
            if (orientation) {
                // 기울기에 따른 힘 적용 (적절한 반응성)
                force.x = orientation.gamma * forceStrength * 0.08;
                force.z = orientation.beta * forceStrength * 0.08;
            }
            
            if (accelerometer) {
                // 가속도계에 따른 추가 힘 (적절한 반응성)
                force.x += accelerometer.x * forceStrength * 0.04;
                force.z += accelerometer.z * forceStrength * 0.04;
            }
        }
        
        // 키보드 입력 처리 (센서 없을 때)
        if (this.keys['KeyW'] || this.keys['ArrowUp']) {
            force.z -= forceStrength;
        }
        if (this.keys['KeyS'] || this.keys['ArrowDown']) {
            force.z += forceStrength;
        }
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
            force.x -= forceStrength;
        }
        if (this.keys['KeyD'] || this.keys['ArrowRight']) {
            force.x += forceStrength;
        }
        
        // 힘 적용
        if (force.length() > 0) {
            this.ballBody.applyForce(force, this.ballBody.position);
            
            // 굴러가는 소리 재생 (빈도 줄이기)
            if (this.sounds.roll && Math.random() < 0.02) {
                this.sounds.roll();
            }
        }
    }
    
    /**
     * 게임 로직 업데이트
     */
    updateGameLogic() {
        if (!this.ballBody) return;
        
        // 시간 업데이트
        this.gameState.time += this.deltaTime;
        
        // 볼이 구멍에 빠졌는지 확인
        this.checkHoleCollisions();
        
        // 볼이 플랫폼에서 떨어졌는지 확인
        this.checkPlatformBounds();
        
        // 시간 제한 확인
        if (this.gameState.time >= this.currentLevelData.timeLimit) {
            this.onTimeUp();
        }
        
        // 볼 속도 제한 (적절한 움직임)
        const maxVelocity = 12;
        if (this.ballBody.velocity.length() > maxVelocity) {
            this.ballBody.velocity.normalize();
            this.ballBody.velocity.scale(maxVelocity, this.ballBody.velocity);
        }
        
        // 볼 속도 감쇠 (자연스러운 마찰 효과)
        this.ballBody.velocity.scale(0.99, this.ballBody.velocity);
        this.ballBody.angularVelocity.scale(0.98, this.ballBody.angularVelocity);
    }
    
    /**
     * 구멍 충돌 확인
     */
    checkHoleCollisions() {
        if (!this.ballBody) return;
        
        this.holes.forEach(hole => {
            const distance = Math.sqrt(
                Math.pow(this.ballBody.position.x - hole.position.x, 2) +
                Math.pow(this.ballBody.position.z - hole.position.z, 2)
            );
            
            if (distance < hole.radius && this.ballBody.position.y < hole.position.y + 0.5) {
                this.onBallFallInHole();
            }
        });
    }
    
    /**
     * 플랫폼 경계 확인
     */
    checkPlatformBounds() {
        if (!this.ballBody || !this.currentLevelData) return;
        
        const { width, depth } = this.currentLevelData.platformSize;
        const ballPos = this.ballBody.position;
        
        if (Math.abs(ballPos.x) > width/2 + 2 || 
            Math.abs(ballPos.z) > depth/2 + 2 || 
            ballPos.y < -5) {
            this.onBallOutOfBounds();
        }
    }
    
    /**
     * 파티클 업데이트
     */
    updateParticles() {
        // 트레일 파티클 업데이트
        if (this.particleSystems.trail && this.ball) {
            const positions = this.particleSystems.trail.geometry.attributes.position.array;
            
            // 모든 파티클을 볼 위치로 이동
            for (let i = 0; i < positions.length; i += 3) {
                positions[i] = this.ball.position.x + (Math.random() - 0.5) * 0.5;
                positions[i + 1] = this.ball.position.y + (Math.random() - 0.5) * 0.5;
                positions[i + 2] = this.ball.position.z + (Math.random() - 0.5) * 0.5;
            }
            
            this.particleSystems.trail.geometry.attributes.position.needsUpdate = true;
        }
        
        // 골 파티클 업데이트
        if (this.particleSystems.goal && this.goal) {
            const positions = this.particleSystems.goal.geometry.attributes.position.array;
            
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] += Math.sin(Date.now() * 0.005 + i) * 0.01;
            }
            
            this.particleSystems.goal.geometry.attributes.position.needsUpdate = true;
        }
    }
    
    /**
     * 카메라 업데이트
     */
    updateCamera() {
        if (!this.ball || !this.camera) return;
        
        switch (this.cameraMode) {
            case 'follow':
                this.updateFollowCamera();
                break;
            case 'overhead':
                this.updateOverheadCamera();
                break;
            case 'free':
                // 자유 카메라는 마우스 입력으로 제어
                break;
        }
    }
    
    /**
     * 추적 카메라 업데이트
     */
    updateFollowCamera() {
        const ballPosition = this.ball.position;
        const targetPosition = ballPosition.clone().add(this.cameraOffset);
        
        // 부드러운 카메라 이동
        this.camera.position.lerp(targetPosition, 0.1);
        this.camera.lookAt(ballPosition);
    }
    
    /**
     * 오버헤드 카메라 업데이트
     */
    updateOverheadCamera() {
        const ballPosition = this.ball.position;
        
        this.camera.position.set(ballPosition.x, 15, ballPosition.z);
        this.camera.lookAt(ballPosition);
    }
    
    /**
     * 볼 충돌 처리
     */
    onBallCollision(event) {
        const contact = event.contact;
        const force = contact.getImpactVelocityAlongNormal();
        
        // 충돌 소리 재생 조건을 더 엄격하게 (더 강한 충돌에만)
        if (Math.abs(force) > 8) {
            // 충돌 소리 재생 (쿨다운 적용)
            const currentTime = Date.now();
            if (!this.lastCollisionSoundTime || currentTime - this.lastCollisionSoundTime > 300) {
                if (this.sounds.collision) {
                    this.sounds.collision();
                }
                this.lastCollisionSoundTime = currentTime;
            }
            
            // 충돌 파티클 효과
            this.createCollisionEffect(this.ball.position);
        }
    }
    
    /**
     * 골 도달 처리
     */
    onGoalReached() {
        console.log('🎯 골 도달!');
        
        // 골 소리 재생
        if (this.sounds.goal) {
            this.sounds.goal();
        }
        
        // 점수 계산
        const timeBonus = Math.max(0, this.currentLevelData.timeLimit - this.gameState.time);
        const collectibleBonus = this.collectibles.filter(c => c.collected).length * 100;
        const levelScore = Math.floor(1000 + timeBonus * 10 + collectibleBonus);
        
        this.gameState.score += levelScore;
        
        // 골 효과
        this.createGoalEffect();
        
        // 다음 레벨로 진행
        setTimeout(() => {
            this.nextLevel();
        }, 2000);
    }
    
    /**
     * 수집 아이템 수집 처리
     */
    onCollectibleCollected(mesh, body) {
        const collectible = this.collectibles.find(c => c.mesh === mesh);
        if (collectible && !collectible.collected) {
            collectible.collected = true;
            
            // 수집 소리 재생
            if (this.sounds.collect) {
                this.sounds.collect();
            }
            
            // 점수 추가
            this.gameState.score += 100;
            
            // 수집 효과
            this.createCollectEffect(mesh.position);
            
            // 아이템 숨기기 (물리 바디 제거는 다음 프레임에서)
            mesh.visible = false;
            
            // 안전하게 물리 바디 제거
            setTimeout(() => {
                if (body && this.world) {
                    try {
                        this.world.removeBody(body);
                    } catch (error) {
                        console.warn('물리 바디 제거 중 오류:', error);
                    }
                }
            }, 100);
            
            console.log('💎 수집 아이템 획득!');
        }
    }
    
    /**
     * 볼이 구멍에 빠짐 처리
     */
    onBallFallInHole() {
        this.onBallLost();
    }
    
    /**
     * 볼이 플랫폼에서 떨어짐 처리
     */
    onBallOutOfBounds() {
        this.onBallLost();
    }
    
    /**
     * 볼 분실 처리
     */
    onBallLost() {
        // 이미 처리 중이면 중복 실행 방지
        if (this.isProcessingBallLoss) {
            return;
        }
        
        this.isProcessingBallLoss = true;
        
        console.log('💥 볼 분실!');
        
        // 체력 감소
        this.gameState.health--;
        
        // 폭발 효과
        if (this.ball) {
            this.createExplosionEffect(this.ball.position);
        }
        
        // 게임 오버 확인
        if (this.gameState.health <= 0) {
            this.onGameOver();
        } else {
            // 볼 리스폰
            setTimeout(() => {
                this.respawnBall();
                this.isProcessingBallLoss = false;
            }, 1000);
        }
    }
    
    /**
     * 볼 리스폰
     */
    respawnBall() {
        const { x, y, z } = this.currentLevelData.ballStart;
        
        this.ballBody.position.set(x, y, z);
        this.ballBody.velocity.set(0, 0, 0);
        this.ballBody.angularVelocity.set(0, 0, 0);
        
        console.log('🔄 볼 리스폰');
    }
    
    /**
     * 시간 초과 처리
     */
    onTimeUp() {
        console.log('⏰ 시간 초과!');
        this.onGameOver();
    }
    
    /**
     * 게임 오버 처리
     */
    onGameOver() {
        // 이미 게임 오버 처리 중이면 중복 실행 방지
        if (!this.gameState.isPlaying) {
            return;
        }
        
        console.log('💀 게임 오버');
        
        this.gameState.isPlaying = false;
        this.gameState.gameStarted = false;
        
        // 게임 오버 화면 표시
        setTimeout(() => {
            this.showGameOverScreen();
        }, 500);
    }
    
    /**
     * 다음 레벨로 진행
     */
    nextLevel() {
        const nextLevelNumber = this.gameState.level + 1;
        
        if (nextLevelNumber <= this.levels.length) {
            this.loadLevel(nextLevelNumber);
        } else {
            // 게임 클리어
            this.onGameComplete();
        }
    }
    
    /**
     * 게임 완료 처리
     */
    onGameComplete() {
        console.log('🏆 게임 완료!');
        
        this.gameState.isPlaying = false;
        
        // 게임 완료 화면 표시
        this.showGameCompleteScreen();
    }
    
    /**
     * 충돌 효과 생성
     */
    createCollisionEffect(position) {
        // 간단한 파티클 효과
        if (this.particleSystems.explosion) {
            this.particleSystems.explosion.position.copy(position);
            this.scene.add(this.particleSystems.explosion);
            
            setTimeout(() => {
                this.scene.remove(this.particleSystems.explosion);
            }, 1000);
        }
    }
    
    /**
     * 골 효과 생성
     */
    createGoalEffect() {
        // 골 파티클 효과 강화
        if (this.particleSystems.goal) {
            this.particleSystems.goal.material.opacity = 1;
            
            setTimeout(() => {
                if (this.particleSystems.goal) {
                    this.particleSystems.goal.material.opacity = 0.8;
                }
            }, 1000);
        }
    }
    
    /**
     * 수집 효과 생성
     */
    createCollectEffect(position) {
        // 수집 파티클 효과
        if (this.particleSystems.collect) {
            this.particleSystems.collect.position.copy(position);
            this.scene.add(this.particleSystems.collect);
            
            setTimeout(() => {
                this.scene.remove(this.particleSystems.collect);
            }, 500);
        }
    }
    
    /**
     * 폭발 효과 생성
     */
    createExplosionEffect(position) {
        // 폭발 파티클 효과
        if (this.particleSystems.explosion) {
            this.particleSystems.explosion.position.copy(position);
            this.scene.add(this.particleSystems.explosion);
            
            setTimeout(() => {
                this.scene.remove(this.particleSystems.explosion);
            }, 1500);
        }
    }
    
    /**
     * UI 업데이트
     */
    updateUI() {
        // 점수 업데이트 (정수로 표시)
        const scoreElement = document.getElementById('scoreValue');
        if (scoreElement) {
            scoreElement.textContent = Math.floor(this.gameState.score);
        }
        
        // 레벨 업데이트
        const levelElement = document.getElementById('levelValue');
        if (levelElement) {
            levelElement.textContent = this.gameState.level;
        }
        
        // 시간 업데이트 (정수로 표시)
        const timeElement = document.getElementById('timeValue');
        if (timeElement) {
            timeElement.textContent = Math.floor(this.gameState.time);
        }
        
        // 체력 업데이트
        const healthElement = document.getElementById('healthValue');
        if (healthElement) {
            healthElement.textContent = this.gameState.health;
        }
        
        // 목적지까지의 거리 업데이트 (소수점 한 자리)
        const distanceElement = document.getElementById('distanceValue');
        if (distanceElement && this.ball && this.goal) {
            const distance = this.ball.position.distanceTo(this.goal.position);
            distanceElement.textContent = distance.toFixed(1);
        }
        
        // 센서 상태 업데이트
        const sensorStatusElement = document.getElementById('sensorStatus');
        if (sensorStatusElement) {
            if (this.sensorData && (this.sensorData.orientation || this.sensorData.accelerometer)) {
                sensorStatusElement.className = 'ui-element sensor-status connected';
                sensorStatusElement.innerHTML = '<span>📱</span><span>센서 연결됨</span>';
            } else {
                sensorStatusElement.className = 'ui-element sensor-status disconnected';
                sensorStatusElement.innerHTML = '<span>⌨️</span><span>키보드 모드</span>';
            }
        }
    }
    
    /**
     * 로딩 화면 표시/숨기기
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
     * 게임 오버 화면 표시
     */
    showGameOverScreen() {
        alert(`게임 오버!\n최종 점수: ${this.gameState.score}\n레벨: ${this.gameState.level}`);
    }
    
    /**
     * 게임 완료 화면 표시
     */
    showGameCompleteScreen() {
        alert(`축하합니다! 게임 완료!\n최종 점수: ${this.gameState.score}\n모든 레벨을 클리어했습니다!`);
    }
    
    /**
     * 에러 메시지 표시
     */
    showError(message) {
        alert('오류: ' + message);
    }
    
    /**
     * 윈도우 리사이즈 처리
     */
    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        
        const containerWidth = Math.min(800, window.innerWidth - 40);
        const containerHeight = Math.min(600, window.innerHeight - 200);
        
        this.camera.aspect = containerWidth / containerHeight;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(containerWidth, containerHeight);
    }
    
    /**
     * 게임 재시작 (public API)
     */
    restart() {
        console.log('🔄 게임 재시작');
        
        // 게임 상태 초기화
        this.gameState = {
            score: 0,
            level: 1,
            health: 3,
            maxHealth: 3,
            time: 0,
            isPlaying: true,
            isPaused: false,
            gameStarted: true
        };
        
        // 플래그 초기화
        this.isProcessingBallLoss = false;
        
        // 첫 번째 레벨 로드
        this.loadLevel(1);
    }
    
    /**
     * 일시정지 토글 (public API)
     */
    togglePause() {
        this.gameState.isPaused = !this.gameState.isPaused;
        console.log(this.gameState.isPaused ? '⏸️ 일시정지' : '▶️ 게임 재개');
    }
    
    /**
     * 센서 보정 (public API)
     */
    calibrate() {
        if (this.calibrateSensors) {
            this.calibrateSensors();
        }
        console.log('🎯 센서 보정 완료');
    }
    
    /**
     * 카메라 모드 전환 (public API)
     */
    toggleCamera() {
        const modes = ['follow', 'overhead', 'free'];
        const currentIndex = modes.indexOf(this.cameraMode);
        this.cameraMode = modes[(currentIndex + 1) % modes.length];
        console.log('📷 카메라 모드:', this.cameraMode);
    }
    
    /**
     * 센서 데이터 수신 (SDK에서 호출)
     */
    onSensorData(data) {
        super.onSensorData(data);
        // 추가적인 센서 데이터 처리가 필요한 경우 여기에 구현
    }
    
    /**
     * 세션 종료 (SDK에서 호출)
     */
    onSessionEnd() {
        super.onSessionEnd();
        this.gameState.isPlaying = false;
        this.gameState.gameStarted = false;
        console.log('🔚 게임 세션 종료');
    }
}

// 게임 인스턴스 생성 및 전역 등록
window.game = new BallBalanceAdventure();