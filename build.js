// concatenates src/*.js in order into game.js and inlines into index.html
const fs = require('fs'), path = require('path');
const files = fs.readdirSync('src').filter(f => /^\d+_.*\.js$/.test(f)).sort();
const js = files.map(f => `// ---- ${f}\n` + fs.readFileSync(path.join('src', f), 'utf8')).join('\n');
fs.writeFileSync('game.js', js);
const shell = fs.readFileSync('src/shell.html', 'utf8');
fs.writeFileSync('index.html', shell.replace('/*GAME*/', () => js));
console.log('built', files.length, 'modules,', (js.length / 1024).toFixed(1), 'KB');
