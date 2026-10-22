/**
 * Headless check for content-pack pickers: lock, sample, Unavailable, no console errors.
 * Usage: node tests/screenshot-packs.js http://127.0.0.1:8765
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const curated = require('../solitaire/js/curated-deals');

const base = process.argv[2] || 'http://127.0.0.1:8765';
const outDir = '/opt/cursor/artifacts/screenshots';
const sampleDeal = curated.deals[0];
const lockedDeal = curated.deals[2];

const pages = [
  ['pack_wordsearch', '/wordsearch/index.html', 'picker', 'wordsearch'],
  ['pack_mahjong', '/mahjong/index.html', 'picker', 'mahjong'],
  ['pack_nonogram', '/nonogram/index.html', 'picker', 'nonogram'],
  ['pack_solitaire', '/solitaire/index.html', 'picker', 'solitaire'],
  ['pack_codebreaker', '/codebreaker/index.html', 'picker', 'codebreaker'],
  ['sample_mythology', '/wordsearch/game.html?category=mythology&difficulty=beginner&level=1', 'play', 'mythology'],
  ['sample_pagoda', '/mahjong/game.html?layout=pagoda', 'play', 'pagoda'],
  ['sample_holiday', '/nonogram/game.html?pack=holiday&level=1', 'play', 'holiday'],
  ['sample_curated', '/solitaire/game.html?deal=' + sampleDeal + '&mode=1', 'play', 'curated'],
  ['sample_heist', '/codebreaker/game.html?diff=heist&mission=1', 'play', 'heist'],
  ['locked_parks', '/wordsearch/game.html?category=parks&difficulty=beginner&level=1', 'lock', 'explorer'],
  ['locked_lotus', '/mahjong/game.html?layout=lotus', 'lock', 'layouts'],
  ['locked_picture', '/nonogram/game.html?pack=holiday&level=5', 'lock', 'holiday'],
  ['locked_deal', '/solitaire/game.html?deal=' + lockedDeal + '&mode=1', 'lock', 'curated'],
  ['locked_heist', '/codebreaker/game.html?diff=heist&mission=4', 'lock', 'heist'],
  ['hub_wordsearch', '/www/wordsearch/www/index.html', 'picker', 'wordsearch']
];

function ignore(text) {
  const t = String(text || '');
  return /favicon|fonts\.google|fonts\.gstatic|net::ERR_NAME|Failed to load resource: net::ERR/i.test(t);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const standalone = spawn('python3', ['-m', 'http.server', '8766', '--bind', '127.0.0.1'], {
    cwd: path.join(__dirname, '..', 'wordsearch', 'www'),
    stdio: 'ignore'
  });
  const chrome = spawn('google-chrome', [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--remote-debugging-port=9339',
    '--user-data-dir=/tmp/arcade-content-chrome',
    'about:blank'
  ], { stdio: 'ignore' });

  let version;
  for (let i = 0; i < 40; i++) {
    try {
      version = await fetch('http://127.0.0.1:9339/json/version').then(r => r.json());
      break;
    } catch (e) {
      await new Promise(r => setTimeout(r, 150));
    }
  }
  if (!version) {
    chrome.kill();
    standalone.kill();
    throw new Error('Chrome DevTools did not start');
  }

  const browser = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    browser.addEventListener('open', resolve);
    browser.addEventListener('error', reject);
  });

  let id = 0;
  const pending = new Map();
  browser.addEventListener('message', event => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });

  function send(method, params, sessionId) {
    const msgId = ++id;
    const payload = { id: msgId, method, params: params || {} };
    if (sessionId) payload.sessionId = sessionId;
    browser.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => pending.set(msgId, { resolve, reject }));
  }

  async function open(url) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Runtime.enable', {}, sessionId);
    await send('Page.enable', {}, sessionId);
    await send('Network.enable', {}, sessionId);
    await send('Emulation.setDeviceMetricsOverride', {
      width: 430,
      height: 1100,
      deviceScaleFactor: 2,
      mobile: true
    }, sessionId);
    const problems = [];
    const onMessage = event => {
      const msg = JSON.parse(event.data);
      if (msg.sessionId !== sessionId) return;
      if (msg.method === 'Runtime.exceptionThrown') {
        const desc = msg.params.exceptionDetails;
        const text = (desc.exception && desc.exception.description) || desc.text;
        if (!ignore(text)) problems.push('exception: ' + text);
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
        if (!ignore(text)) problems.push('console: ' + text);
      }
      if (msg.method === 'Network.responseReceived') {
        const resp = msg.params.response;
        if (resp.status >= 400 && /arcade-store|arcade-content|arcade-cosmetics|pack-words|picture-packs|curated-deals|heist\.js/.test(resp.url)) {
          problems.push('http ' + resp.status + ' ' + resp.url);
        }
      }
    };
    browser.addEventListener('message', onMessage);
    await send('Page.navigate', { url }, sessionId);
    await new Promise(r => setTimeout(r, 1200));
    return {
      sessionId,
      targetId,
      problems,
      async close() {
        browser.removeEventListener('message', onMessage);
        await send('Target.closeTarget', { targetId });
      }
    };
  }

  const failures = [];
  try {
    for (const [name, pagePath, kind] of pages) {
      const page = await open(base + pagePath);
      const evaluated = await send('Runtime.evaluate', {
        expression: `(() => {
          const shelf = document.querySelector('[data-content-shelf]');
          if (shelf) shelf.scrollIntoView({ block: 'start' });
          const text = document.body.innerText || '';
          return {
            hasStore: !!(window.ArcadeStore && window.ArcadeContent),
            unavailable: /unavailable/i.test(text),
            locked: /locked/i.test(text) || !!document.querySelector('.content-lock'),
            sample: /sample/i.test(text),
            price: /\\$\\d+\\.\\d{2}/.test(text),
            overlay: !!document.getElementById('content-lock-overlay'),
            grid: !!document.getElementById('ws-grid') || !!document.getElementById('board-viewport') || !!document.querySelector('.nonogram-grid, .grid-wrapper, #grid-board') || !!document.getElementById('tableau-area') || !!document.querySelector('.terminal-viewport')
          };
        })()`,
        returnByValue: true
      }, page.sessionId);
      const value = evaluated.result && evaluated.result.value;
      if (page.problems.length) failures.push(name + ' ' + page.problems.join(' | '));
      if (!value || !value.hasStore) failures.push(name + ' missing ArcadeContent');
      if (value && value.price) failures.push(name + ' showed a hard-coded price');
      if (kind === 'picker') {
        if (!value.unavailable) failures.push(name + ' missing Unavailable');
        if (!value.locked) failures.push(name + ' missing Locked');
        if (!value.sample) failures.push(name + ' missing Sample');
      }
      if (kind === 'picker' || name === 'sample_holiday' || name === 'sample_heist' || name === 'locked_parks') {
        const shot = await send('Page.captureScreenshot', { format: 'png' }, page.sessionId);
        fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(shot.data, 'base64'));
      }
      if (kind === 'lock' && value && !value.overlay) failures.push(name + ' did not lock');
      if (kind === 'play' && value && value.overlay) failures.push(name + ' locked a sample');
      await page.close();
    }

    const solo = await open('http://127.0.0.1:8766/index.html');
    const soloEval = await send('Runtime.evaluate', {
      expression: '({ store: typeof window.ArcadeStore, content: typeof window.ArcadeContent })',
      returnByValue: true
    }, solo.sessionId);
    const soloValue = soloEval.result && soloEval.result.value;
    if (!soloValue || soloValue.store !== 'undefined' || soloValue.content !== 'undefined') {
      failures.push('standalone loaded the store ' + JSON.stringify(soloValue));
    }
    if (solo.problems.length) failures.push('standalone ' + solo.problems.join(' | '));
    await solo.close();
  } finally {
    browser.close();
    chrome.kill();
    standalone.kill();
  }

  if (failures.length) {
    console.error(failures.join('\n'));
    process.exit(1);
  }
  console.log('content pack pages ok');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
