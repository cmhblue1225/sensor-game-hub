const WebSocket = require('ws');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

function createRequestHandler() {
    return (req, res) => {
        let filePath = '';
        let contentType = 'text/html';
        
        if (req.url === '/' || req.url === '/index.html') {
            filePath = path.join(__dirname, 'index.html');
        } else if (req.url === '/client.html') {
            filePath = path.join(__dirname, 'client.html');
        } else if (req.url === '/server.html') {
            filePath = path.join(__dirname, 'server.html');
        } else if (req.url === '/sensor-client.html') {
            filePath = path.join(__dirname, 'sensor-client.html');
        } else if (req.url === '/sensor-dashboard.html') {
            filePath = path.join(__dirname, 'sensor-dashboard.html');
        } else if (req.url === '/dashboard') {
            filePath = path.join(__dirname, 'sensor-dashboard.html');
        } else if (req.url === '/settings') {
            filePath = path.join(__dirname, 'settings.html');
        } else if (req.url === '/ball-game' || req.url === '/ball-rolling') {
            filePath = path.join(__dirname, 'ball-rolling-game', 'index.html');
        } else if (req.url === '/racing-game' || req.url === '/racing') {
            filePath = path.join(__dirname, 'racing-game', 'index.html');
        } else if (req.url === '/sensor-shooter-game' || req.url === '/shooter') {
            filePath = path.join(__dirname, 'sensor-shooter-game', 'index.html');
        } else if (req.url === '/runner-game' || req.url === '/runner') {
            filePath = path.join(__dirname, 'runner-game', 'index.html');
        } else if (req.url === '/hurdle-game' || req.url === '/hurdle') {
            filePath = path.join(__dirname, 'hurdle-game', 'index.html');
        } else if (req.url === '/ramen-slurp-game' || req.url === '/ramen') {
            filePath = path.join(__dirname, 'ramen-slurp-game', 'index.html');
        } else if (req.url === '/staggering-home-game' || req.url === '/staggering') {
            filePath = path.join(__dirname, 'staggering-home-game', 'index.html');
        } else if (req.url === '/baseball-game' || req.url === '/baseball') {
            filePath = path.join(__dirname, 'baseball-game', 'index.html');
        } else if (req.url.startsWith('/ball-rolling-game/')) {
            // 볼 굴리기 게임 관련 정적 파일 서빙
            const relativePath = req.url.substring('/ball-rolling-game/'.length);
            filePath = path.join(__dirname, 'ball-rolling-game', relativePath);
        } else if (req.url.startsWith('/racing-game/')) {
            // 레이싱 게임 관련 정적 파일 서빙
            const relativePath = req.url.substring('/racing-game/'.length);
            filePath = path.join(__dirname, 'racing-game', relativePath);
        } else if (req.url.startsWith('/sensor-shooter-game/')) {
            // 센서 슈터 게임 관련 정적 파일 서빙
            const relativePath = req.url.substring('/sensor-shooter-game/'.length);
            filePath = path.join(__dirname, 'sensor-shooter-game', relativePath);
        } else if (req.url.startsWith('/runner-game/')) {
            // 러너 게임 관련 정적 파일 서빙
            const relativePath = req.url.substring('/runner-game/'.length);
            filePath = path.join(__dirname, 'runner-game', relativePath);
        } else if (req.url.startsWith('/hurdle-game/')) {
            // 허들 게임 관련 정적 파일 서빙
            const relativePath = req.url.substring('/hurdle-game/'.length);
            filePath = path.join(__dirname, 'hurdle-game', relativePath);
        } else if (req.url.startsWith('/ramen-slurp-game/')) {
            // 라면 후루룩 게임 관련 정적 파일 서빙
            const relativePath = req.url.substring('/ramen-slurp-game/'.length);
            filePath = path.join(__dirname, 'ramen-slurp-game', relativePath);
        } else if (req.url.startsWith('/staggering-home-game/')) {
            // 비틀비틀 귀가 게임 관련 정적 파일 서빙
            const relativePath = req.url.substring('/staggering-home-game/'.length);
            filePath = path.join(__dirname, 'staggering-home-game', relativePath);
        } else if (req.url.startsWith('/baseball-game/')) {
            // 야구 게임 관련 정적 파일 서빙
            const relativePath = req.url.substring('/baseball-game/'.length);
            filePath = path.join(__dirname, 'baseball-game', relativePath);
        } else if (req.url === '/rhythm-game' || req.url === '/rhythm') {
            filePath = path.join(__dirname, 'rhythm-game', 'index.html');
        } else if (req.url.startsWith('/rhythm-game/')) {
            // 리듬 게임 관련 정적 파일 서빙
            const relativePath = req.url.substring('/rhythm-game/'.length);
            filePath = path.join(__dirname, 'rhythm-game', relativePath);
        } else if (req.url.startsWith('/shared/')) {
            // 공통 모듈 서빙
            const relativePath = req.url.substring('/shared/'.length);
            filePath = path.join(__dirname, 'shared', relativePath);
        } else {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        
        // 파일 확장자에 따른 Content-Type 설정
        const ext = path.extname(filePath).toLowerCase();
        switch (ext) {
            case '.js':
                contentType = 'application/javascript';
                break;
            case '.css':
                contentType = 'text/css';
                break;
            case '.html':
                contentType = 'text/html';
                break;
            case '.png':
                contentType = 'image/png';
                break;
            case '.jpg':
            case '.jpeg':
                contentType = 'image/jpeg';
                break;
            case '.gif':
                contentType = 'image/gif';
                break;
            case '.svg':
                contentType = 'image/svg+xml';
                break;
            case '.mp3':
                contentType = 'audio/mpeg';
                break;
            case '.wav':
                contentType = 'audio/wav';
                break;
            default:
                contentType = 'text/plain';
        }
        
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('File not found');
                return;
            }
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    };
}

// HTTP 서버 생성
const server = http.createServer(createRequestHandler());

// HTTPS 서버 생성 (iOS 센서 권한을 위해 필요)
let httpsServer = null;
try {
    const certPath = path.join(__dirname, 'cert.pem');
    const keyPath = path.join(__dirname, 'key.pem');
    
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        const options = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };
        httpsServer = https.createServer(options, createRequestHandler());
        console.log('HTTPS 인증서를 찾았습니다. HTTPS 서버도 시작됩니다.');
    }
} catch (error) {
    console.log('HTTPS 인증서 로드 실패:', error.message);
}

const wss = new WebSocket.Server({ server });
let httpsWss = null;
if (httpsServer) {
    httpsWss = new WebSocket.Server({ server: httpsServer });
}

let clients = new Map();
let devices = new Map();
let dashboards = new Map();
let clientIdCounter = 0;
let totalMessages = 0;
let serverStartTime = Date.now();

function setupWebSocketHandlers(wsServer) {
    wsServer.on('connection', (ws, request) => {
    const clientId = ++clientIdCounter;
    const clientIp = request.socket.remoteAddress;
    
    clients.set(clientId, {
        ws: ws,
        type: 'unknown',
        id: null,
        ip: clientIp,
        connectedAt: new Date()
    });
    
    console.log(`클라이언트 #${clientId} 연결됨 (${clientIp})`);
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            totalMessages++;
            
            const client = clients.get(clientId);
            
            switch(data.type) {
                case 'device_register':
                    handleDeviceRegister(clientId, data);
                    break;
                    
                case 'dashboard_register':
                    handleDashboardRegister(clientId, data);
                    break;
                    
                case 'game_client_register':
                    handleGameClientRegister(clientId, data);
                    break;
                    
                case 'sensor_data':
                    handleSensorData(clientId, data);
                    break;
                    
                case 'join':
                    handleChatJoin(clientId, data);
                    break;
                    
                case 'message':
                    handleChatMessage(clientId, data);
                    break;
                    
                case 'leave':
                    handleChatLeave(clientId, data);
                    break;
                    
                case 'stats_request':
                    handleStatsRequest(clientId, data);
                    break;
            }
        } catch (error) {
            console.error('메시지 처리 오류:', error);
        }
    });
    
    ws.on('close', () => {
        const client = clients.get(clientId);
        if (client) {
            console.log(`클라이언트 #${clientId} 연결 끊김`);
            
            // 장치 또는 대시보드 정리
            if (client.type === 'device') {
                devices.delete(client.id);
                broadcastToDashboards({
                    type: 'device_disconnect',
                    deviceId: client.id,
                    timestamp: Date.now()
                });
            } else if (client.type === 'dashboard') {
                dashboards.delete(clientId);
            }
            
            clients.delete(clientId);
        }
    });
    
    ws.on('error', (error) => {
        console.error(`클라이언트 #${clientId} 오류:`, error);
    });
    });
}

// WebSocket 핸들러 설정
setupWebSocketHandlers(wss);
if (httpsWss) {
    setupWebSocketHandlers(httpsWss);
}

function handleDeviceRegister(clientId, data) {
    const client = clients.get(clientId);
    client.type = 'device';
    client.id = data.deviceId;
    
    devices.set(data.deviceId, {
        clientId: clientId,
        deviceId: data.deviceId,
        deviceType: data.deviceType,
        userAgent: data.userAgent,
        registeredAt: Date.now(),
        lastSensorData: null
    });
    
    console.log(`장치 등록됨: ${data.deviceType} (${data.deviceId})`);
    
    // 대시보드에 장치 등록 알림
    broadcastToDashboards({
        type: 'device_register',
        deviceId: data.deviceId,
        deviceType: data.deviceType,
        timestamp: Date.now()
    });
}

function handleDashboardRegister(clientId, data) {
    const client = clients.get(clientId);
    client.type = 'dashboard';
    
    dashboards.set(clientId, {
        clientId: clientId,
        registeredAt: Date.now()
    });
    
    console.log(`대시보드 등록됨: 클라이언트 #${clientId}`);
    
    // 기존 장치 정보 전송
    devices.forEach((device, deviceId) => {
        const client = clients.get(clientId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify({
                type: 'device_register',
                deviceId: deviceId,
                deviceType: device.deviceType,
                timestamp: Date.now()
            }));
        }
    });
}

function handleGameClientRegister(clientId, data) {
    const client = clients.get(clientId);
    client.type = 'game_client';
    client.id = data.deviceId;
    
    console.log(`게임 클라이언트 등록됨: ${data.deviceId} (클라이언트 #${clientId})`);
    
    // 게임 클라이언트는 센서 데이터를 수신만 하므로 별도 처리 없음
}

function handleSensorData(clientId, data) {
    const device = devices.get(data.deviceId);
    if (!device) return;
    
    device.lastSensorData = data.data;
    device.lastUpdate = Date.now();
    
    // 대시보드와 게임 클라이언트에 센서 데이터 전송
    const sensorMessage = {
        type: 'sensor_data',
        deviceId: data.deviceId,
        deviceType: device.deviceType,
        data: data.data,
        timestamp: data.timestamp
    };
    
    broadcastToDashboards(sensorMessage);
    broadcastToGameClients(sensorMessage);
    
    // 센서 데이터 로깅 (5초마다 한 번씩만)
    if (!device.lastLogTime || Date.now() - device.lastLogTime > 5000) {
        console.log(`센서 데이터 수신: ${data.deviceId}`);
        device.lastLogTime = Date.now();
    }
}

function handleChatJoin(clientId, data) {
    const client = clients.get(clientId);
    client.name = data.name;
    client.type = 'chat';
    
    console.log(`채팅 사용자 입장: ${data.name}`);
    
    broadcast({
        type: 'join',
        name: data.name,
        timestamp: new Date().toISOString()
    }, clientId);
}

function handleChatMessage(clientId, data) {
    const client = clients.get(clientId);
    if (client && client.name) {
        broadcast({
            type: 'message',
            name: client.name,
            message: data.message,
            timestamp: new Date().toISOString()
        });
    }
}

function handleChatLeave(clientId, data) {
    const client = clients.get(clientId);
    if (client && client.name) {
        broadcast({
            type: 'leave',
            name: client.name,
            timestamp: new Date().toISOString()
        }, clientId);
    }
}

function handleStatsRequest(clientId, data) {
    const client = clients.get(clientId);
    if (!client) return;
    
    // 서버 통계 수집
    const stats = {
        connectedDevices: devices.size,
        totalDashboards: dashboards.size,
        totalClients: clients.size,
        totalMessages: totalMessages,
        uptime: Date.now() - serverStartTime,
        timestamp: Date.now()
    };
    
    // 클라이언트에게 통계 응답
    try {
        client.ws.send(JSON.stringify({
            type: 'stats_response',
            stats: stats,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error(`통계 응답 전송 실패 (클라이언트 #${clientId}):`, error);
    }
}

function broadcast(message, excludeClientId = null) {
    const messageStr = JSON.stringify(message);
    
    clients.forEach((client, clientId) => {
        if (clientId !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
            try {
                client.ws.send(messageStr);
            } catch (error) {
                console.error(`클라이언트 #${clientId}에게 메시지 전송 실패:`, error);
            }
        }
    });
}

function broadcastToDashboards(message) {
    const messageStr = JSON.stringify(message);
    
    dashboards.forEach((dashboard, clientId) => {
        const client = clients.get(clientId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
            try {
                client.ws.send(messageStr);
            } catch (error) {
                console.error(`대시보드 #${clientId}에게 메시지 전송 실패:`, error);
            }
        }
    });
}

function broadcastToGameClients(message) {
    const messageStr = JSON.stringify(message);
    
    clients.forEach((client, clientId) => {
        if (client.type === 'game_client' && client.ws.readyState === WebSocket.OPEN) {
            try {
                client.ws.send(messageStr);
            } catch (error) {
                console.error(`게임 클라이언트 #${clientId}에게 메시지 전송 실패:`, error);
            }
        }
    });
}

function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const PORT = 8080;
const HTTPS_PORT = 8443;

server.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIPAddress();
    console.log(`\n=== 센서 게임 플랫폼 서버 ===`);
    console.log(`HTTP 서버가 포트 ${PORT}에서 시작되었습니다`);
    
    if (httpsServer) {
        httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
            console.log(`HTTPS 서버가 포트 ${HTTPS_PORT}에서 시작되었습니다`);
        });
    }
    
    console.log(`\n🏠 메인 게임 플랫폼:`);
    if (httpsServer) {
        console.log(`   HTTPS: https://${localIP}:${HTTPS_PORT}/`);
    }
    console.log(`   HTTP: http://${localIP}:${PORT}/`);
    
    console.log(`\n📱 휴대폰 센서 클라이언트 (iOS 권한 지원):`);
    if (httpsServer) {
        console.log(`   HTTPS (권장): https://${localIP}:${HTTPS_PORT}/sensor-client.html`);
        console.log(`   HTTPS 로컬: https://localhost:${HTTPS_PORT}/sensor-client.html`);
    }
    console.log(`   HTTP: http://${localIP}:${PORT}/sensor-client.html`);
    
    console.log(`\n💻 데스크톱 모니터링 대시보드:`);
    if (httpsServer) {
        console.log(`   HTTPS: https://${localIP}:${HTTPS_PORT}/sensor-dashboard.html`);
    }
    console.log(`   HTTP: http://${localIP}:${PORT}/sensor-dashboard.html`);
    
    console.log(`\n🎮 게임들:`);
    console.log(`   🎱 2D 볼 굴리기 게임:`);
    if (httpsServer) {
        console.log(`     HTTPS: https://${localIP}:${HTTPS_PORT}/ball-game`);
    }
    console.log(`     HTTP: http://${localIP}:${PORT}/ball-game`);
    
    console.log(`   ⚾ 센서 야구 게임:`);
    if (httpsServer) {
        console.log(`     HTTPS: https://${localIP}:${HTTPS_PORT}/baseball-game`);
    }
    console.log(`     HTTP: http://${localIP}:${PORT}/baseball-game`);
    
    console.log(`   🎵 센서 리듬 게임:`);
    if (httpsServer) {
        console.log(`     HTTPS: https://${localIP}:${HTTPS_PORT}/rhythm-game`);
    }
    console.log(`     HTTP: http://${localIP}:${PORT}/rhythm-game`);
    
    console.log(`\n💬 채팅 (기존 기능):`);
    console.log(`   클라이언트: http://${localIP}:${PORT}/client.html`);
    
    if (httpsServer) {
        console.log(`\n⚠️  HTTPS 인증서는 자체 서명된 인증서입니다.`);
        console.log(`    브라우저에서 '고급' → '안전하지 않음으로 이동' 클릭하여 접속하세요.`);
    } else {
        console.log(`\n⚠️  iOS 센서 권한을 위해 HTTPS가 필요합니다.`);
        console.log(`    다음 명령어로 인증서를 생성하세요:`);
        console.log(`    openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"`);
    }
    
    console.log(`\n서버 준비 완료!`);
    console.log(`=================================\n`);
});

server.on('error', (error) => {
    console.error('서버 오류:', error);
});

process.on('SIGINT', () => {
    console.log('\n서버를 종료합니다...');
    
    clients.forEach((client, clientId) => {
        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.close();
        }
    });
    
    server.close(() => {
        console.log('서버가 종료되었습니다');
        process.exit(0);
    });
});

// 통계 로깅 (30초마다)
setInterval(() => {
    const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    
    console.log(`\n=== 서버 통계 ===`);
    console.log(`업타임: ${hours}시간 ${minutes}분 ${seconds}초`);
    console.log(`총 연결: ${clients.size}`);
    console.log(`활성 장치: ${devices.size}`);
    console.log(`대시보드: ${dashboards.size}`);
    console.log(`총 메시지: ${totalMessages}`);
    
    if (devices.size > 0) {
        console.log(`\n연결된 장치:`);
        devices.forEach((device, deviceId) => {
            const timeSinceUpdate = device.lastUpdate ? Date.now() - device.lastUpdate : 0;
            const status = timeSinceUpdate < 5000 ? '활성' : '비활성';
            console.log(`  ${device.deviceType} (${deviceId}): ${status}`);
        });
    }
    console.log(`================\n`);
}, 30000);