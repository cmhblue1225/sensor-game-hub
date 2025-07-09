/**
 * 3D 볼 밸런스 어드벤처 - 상용 품질 센서 게임
 * Three.js + Cannon.js 물리 엔진 활용
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
        this.goal = null;
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
            this.showErrorMessage('게임을 로드할 수 없습니다.');
        }
    }
    
    /**
     * 라이브러리 로딩 대기
     */
    async waitForLibraries() {
        const maxAttempts = 50; // 5초 대기
        let attempts = 0;
        
        console.log('🔄 라이브러리 로딩 대기 중...');
        
        while (attempts < maxAttempts) {
            const threeLoaded = typeof THREE !== 'undefined';
            const cannonLoaded = typeof CANNON !== 'undefined';
            
            console.log(`📚 THREE.js: ${threeLoaded ? '✅' : '❌'}, CANNON.js: ${cannonLoaded ? '✅' : '❌'}`);
            
            if (threeLoaded && cannonLoaded) {
                console.log('✅ 필수 라이브러리 로딩 완료');
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        // 최종 확인
        if (typeof THREE === 'undefined') {
            throw new Error('THREE.js 라이브러리 로딩 실패 - CDN 연결을 확인하세요');
        }
        
        if (typeof CANNON === 'undefined') {
            console.warn('⚠️ CANNON.js 라이브러리 로딩 실패 - 간단한 물리 시뮬레이션 사용');
            // CANNON.js 없이도 게임 진행 가능
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
            throw new Error('CANNON.js 물리 엔진이 로드되지 않았습니다.');
        }
        // 캔버스 설정
        this.canvas = document.getElementById('gameCanvas');
        
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
        this.renderer.setSize(800, 600);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        // 물리 세계 초기화
        if (typeof CANNON !== 'undefined') {
            this.world = new CANNON.World();
            this.world.gravity.set(0, -20, 0);
            this.world.broadphase = new CANNON.NaiveBroadphase();
            this.world.solver.iterations = 10;
            this.physicsEnabled = true;
            console.log('✅ CANNON.js 물리 엔진 활성화');
        } else {
            console.warn('⚠️ CANNON.js 없음, 간단한 물리 시뮬레이션으로 대체');
            this.world = null;
            this.physicsEnabled = false;
        }
        
        // 머티리얼 설정
        this.setupMaterials();
        
        // 조명 설정
        this.setupLighting();
        
        // 환경 설정
        this.setupEnvironment();
        
        // 파티클 시스템 초기화
        this.initializeParticles();
        
        // 반응형 캔버스 설정
        this.setupResponsiveCanvas();
    }
    
    /**
     * 머티리얼 설정
     */
    setupMaterials() {
        // 물리 머티리얼 (CANNON.js 사용 시)
        if (this.physicsEnabled && typeof CANNON !== 'undefined') {
            this.ballMaterial = new CANNON.Material("ball");
            this.platformMaterial = new CANNON.Material("platform");
            this.goalMaterial = new CANNON.Material("goal");
            
            // 머티리얼 간 상호작용 정의
            const ballPlatformContact = new CANNON.ContactMaterial(
                this.ballMaterial,
                this.platformMaterial,
                {
                    friction: 0.3,
                    restitution: 0.4
                }
            );
            
            const ballGoalContact = new CANNON.ContactMaterial(
                this.ballMaterial,
                this.goalMaterial,
                {
                    friction: 0.1,
                    restitution: 0.8
                }
            );
            
            this.world.addContactMaterial(ballPlatformContact);
            this.world.addContactMaterial(ballGoalContact);
        } else {
            // 간단한 물리 시뮬레이션을 위한 설정
            this.ballVelocity = new THREE.Vector3(0, 0, 0);
            this.ballPosition = new THREE.Vector3(0, 2, 0);
            this.gravity = -9.8;
            this.friction = 0.95;
            this.bounce = 0.6;
        }
        
        // Three.js 머티리얼
        this.materials = {
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
                opacity: 0.8
            }),
            obstacle: new THREE.MeshLambertMaterial({
                color: 0x8e44ad,
                transparent: true,
                opacity: 0.7
            }),
            collectible: new THREE.MeshPhysicalMaterial({
                color: 0xf1c40f,
                emissive: 0x332200,
                metalness: 0.8,
                roughness: 0.2
            })
        };
    }
    
    /**
     * 조명 설정
     */
    setupLighting() {
        // 주변광
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        // 주 방향광 (그림자 포함)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        directionalLight.shadow.bias = -0.0001;
        this.scene.add(directionalLight);
        
        // 보조 조명들
        const light1 = new THREE.PointLight(0x667eea, 0.5, 30);
        light1.position.set(-10, 5, -10);
        this.scene.add(light1);
        
        const light2 = new THREE.PointLight(0xff6b6b, 0.3, 25);
        light2.position.set(10, 5, 10);
        this.scene.add(light2);
        
        // 스포트라이트 (볼 추적)
        this.ballSpotlight = new THREE.SpotLight(0xffffff, 0.8);
        this.ballSpotlight.position.set(0, 15, 0);
        this.ballSpotlight.angle = Math.PI / 6;
        this.ballSpotlight.penumbra = 0.3;
        this.ballSpotlight.decay = 2;
        this.ballSpotlight.distance = 30;
        this.ballSpotlight.castShadow = true;
        this.scene.add(this.ballSpotlight);
    }
    
    /**
     * 환경 설정
     */
    setupEnvironment() {
        // 스카이박스
        const loader = new THREE.CubeTextureLoader();
        const skyboxTexture = this.createProceduralSkybox();
        this.scene.background = skyboxTexture;
        
        // 바닥 (무한 평면)
        const floorGeometry = new THREE.PlaneGeometry(200, 200);
        const floorMaterial = new THREE.MeshLambertMaterial({
            color: 0x0f1419,
            transparent: true,
            opacity: 0.5
        });
        this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.position.y = -10;
        this.floor.receiveShadow = true;
        this.scene.add(this.floor);
        
        // 환경 반사용 큐브맵 설정
        this.materials.ball.envMap = skyboxTexture;
    }
    
    /**
     * 절차적 스카이박스 생성
     */
    createProceduralSkybox() {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // 그라데이션 배경
        const gradient = ctx.createLinearGradient(0, 0, 0, size);
        gradient.addColorStop(0, '#000428');
        gradient.addColorStop(0.5, '#004e92');
        gradient.addColorStop(1, '#000428');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        
        // 별 추가
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const radius = Math.random() * 2;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        
        // 6면 모두 같은 텍스처 사용
        return new THREE.CubeTexture([
            texture.image, texture.image, texture.image,
            texture.image, texture.image, texture.image
        ]);
    }
    
    /**
     * 파티클 시스템 초기화
     */
    initializeParticles() {
        // 볼 궤적 파티클
        this.particleSystems.trail = this.createTrailSystem();
        
        // 목표 지점 파티클
        this.particleSystems.goal = this.createGoalParticles();
        
        // 수집 아이템 파티클
        this.particleSystems.collect = this.createCollectParticles();
        
        // 폭발 효과 파티클
        this.particleSystems.explosion = this.createExplosionParticles();
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
     * 수집 아이템 파티클
     */
    createCollectParticles() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(30 * 3);
        const colors = new Float32Array(30 * 3);
        
        for (let i = 0; i < 30; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 10;
            positions[i * 3 + 1] = Math.random() * 5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
            
            colors[i * 3] = 1.0;     // R
            colors[i * 3 + 1] = 0.8; // G
            colors[i * 3 + 2] = 0.0; // B
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.3,
            vertexColors: true,
            transparent: true,
            opacity: 0.7
        });
        
        return new THREE.Points(geometry, material);
    }
    
    /**
     * 폭발 효과 파티클
     */
    createExplosionParticles() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(50 * 3);
        const velocities = new Float32Array(50 * 3);
        const colors = new Float32Array(50 * 3);
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.4,
            vertexColors: true,
            transparent: true,
            opacity: 0.9
        });
        
        const explosion = new THREE.Points(geometry, material);
        explosion.visible = false;
        this.scene.add(explosion);
        
        return {
            object: explosion,
            positions: positions,
            velocities: velocities,
            colors: colors,
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
            
            // 사운드 생성 (절차적 오디오)
            this.sounds = {
                ballRoll: this.createRollSound(),
                ballBounce: this.createBounceSound(),
                collect: this.createCollectSound(),
                goal: this.createGoalSound(),
                fall: this.createFallSound(),
                levelComplete: this.createLevelCompleteSound()
            };
            
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
                    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1.0);
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    oscillator.start(this.audioContext.currentTime + index * 0.1);
                    oscillator.stop(this.audioContext.currentTime + 1.0 + index * 0.1);
                });
            }
        };
    }
    
    /**
     * 추락 사운드 생성
     */
    createFallSound() {
        return {
            play: (volume = 0.4) => {
                if (!this.audioContext) return;
                
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 1.0);
                
                gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1.0);
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 1.0);
            }
        };
    }
    
    /**
     * 레벨 완료 사운드 생성
     */
    createLevelCompleteSound() {
        return {
            play: (volume = 0.6) => {
                if (!this.audioContext) return;
                
                // 승리 멜로디
                const melody = [
                    { freq: 261.63, duration: 0.2 }, // C
                    { freq: 329.63, duration: 0.2 }, // E
                    { freq: 392.00, duration: 0.2 }, // G
                    { freq: 523.25, duration: 0.4 }  // C (높은음)
                ];
                
                let time = this.audioContext.currentTime;
                
                melody.forEach((note) => {
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(note.freq, time);
                    
                    gainNode.gain.setValueAtTime(volume * 0.4, time);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, time + note.duration);
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(this.audioContext.destination);
                    
                    oscillator.start(time);
                    oscillator.stop(time + note.duration);
                    
                    time += note.duration;
                });
            }
        };
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
                ballStart: { x: -8, y: 2, z: -8 },
                goalPosition: { x: 8, y: 1.5, z: 8 },
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
            this.world.remove(obstacle.body);
        });
        this.obstacles = [];
        
        // 구멍 제거
        this.holes.forEach(hole => {
            this.scene.remove(hole.mesh);
        });
        this.holes = [];
        
        // 수집 아이템 제거
        this.collectibles.forEach(collectible => {
            this.scene.remove(collectible.mesh);
            this.world.remove(collectible.body);
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
        this.platform = new THREE.Mesh(geometry, this.materials.platform);
        this.platform.position.set(0, 0, 0);
        this.platform.receiveShadow = true;
        this.scene.add(this.platform);
        
        // 물리 바디
        const shape = new CANNON.Box(new CANNON.Vec3(size.width/2, size.height/2, size.depth/2));
        this.platformBody = new CANNON.Body({ mass: 0, material: this.platformMaterial });
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
        this.ball = new THREE.Mesh(geometry, this.materials.ball);
        this.ball.position.set(startPos.x, startPos.y, startPos.z);
        this.ball.castShadow = true;
        this.scene.add(this.ball);
        
        // 물리 바디 (CANNON.js 사용 시)
        if (this.physicsEnabled && typeof CANNON !== 'undefined') {
            const shape = new CANNON.Sphere(0.5);
            this.ballBody = new CANNON.Body({ mass: 1, material: this.ballMaterial });
            this.ballBody.addShape(shape);
            this.ballBody.position.set(startPos.x, startPos.y, startPos.z);
            this.ballBody.linearDamping = 0.1;
            this.ballBody.angularDamping = 0.1;
            this.world.add(this.ballBody);
        } else {
            // 간단한 물리 시뮬레이션
            this.ballPosition.set(startPos.x, startPos.y, startPos.z);
            this.ballVelocity.set(0, 0, 0);
            this.ballBody = null;
        }
        
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
            if (velocity > 5) {
                this.sounds.ballBounce.play(Math.min(velocity / 10, 0.5));
            }
        });
    }
    
    /**
     * 목표 지점 생성
     */
    createGoal(goalPos) {
        // Three.js 메시
        const geometry = new THREE.CylinderGeometry(1.5, 1.5, 0.5, 32);
        this.goal = new THREE.Mesh(geometry, this.materials.goal);
        this.goal.position.set(goalPos.x, goalPos.y, goalPos.z);
        this.scene.add(this.goal);
        
        // 물리 바디 (센서로 설정)
        const shape = new CANNON.Cylinder(1.5, 1.5, 0.5, 8);
        this.goalBody = new CANNON.Body({ mass: 0, material: this.goalMaterial });
        this.goalBody.addShape(shape);
        this.goalBody.position.set(goalPos.x, goalPos.y, goalPos.z);
        this.goalBody.isTrigger = true;
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
        const mesh = new THREE.Mesh(geometry, this.materials.obstacle);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        
        // 물리 바디
        const shape = new CANNON.Box(new CANNON.Vec3(width/2, height/2, depth/2));
        const body = new CANNON.Body({ mass: 0, material: this.platformMaterial });
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
        const mesh = new THREE.Mesh(geometry, this.materials.collectible);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        this.scene.add(mesh);
        
        // 물리 바디 (센서로 설정)
        const shape = new CANNON.Sphere(0.3);
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(shape);
        body.position.set(x, y, z);
        body.isTrigger = true;
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
        
        const tiltSensitivity = 8.0;
        const maxTiltForce = 15.0;
        
        // 기울기 기반 중력 시뮬레이션
        if (gameInput.tilt) {
            const forceX = Math.max(-maxTiltForce, Math.min(maxTiltForce, gameInput.tilt.x * tiltSensitivity));
            const forceZ = Math.max(-maxTiltForce, Math.min(maxTiltForce, gameInput.tilt.y * tiltSensitivity));
            
            if (this.ballBody) {
                // CANNON.js 물리 엔진 사용
                this.ballBody.force.x += forceX;
                this.ballBody.force.z += forceZ;
            } else {
                // 간단한 물리 시뮬레이션
                this.ballVelocity.x += forceX * this.deltaTime * 0.1;
                this.ballVelocity.z += forceZ * this.deltaTime * 0.1;
            }
            
            // 볼 굴리는 사운드 재생
            const velocity = this.ballBody ? this.ballBody.velocity.length() : this.ballVelocity.length();
            if (velocity > 1 && Math.random() < 0.1) {
                this.sounds.ballRoll.play(Math.min(velocity / 20, 0.2));
            }
        }
        
        // 흔들기 기반 점프
        if (gameInput.shake && gameInput.shake.detected && gameInput.shake.intensity > 15) {
            if (this.ballBody) {
                this.ballBody.velocity.y += 5;
            } else {
                this.ballVelocity.y += 5;
            }
            this.sounds.ballBounce.play(0.3);
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
                    this.ballBody.velocity.y += 5;
                    this.sounds.ballBounce.play(0.3);
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
        
        // 키보드 입력을 센서 입력으로 처리
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
        if (!this.ballBody || !this.gameState.isPlaying) return;
        
        // 키보드 입력 처리
        this.handleKeyboardInput();
        
        // 물리 시뮬레이션 업데이트
        if (this.physicsEnabled && this.world) {
            this.world.step(1/60);
            // Three.js 오브젝트를 물리 바디에 동기화
            this.syncPhysicsToVisuals();
        } else {
            // 간단한 물리 시뮬레이션
            this.updateSimplePhysics();
        }
        
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
    }
    
    /**
     * 간단한 물리 시뮬레이션 (CANNON.js 없이)
     */
    updateSimplePhysics() {
        if (!this.ball || !this.ballPosition) return;
        
        // 중력 적용
        this.ballVelocity.y += this.gravity * this.deltaTime;
        
        // 속도로 위치 업데이트
        this.ballPosition.add(this.ballVelocity.clone().multiplyScalar(this.deltaTime));
        
        // 플랫폼 충돌 감지 (간단한 Y축 체크)
        if (this.ballPosition.y <= 0.5) {
            this.ballPosition.y = 0.5;
            this.ballVelocity.y *= -this.bounce;
            
            // 마찰 적용
            this.ballVelocity.x *= this.friction;
            this.ballVelocity.z *= this.friction;
        }
        
        // 시각적 오브젝트 위치 동기화
        this.ball.position.copy(this.ballPosition);
        
        // 회전 효과 (굴리기 시뮬레이션)
        this.ball.rotation.x += this.ballVelocity.z * this.deltaTime;
        this.ball.rotation.z -= this.ballVelocity.x * this.deltaTime;
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
        
        const ballPosition = this.ball.position;
        
        switch (this.cameraMode) {
            case 'follow':
                // 볼을 따라가는 카메라
                this.cameraTarget.copy(ballPosition);
                this.camera.position.lerp(
                    ballPosition.clone().add(this.cameraOffset),
                    0.05
                );
                this.camera.lookAt(this.cameraTarget);
                
                // 스포트라이트도 볼을 따라감
                if (this.ballSpotlight) {
                    this.ballSpotlight.target.position.copy(ballPosition);
                    this.ballSpotlight.position.set(
                        ballPosition.x,
                        ballPosition.y + 15,
                        ballPosition.z
                    );
                }
                break;
                
            case 'overhead':
                // 상공에서 내려다보는 시점
                this.camera.position.set(ballPosition.x, 20, ballPosition.z + 5);
                this.camera.lookAt(ballPosition);
                break;
                
            case 'free':
                // 자유 시점 (현재 위치 유지)
                break;
        }
    }
    
    /**
     * 파티클 시스템 업데이트
     */
    updateParticles() {
        // 볼 궤적 파티클 업데이트
        if (this.ball && this.particleSystems.trail) {
            const trail = this.particleSystems.trail;
            const ballPos = this.ball.position;
            
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
        const time = this.clock.getElapsedTime();
        
        // 수집 아이템 회전
        this.collectibles.forEach(collectible => {
            if (!collectible.collected) {
                collectible.mesh.rotation.y += collectible.rotationSpeed;
                collectible.mesh.position.y = collectible.body.position.y + Math.sin(time * 2 + collectible.mesh.position.x) * 0.2;
            }
        });
        
        // 목표 지점 애니메이션
        if (this.goal) {
            this.goal.rotation.y += 0.01;
            const pulseScale = 1 + Math.sin(time * 3) * 0.1;
            this.goal.scale.set(pulseScale, 1, pulseScale);
        }
        
        // 장애물 미세 애니메이션
        this.obstacles.forEach((obstacle, index) => {
            const offset = index * 0.5;
            obstacle.mesh.rotation.y = Math.sin(time * 0.5 + offset) * 0.02;
        });
    }
    
    /**
     * 렌더링 (필수 메서드)
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
        // 점수 업데이트
        const scoreElement = document.getElementById('scoreValue');
        if (scoreElement) {
            scoreElement.textContent = this.gameState.score;
        }
        
        // 레벨 업데이트
        const levelElement = document.getElementById('levelValue');
        if (levelElement) {
            levelElement.textContent = this.gameState.level;
        }
        
        // 시간 업데이트
        const timeElement = document.getElementById('timeValue');
        if (timeElement) {
            timeElement.textContent = Math.floor(this.gameState.time);
        }
        
        // 체력 업데이트
        const healthElement = document.getElementById('healthValue');
        if (healthElement) {
            healthElement.textContent = this.gameState.health;
        }
    }
    
    /**
     * 센서 상태 업데이트 (필수 메서드)
     */
    updateSensorStatus(isConnected) {
        this.sensorConnected = isConnected;
        const statusElement = document.getElementById('sensorStatus');
        
        if (statusElement) {
            if (isConnected) {
                statusElement.innerHTML = '<span>📱</span><span>센서 연결됨</span>';
                statusElement.className = 'ui-element sensor-status connected';
            } else {
                statusElement.innerHTML = '<span>⌨️</span><span>시뮬레이션 모드 (WASD/화살표)</span>';
                statusElement.className = 'ui-element sensor-status disconnected';
            }
        }
    }
    
    /**
     * 레벨 완료
     */
    completeLevel() {
        this.gameState.isPlaying = false;
        
        // 점수 계산
        const timeBonus = Math.max(0, this.currentLevelData.par - this.gameState.time) * 10;
        const healthBonus = this.gameState.health * 50;
        const levelBonus = this.gameState.level * 100;
        const totalBonus = Math.floor(timeBonus + healthBonus + levelBonus);
        
        this.gameState.score += totalBonus;
        
        // 사운드 재생
        this.sounds.levelComplete.play();
        
        // 축하 메시지
        setTimeout(() => {
            if (this.gameState.level < this.levels.length) {
                const proceed = confirm(`🎉 레벨 ${this.gameState.level} 완료!\n\n보너스 점수: ${totalBonus}\n총 점수: ${this.gameState.score}\n\n다음 레벨로 진행하시겠습니까?`);
                if (proceed) {
                    this.nextLevel();
                } else {
                    this.restart();
                }
            } else {
                alert(`🏆 축하합니다! 모든 레벨을 완료했습니다!\n\n최종 점수: ${this.gameState.score}\n\n정말 훌륭한 플레이였습니다!`);
                this.restart();
            }
        }, 1000);
    }
    
    /**
     * 구멍에 빠짐
     */
    fallIntoHole() {
        this.gameState.health--;
        this.sounds.fall.play();
        this.createExplosion(this.ball.position);
        
        if (this.gameState.health <= 0) {
            this.gameOver();
        } else {
            this.respawnBall();
        }
    }
    
    /**
     * 플랫폼에서 추락
     */
    fallOffPlatform() {
        this.gameState.health--;
        this.sounds.fall.play();
        this.createExplosion(this.ball.position);
        
        if (this.gameState.health <= 0) {
            this.gameOver();
        } else {
            this.respawnBall();
        }
    }
    
    /**
     * 아이템 수집
     */
    collectItem(index) {
        const collectible = this.collectibles[index];
        if (collectible.collected) return;
        
        collectible.collected = true;
        this.gameState.score += collectible.value;
        
        // 사운드 재생
        this.sounds.collect.play();
        
        // 시각적 효과
        this.scene.remove(collectible.mesh);
        this.world.remove(collectible.body);
        
        // 파티클 효과
        this.createCollectEffect(collectible.mesh.position);
    }
    
    /**
     * 수집 효과 생성
     */
    createCollectEffect(position) {
        const collectParticles = this.particleSystems.collect.clone();
        collectParticles.position.copy(position);
        this.scene.add(collectParticles);
        
        // 3초 후 제거
        setTimeout(() => {
            this.scene.remove(collectParticles);
        }, 3000);
    }
    
    /**
     * 폭발 효과 생성
     */
    createExplosion(position) {
        const explosion = this.particleSystems.explosion;
        
        // 파티클 위치 및 속도 초기화
        for (let i = 0; i < 50; i++) {
            explosion.positions[i * 3] = position.x;
            explosion.positions[i * 3 + 1] = position.y;
            explosion.positions[i * 3 + 2] = position.z;
            
            explosion.velocities[i * 3] = (Math.random() - 0.5) * 20;
            explosion.velocities[i * 3 + 1] = Math.random() * 15 + 5;
            explosion.velocities[i * 3 + 2] = (Math.random() - 0.5) * 20;
            
            explosion.colors[i * 3] = 1.0;     // R
            explosion.colors[i * 3 + 1] = Math.random() * 0.5; // G
            explosion.colors[i * 3 + 2] = 0.0; // B
        }
        
        explosion.object.geometry.attributes.position.needsUpdate = true;
        explosion.object.geometry.attributes.color.needsUpdate = true;
        explosion.object.visible = true;
        explosion.active = true;
        explosion.timer = 0;
    }
    
    /**
     * 볼 리스폰
     */
    respawnBall() {
        if (!this.currentLevelData || !this.ballBody) return;
        
        const startPos = this.currentLevelData.ballStart;
        
        // 물리 바디 위치 및 속도 초기화
        this.ballBody.position.set(startPos.x, startPos.y, startPos.z);
        this.ballBody.velocity.set(0, 0, 0);
        this.ballBody.angularVelocity.set(0, 0, 0);
        
        // 시각적 피드백
        setTimeout(() => {
            this.gameState.isPlaying = true;
        }, 1000);
    }
    
    /**
     * 시간 초과
     */
    timeUp() {
        this.gameState.isPlaying = false;
        alert('⏰ 시간 초과! 다시 도전해보세요.');
        this.restart();
    }
    
    /**
     * 게임 오버
     */
    gameOver() {
        this.gameState.isPlaying = false;
        
        setTimeout(() => {
            const retry = confirm(`💀 게임 오버!\n\n점수: ${this.gameState.score}\n레벨: ${this.gameState.level}\n\n다시 시도하시겠습니까?`);
            if (retry) {
                this.restart();
            }
        }, 1000);
    }
    
    /**
     * 게임 재시작 (권장 메서드)
     */
    restart() {
        this.gameState.score = 0;
        this.gameState.level = 1;
        this.gameState.health = this.gameState.maxHealth;
        this.gameState.time = 0;
        this.gameState.isPlaying = true;
        this.gameState.isPaused = false;
        
        this.loadLevel(1);
        this.updateUI();
    }
    
    /**
     * 다음 레벨
     */
    nextLevel() {
        if (this.gameState.level < this.levels.length) {
            this.gameState.level++;
            this.gameState.health = this.gameState.maxHealth;
            this.gameState.time = 0;
            this.loadLevel(this.gameState.level);
        } else {
            alert('🏆 모든 레벨을 완료했습니다!');
            this.restart();
        }
    }
    
    /**
     * 일시정지 토글
     */
    togglePause() {
        this.gameState.isPaused = !this.gameState.isPaused;
        
        const button = event.target;
        if (this.gameState.isPaused) {
            button.textContent = '▶️ 계속하기';
        } else {
            button.textContent = '⏸️ 일시정지';
        }
    }
    
    /**
     * 카메라 모드 전환
     */
    toggleCamera() {
        const modes = ['follow', 'overhead', 'free'];
        const currentIndex = modes.indexOf(this.cameraMode);
        this.cameraMode = modes[(currentIndex + 1) % modes.length];
        
        const modeNames = {
            'follow': '추적 모드',
            'overhead': '상공 모드',
            'free': '자유 모드'
        };
        
        console.log(`카메라 모드: ${modeNames[this.cameraMode]}`);
    }
    
    /**
     * 카메라 리셋
     */
    resetCamera() {
        this.cameraMode = 'follow';
        this.cameraOffset.set(0, 8, 8);
        
        if (this.ball) {
            this.camera.position.copy(this.ball.position).add(this.cameraOffset);
            this.camera.lookAt(this.ball.position);
        }
    }
    
    /**
     * 센서 보정
     */
    calibrate() {
        if (this.sensorConnected) {
            // SDK의 보정 기능 호출
            this.calibrateSensors();
            alert('📱 센서가 보정되었습니다.');
        } else {
            alert('⌨️ 키보드 모드에서는 보정이 불필요합니다.');
        }
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
        if (!this.canvas || !this.renderer || !this.camera) return;
        
        const container = this.canvas.parentElement;
        const maxWidth = Math.min(window.innerWidth - 40, 1200);
        const maxHeight = Math.min(window.innerHeight - 300, 800);
        
        // 4:3 비율 유지
        const aspectRatio = 4/3;
        let width = maxWidth;
        let height = width / aspectRatio;
        
        if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
        }
        
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        
        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }
    
    /**
     * 로딩 스크린 표시/숨김
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
     * 에러 메시지 표시
     */
    showErrorMessage(message) {
        alert(`❌ 오류: ${message}`);
        this.showLoadingScreen(false);
    }
}

// 게임 인스턴스 생성 (필수)
document.addEventListener('DOMContentLoaded', () => {
    // 약간의 지연을 두어 스크립트 로딩을 확실히 대기
    setTimeout(() => {
        console.log('🎮 게임 인스턴스 생성 시작');
        window.game = new BallBalanceAdventure();
    }, 500);
});