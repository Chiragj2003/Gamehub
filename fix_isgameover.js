const fs = require('fs');
const file = 'c:/Users/chira/Desktop/game_hub/components/ClassicGames.tsx';

let content = fs.readFileSync(file, 'utf8');

// The React-based games don't have requestAnimationFrame and therefore don't have animId
// We injected 'isGameOver = true;' incorrectly into them. Let's fix that.

// First, find ClassicMemoryMatch
let memoryMatchStart = content.indexOf('export const ClassicMemoryMatch');
let connectFourStart = content.indexOf('export const ClassicConnectFour');
let ticTacToeStart = content.indexOf('export const ClassicTicTacToe');
let c2048Start = content.indexOf('export const Classic2048');

// We can just remove 'isGameOver = true; ' from the entire bottom half of the file
// Or simply just replace all instances of "isGameOver = true; onGameOver" with "onGameOver"
// for the React games by splitting the string.

if (memoryMatchStart !== -1) {
    let topHalf = content.substring(0, memoryMatchStart);
    let bottomHalf = content.substring(memoryMatchStart);
    
    // In bottom half, remove all isGameOver = true;
    bottomHalf = bottomHalf.replace(/isGameOver = true; /g, '');
    
    content = topHalf + bottomHalf;
    fs.writeFileSync(file, content);
    console.log('Successfully fixed ClassicGames.tsx compilation errors.');
} else {
    console.log('Could not find ClassicMemoryMatch');
}
