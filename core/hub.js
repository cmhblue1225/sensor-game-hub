/**
 * 센서 게임 허브 v2.0 - 메인 JavaScript
 * 허브 UI 관리, 게임 목록, 센서 상태 등을 처리
 */

class SensorGameHub {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.games = new Map();
        this.currentFilter = 'all';
        this.stats = {
            totalGames: 0,
            activePlayers: 0,
            connectedSensors: 0
        };
        
        this.init();
    }
    
    /**
     * 허브 초기화
     */
    init() {
        console.log('🎮 센서 게임 허브 v2.0 초기화');
        
        // WebSocket 연결
        this.connectToServer();
        
        // 이벤트 리스너 설정
        this.setupEventListeners();
        
        // 게임 목록 로드
        this.loadGames();
        
        // 서버 상태 로드
        this.loadServerStatus();
        
        // 주기적 업데이트
        this.startPeriodicUpdates();
    }
    
    /**
     * WebSocket 서버 연결
     */
    connectToServer() {
        try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}`;
            
            this.socket = new WebSocket(wsUrl);
            
            this.socket.onopen = () => {
                this.isConnected = true;
                console.log('✅ 허브 서버 연결 성공');
                this.updateConnectionStatus(true);
                
                // 허브 클라이언트로 등록
                this.socket.send(JSON.stringify({
                    type: 'register_hub_client',
                    timestamp: Date.now()
                }));
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
                console.log('🔌 서버 연결 끊김');
                this.updateConnectionStatus(false);
                
                // 재연결 시도
                setTimeout(() => this.connectToServer(), 5000);
            };
            
            this.socket.onerror = (error) => {
                console.error('WebSocket 오류:', error);
            };
            
        } catch (error) {
            console.error('서버 연결 실패:', error);
            this.updateConnectionStatus(false);
        }
    }
    
    /**
     * 서버 메시지 처리
     */
    handleServerMessage(data) {
        switch (data.type) {
            case 'connection_established':
                console.log('서버 연결 확인:', data);
                break;
                
            case 'sensor_device_connected':
                this.stats.connectedSensors++;
                this.updateStats();
                break;
                
            case 'sensor_device_disconnected':
                this.stats.connectedSensors = Math.max(0, this.stats.connectedSensors - 1);
                this.updateStats();
                break;
                
            case 'game_client_connected':
                this.stats.activePlayers++;
                this.updateStats();
                break;
                
            case 'game_client_disconnected':
                this.stats.activePlayers = Math.max(0, this.stats.activePlayers - 1);
                this.updateStats();
                break;
                
            case 'pong':
                this.updateLatency(data);
                break;
        }
    }
    
    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 필터 버튼
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });
        
        // 모달 관련
        const modal = document.getElementById('gameModal');
        const closeModal = document.getElementById('closeModal');
        
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        
        if (modal) {
            window.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }
        
        // 키보드 단축키
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('gameModal');
                if (modal.style.display === 'block') {
                    modal.style.display = 'none';
                }
            }
        });
    }
    
    /**
     * 게임 목록 로드
     */
    async loadGames() {
        try {
            this.showLoading(true);
            
            const response = await fetch('/api/games');
            const data = await response.json();
            
            if (data.success) {
                this.games.clear();
                data.games.forEach(game => {
                    this.games.set(game.id, game);
                });
                
                this.stats.totalGames = data.total;
                this.renderGames();
                this.updateStats();
            } else {
                console.error('게임 목록 로드 실패:', data.error);
                this.showNoGames();
            }
        } catch (error) {
            console.error('게임 목록 로드 오류:', error);
            this.showNoGames();
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * 서버 상태 로드
     */
    async loadServerStatus() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            
            if (data.success) {
                this.stats.activePlayers = data.status.activeGameClients;
                this.stats.connectedSensors = data.status.activeSensorDevices;
                this.updateStats();
            }
        } catch (error) {
            console.error('서버 상태 로드 오류:', error);
        }
    }
    
    /**
     * 게임 목록 렌더링
     */
    renderGames() {
        const gamesGrid = document.getElementById('gamesGrid');
        if (!gamesGrid) return;
        
        // 필터링된 게임 목록
        const filteredGames = Array.from(this.games.values())
            .filter(game => this.currentFilter === 'all' || game.category === this.currentFilter)
            .sort((a, b) => b.playCount - a.playCount);
        
        if (filteredGames.length === 0) {
            gamesGrid.innerHTML = '';
            this.showNoGames();
            return;
        }
        
        gamesGrid.innerHTML = filteredGames.map(game => this.createGameCard(game)).join('');
        
        // 게임 카드 클릭 이벤트
        gamesGrid.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', () => {
                const gameId = card.dataset.gameId;
                this.openGame(gameId);
            });
        });
        
        this.showNoGames(false);
    }
    
    /**
     * 게임 카드 HTML 생성
     */
    createGameCard(game) {
        const difficultyColors = {
            easy: '#00ff88',
            medium: '#ffaa00',
            hard: '#ff4757'
        };
        
        return `
            <div class="game-card" data-game-id="${game.id}">
                <div class="game-header">
                    <div class="game-icon">${game.icon}</div>
                    <div class="game-info">
                        <div class="game-title">${game.name}</div>
                        <div class="game-author">by ${game.author}</div>
                    </div>
                </div>
                <div class="game-description">${game.description}</div>
                <div class="game-meta">
                    <span class="game-category">${this.getCategoryName(game.category)}</span>
                    <span class="game-difficulty" style="color: ${difficultyColors[game.difficulty] || '#808080'}">
                        ${this.getDifficultyName(game.difficulty)}
                    </span>
                </div>
                <div class="game-stats">
                    <span>플레이 ${game.playCount}회</span>
                    <span>v${game.version}</span>
                </div>
            </div>
        `;
    }
    
    /**
     * 게임 실행
     */
    openGame(gameId) {
        const game = this.games.get(gameId);
        if (!game) {
            console.error('게임을 찾을 수 없습니다:', gameId);
            return;
        }
        
        // 플레이 카운트 증가
        this.incrementPlayCount(gameId);
        
        // 새 창에서 게임 열기
        window.open(game.path, '_blank');
    }
    
    /**
     * 플레이 카운트 증가
     */
    async incrementPlayCount(gameId) {
        try {
            const response = await fetch(`/api/games/${gameId}/play`, {
                method: 'POST'
            });
            
            if (response.ok) {
                const game = this.games.get(gameId);
                if (game) {
                    game.playCount++;
                    this.renderGames(); // 업데이트된 카운트로 다시 렌더링
                }
            }
        } catch (error) {
            console.error('플레이 카운트 업데이트 오류:', error);
        }
    }
    
    /**
     * 필터 설정
     */
    setFilter(filter) {
        this.currentFilter = filter;
        
        // 필터 버튼 활성화 상태 업데이트
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        
        // 게임 목록 다시 렌더링
        this.renderGames();
    }
    
    /**
     * 연결 상태 업데이트
     */
    updateConnectionStatus(connected) {
        const statusIcon = document.getElementById('connectionStatus');
        const statusText = document.getElementById('connectionText');
        
        if (statusIcon && statusText) {
            if (connected) {
                statusIcon.textContent = '🟢';
                statusText.textContent = '서버 연결됨';
            } else {
                statusIcon.textContent = '🔴';
                statusText.textContent = '서버 연결 끊김';
            }
        }
    }
    
    /**
     * 통계 업데이트
     */
    updateStats() {
        const elements = {
            totalGames: document.getElementById('totalGames'),
            activePlayers: document.getElementById('activePlayers'),
            connectedSensors: document.getElementById('connectedSensors'),
            deviceCount: document.getElementById('deviceCount')
        };
        
        if (elements.totalGames) {
            this.animateNumber(elements.totalGames, this.stats.totalGames);
        }
        
        if (elements.activePlayers) {
            this.animateNumber(elements.activePlayers, this.stats.activePlayers);
        }
        
        if (elements.connectedSensors) {
            this.animateNumber(elements.connectedSensors, this.stats.connectedSensors);
        }
        
        if (elements.deviceCount) {
            elements.deviceCount.textContent = this.stats.connectedSensors;
        }
    }
    
    /**
     * 숫자 애니메이션
     */
    animateNumber(element, targetValue) {
        const currentValue = parseInt(element.textContent) || 0;
        const increment = Math.ceil((targetValue - currentValue) / 10);
        
        if (currentValue < targetValue) {
            element.textContent = Math.min(currentValue + increment, targetValue);
            setTimeout(() => this.animateNumber(element, targetValue), 50);
        } else if (currentValue > targetValue) {
            element.textContent = Math.max(currentValue - increment, targetValue);
            setTimeout(() => this.animateNumber(element, targetValue), 50);
        }
    }
    
    /**
     * 지연시간 업데이트
     */
    updateLatency(data) {
        const latency = Date.now() - data.timestamp;
        const latencyElement = document.getElementById('latency');
        
        if (latencyElement) {
            latencyElement.textContent = `${latency}ms`;
        }
    }
    
    /**
     * 로딩 상태 표시
     */
    showLoading(show) {
        const loading = document.getElementById('gamesLoading');
        if (loading) {
            loading.style.display = show ? 'block' : 'none';
        }
    }
    
    /**
     * 게임 없음 상태 표시
     */
    showNoGames(show = true) {
        const noGames = document.getElementById('noGames');
        if (noGames) {
            noGames.style.display = show ? 'block' : 'none';
        }
    }
    
    /**
     * 주기적 업데이트 시작
     */
    startPeriodicUpdates() {
        // 30초마다 서버 상태 업데이트
        setInterval(() => {
            this.loadServerStatus();
        }, 30000);
        
        // 5초마다 ping 전송 (지연시간 측정)
        setInterval(() => {
            if (this.isConnected && this.socket) {
                this.socket.send(JSON.stringify({
                    type: 'ping',
                    timestamp: Date.now()
                }));
            }
        }, 5000);
    }
    
    /**
     * 카테고리 이름 변환
     */
    getCategoryName(category) {
        const names = {
            puzzle: '퍼즐',
            action: '액션',
            racing: '레이싱',
            sport: '스포츠',
            casual: '캐주얼',
            arcade: '아케이드'
        };
        return names[category] || category;
    }
    
    /**
     * 난이도 이름 변환
     */
    getDifficultyName(difficulty) {
        const names = {
            easy: '쉬움',
            medium: '보통',
            hard: '어려움'
        };
        return names[difficulty] || difficulty;
    }
}

// 허브 초기화
document.addEventListener('DOMContentLoaded', () => {
    window.sensorGameHub = new SensorGameHub();
});

// 전역 함수들 (필요시 사용)
window.openGame = (gameId) => {
    if (window.sensorGameHub) {
        window.sensorGameHub.openGame(gameId);
    }
};

window.setGameFilter = (filter) => {
    if (window.sensorGameHub) {
        window.sensorGameHub.setFilter(filter);
    }
};