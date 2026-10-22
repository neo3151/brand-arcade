/**
 * sync-hub.js — Mobile Asset Synchronizer for Brand Arcade Hub
 * Prepares the www/ directory for Capacitor iOS & Android builds
 */
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const destDir = path.join(__dirname, 'www');

console.log('🔄 Synchronizing Brand Arcade Hub assets to www/...');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
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

// 1. Copy Core Hub Web Assets
const coreFiles = ['index.html', 'manifest.json', 'sw.js'];
coreFiles.forEach(file => {
  const s = path.join(rootDir, file);
  const d = path.join(destDir, file);
  if (fs.existsSync(s)) {
    fs.copyFileSync(s, d);
  }
});

// 2. Copy Shared Assets Folder (CSS, Icons, Scripts, Telemetry HUD, Passport, hub store)
['arcade-store.js', 'arcade-cosmetics.js', 'arcade-cosmetics.css', 'arcade-content.js', 'arcade-content.css'].forEach(file => {
  const entry = path.join(rootDir, 'assets', file);
  if (!fs.existsSync(entry)) {
    throw new Error('assets/' + file + ' is required for the hub store');
  }
});
copyRecursive(path.join(rootDir, 'assets'), path.join(destDir, 'assets'));

// 3. Copy 10 Arcade Game Web Runtime Bundles
const games = [
  'blockblast', 'solitaire', 'sudoku', 'nonogram', 'minesweeper',
  'mahjong', 'codebreaker', 'wordsearch', 'spidersolitaire', 'spades'
];

games.forEach(game => {
  const gameWww = path.join(rootDir, game, 'www');
  const targetGameWww = path.join(destDir, game, 'www');
  if (fs.existsSync(gameWww)) {
    copyRecursive(gameWww, targetGameWww);
  }
});

console.log('✓ Successfully synchronized Hub and 10 games into www/ for Capacitor!');
