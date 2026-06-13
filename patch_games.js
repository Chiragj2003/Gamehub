const fs = require('fs');
const file = 'c:/Users/chira/Desktop/game_hub/components/ClassicGames.tsx';

let content = fs.readFileSync(file, 'utf8');

// We want to add let isGameOver = false; after let animId: number;
content = content.replace(/let animId: number;/g, 'let animId: number;\n    let isGameOver = false;');

// We want to replace onGameOver( with isGameOver = true; onGameOver(
// But wait, there is const onGameOver = ... in some places? No, it's a prop.
// In the prop destructuring: { onGameOver } -> we don't want to replace that.
// We only want to replace onGameOver(score) or similar.
content = content.replace(/onGameOver\(/g, 'isGameOver = true; onGameOver(');

// Now we need to replace animId = requestAnimationFrame(update); 
// inside the update function with if (!isGameOver) animId = requestAnimationFrame(update);
// But wait, the initial call outside update should also be protected, or it doesn't matter since isGameOver is false.
content = content.replace(/animId = requestAnimationFrame\(update\);/g, 'if (!isGameOver) animId = requestAnimationFrame(update);');

fs.writeFileSync(file, content);
console.log('Successfully patched ClassicGames.tsx to prevent overlapping loops.');
