#!/bin/bash

echo "🔥 macOS 방화벽에 센서 게임 허브 포트 허용 설정"
echo "================================================="
echo ""

echo "🔍 현재 방화벽 상태 확인..."
firewall_status=$(/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null)
echo "$firewall_status"
echo ""

if [[ "$firewall_status" == *"enabled"* ]]; then
    echo "🔥 방화벽이 활성화되어 있습니다."
    echo ""
    echo "📋 다음 중 하나의 방법을 선택하세요:"
    echo ""
    echo "방법 1: 시스템 환경설정에서 수동 설정 (권장)"
    echo "1. 시스템 환경설정 > 보안 및 개인 정보 보호 > 방화벽"
    echo "2. 방화벽 옵션 클릭"
    echo "3. '+' 버튼으로 Node.js 추가"
    echo "4. '들어오는 연결 허용' 선택"
    echo ""
    echo "방법 2: 터미널에서 자동 설정"
    echo "다음 명령어를 실행하세요:"
    echo "sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node"
    echo "sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node"
    echo ""
    echo "방법 3: 일시적으로 방화벽 비활성화 (비권장)"
    echo "sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off"
    echo ""
else
    echo "✅ 방화벽이 비활성화되어 있습니다. 다른 문제일 수 있습니다."
fi

echo "🔍 Node.js 경로 확인:"
which node

echo ""
echo "🌐 테스트할 URL:"
echo "- 로컬: https://localhost:8443"
echo "- 네트워크: https://172.30.1.43:8443"