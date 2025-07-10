# Rhythm Blade 개발 로그

이 문서는 `sensor-game-hub` 프로젝트 내 `games/rhythm-blade` 게임의 개발 과정을 기록한 로그입니다.

## 1. 프로젝트 개요

*   **게임명:** Rhythm Blade
*   **목표:** 핸드폰 센서를 활용하여 비트세이버와 유사한 VR 리듬 게임을 웹 환경에서 구현.
*   **핵심 기능:**
    *   두 개의 라이트세이버 (왼쪽/오른쪽)를 이용한 큐브 노트 베기.
    *   큐브 노트는 멀리서 생성되어 플레이어에게 다가옴.
    *   인게임 에디터를 통한 게임 설정(큐브 속도, 노트 생성 거리, 노트 시퀀스) 실시간 변경.
    *   게임 클리어율 게이지 및 게임 종료 판정.

## 2. 구현된 주요 기능 및 변경 사항

### 2.1. 3D 렌더링 환경 구축 (`index.html`, `game.js`)

*   **`index.html`:**
    *   `three.js` 라이브러리 추가 (`<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>`).
    *   게임 캔버스 대신 `three.js` 렌더러가 부착될 `<div id="game-container">` 추가.
    *   에디터 UI (`editor-container`) 및 'Edit Settings' 버튼 (`show-editor-btn`) 추가.
    *   게이지 바 UI (`gauge-container`, `gauge-bar`) 추가.
    *   게임 종료 모달 (`game-over-modal`) 및 관련 UI (`game-over-title`, `final-score`, `restart-btn`) 추가.
    *   새로운 UI 요소들에 대한 CSS 스타일 추가.
*   **`game.js`:**
    *   2D 캔버스 기반 렌더링에서 `three.js`를 이용한 3D 렌더링으로 전면 전환.
    *   `THREE.Scene`, `THREE.PerspectiveCamera`, `THREE.WebGLRenderer` 초기화.
    *   3D 라이트세이버(`createSaber` 함수) 및 큐브 노트(`THREE.BoxGeometry`) 생성 로직 구현.
    *   광원(`THREE.AmbientLight`, `THREE.DirectionalLight`) 추가.

### 2.2. 인게임 에디터 및 게임 흐름 제어

*   **`index.html`:**
    *   에디터는 기본적으로 숨겨져 있으며, 'Edit Settings' 버튼 클릭 시 표시.
    *   'Apply and Restart Game' 버튼 클릭 시 에디터 숨김.
*   **`game.js`:**
    *   `showEditor()`: 게임 일시 정지 및 에디터 표시.
    *   `hideEditor()`: 에디터 숨김 및 게임 재개.
    *   `applySettings()`: 에디터의 `cubeSpeed`, `spawnDistance`, `noteSequence` 값을 읽어 게임 설정에 적용. `noteSequence`의 길이를 `totalNotes`로 계산하여 게이지 시스템에 활용.
    *   `restartGame()`: 게임 상태(점수, 콤보, 노트 관련 변수) 초기화, 기존 노트 제거, 게임 오버 모달 숨김, 게이지 100%로 초기화.
    *   `DOMContentLoaded` 이벤트에서 `window.game.applySettings()` 및 `window.game.hideEditor()`를 호출하여 게임이 로드되자마자 시작되고 에디터가 숨겨지도록 설정.

### 2.3. 센서 입력 처리 및 감도 조절

*   **`game.js` - `handleSensorInput`:**
    *   `SensorGameSDK`에서 처리된 `gameInput.rotation.speed` (회전 속도)와 `gameInput.rotation.direction` (회전 방향)을 사용하여 스윙 감지.
    *   `gameInput.rotation.direction`을 라디안에서 각도로 변환하여 좌/우 스윙 판별.
    *   **센서 로그 출력:** `console.log('Sensor Data:', gameInput);`를 추가하여 센서 데이터 디버깅 용이.
    *   **감도 조절:**
        *   `sensorSensitivity.gyroscope`: `2.0`에서 `1.0`으로 변경 (전반적인 자이로스코프 민감도 감소).
        *   `swingThreshold`: `40`에서 `200`으로 변경 (스윙으로 인식하는 최소 회전 속도 증가).
        *   **목표:** 강하게 휘두를 때만 센서가 반응하도록 둔감하게 설정.

### 2.4. 충돌 감지 및 파괴 이펙트

*   **`game.js` - `checkHit`:**
    *   기존의 단순 Z축 위치 비교 대신, `three.js`의 `THREE.Box3().setFromObject()`와 `intersectsBox()`를 사용하여 블레이드와 큐브 간의 정확한 3D 경계 충돌 감지.
    *   충돌 성공 시 `createHitEffect()` 호출.
*   **`game.js` - `createHitEffect`:**
    *   큐브가 파괴된 위치에 작은 큐브 형태의 파티클을 여러 개 생성.
    *   파티클에 무작위 속도와 수명(`userData.life`) 부여.
    *   `particleEffects` 배열에 파티클 그룹 추가.
*   **`game.js` - `updateEffects`:**
    *   `particleEffects` 배열을 순회하며 각 파티클의 위치, 크기, 수명 업데이트.
    *   수명이 다한 파티클은 장면에서 제거.
*   **`game.js` - `update`:**
    *   매 프레임 `updateEffects()`를 호출하여 파티클 애니메이션 갱신.

### 2.5. 게이지 바 및 게임 종료 로직

*   **`game.js` - `gameState`:**
    *   `totalNotes`: 현재 비트맵의 총 노트 수.
    *   `missedNotes`: 플레이어가 놓친 노트 수.
    *   `notesProcessed`: 처리된 노트 수 (친 노트 + 놓친 노트).
    *   `gaugePercent`: 현재 클리어율 (100%에서 시작).
*   **`game.js` - `updateGauge`:**
    *   `gaugeBar` UI의 너비를 `gaugePercent`에 따라 조절.
    *   게이지 퍼센트에 따라 게이지 바의 색상 변경 (초록 -> 노랑 -> 빨강).
    *   `missedNotes`와 `totalNotes`를 기반으로 `gaugePercent` 계산: `100 - (missedNotes / totalNotes) * 100`.
*   **`game.js` - `update`:**
    *   노트가 플레이어를 지나치면 (`note.position.z > this.camera.position.z + 2`) `missedNotes`와 `notesProcessed` 증가, `updateGauge()` 호출.
    *   `notesProcessed`가 `totalNotes`와 같아지면 `endGame()` 호출.
*   **`game.js` - `checkHit`:**
    *   노트를 성공적으로 쳤을 때 `notesProcessed` 증가, `updateGauge()` 호출.
*   **`game.js` - `endGame`:**
    *   `isPlaying`을 `false`로 설정하여 게임 정지.
    *   `gameOverModal` 표시.
    *   최종 `gaugePercent`를 `finalScore` UI에 표시.
    *   `gaugePercent`가 60% 이상이면 "Game Clear!", 아니면 "Clear Failed" 메시지 표시.
*   **`index.html` / `game.js`:**
    *   게임 종료 모달의 'Restart Game' 버튼 (`restart-btn`) 클릭 시 `restartGame()` 호출하여 게임 재시작.

## 3. `LLM_DEVELOPMENT_PROMPT.md` 지침 준수 여부

*   **`SensorGameSDK` 상속:** 완벽하게 준수.
*   **필수 메서드 구현:** `initializeGame`, `handleSensorInput`, `update`, `render` 등 핵심 메서드 모두 구현 및 활용.
*   **센서 데이터 활용:** `gameInput.rotation.speed` 및 `gameInput.rotation.direction`을 사용하여 자이로스코프 데이터를 정확히 활용.
*   **키보드 시뮬레이션:** 센서 미연결 시 키보드 시뮬레이션 기능 유지.
*   **폴더 구조:** `games/rhythm-blade/` 내 `index.html`, `game.js` 존재하여 자동 등록 시스템 준수.
*   **센서 상태 UI 표시:** 현재는 콘솔 로그로만 표시되나, 향후 UI 추가를 통해 지침의 권장 사항을 완전히 충족할 수 있음.

## 4. 향후 개선 사항 (선택 사항)

*   **센서 상태 UI:** 게임 화면 내에 센서 연결 상태를 시각적으로 표시하는 UI 추가.
*   **점수/콤보 UI:** 현재 콘솔에만 출력되는 점수와 콤보를 3D 화면에 표시.
*   **음악 동기화:** `noteSequence`를 실제 음악 파일의 비트에 맞춰 정교하게 조정.
*   **다양한 노트 타입:** 방향 지시가 있는 큐브, 연속 노트 등 추가.
*   **이펙트 개선:** 블레이드 스윙 시 잔상 효과, 큐브 파괴 시 더 다채로운 파티클 시스템.
*   **성능 최적화:** 대규모 노트 시퀀스 또는 복잡한 이펙트 시 발생할 수 있는 성능 저하에 대비한 최적화.

---
이 문서는 `rhythm-blade` 게임의 현재 상태와 개발 과정을 요약한 것입니다. 다음 작업에 도움이 되기를 바랍니다.
