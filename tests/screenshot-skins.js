/**
 * Headless check: every paid skin paints, store rows stay Unavailable on the web,
 * hub game pages load ArcadeStore, and a standalone /index.html does not.
 *
 * Usage: node tests/screenshot-skins.js http://127.0.0.1:8765
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const base = process.argv[2] || 'http://127.0.0.1:8765';
const outDir = '/opt/cursor/artifacts/screenshots';

const shots = [
  ['blockblast', 'marble', '/blockblast/game.html?theme=marble'],
  ['blockblast', 'walnut', '/blockblast/game.html?theme=walnut'],
  ['blockblast', 'stainedglass', '/blockblast/game.html?theme=stainedglass'],
  ['solitaire', 'solitaire-noir', '/solitaire/game.html?deal=3&mode=1&theme=solitaire-noir'],
  ['solitaire', 'solitaire-burgundy', '/solitaire/game.html?deal=3&mode=1&theme=solitaire-burgundy'],
  ['spidersolitaire', 'spider-violet', '/spidersolitaire/game.html?difficulty=4suit&level=7&theme=spider-violet'],
  ['spidersolitaire', 'spider-emerald', '/spidersolitaire/game.html?difficulty=4suit&level=7&theme=spider-emerald'],
  ['spades', 'montecarlo', '/spades/game.html?mode=twos_wild&target=200&theme=montecarlo'],
  ['spades', 'artdeco', '/spades/game.html?mode=classic&target=250&theme=artdeco'],
  ['mahjong', 'ivory', '/mahjong/game.html?layout=turtle&theme=ivory'],
  ['mahjong', 'bamboo', '/mahjong/game.html?layout=turtle&theme=bamboo'],
  ['mahjong', 'porcelain', '/mahjong/game.html?layout=turtle&theme=porcelain'],
  ['minesweeper', 'europa', '/minesweeper/game.html?diff=recruit&theme=europa'],
  ['minesweeper', 'venus', '/minesweeper/game.html?diff=recruit&theme=venus'],
  ['codebreaker', 'phosphor', '/codebreaker/game.html?diff=rookie&theme=phosphor'],
  ['codebreaker', 'amber', '/codebreaker/game.html?diff=rookie&theme=amber'],
  ['codebreaker', 'hacker', '/codebreaker/game.html?diff=rookie&theme=hacker'],
  ['sudoku', 'washi', '/sudoku/game.html?difficulty=easy&level=1&theme=washi'],
  ['sudoku', 'nightink', '/sudoku/game.html?difficulty=easy&level=1&theme=nightink'],
  ['sudoku', 'sumie', '/sudoku/game.html?difficulty=easy&level=1&theme=sumie'],
  ['nonogram', 'kintsugi', '/nonogram/game.html?difficulty=beginner&level=1&theme=kintsugi'],
  ['nonogram', 'indigo', '/nonogram/game.html?difficulty=beginner&level=1&theme=indigo'],
  ['wordsearch', 'atlas', '/wordsearch/game.html?category=animals&difficulty=easy&level=1&theme=atlas'],
  ['wordsearch', 'neonink', '/wordsearch/game.html?category=animals&difficulty=easy&level=1&theme=neonink']
];

const checks = [
  ['blockblast store', '/blockblast/store.html', 'blockblast'],
  ['solitaire store', '/solitaire/store.html', 'solitaire'],
  ['spades store', '/spades/store.html', 'spades'],
  ['hub blockblast', '/www/blockblast/www/store.html', 'blockblast'],
  ['hub spades game', '/www/spades/www/game.html?theme=montecarlo', 'spades']
];

function ignore(text) {
  const t = String(text || '');
  return /favicon|fonts\.google|fonts\.gstatic|net::ERR_NAME|Failed to load resource: net::ERR/i.test(t);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const standalone = spawn('python3', ['-m', 'http.server', '8766', '--bind', '127.0.0.1'], {
    cwd: path.join(__dirname, '..', 'blockblast', 'www'),
    stdio: 'ignore'
  });

  const chrome = spawn('google-chrome', [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--remote-debugging-port=9336',
    '--user-data-dir=/tmp/arcade-cosmetics-chrome',
    'about:blank'
  ], { stdio: 'ignore' });

  let version;
  for (let i = 0; i < 40; i++) {
    try {
      version = await fetch('http://127.0.0.1:9336/json/version').then(r => r.json());
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
      height: 900,
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
        if (resp.status >= 400 && /arcade-store|arcade-cosmetics|arcade-purchases/.test(resp.url)) {
          problems.push('http ' + resp.status + ' ' + resp.url);
        }
      }
    };
    browser.addEventListener('message', onMessage);
    await send('Page.navigate', { url }, sessionId);
    await new Promise(r => setTimeout(r, 1400));
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
    for (const [game, skin, pagePath] of shots) {
      const page = await open(base + pagePath);
      const evaluated = await send('Runtime.evaluate', {
        expression: `(() => {
          const game = ${JSON.stringify(game)};
          if (game === 'minesweeper') {
            const cells = Array.from(document.querySelectorAll('.cell'));
            if (cells[0]) {
              cells[0].classList.add('cell--flagged');
              if (!cells[0].querySelector('.flag-icon')) {
                const icon = document.createElement('span');
                icon.className = 'flag-icon';
                icon.textContent = '⚑';
                cells[0].appendChild(icon);
              }
            }
            if (cells[1]) cells[1].classList.add('cell--exploded');
            if (cells[2]) {
              cells[2].classList.add('cell--revealed', 'cell--num-1');
              cells[2].textContent = '1';
            }
          }
          if (game === 'nonogram') {
            document.querySelectorAll('.grid-cell').forEach((cell, index) => {
              if (index % 3 === 0) cell.classList.add('filled');
            });
          }
          if (game === 'spades') {
            const bid = document.getElementById('bidding-modal');
            if (bid) bid.style.display = 'none';
          }
          return {
            skin: document.documentElement.dataset.paidSkin || '',
            theme: document.body ? document.body.dataset.theme || '' : '',
            preview: document.documentElement.dataset.paidPreview || '',
            store: !!window.ArcadeStore,
            saved: localStorage.getItem('arcade_cosmetic_v1')
          };
        })()`,
        returnByValue: true
      }, page.sessionId);
      await new Promise(r => setTimeout(r, 200));
      const shot = await send('Page.captureScreenshot', { format: 'png' }, page.sessionId);
      const file = path.join(outDir, 'skin_' + game + '_' + skin + '.png');
      fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
      const value = evaluated.result && evaluated.result.value;
      if (!value) page.problems.push('no eval');
      else {
        if (value.skin !== skin) page.problems.push('skin ' + value.skin);
        if (game === 'blockblast' && value.theme !== skin) page.problems.push('theme ' + value.theme);
        if (value.preview !== '1') page.problems.push('preview not marked');
        if (value.saved) page.problems.push('preview saved ' + value.saved);
        if (!value.store) page.problems.push('ArcadeStore missing on hub path');
      }
      await page.close();
      if (page.problems.length) {
        failures.push(skin + ' ' + page.problems.join('; '));
        console.log('FAIL', skin, page.problems);
      } else {
        console.log('ok  ', file);
      }
    }

    for (const [name, pagePath, game] of checks) {
      const page = await open(base + pagePath);
      const evaluated = await send('Runtime.evaluate', {
        expression: `(() => {
          const text = document.body ? document.body.innerText : '';
          return {
            store: !!window.ArcadeStore,
            price: window.ArcadeStore ? window.ArcadeStore.getPrice('com.gamingempire.benchmarkarcade.blockblast.skin.marble') : 'missing',
            unavailable: text.includes('Unavailable'),
            cabinet: text.includes('Cabinet skins'),
            priceText: (text.match(/\\$\\d+\\.\\d{2}/) || [])[0] || '',
            skin: document.documentElement.dataset.paidSkin || ''
          };
        })()`,
        returnByValue: true
      }, page.sessionId);
      const value = evaluated.result && evaluated.result.value;
      if (!value || !value.store) page.problems.push('store missing');
      if (value && value.price !== null) page.problems.push('price ' + value.price);
      if (value && value.priceText) page.problems.push('price text ' + value.priceText);
      if (name.indexOf('store') !== -1) {
        if (!value || !value.unavailable || !value.cabinet) page.problems.push('shelf ' + JSON.stringify(value));
      }
      if (name === 'hub spades game' && (!value || value.skin !== 'montecarlo')) {
        page.problems.push('hub skin ' + (value && value.skin));
      }
      if (name === 'blockblast store') {
        const shot = await send('Page.captureScreenshot', { format: 'png' }, page.sessionId);
        fs.writeFileSync(path.join(outDir, 'store_blockblast_unavailable.png'), Buffer.from(shot.data, 'base64'));
      }
      if (name === 'solitaire store') {
        const shot = await send('Page.captureScreenshot', { format: 'png' }, page.sessionId);
        fs.writeFileSync(path.join(outDir, 'store_solitaire_cardroom.png'), Buffer.from(shot.data, 'base64'));
      }
      await page.close();
      if (page.problems.length) {
        failures.push(name + ' ' + page.problems.join('; '));
        console.log('FAIL', name, page.problems);
      } else {
        console.log('ok  ', name, game);
      }
    }

    const alone = await open('http://127.0.0.1:8766/index.html');
    const aloneValue = await send('Runtime.evaluate', {
      expression: `({ store: typeof window.ArcadeStore !== 'undefined', depth: location.pathname })`,
      returnByValue: true
    }, alone.sessionId);
    const aloneResult = aloneValue.result && aloneValue.result.value;
    if (!aloneResult || aloneResult.store) alone.problems.push('standalone loaded ArcadeStore ' + JSON.stringify(aloneResult));
    await alone.close();
    if (alone.problems.length) {
      failures.push('standalone ' + alone.problems.join('; '));
      console.log('FAIL standalone', alone.problems);
    } else {
      console.log('ok   standalone /index.html');
    }
  } finally {
    browser.close();
    chrome.kill();
    standalone.kill();
  }

  if (failures.length) {
    console.error('\n' + failures.join('\n'));
    process.exit(1);
  }
  console.log('screenshot-skins: painted looks, unavailable web prices, standalone stayed free');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
