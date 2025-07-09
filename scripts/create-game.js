#!/usr/bin/env node

/**
 * 새 게임 생성 스크립트
 * 사용법: node scripts/create-game.js <game-name>
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise(resolve => {
        rl.question(question, resolve);
    });
}

async function createGame() {
    try {
        console.log('🎮 새 센서 게임 생성 도구\n');
        
        // 게임 정보 입력
        const gameId = await ask('게임 ID (예: my-awesome-game): ');
        const gameName = await ask('게임 이름 (예: 나의 멋진 게임): ');
        const gameDescription = await ask('게임 설명: ');
        const authorName = await ask('개발자 이름: ');
        const gameIcon = await ask('게임 아이콘 (이모지): ');
        const gameCategory = await ask('게임 카테고리 (puzzle/action/racing/sport/casual/arcade): ');
        const gameDifficulty = await ask('게임 난이도 (easy/medium/hard): ');
        
        // 클래스 이름 생성
        const gameClassName = gameId.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join('') + 'Game';
        
        // 게임 폴더 생성
        const gameDir = path.join(__dirname, '../games', gameId);
        if (fs.existsSync(gameDir)) {
            console.log('❌ 이미 존재하는 게임 ID입니다.');
            rl.close();
            return;
        }
        
        fs.mkdirSync(gameDir, { recursive: true });
        
        // 템플릿 파일들 읽기
        const templateDir = path.join(__dirname, '../templates');
        const htmlTemplate = fs.readFileSync(path.join(templateDir, 'game-template.html'), 'utf8');
        const jsTemplate = fs.readFileSync(path.join(templateDir, 'game-template.js'), 'utf8');
        const jsonTemplate = fs.readFileSync(path.join(templateDir, 'game-template.json'), 'utf8');
        
        // 변수 치환
        const replacements = {
            '{{GAME_ID}}': gameId,
            '{{GAME_NAME}}': gameName,
            '{{GAME_DESCRIPTION}}': gameDescription,
            '{{AUTHOR_NAME}}': authorName,
            '{{GAME_ICON}}': gameIcon,
            '{{GAME_CATEGORY}}': gameCategory,
            '{{GAME_DIFFICULTY}}': gameDifficulty,
            '{{GAME_CLASS_NAME}}': gameClassName
        };
        
        function replaceTemplate(template) {
            let result = template;
            for (const [key, value] of Object.entries(replacements)) {
                result = result.replace(new RegExp(key, 'g'), value);
            }
            return result;
        }
        
        // 파일 생성
        fs.writeFileSync(path.join(gameDir, 'index.html'), replaceTemplate(htmlTemplate));
        fs.writeFileSync(path.join(gameDir, 'game.js'), replaceTemplate(jsTemplate));
        fs.writeFileSync(path.join(gameDir, 'game.json'), replaceTemplate(jsonTemplate));
        
        console.log(`\n✅ 게임 '${gameName}'이 성공적으로 생성되었습니다!`);
        console.log(`📁 경로: ${gameDir}`);
        console.log(`🎮 게임 URL: https://localhost:8443/games/${gameId}`);
        console.log(`\n📝 다음 단계:`);
        console.log(`1. ${gameDir}/game.js 파일을 편집하여 게임 로직 구현`);
        console.log(`2. 서버 재시작 (npm start)`);
        console.log(`3. 허브에서 게임 확인`);
        
    } catch (error) {
        console.error('❌ 게임 생성 실패:', error);
    } finally {
        rl.close();
    }
}

createGame();