/**
 * Load each game's menu, supply page, and a playable board.
 * Fails on uncaught exceptions, console errors, or a real-money price in the UI.
 *
 * Usage: node tests/smoke-pages.js http://127.0.0.1:8765
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');

function chromeBin() {
  const mac = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  if (process.platform === 'darwin' && fs.existsSync(mac)) return mac;
  return 'google-chrome';
}

const base = process.argv[2] || 'http://127.0.0.1:8765';
const pages = [
  ['blockblast menu', '/blockblast/index.html', "window.Progress.getPowerups().hammer >= 15 && window.Progress.getCoins() >= 0"],
  ['blockblast supply', '/blockblast/store.html', "document.body.innerText.includes('Morning') || document.body.innerText.includes('refill')"],
  ['blockblast play', '/blockblast/game.html', 'true'],
  ['solitaire menu', '/solitaire/index.html', 'window.SolitaireProgress.getHints() >= 15'],
  ['solitaire supply', '/solitaire/store.html', "document.body.innerText.includes('Morning Supply')"],
  ['solitaire play', '/solitaire/game.html?deal=3&mode=1', 'true'],
  ['sudoku menu', '/sudoku/index.html', "window.Progress.getUnlockedLevel('master') === 1000 && window.Progress.getHints() >= 15"],
  ['sudoku supply', '/sudoku/store.html', "document.body.innerText.includes('Morning')"],
  ['sudoku play', '/sudoku/game.html?difficulty=hard&level=12', 'true'],
  ['nonogram menu', '/nonogram/index.html', "window.Progress.getUnlockedLevel('master') === 1000 && window.Progress.getInventory().coins >= 0"],
  ['nonogram supply', '/nonogram/store.html', "document.body.innerText.includes('Morning') && !/\\$\\d+\\.\\d{2}/.test(document.body.innerText)"],
  ['nonogram play', '/nonogram/game.html?difficulty=beginner&level=2', 'true'],
  ['minesweeper menu', '/minesweeper/index.html', 'window.Progress.getInventory().shields >= 15'],
  ['minesweeper supply', '/minesweeper/store.html', "document.body.innerText.includes('Morning')"],
  ['minesweeper play', '/minesweeper/game.html?diff=nightmare', 'true'],
  ['mahjong menu', '/mahjong/index.html', 'window.Progress.getInventory().undos >= 15'],
  ['mahjong supply', '/mahjong/store.html', "document.body.innerText.includes('morning') || document.body.innerText.includes('Morning')"],
  ['mahjong play', '/mahjong/game.html?layout=dragon', 'true'],
  ['codebreaker menu', '/codebreaker/index.html', 'window.Progress.getInventory().decryptors >= 15'],
  ['codebreaker supply', '/codebreaker/store.html', "document.getElementById('fair-play-status') && document.getElementById('fair-play-status').textContent.length > 20"],
  ['codebreaker play', '/codebreaker/game.html?diff=chief', 'true'],
  ['wordsearch menu', '/wordsearch/index.html', "window.Progress.getUnlockedLevel('space','master') === 1000"],
  ['wordsearch supply', '/wordsearch/store.html', "document.body.innerText.includes('Morning')"],
  ['wordsearch play', '/wordsearch/game.html?category=animals&difficulty=master&level=8', 'true'],
  ['spider menu', '/spidersolitaire/index.html', "window.Progress.getUnlockedLevel('4suit') === 1000"],
  ['spider supply', '/spidersolitaire/store.html', "window.Progress.getInventory().coins >= 0 && document.body.innerText.includes('Morning') && !/\\$\\d+\\.\\d{2}/.test(document.body.innerText)"],
  ['spider play', '/spidersolitaire/game.html?difficulty=4suit&level=7', 'true'],
  ['spades menu', '/spades/index.html', 'window.Progress.getInventory().coins >= 0'],
  ['spades cosmetics', '/spades/store.html', "document.body.innerText.includes('Cosmetics') && document.body.innerText.includes('150') && !/\\$\\d+\\.\\d{2}/.test(document.body.innerText)"],
  ['spades play', '/spades/game.html?mode=twos_wild&target=200', 'true'],
  ['hub copy sudoku', '/www/sudoku/www/index.html', "window.Progress.getUnlockedLevel('easy') === 1000"]
];

function ignore(text) {
  const t = String(text || '');
  return /favicon|fonts\.google|fonts\.gstatic|net::ERR_NAME|Failed to load resource: net::ERR/i.test(t);
}

async function main() {
  const chrome = spawn(chromeBin(), [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--remote-debugging-port=9333',
    '--user-data-dir=/tmp/fair-play-chrome',
    'about:blank'
  ], { stdio: 'ignore' });

  let version;
  for (let i = 0; i < 40; i++) {
    try {
      version = await fetch('http://127.0.0.1:9333/json/version').then(r => r.json());
      break;
    } catch (e) {
      await new Promise(r => setTimeout(r, 150));
    }
  }
  if (!version) {
    chrome.kill();
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

  const failures = [];
  try {
    for (const [name, path, expression] of pages) {
      const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
      await send('Runtime.enable', {}, sessionId);
      await send('Page.enable', {}, sessionId);
      await send('Network.enable', {}, sessionId);

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
        if (msg.method === 'Network.loadingFailed') {
          const url = msg.params && (msg.params.url || msg.params.errorText || '');
          // URL is not on this event; recorded via response.
        }
        if (msg.method === 'Network.responseReceived') {
          const resp = msg.params.response;
          if (resp.status >= 400 && /fair-play|progress\.js|store\.js|game\.js|index\.html|store\.html/.test(resp.url)) {
            problems.push('http ' + resp.status + ' ' + resp.url);
          }
        }
      };
      browser.addEventListener('message', onMessage);

      await send('Page.navigate', { url: base + path }, sessionId);
      await new Promise(r => setTimeout(r, 900));
      const evalResult = await send('Runtime.evaluate', {
        expression: `(function(){ try { return { ok: !!(${expression}), text: document.body ? document.body.innerText.slice(0, 400) : '' }; } catch (e) { return { ok: false, error: String(e) }; } })()`,
        returnByValue: true
      }, sessionId);
      const value = evalResult.result && evalResult.result.value;
      if (!value || value.ok !== true) {
        problems.push('check failed: ' + JSON.stringify(value));
      }
      if (value && value.text && /\$\d+\.\d{2}/.test(value.text)) {
        problems.push('price text: ' + value.text.match(/\$\d+\.\d{2}[^\n]*/));
      }
      browser.removeEventListener('message', onMessage);
      await send('Target.closeTarget', { targetId });
      if (problems.length) {
        failures.push(name + ' ' + path + '\n  ' + problems.join('\n  '));
        console.log('FAIL', name);
      } else {
        console.log('ok  ', name);
      }
    }
  } finally {
    browser.close();
    chrome.kill();
  }

  if (failures.length) {
    console.error('\n' + failures.join('\n\n'));
    process.exit(1);
  }
  console.log('smoke-pages: all pages loaded');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
