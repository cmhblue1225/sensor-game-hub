/**
 * 센서 게임 허브 플랫폼 서버 (HTTPS 전용)
 * 개발자들이 센서 기반 게임을 쉽게 개발하고 배포할 수 있는 통합 플랫폼
 * 모바일 센서 권한을 위해 HTTPS만 사용
 */

const express = require('express');
const WebSocket = require('ws');
const https = require('https');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { exec } = require('child_process');
const os = require('os');
const selfsigned = require('selfsigned');

// Express 앱 생성
const app = express();

// HTTPS 서버 변수
let httpsServer = null;
let httpsWss = null;

// 클라이언트 관리
const clients = new Map();
const sensorDevices = new Map();
const gameClients = new Map();
const gameSessions = new Map(); // 게임 세션 관리 (sessionId -> {gameClientId, sensorDeviceId})
let clientIdCounter = 0;
let serverStats = {
  startTime: Date.now(),
  totalConnections: 0,
  totalMessages: 0,
  activeGames: 0
};

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

/**
 * 게임 등록 시스템
 */
const gameRegistry = new Map();

/**
 * games 폴더의 모든 게임을 자동으로 스캔하고 등록
 */
async function scanAndRegisterGames() {
  const gamesDir = path.join(__dirname, 'games');
  
  try {
    if (!fs.existsSync(gamesDir)) {
      console.log('📁 games 폴더가 존재하지 않습니다. 생성합니다...');
      fs.mkdirSync(gamesDir, { recursive: true });
      return;
    }
    
    const gameDirectories = fs.readdirSync(gamesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    console.log(`🔍 게임 폴더 스캔 중... (${gameDirectories.length}개 발견)`);
    
    let registeredCount = 0;
    
    for (const gameDir of gameDirectories) {
      const gamePath = path.join(gamesDir, gameDir);
      const indexPath = path.join(gamePath, 'index.html');
      const gameJsonPath = path.join(gamePath, 'game.json');
      
      // index.html이 없으면 스킵
      if (!fs.existsSync(indexPath)) {
        console.warn(`⚠️ ${gameDir}: index.html이 없어 스킵합니다.`);
        continue;
      }
      
      let gameInfo = {
        id: gameDir,
        name: gameDir.charAt(0).toUpperCase() + gameDir.slice(1).replace(/-/g, ' '),
        description: `${gameDir} 게임`,
        author: 'Unknown',
        version: '1.0.0',
        category: 'casual',
        difficulty: 'medium',
        icon: '🎮',
        path: `/games/${gameDir}`,
        sensorTypes: ['orientation'],
        minPlayers: 1,
        maxPlayers: 1,
        features: ['singleplayer', 'sensor-control', 'session-based'],
        thumbnail: `/games/${gameDir}/thumbnail.png`
      };
      
      // game.json이 있으면 메타데이터 로드
      if (fs.existsSync(gameJsonPath)) {
        try {
          const gameMetadata = JSON.parse(fs.readFileSync(gameJsonPath, 'utf8'));
          
          // 기본값과 병합
          gameInfo = {
            ...gameInfo,
            ...gameMetadata,
            id: gameDir, // ID는 폴더명으로 강제 설정
            path: `/games/${gameDir}`, // 경로는 자동 설정
            thumbnail: gameMetadata.thumbnail || gameInfo.thumbnail
          };
          
          console.log(`📋 ${gameDir}: game.json 메타데이터 로드됨`);
        } catch (error) {
          console.warn(`⚠️ ${gameDir}: game.json 파싱 오류, 기본값 사용 - ${error.message}`);
        }
      } else {
        console.log(`📋 ${gameDir}: game.json 없음, 기본값 사용`);
      }
      
      // 게임 등록
      registerGame(gameInfo);
      registeredCount++;
    }
    
    console.log(`✅ 총 ${registeredCount}개 게임이 등록되었습니다.`);
    
    if (registeredCount === 0) {
      console.log('💡 games 폴더에 게임이 없습니다. 샘플 게임을 등록합니다...');
      initializeDefaultGames();
    }
    
  } catch (error) {
    console.error('❌ 게임 스캔 중 오류 발생:', error);
    console.log('💡 샘플 게임을 등록합니다...');
    initializeDefaultGames();
  }
}

// 기본 샘플 게임 (games 폴더가 비어있을 때만 사용)
function initializeDefaultGames() {
  registerGame({
    id: 'sample-tilt-ball',
    name: '기울기 볼 굴리기',
    description: '휴대폰을 기울여서 공을 굴려 목표 지점에 도달시키는 게임',
    author: 'Hub Team',
    version: '1.0.0',
    category: 'puzzle',
    difficulty: 'easy',
    icon: '🎱',
    path: '/games/sample-tilt-ball',
    sensorTypes: ['orientation'],
    minPlayers: 1,
    maxPlayers: 1,
    features: ['singleplayer', 'physics', 'session-based'],
    thumbnail: '/games/sample-tilt-ball/thumbnail.png'
  });
}

/**
 * 세션 ID 생성 함수
 */
function generateSessionId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/**
 * 센서 디바이스와 게임 클라이언트 매칭
 */
function matchSensorToGame(sensorDeviceId, gameClientId) {
  const sessionId = generateSessionId();
  
  gameSessions.set(sessionId, {
    gameClientId: gameClientId,
    sensorDeviceId: sensorDeviceId,
    connectedAt: new Date(),
    lastActivity: new Date()
  });
  
  // 센서 디바이스에 세션 ID 저장
  if (sensorDevices.has(sensorDeviceId)) {
    sensorDevices.get(sensorDeviceId).sessionId = sessionId;
  }
  
  // 게임 클라이언트에 세션 ID 저장
  if (gameClients.has(gameClientId)) {
    gameClients.get(gameClientId).sessionId = sessionId;
  }
  
  console.log(`🔗 세션 매칭: ${sensorDeviceId} ↔ ${gameClientId} (세션: ${sessionId})`);
  return sessionId;
}

/**
 * 세션 연결 해제
 */
function unmatchSession(sessionId) {
  const session = gameSessions.get(sessionId);
  if (session) {
    // 센서 디바이스에서 세션 ID 제거
    if (sensorDevices.has(session.sensorDeviceId)) {
      delete sensorDevices.get(session.sensorDeviceId).sessionId;
    }
    
    // 게임 클라이언트에서 세션 ID 제거
    if (gameClients.has(session.gameClientId)) {
      delete gameClients.get(session.gameClientId).sessionId;
    }
    
    gameSessions.delete(sessionId);
    console.log(`🔌 세션 연결 해제: ${sessionId}`);
  }
}

/**
 * 게임 등록 함수
 */
function registerGame(gameInfo) {
  gameRegistry.set(gameInfo.id, {
    ...gameInfo,
    registeredAt: new Date().toISOString(),
    isActive: true,
    playCount: 0,
    rating: 0,
    reviews: []
  });
  console.log(`🎮 게임 등록됨: ${gameInfo.name} (${gameInfo.id})`);
}

/**
 * API 라우트 설정
 */

// 메인 허브 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 게임 목록 API
app.get('/api/games', (req, res) => {
  const games = Array.from(gameRegistry.values())
    .filter(game => game.isActive)
    .sort((a, b) => b.playCount - a.playCount);
  
  res.json({
    success: true,
    games: games,
    total: games.length
  });
});

// 특정 게임 정보 API
app.get('/api/games/:gameId', (req, res) => {
  const game = gameRegistry.get(req.params.gameId);
  if (!game) {
    return res.status(404).json({
      success: false,
      error: '게임을 찾을 수 없습니다.'
    });
  }
  
  res.json({
    success: true,
    game: game
  });
});

// 게임 플레이 카운트 증가
app.post('/api/games/:gameId/play', (req, res) => {
  const game = gameRegistry.get(req.params.gameId);
  if (!game) {
    return res.status(404).json({
      success: false,
      error: '게임을 찾을 수 없습니다.'
    });
  }
  
  game.playCount++;
  res.json({
    success: true,
    playCount: game.playCount
  });
});

// 서버 상태 API
app.get('/api/status', (req, res) => {
  const uptime = Date.now() - serverStats.startTime;
  res.json({
    success: true,
    status: {
      uptime: uptime,
      totalConnections: serverStats.totalConnections,
      activeConnections: clients.size,
      activeSensorDevices: sensorDevices.size,
      activeGameClients: gameClients.size,
      totalMessages: serverStats.totalMessages,
      registeredGames: gameRegistry.size,
      activeGames: Array.from(gameRegistry.values()).filter(g => g.isActive).length
    }
  });
});

// 게임 재스캔 API (개발/관리용)
app.post('/api/games/rescan', async (req, res) => {
  try {
    console.log('🔄 게임 재스캔 요청됨...');
    
    // 기존 등록된 게임들 임시 저장 (플레이 카운트 등 보존)
    const existingGames = new Map();
    for (const [gameId, gameInfo] of gameRegistry.entries()) {
      existingGames.set(gameId, {
        playCount: gameInfo.playCount,
        rating: gameInfo.rating,
        reviews: gameInfo.reviews
      });
    }
    
    // 게임 레지스트리 초기화
    gameRegistry.clear();
    
    // 게임 재스캔
    await scanAndRegisterGames();
    
    // 기존 데이터 복원
    for (const [gameId, gameInfo] of gameRegistry.entries()) {
      if (existingGames.has(gameId)) {
        const existingData = existingGames.get(gameId);
        gameInfo.playCount = existingData.playCount;
        gameInfo.rating = existingData.rating;
        gameInfo.reviews = existingData.reviews;
      }
    }
    
    const games = Array.from(gameRegistry.values());
    res.json({
      success: true,
      message: `${games.length}개 게임이 재스캔되었습니다.`,
      games: games
    });
    
  } catch (error) {
    console.error('❌ 게임 재스캔 오류:', error);
    res.status(500).json({
      success: false,
      error: '게임 재스캔 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

// 센서 클라이언트 페이지
app.get('/sensor-client', (req, res) => {
  res.sendFile(path.join(__dirname, 'core', 'sensor-client.html'));
});

// 센서 대시보드
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'core', 'sensor-dashboard.html'));
});

// 개발자 문서
app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'docs', 'index.html'));
});

// SDK 다운로드
app.get('/sdk', (req, res) => {
  res.sendFile(path.join(__dirname, 'sdk', 'sensor-game-sdk.js'));
});

// 게임 템플릿
app.get('/template', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'game-template.zip'));
});

/**
 * WebSocket 연결 처리 함수
 */
function setupWebSocketHandlers(wsServer) {
  wsServer.on('connection', (ws, request) => {
    const clientId = ++clientIdCounter;
    serverStats.totalConnections++;
    
    const clientInfo = {
      id: clientId,
      ws: ws,
      type: 'unknown',
      connectedAt: new Date(),
      lastActivity: new Date(),
      metadata: {}
    };
    
    clients.set(clientId, clientInfo);
    console.log(`🔗 클라이언트 연결됨: #${clientId} (총 ${clients.size}개)`);
    
    // 연결 확인 메시지
    ws.send(JSON.stringify({
      type: 'connection_established',
      clientId: clientId,
      serverTime: Date.now(),
      hubVersion: '2.0.0'
    }));
    
    // 메시지 처리
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        serverStats.totalMessages++;
        clientInfo.lastActivity = new Date();
        
        handleWebSocketMessage(clientId, data);
      } catch (error) {
        console.error(`❌ 메시지 처리 오류 (클라이언트 #${clientId}):`, error);
        ws.send(JSON.stringify({
          type: 'error',
          message: '잘못된 메시지 형식입니다.'
        }));
      }
    });
    
    // 연결 종료 처리
    ws.on('close', () => {
      handleClientDisconnect(clientId);
    });
    
    // 에러 처리
    ws.on('error', (error) => {
      console.error(`❌ HTTPS WebSocket 오류 (클라이언트 #${clientId}):`, error);
    });
  });
}

/**
 * WebSocket 메시지 처리
 */
function handleWebSocketMessage(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;
  
  switch (data.type) {
    case 'register_sensor_device':
      handleSensorDeviceRegister(clientId, data);
      break;
      
    case 'register_game_client':
      handleGameClientRegister(clientId, data);
      break;
      
    case 'register_dashboard':
      handleDashboardRegister(clientId, data);
      break;
      
    case 'sensor_data':
      handleSensorData(clientId, data);
      break;
      
    case 'game_event':
      handleGameEvent(clientId, data);
      break;
      
    case 'ping':
      handlePing(clientId, data);
      break;
      
    case 'request_sensor_match':
      handleSensorMatchRequest(clientId, data);
      break;
      
    case 'disconnect_sensor':
      handleSensorDisconnect(clientId, data);
      break;
      
    default:
      console.warn(`⚠️ 알 수 없는 메시지 타입: ${data.type}`);
  }
}

/**
 * 센서 디바이스 등록
 */
function handleSensorDeviceRegister(clientId, data) {
  const client = clients.get(clientId);
  client.type = 'sensor_device';
  client.metadata = {
    deviceId: data.deviceId,
    deviceType: data.deviceType || 'mobile',
    userAgent: data.userAgent,
    capabilities: data.capabilities || []
  };
  
  sensorDevices.set(data.deviceId, {
    clientId: clientId,
    deviceInfo: client.metadata,
    registeredAt: new Date(),
    lastSensorData: null
  });
  
  console.log(`📱 센서 디바이스 등록됨: ${data.deviceId} (${data.deviceType})`);
  
  // 등록 확인
  client.ws.send(JSON.stringify({
    type: 'registration_success',
    deviceId: data.deviceId,
    capabilities: client.metadata.capabilities
  }));
  
  // 게임 클라이언트들에게 새 센서 디바이스 알림
  broadcastToGameClients({
    type: 'sensor_device_connected',
    deviceId: data.deviceId,
    deviceType: data.deviceType
  });
  
  // 대시보드들에게 새 센서 디바이스 알림
  broadcastToDashboards({
    type: 'sensor_device_connected',
    deviceId: data.deviceId,
    deviceType: data.deviceType
  });
}

/**
 * 게임 클라이언트 등록
 */
function handleGameClientRegister(clientId, data) {
  const client = clients.get(clientId);
  client.type = 'game_client';
  client.metadata = {
    gameId: data.gameId,
    gameName: data.gameName || data.gameId,
    requestedSensors: data.requestedSensors || ['orientation'],
    clientVersion: data.clientVersion || '1.0.0'
  };
  
  gameClients.set(clientId, {
    clientInfo: client.metadata,
    registeredAt: new Date(),
    connectedSensors: []
  });
  
  console.log(`🎮 게임 클라이언트 등록됨: ${data.gameId}`);
  
  // 등록 확인
  client.ws.send(JSON.stringify({
    type: 'registration_success',
    gameId: data.gameId,
    availableSensors: Array.from(sensorDevices.keys())
  }));
  
  // 게임 플레이 카운트 증가
  const game = gameRegistry.get(data.gameId);
  if (game) {
    game.playCount++;
  }
}

/**
 * 대시보드 클라이언트 등록
 */
function handleDashboardRegister(clientId, data) {
  const client = clients.get(clientId);
  client.type = 'dashboard';
  client.metadata = {
    registeredAt: new Date(),
    userAgent: data.userAgent || 'Unknown'
  };
  
  console.log(`📊 대시보드 클라이언트 등록됨: #${clientId}`);
  
  // 등록 확인
  client.ws.send(JSON.stringify({
    type: 'dashboard_registered',
    connectedDevices: sensorDevices.size,
    activeGames: gameClients.size
  }));
}

/**
 * 센서 데이터 처리 및 전달
 */
function handleSensorData(clientId, data) {
  const sensorDevice = sensorDevices.get(data.deviceId);
  if (!sensorDevice) {
    console.warn(`⚠️ 알 수 없는 센서 디바이스: ${data.deviceId}`);
    return;
  }
  
  // 센서 데이터 업데이트
  sensorDevice.lastSensorData = {
    ...data.sensorData,
    timestamp: Date.now(),
    received: new Date()
  };
  
  // 세션 기반 센서 데이터 전달
  if (sensorDevice.sessionId) {
    const session = gameSessions.get(sensorDevice.sessionId);
    if (session) {
      // 매칭된 게임 클라이언트에게만 센서 데이터 전달
      const gameClient = clients.get(session.gameClientId);
      if (gameClient && gameClient.ws.readyState === WebSocket.OPEN) {
        gameClient.ws.send(JSON.stringify({
          type: 'sensor_data',
          deviceId: data.deviceId,
          sessionId: sensorDevice.sessionId,
          sensorData: sensorDevice.lastSensorData
        }));
      }
      
      // 세션 활동 시간 업데이트
      session.lastActivity = new Date();
    }
  }
  
  // 모든 대시보드 클라이언트에게 센서 데이터 전달 (모니터링용)
  broadcastToDashboards({
    type: 'sensor_data',
    deviceId: data.deviceId,
    sessionId: sensorDevice.sessionId,
    sensorData: sensorDevice.lastSensorData
  });
}

/**
 * 게임 이벤트 처리
 */
function handleGameEvent(clientId, data) {
  console.log(`🎮 게임 이벤트: ${data.eventType} from ${data.gameId}`);
  
  // 필요시 다른 클라이언트들에게 브로드캐스트
  if (data.broadcast) {
    broadcastToGameClients({
      type: 'game_event',
      gameId: data.gameId,
      eventType: data.eventType,
      eventData: data.eventData
    }, clientId);
  }
}

/**
 * Ping 처리 (지연시간 측정)
 */
function handlePing(clientId, data) {
  const client = clients.get(clientId);
  if (client) {
    client.ws.send(JSON.stringify({
      type: 'pong',
      timestamp: data.timestamp,
      serverTime: Date.now()
    }));
  }
}

/**
 * 센서 매칭 요청 처리
 */
function handleSensorMatchRequest(clientId, data) {
  const client = clients.get(clientId);
  if (!client || client.type !== 'game_client') {
    return;
  }
  
  // 사용 가능한 센서 디바이스 찾기 (세션에 연결되지 않은 것들)
  const availableSensors = Array.from(sensorDevices.entries())
    .filter(([deviceId, device]) => !device.sessionId)
    .map(([deviceId, device]) => ({
      deviceId: deviceId,
      deviceType: device.deviceInfo.deviceType,
      connectedAt: device.registeredAt
    }));
  
  if (availableSensors.length === 0) {
    client.ws.send(JSON.stringify({
      type: 'sensor_match_failed',
      reason: 'no_available_sensors',
      message: '사용 가능한 센서가 없습니다.'
    }));
    return;
  }
  
  // 가장 최근에 연결된 센서 선택
  const selectedSensor = availableSensors.sort((a, b) => 
    new Date(b.connectedAt) - new Date(a.connectedAt)
  )[0];
  
  // 세션 매칭
  const sessionId = matchSensorToGame(selectedSensor.deviceId, clientId);
  
  // 게임 클라이언트에 매칭 성공 알림
  client.ws.send(JSON.stringify({
    type: 'sensor_matched',
    sessionId: sessionId,
    deviceId: selectedSensor.deviceId,
    deviceType: selectedSensor.deviceType
  }));
  
  // 센서 디바이스에 매칭 성공 알림
  const sensorDevice = sensorDevices.get(selectedSensor.deviceId);
  if (sensorDevice) {
    const sensorClient = clients.get(sensorDevice.clientId);
    if (sensorClient) {
      sensorClient.ws.send(JSON.stringify({
        type: 'matched_to_game',
        sessionId: sessionId,
        gameClientId: clientId,
        gameId: client.metadata.gameId
      }));
    }
  }
}

/**
 * 센서 연결 해제 처리
 */
function handleSensorDisconnect(clientId, data) {
  const client = clients.get(clientId);
  if (!client) return;
  
  if (client.type === 'game_client') {
    const gameClient = gameClients.get(clientId);
    if (gameClient && gameClient.sessionId) {
      unmatchSession(gameClient.sessionId);
    }
  } else if (client.type === 'sensor_device') {
    const sensorDevice = sensorDevices.get(client.metadata.deviceId);
    if (sensorDevice && sensorDevice.sessionId) {
      unmatchSession(sensorDevice.sessionId);
    }
  }
}

/**
 * 클라이언트 연결 해제 처리
 */
function handleClientDisconnect(clientId) {
  const client = clients.get(clientId);
  if (!client) return;
  
  console.log(`🔌 클라이언트 연결 해제됨: #${clientId} (${client.type})`);
  
  // 센서 디바이스인 경우
  if (client.type === 'sensor_device' && client.metadata.deviceId) {
    const sensorDevice = sensorDevices.get(client.metadata.deviceId);
    
    // 연결된 세션이 있으면 해제
    if (sensorDevice && sensorDevice.sessionId) {
      const session = gameSessions.get(sensorDevice.sessionId);
      if (session) {
        // 매칭된 게임 클라이언트에 센서 연결 해제 알림
        const gameClient = clients.get(session.gameClientId);
        if (gameClient && gameClient.ws.readyState === WebSocket.OPEN) {
          gameClient.ws.send(JSON.stringify({
            type: 'sensor_device_disconnected',
            deviceId: client.metadata.deviceId,
            sessionId: sensorDevice.sessionId
          }));
        }
        
        unmatchSession(sensorDevice.sessionId);
      }
    }
    
    sensorDevices.delete(client.metadata.deviceId);
    
    // 대시보드들에게 센서 연결 해제 알림
    broadcastToDashboards({
      type: 'sensor_device_disconnected',
      deviceId: client.metadata.deviceId
    });
  }
  
  // 게임 클라이언트인 경우
  if (client.type === 'game_client') {
    const gameClient = gameClients.get(clientId);
    
    // 연결된 세션이 있으면 해제
    if (gameClient && gameClient.sessionId) {
      const session = gameSessions.get(gameClient.sessionId);
      if (session) {
        // 매칭된 센서 디바이스에 게임 연결 해제 알림
        const sensorDevice = sensorDevices.get(session.sensorDeviceId);
        if (sensorDevice) {
          const sensorClient = clients.get(sensorDevice.clientId);
          if (sensorClient && sensorClient.ws.readyState === WebSocket.OPEN) {
            sensorClient.ws.send(JSON.stringify({
              type: 'game_client_disconnected',
              gameClientId: clientId,
              sessionId: gameClient.sessionId
            }));
          }
        }
        
        unmatchSession(gameClient.sessionId);
      }
    }
    
    gameClients.delete(clientId);
  }
  
  clients.delete(clientId);
}

/**
 * 게임 클라이언트들에게 브로드캐스트
 */
function broadcastToGameClients(message, excludeClientId = null) {
  gameClients.forEach((gameClient, clientId) => {
    if (clientId === excludeClientId) return;
    
    const client = clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`❌ 게임 클라이언트 전송 실패 #${clientId}:`, error);
      }
    }
  });
}

/**
 * 대시보드 클라이언트들에게 브로드캐스트
 */
function broadcastToDashboards(message, excludeClientId = null) {
  clients.forEach((client, clientId) => {
    if (clientId === excludeClientId || client.type !== 'dashboard') return;
    
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`❌ 대시보드 클라이언트 전송 실패 #${clientId}:`, error);
      }
    }
  });
}

/**
 * 모든 클라이언트에게 브로드캐스트
 */
function broadcastToAll(message, excludeClientId = null) {
  clients.forEach((client, clientId) => {
    if (clientId === excludeClientId) return;
    
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`❌ 브로드캐스트 전송 실패 #${clientId}:`, error);
      }
    }
  });
}

// 로컬 IP 주소 가져오기 함수
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return 'localhost';
}

// SSL 인증서 자동 생성 함수
function generateSSLCertificate() {
  const certPath = path.join(__dirname, 'cert.pem');
  const keyPath = path.join(__dirname, 'key.pem');

  return new Promise((resolve, reject) => {
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      console.log('✅ SSL 인증서가 이미 존재합니다.');
      resolve(true);
      return;
    }

    console.log('🔐 SSL 인증서를 자동 생성하는 중...');
    const localIP = getLocalIP();
    const attrs = [{ name: 'commonName', value: 'localhost' }];
    const pems = selfsigned.generate(attrs, {
      algorithm: 'sha256',
      days: 365,
      keySize: 2048,
      extensions: [{
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 7, ip: '127.0.0.1' },
          { type: 7, ip: localIP },
        ]
      }]
    });

    if (!pems) {
        console.error('❌ SSL 인증서 생성 실패');
        return reject(new Error('selfsigned.generate failed'));
    }

    fs.writeFileSync(keyPath, pems.private);
    fs.writeFileSync(certPath, pems.cert);

    console.log('✅ SSL 인증서가 성공적으로 생성되었습니다!');
    console.log(`   - 인증서 파일: ${certPath}`);
    console.log(`   - 키 파일: ${keyPath}`);
    console.log(`   - 지원 도메인: localhost, 127.0.0.1, ${localIP}`);
    resolve(true);
  });
}

// 인증서를 시스템 키체인에 자동으로 추가하는 함수
function trustCertificate() {
  const certPath = path.join(__dirname, 'cert.pem');

  if (!fs.existsSync(certPath)) {
    return Promise.resolve(false);
  }

  // macOS (darwin)에서만 자동 신뢰 시도
  if (process.platform !== 'darwin') {
    console.log('⚠️ Windows/Linux에서는 인증서 자동 신뢰를 지원하지 않습니다.');
    console.log(`   수동으로 cert.pem 파일을 신뢰해야 할 수 있습니다: ${certPath}`);
    console.log('   브라우저에서 보안 경고가 표시되면 "고급"을 클릭하고 "안전하지 않음으로 이동"을 선택하세요.');
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    // 인증서가 이미 신뢰되어 있는지 확인
    exec(`security find-certificate -c localhost /Library/Keychains/System.keychain 2>/dev/null`, (error) => {
      if (error) {
        // 인증서가 없으므로 추가
        console.log('🔐 HTTPS 인증서를 시스템 키체인에 추가하는 중 (macOS)...');
        console.log('   (관리자 비밀번호가 필요할 수 있습니다)');

        exec(`sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "${certPath}"`, (addError) => {
          if (addError) {
            console.log('⚠️  인증서 자동 추가 실패 (수동 설정 필요)');
            console.log('   브라우저에서 보안 경고 시 "고급" → "안전하지 않음으로 이동" 클릭');
            resolve(false);
          } else {
            console.log('✅ 인증서가 시스템 키체인에 추가되었습니다!');
            console.log('   이제 브라우저에서 보안 경고 없이 HTTPS에 접속할 수 있습니다.');
            resolve(true);
          }
        });
      } else {
        // 인증서가 이미 존재함
        console.log('✅ HTTPS 인증서가 이미 시스템에 신뢰되어 있습니다.');
        resolve(true);
      }
    });
  });
}

// Windows 방화벽 자동 설정 함수
function configureFirewall() {
  // Windows가 아닌 경우 아무것도 하지 않음
  if (process.platform !== 'win32') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const ruleName = "SensorGameHub Port 8443";
    const checkRuleCommand = `netsh advfirewall firewall show rule name="${ruleName}"`;

    exec(checkRuleCommand, (error) => {
      // 규칙이 존재하지 않으면 error 객체가 반환됨
      if (error) {
        console.log(`🔥 Windows 방화벽 규칙을 설정합니다: "${ruleName}"`);
        console.log('   (관리자 권한을 요청하는 창이 나타날 수 있습니다)');

        const addRuleCommand = `netsh advfirewall firewall add rule name="${ruleName}" dir=in action=allow protocol=TCP localport=8443`;
        exec(addRuleCommand, (addError) => {
          if (addError) {
            console.error(`❌ 방화벽 규칙 추가 실패: ${addError.message}`);
            console.log('   수동으로 8443 포트에 대한 인바운드 규칙을 허용해주세요.');
          } else {
            console.log('✅ 방화벽 규칙이 성공적으로 추가되었습니다.');
          }
          resolve(); // 실패하더라도 서버 시작은 계속 진행
        });
      } else {
        // 규칙이 이미 존재함
        console.log('✅ Windows 방화벽 규칙이 이미 설정되어 있습니다.');
        resolve();
      }
    });
  });
}

// 서버 설정 및 시작 함수
async function setupAndStartServer() {
  try {
    const PORT = process.env.PORT || 8443;
    const NODE_ENV = process.env.NODE_ENV || 'development';
    
    console.log('\n🚀 센서 게임 허브 플랫폼 v2.0');
    console.log('==============================================');
    
    // 프로덕션 환경에서는 HTTP 서버 실행 (Render 호환)
    if (NODE_ENV === 'production') {
      console.log('🌐 프로덕션 모드: HTTP 서버 실행');
      
      // HTTP WebSocket 서버 생성
      const http = require('http');
      const httpServer = http.createServer(app);
      const httpWss = new WebSocket.Server({ server: httpServer });
      setupWebSocketHandlers(httpWss);
      
      // HTTP 서버 시작
      httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`🌐 HTTP 서버: http://0.0.0.0:${PORT}`);
        console.log('📱 모바일 접속 (센서 연결용):');
        console.log(`   https://sensor-game-hub.onrender.com/sensor-client`);
        console.log('🎮 PC 접속 (게임 플레이용):');
        console.log(`   https://sensor-game-hub.onrender.com`);
        console.log('📊 기타 서비스:');
        console.log(`   대시보드: https://sensor-game-hub.onrender.com/dashboard`);
        console.log('==============================================');
        console.log('✅ 서버 준비 완료!');
        console.log('💡 Render에서 자동으로 HTTPS를 제공합니다! 🎉');
      });
      
      httpServer.on('error', (error) => {
        console.error('❌ HTTP 서버 오류:', error);
        if (error.code === 'EADDRINUSE') {
          console.error(`❌ 포트 ${PORT}이 이미 사용 중입니다.`);
        } else if (error.code === 'EACCES') {
          console.error(`❌ 포트 ${PORT}에 대한 접근 권한이 없습니다.`);
        }
        process.exit(1);
      });
      
    } else {
      // 개발 환경에서는 HTTPS 서버 실행
      console.log('🔒 개발 모드: HTTPS 서버 실행');
      
      // SSL 인증서 자동 생성
      await generateSSLCertificate();
      
      // 인증서를 시스템에 자동으로 신뢰하도록 설정
      console.log('');
      await trustCertificate();
      console.log('');

      // Windows 방화벽 자동 설정
      await configureFirewall();
      console.log('');
      
      const certPath = path.join(__dirname, 'cert.pem');
      const keyPath = path.join(__dirname, 'key.pem');
      
      const key = fs.readFileSync(keyPath, 'utf8');
      const cert = fs.readFileSync(certPath, 'utf8');
      
      const httpsOptions = { key, cert };
      httpsServer = https.createServer(httpsOptions, app);
      
      // HTTPS WebSocket 서버 생성
      httpsWss = new WebSocket.Server({ server: httpsServer });
      setupWebSocketHandlers(httpsWss);
      
      // HTTPS 서버 시작
      httpsServer.listen(PORT, '0.0.0.0', () => {
        const localIP = getLocalIP();
        
        console.log(`🔒 HTTPS 서버: https://${localIP}:${PORT}`);
        console.log(`   로컬 접속: https://localhost:${PORT}`);
        console.log('');
        console.log('📱 모바일 접속 (센서 연결용):');
        console.log(`   https://${localIP}:${PORT}/sensor-client`);
        console.log('');
        console.log('🎮 PC 접속 (게임 플레이용):');
        console.log(`   https://${localIP}:${PORT}`);
        console.log('');
        console.log('📊 기타 서비스:');
        console.log(`   대시보드: https://${localIP}:${PORT}/dashboard`);
        console.log(`   개발자 문서: https://${localIP}:${PORT}/docs`);
        console.log(`   SDK: https://${localIP}:${PORT}/sdk`);
        console.log('');
        console.log('==============================================');
        console.log('✅ HTTPS 서버 준비 완료!');
        console.log('💡 이제 안드로이드/iOS 모든 기기에서 센서를 사용할 수 있습니다! 🎉');
        console.log('📱 모바일에서는 센서 연결, PC에서는 게임 선택이 가능합니다.\n');
      });
      
      httpsServer.on('error', (error) => {
        console.error('❌ HTTPS 서버 오류:', error);
        if (error.code === 'EADDRINUSE') {
          console.error(`❌ 포트 ${PORT}이 이미 사용 중입니다.`);
        } else if (error.code === 'EACCES') {
          console.error(`❌ 포트 ${PORT}에 대한 접근 권한이 없습니다.`);
        }
        process.exit(1);
      });
    }
    
  } catch (error) {
    console.error('❌ 서버 설정 실패:', error);
    process.exit(1);
  }
}

// 정리 작업
process.on('SIGINT', () => {
  console.log('\n🛑 서버를 종료합니다...');
  
  // 모든 클라이언트에게 서버 종료 알림
  broadcastToAll({
    type: 'server_shutdown',
    message: '서버가 종료됩니다.'
  });
  
  // WebSocket 서버 정리
  if (httpsWss) {
    httpsWss.close(() => {
      if (httpsServer) {
        httpsServer.close(() => {
          console.log('✅ 서버가 안전하게 종료되었습니다.');
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    });
  } else {
    process.exit(0);
  }
});

// 주기적 상태 리포트 (개발 모드에서만)
if (process.env.NODE_ENV !== 'production') {
  setInterval(() => {
    const uptime = Math.floor((Date.now() - serverStats.startTime) / 1000);
    console.log(`📈 상태: 연결 ${clients.size}, 센서 ${sensorDevices.size}, 게임 ${gameClients.size}, 업타임 ${uptime}s`);
  }, 30000); // 30초마다
}

/**
 * 서버 시작 (HTTPS 전용)
 */
async function startServer() {
  // games 폴더의 모든 게임을 자동으로 스캔하고 등록
  await scanAndRegisterGames();
  
  // 서버 설정 및 시작
  await setupAndStartServer();
}

// 서버 시작
startServer().catch(error => {
  console.error('❌ 서버 시작 실패:', error);
  process.exit(1);
});