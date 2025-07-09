#!/bin/bash

# macOS에서 자체 서명 인증서를 신뢰하도록 설정하는 스크립트

echo "🔒 macOS에서 HTTPS 인증서 신뢰 설정"
echo "===================================="
echo ""

# 현재 디렉토리에서 cert.pem 파일 확인
if [ ! -f "cert.pem" ]; then
    echo "❌ cert.pem 파일을 찾을 수 없습니다."
    echo "   ./setup-ssl.sh를 먼저 실행하여 인증서를 생성하세요."
    exit 1
fi

echo "🔍 인증서 파일 확인: ✅ cert.pem 발견"
echo ""

# 인증서를 시스템 키체인에 추가
echo "🔐 인증서를 시스템 키체인에 추가하는 중..."
echo "   (관리자 비밀번호가 필요할 수 있습니다)"
echo ""

# 인증서를 키체인에 추가하고 신뢰 설정
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain cert.pem

if [ $? -eq 0 ]; then
    echo "✅ 인증서가 성공적으로 시스템 키체인에 추가되었습니다!"
    echo ""
    echo "🌐 이제 브라우저에서 다음 URL에 안전하게 접속할 수 있습니다:"
    echo "   https://localhost:8443"
    echo "   https://172.30.1.43:8443"
    echo ""
    echo "📱 모바일에서도 보안 경고 없이 접속 가능합니다:"
    echo "   https://172.30.1.43:8443/sensor-client"
    echo ""
    echo "⚠️  주의: 개발이 완료되면 다음 명령어로 인증서를 제거하세요:"
    echo "   sudo security delete-certificate -c localhost /Library/Keychains/System.keychain"
    echo ""
else
    echo "❌ 인증서 추가에 실패했습니다."
    echo ""
    echo "🔧 수동 설정 방법:"
    echo "1. 브라우저에서 https://localhost:8443 접속"
    echo "2. '고급' 버튼 클릭"
    echo "3. 'localhost(안전하지 않음)로 이동' 클릭"
    echo ""
    echo "📱 iOS에서 설정 방법:"
    echo "1. https://172.30.1.43:8443/sensor-client 접속"
    echo "2. '고급' 터치"
    echo "3. '172.30.1.43(안전하지 않음)로 이동' 터치"
    echo "4. 설정 > 일반 > VPN 및 기기 관리 > 인증서 신뢰"
fi

echo ""
echo "🎮 준비 완료! 센서 게임을 즐기세요!"