/**
 * cap sync rewrites packageClassList from CocoaPods plugins only.
 * Put the in-app Island plugin back so the next launch still registers it.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'ios', 'App', 'App', 'capacitor.config.json');
const fallback = {
  appId: 'com.gamingempire.benchmarkarcade',
  appName: 'Benchmark Arcade',
  webDir: 'www',
  server: { androidScheme: 'https', iosScheme: 'https' },
  packageClassList: []
};

const config = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
const list = Array.isArray(config.packageClassList) ? config.packageClassList : [];
if (!list.includes('ArcadeIslandPlugin')) list.push('ArcadeIslandPlugin');
if (!list.includes('PurchasesPlugin')) list.unshift('PurchasesPlugin');
config.packageClassList = list;
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(config, null, '\t') + '\n');
console.log('ArcadeIslandPlugin is in ios/App/App/capacitor.config.json');
