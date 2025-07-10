/**
 * Rhythm Blade - A 3D Web-based Rhythm Game
 * Sensor Game Hub v2.0 Compatible
 * Utilizes three.js for 3D rendering.
 */

class RhythmBlade extends SensorGameSDK {
    constructor() {
        super({
            gameId: 'rhythm-blade',
            gameName: 'Rhythm Blade',
            requestedSensors: ['gyroscope', 'accelerometer'],
            sensorSensitivity: {
                gyroscope: 1.0, // 감도를 낮춤 (더 강한 움직임 필요)
                accelerometer: 1.0,
            },
            smoothingFactor: 2, // Adjusted to a valid range (1-10)
            deadzone: 0.2
        });

        this.initializeGame();
        this.setupEventListeners();
    }

    initializeGame() {
        console.log('🎮 Rhythm Blade 3D 초기화 시작');

        // Game state
        this.gameState = {
            score: 0,
            combo: 0,
            isPlaying: false,
            startTime: 0,
            totalNotes: 0,     // 총 노트 수
            missedNotes: 0,    // 놓친 노트 수
            notesProcessed: 0, // 처리된 노트 수 (친 노트 + 놓친 노트)
            gaugePercent: 100  // 게이지 퍼센트
        };

        // Game settings from editor
        this.settings = {
            cubeSpeed: 10,
            spawnDistance: 100,
            noteSequence: []
        };

        // Scene setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 5;
        this.camera.position.y = 1.5;

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // UI Elements
        this.editorContainer = document.getElementById('editor-container');
        this.showEditorBtn = document.getElementById('show-editor-btn');
        this.gaugeBar = document.getElementById('gauge-bar');
        this.gameOverModal = document.getElementById('game-over-modal');
        this.gameOverTitle = document.getElementById('game-over-title');
        this.finalScore = document.getElementById('final-score');
        this.restartGameBtn = document.getElementById('restart-btn');

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(0, 1, 1);
        this.scene.add(directionalLight);

        // Player Sabers
        this.sabers = {
            left: this.createSaber(0xff0000, -1.5), // Red for left
            right: this.createSaber(0x0000ff, 1.5)  // Blue for right
        };
        this.scene.add(this.sabers.left);
        this.scene.add(this.sabers.right);

        this.notes = [];
        this.noteSpawnIndex = 0;
        this.particleEffects = [];

        this.on('onSensorData', (gameInput) => this.handleSensorInput(gameInput));
        this.on('onSensorStatusChange', (status) => this.updateSensorStatus(status.connected));

        this.gameLoop();
    }

    createSaber(color, xPosition) {
        const saberGroup = new THREE.Group();
        
        // Hilt
        const hiltGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 16);
        const hiltMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const hilt = new THREE.Mesh(hiltGeometry, hiltMaterial);
        hilt.position.y = -0.25;
        
        // Blade
        const bladeGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 16);
        const bladeMaterial = new THREE.MeshBasicMaterial({ color: color });
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.position.y = 0.75;

        saberGroup.add(hilt);
        saberGroup.add(blade);
        saberGroup.position.set(xPosition, 1, 2);
        saberGroup.rotation.x = THREE.MathUtils.degToRad(-20);

        saberGroup.userData = { swinging: false, swingTime: 0 };

        return saberGroup;
    }

    setupEventListeners() {
        document.getElementById('apply-settings').addEventListener('click', () => this.applySettings());
        this.showEditorBtn.addEventListener('click', () => this.showEditor());
        this.restartGameBtn.addEventListener('click', () => this.restartGame());
        window.addEventListener('resize', () => this.onWindowResize(), false);
        this.updateSensorStatus(this.sensorConnected);
    }

    showEditor() {
        this.gameState.isPlaying = false; // Pause the game
        this.editorContainer.style.display = 'block';
        this.showEditorBtn.style.display = 'none';
    }

    hideEditor() {
        this.editorContainer.style.display = 'none';
        this.showEditorBtn.style.display = 'block';
    }

    applySettings() {
        console.log("Applying new settings from editor...");
        this.settings.cubeSpeed = parseFloat(document.getElementById('cube-speed').value);
        this.settings.spawnDistance = parseFloat(document.getElementById('spawn-distance').value);
        const noteSequenceText = document.getElementById('note-sequence').value;
        try {
            this.settings.noteSequence = JSON.parse(noteSequenceText);
            this.gameState.totalNotes = this.settings.noteSequence.length; // Calculate total notes
            this.hideEditor();
            this.restartGame();
        } catch (e) {
            alert('Invalid JSON in Note Sequence. Please check the format.');
            console.error("JSON Parse Error:", e);
        }
    }

    updateGauge() {
        if (this.gameState.totalNotes === 0) {
            this.gameState.gaugePercent = 100;
        } else {
            const missedPercentage = (this.gameState.missedNotes / this.gameState.totalNotes) * 100;
            this.gameState.gaugePercent = 100 - missedPercentage;
        }
        this.gaugeBar.style.width = `${this.gameState.gaugePercent}%`;
        // Change color based on percentage
        if (this.gameState.gaugePercent > 80) {
            this.gaugeBar.style.backgroundColor = '#4CAF50'; // Green
        } else if (this.gameState.gaugePercent > 40) {
            this.gaugeBar.style.backgroundColor = '#FFC107'; // Yellow
        } else {
            this.gaugeBar.style.backgroundColor = '#F44336'; // Red
        }
    }

    restartGame() {
        this.gameState.score = 0;
        this.gameState.combo = 0;
        this.gameState.isPlaying = true;
        this.gameState.startTime = Date.now();
        this.noteSpawnIndex = 0;
        this.gameState.missedNotes = 0;
        this.gameState.notesProcessed = 0;
        this.gameState.gaugePercent = 100;

        // Clear existing notes
        this.notes.forEach(note => this.scene.remove(note));
        this.notes = [];

        // Hide game over modal if visible
        this.gameOverModal.style.display = 'none';

        console.log("Game restarted with new settings.");
        this.updateGauge(); // Update gauge to 100% on restart
    }

    handleSensorInput(gameInput) {
        console.log('Sensor Data:', gameInput); // Log sensor data
        if (!this.gameState.isPlaying) return;

        const swingThreshold = 200; // 스윙 인식 기준을 높여 둔감하게 만듦

        // Use rotation speed and direction from the SDK's processed gameInput
        const speed = gameInput.rotation.speed;
        const direction = gameInput.rotation.direction * (180 / Math.PI); // Convert radians to degrees

        if (speed > swingThreshold) {
            // Left-to-Right swing (approximated by direction)
            if (direction > -90 && direction < 90) {
                this.triggerSwing('right');
            }
            // Right-to-Left swing
            else {
                this.triggerSwing('left');
            }
        }
    }

    triggerSwing(side) {
        const saber = this.sabers[side];
        if (!saber.userData.swinging) {
            saber.userData.swinging = true;
            saber.userData.swingTime = Date.now();
            this.checkHit(side);
        }
    }

    checkHit(side) {
        const saber = this.sabers[side];
        const saberBox = new THREE.Box3().setFromObject(saber);
        let hit = false;

        for (let i = this.notes.length - 1; i >= 0; i--) {
            const note = this.notes[i];
            const noteBox = new THREE.Box3().setFromObject(note);

            if (note.userData.lane === side && saberBox.intersectsBox(noteBox)) {
                this.createHitEffect(note.position, note.material.color);
                this.scene.remove(note);
                this.notes.splice(i, 1);
                
                this.gameState.score += 100;
                this.gameState.combo++;
                this.gameState.notesProcessed++; // Increment processed notes
                hit = true;
                break; // One hit per swing
            }
        }
        if (!hit) {
            this.gameState.combo = 0;
        }
        this.updateGauge(); // Update gauge after hit or miss
    }

    createHitEffect(position, color) {
        const particleCount = 20;
        const particles = new THREE.Group();
        const particleMaterial = new THREE.MeshBasicMaterial({ color: color });

        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particle.position.copy(position);

            particle.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            );
            particle.userData.life = 1;

            particles.add(particle);
        }

        this.particleEffects.push(particles);
        this.scene.add(particles);
    }

    updateEffects() {
        for (let i = this.particleEffects.length - 1; i >= 0; i--) {
            const particleGroup = this.particleEffects[i];
            let allParticlesDead = true;

            particleGroup.children.forEach(particle => {
                if (particle.userData.life > 0) {
                    allParticlesDead = false;
                    particle.position.add(particle.userData.velocity.clone().multiplyScalar(0.1));
                    particle.userData.life -= 0.02;
                    particle.scale.setScalar(particle.userData.life);
                } else {
                    particle.visible = false;
                }
            });

            if (allParticlesDead) {
                this.scene.remove(particleGroup);
                this.particleEffects.splice(i, 1);
            }
        }
    }

    spawnNote() {
        if (this.noteSpawnIndex >= this.settings.noteSequence.length) return;

        const now = Date.now();
        const elapsedTime = (now - this.gameState.startTime) / 1000; // in seconds
        const noteData = this.settings.noteSequence[this.noteSpawnIndex];

        if (elapsedTime >= noteData.time) {
            const lane = noteData.lane;
            const color = lane === 'left' ? 0xff0000 : 0x0000ff;
            const xPosition = lane === 'left' ? -1.5 : 1.5;

            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshStandardMaterial({ color: color });
            const cube = new THREE.Mesh(geometry, material);

            cube.position.set(xPosition, 1.5, -this.settings.spawnDistance);
            cube.userData = { lane: lane };

            this.notes.push(cube);
            this.scene.add(cube);
            this.noteSpawnIndex++;
        }
    }

    update() {
        if (!this.gameState.isPlaying) return;

        const now = Date.now();
        const delta = this.settings.cubeSpeed * 0.01;

        // Update note positions
        for (let i = this.notes.length - 1; i >= 0; i--) {
            const note = this.notes[i];
            note.position.z += delta;

            if (note.position.z > this.camera.position.z + 2) {
                this.scene.remove(note);
                this.notes.splice(i, 1);
                this.gameState.combo = 0;
                this.gameState.missedNotes++; // Increment missed notes
                this.gameState.notesProcessed++; // Increment processed notes
                this.updateGauge(); // Update gauge
            }
        }

        // Check if all notes have been processed
        if (this.gameState.notesProcessed >= this.gameState.totalNotes && this.gameState.totalNotes > 0) {
            this.endGame();
        }

        // Spawn new notes
        this.spawnNote();

        // Update saber animations
        this.updateSaber(this.sabers.left, now, -1);
        this.updateSaber(this.sabers.right, now, 1);

        // Update particle effects
        this.updateEffects();
    }

    endGame() {
        this.gameState.isPlaying = false;
        this.gameOverModal.style.display = 'flex'; // Show modal

        const finalPercentage = Math.max(0, this.gameState.gaugePercent);
        this.finalScore.textContent = finalPercentage.toFixed(2);

        if (finalPercentage >= 60) {
            this.gameOverTitle.textContent = 'Game Clear!';
            this.gameOverTitle.style.color = '#00ff88';
        } else {
            this.gameOverTitle.textContent = 'Clear Failed';
            this.gameOverTitle.style.color = '#ff6b6b';
        }
    }

    updateSaber(saber, now, direction) {
        if (saber.userData.swinging) {
            const swingDuration = 200; // ms
            const timeSinceSwing = now - saber.userData.swingTime;

            if (timeSinceSwing < swingDuration) {
                const swingProgress = timeSinceSwing / swingDuration;
                const swingAngle = Math.sin(swingProgress * Math.PI) * 90 * direction;
                saber.rotation.z = THREE.MathUtils.degToRad(swingAngle);
            } else {
                saber.userData.swinging = false;
                saber.rotation.z = 0;
            }
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    gameLoop() {
        requestAnimationFrame(() => this.gameLoop());
        this.update();
        this.render();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    updateSensorStatus(isConnected) {
        // This part can be expanded to show status on the 3D screen or in the editor UI
        console.log("Sensor connected:", isConnected);
        if (!isConnected) {
            this.setupKeyboardControls();
        }
    }

    setupKeyboardControls() {
        if (this.keyboardSetup) return;
        this.keyboardSetup = true;
        document.addEventListener('keydown', (e) => {
            if (this.sensorConnected) return;
            const key = e.key.toLowerCase();
            if (key === 'q') this.triggerSwing('left');
            if (key === 'e') this.triggerSwing('right');
        });
        console.log("Keyboard controls enabled (Q for left, E for right).");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const noteSequenceTextarea = document.getElementById('note-sequence');
    const defaultBeatmap = [
        { "time": 2, "lane": "left" },
        { "time": 3, "lane": "right" },
        { "time": 4, "lane": "left" },
        { "time": 4.5, "lane": "left" },
        { "time": 5, "lane": "right" },
        { "time": 5.5, "lane": "right" },
        { "time": 6, "lane": "left" },
        { "time": 6.25, "lane": "right" },
        { "time": 6.5, "lane": "left" },
        { "time": 6.75, "lane": "right" }
    ];
    noteSequenceTextarea.value = JSON.stringify(defaultBeatmap, null, 2);

    window.game = new RhythmBlade();
    // Apply the initial settings to start the game immediately
    window.game.applySettings(); 
    window.game.hideEditor(); // Ensure editor is hidden on start
});
