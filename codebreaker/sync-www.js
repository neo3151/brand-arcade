const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const destDir = path.join(__dirname, 'www');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Copy HTML files
['index.html', 'game.html', 'store.html'].forEach(file => {
  const p = path.join(srcDir, file);
  if (fs.existsSync(p)) {
    fs.copyFileSync(p, path.join(destDir, file));
  }
});

// Copy asset directories
['css', 'js'].forEach(dir => {
  const p = path.join(srcDir, dir);
  if (fs.existsSync(p)) {
    copyRecursive(p, path.join(destDir, dir));
  }
});

console.log('✓ Successfully synchronized web assets to www/');
