const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const destDir = path.join(__dirname, 'www');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const copyList = [
  'index.html',
  'game.html',
  'store.html',
  'css',
  'js'
];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(child => {
      copyRecursive(path.join(src, child), path.join(dest, child));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyList.forEach(item => {
  const s = path.join(srcDir, item);
  const d = path.join(destDir, item);
  if (fs.existsSync(s)) {
    copyRecursive(s, d);
  }
});

console.log('✓ Successfully synchronized web assets to www/');
