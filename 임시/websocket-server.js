const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const server = http.createServer((req, res) => {
    if (req.url === '/client.html' || req.url === '/') {
        fs.readFile(path.join(__dirname, 'client.html'), (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('File not found');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    } else if (req.url === '/server.html') {
        fs.readFile(path.join(__dirname, 'server.html'), (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('File not found');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

const wss = new WebSocket.Server({ server });

let clients = new Map();
let clientIdCounter = 0;

wss.on('connection', (ws, request) => {
    const clientId = ++clientIdCounter;
    const clientIp = request.socket.remoteAddress;
    
    clients.set(clientId, {
        ws: ws,
        name: null,
        ip: clientIp,
        connectedAt: new Date()
    });
    
    console.log(`클라이언트 #${clientId} 연결됨 (${clientIp})`);
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log(`클라이언트 #${clientId}로부터 메시지:`, data);
            
            const client = clients.get(clientId);
            
            switch(data.type) {
                case 'join':
                    client.name = data.name;
                    console.log(`클라이언트 #${clientId}의 이름: ${data.name}`);
                    
                    broadcast({
                        type: 'join',
                        name: data.name,
                        timestamp: new Date().toISOString()
                    }, clientId);
                    break;
                    
                case 'message':
                    if (client.name) {
                        broadcast({
                            type: 'message',
                            name: client.name,
                            message: data.message,
                            timestamp: new Date().toISOString()
                        });
                    }
                    break;
                    
                case 'leave':
                    if (client.name) {
                        broadcast({
                            type: 'leave',
                            name: client.name,
                            timestamp: new Date().toISOString()
                        }, clientId);
                    }
                    break;
            }
        } catch (error) {
            console.error('메시지 처리 오류:', error);
        }
    });
    
    ws.on('close', () => {
        const client = clients.get(clientId);
        if (client && client.name) {
            console.log(`클라이언트 #${clientId} (${client.name}) 연결 끊김`);
            
            broadcast({
                type: 'leave',
                name: client.name,
                timestamp: new Date().toISOString()
            }, clientId);
        } else {
            console.log(`클라이언트 #${clientId} 연결 끊김`);
        }
        
        clients.delete(clientId);
    });
    
    ws.on('error', (error) => {
        console.error(`클라이언트 #${clientId} 오류:`, error);
    });
});

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

function getConnectedClients() {
    return Array.from(clients.values()).map(client => ({
        name: client.name,
        ip: client.ip,
        connectedAt: client.connectedAt
    }));
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
server.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIPAddress();
    console.log(`WebSocket 서버가 포트 ${PORT}에서 시작되었습니다`);
    console.log(`로컬 접속: http://localhost:${PORT}`);
    console.log(`네트워크 접속: http://${localIP}:${PORT}`);
    console.log(`휴대폰 접속: http://${localIP}:${PORT}/client.html`);
    console.log(`클라이언트 연결 대기 중...`);
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

setInterval(() => {
    console.log(`현재 연결된 클라이언트 수: ${clients.size}`);
    if (clients.size > 0) {
        console.log('연결된 클라이언트 목록:');
        clients.forEach((client, clientId) => {
            console.log(`  #${clientId}: ${client.name || '이름 없음'} (${client.ip})`);
        });
    }
}, 30000);