#!/bin/bash

# 센서 게임 허브 HTTPS 설정 스크립트
# 자동 SSL 인증서 생성 및 시스템 신뢰 설정

echo "🔐 센서 게임 허브 HTTPS 설정"
echo "=============================="
echo ""

# 현재 디렉토리 확인
if [ ! -f "server.js" ]; then
    echo "❌ 센서 게임 허브 프로젝트 폴더에서 실행해주세요."
    exit 1
fi

# 현재 IP 주소 가져오기
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP="192.168.1.100"  # 기본값
fi

echo "🔍 네트워크 정보:"
echo "   로컬 IP: $LOCAL_IP"
echo "   호스트명: localhost"
echo ""

# 기존 인증서 확인
if [ -f "cert.pem" ] && [ -f "key.pem" ]; then
    echo "⚠️  기존 SSL 인증서가 발견되었습니다."
    echo "   기존 인증서를 삭제하고 새로 생성하시겠습니까? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        rm -f cert.pem key.pem
        echo "✅ 기존 인증서를 삭제했습니다."
    else
        echo "✅ 기존 인증서를 유지합니다."
        echo ""
        echo "🔒 HTTPS 서버 접속 URL:"
        echo "   메인 허브: https://$LOCAL_IP:8443"
        echo "   센서 연결: https://$LOCAL_IP:8443/sensor-client"
        echo ""
        echo "🚀 서버 시작: npm start"
        exit 0
    fi
fi

echo "🔐 SSL 인증서 생성 중..."

# OpenSSL 설치 확인
if ! command -v openssl &> /dev/null; then
    echo "❌ OpenSSL이 설치되어 있지 않습니다."
    echo "   macOS: brew install openssl"
    echo "   Ubuntu: sudo apt-get install openssl"
    exit 1
fi

# SSL 인증서 생성 (SAN 확장으로 여러 도메인 지원)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
    -subj "/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1,IP:$LOCAL_IP"

if [ $? -eq 0 ]; then
    echo "✅ SSL 인증서가 성공적으로 생성되었습니다!"
    echo "   - 인증서: cert.pem"
    echo "   - 키 파일: key.pem"
    echo "   - 지원 도메인: localhost, 127.0.0.1, $LOCAL_IP"
    echo ""
else
    echo "❌ SSL 인증서 생성에 실패했습니다."
    exit 1
fi

# macOS에서 자동 인증서 신뢰 설정
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🔐 macOS 키체인에 인증서 신뢰 설정 중..."
    
    # 기존 인증서 확인
    if security find-certificate -c localhost /Library/Keychains/System.keychain 2>/dev/null; then
        echo "✅ 인증서가 이미 키체인에 신뢰되어 있습니다."
    else
        echo "   (관리자 비밀번호가 필요합니다)"
        if sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain cert.pem; then
            echo "✅ 인증서가 시스템 키체인에 추가되었습니다!"
            echo "   이제 브라우저에서 보안 경고 없이 HTTPS에 접속할 수 있습니다."
        else
            echo "⚠️  인증서 자동 추가에 실패했습니다."
            echo "   브라우저에서 보안 경고가 나타나면 '고급' → '안전하지 않음으로 이동'을 클릭하세요."
        fi
    fi
    echo ""
fi

# 방화벽 확인 및 안내
if [[ "$OSTYPE" == "darwin"* ]]; then
    FIREWALL_STATUS=$(/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null)
    if [[ "$FIREWALL_STATUS" == *"enabled"* ]]; then
        echo "🔥 macOS 방화벽이 활성화되어 있습니다."
        echo "   모바일 기기에서 접속이 안 될 경우 다음 방법을 시도하세요:"
        echo ""
        echo "   방법 1: 시스템 환경설정에서 설정 (권장)"
        echo "   1. 시스템 환경설정 → 보안 및 개인 정보 보호 → 방화벽"
        echo "   2. 방화벽 옵션 클릭"
        echo "   3. '+' 버튼으로 Node.js 추가"
        echo "   4. '들어오는 연결 허용' 선택"
        echo ""
        echo "   방법 2: 터미널에서 자동 설정"
        echo "   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node"
        echo "   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node"
        echo ""
    fi
fi

# 완료 메시지
echo "🎉 HTTPS 설정이 완료되었습니다!"
echo "================================="
echo ""
echo "🔒 HTTPS 서버 접속 URL:"
echo "   메인 허브: https://$LOCAL_IP:8443"
echo "   로컬 접속: https://localhost:8443"
echo ""
echo "📱 모바일 접속 (센서 연결용):"
echo "   https://$LOCAL_IP:8443/sensor-client"
echo ""
echo "🎮 PC 접속 (게임 플레이용):"
echo "   https://$LOCAL_IP:8443"
echo ""
echo "📊 기타 서비스:"
echo "   대시보드: https://$LOCAL_IP:8443/dashboard"
echo "   개발자 문서: https://$LOCAL_IP:8443/docs"
echo ""
echo "🚀 서버 시작 명령어:"
echo "   npm start"
echo ""
echo "💡 사용 방법:"
echo "   1. 서버 시작: npm start"
echo "   2. 모바일: 센서 연결 URL 접속"
echo "   3. PC: 메인 허브 URL 접속"
echo "   4. 게임 즐기기! 🎮"
echo ""
echo "⚠️  인증서 제거 시 (개발 완료 후):"
echo "   sudo security delete-certificate -c localhost /Library/Keychains/System.keychain"
echo ""