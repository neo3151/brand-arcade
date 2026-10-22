/**
 * In the browser, rewrite fairplay_supply_v1's date and confirm Sudoku refills.
 * Usage: node tests/smoke-refill.js http://127.0.0.1:8765
 */
'use strict';

const { spawn } = require('child_process');
const base = process.argv[2] || 'http://127.0.0.1:8765';

async function main() {
  const chrome = spawn('google-chrome', [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
    '--remote-debugging-port=9334', '--user-data-dir=/tmp/fair-play-chrome-refill', 'about:blank'
  ], { stdio: 'ignore' });

  let version;
  for (let i = 0; i < 40; i++) {
    try {
      version = await fetch('http://127.0.0.1:9334/json/version').then(r => r.json());
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

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);

  async function evalPage(expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true }, sessionId);
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }

  try {
    await send('Page.navigate', { url: base + '/sudoku/index.html' }, sessionId);
    await new Promise(r => setTimeout(r, 800));
    const seeded = await evalPage(`(() => {
      const raw = JSON.parse(localStorage.getItem('sudoku_progress_v1'));
      raw.hints = 1;
      localStorage.setItem('sudoku_progress_v1', JSON.stringify(raw));
      const supply = JSON.parse(localStorage.getItem('fairplay_supply_v1') || '{}');
      supply.sudoku = { lastRefillDate: '1999-01-01', milestoneTier: supply.sudoku ? supply.sudoku.milestoneTier || 0 : 0 };
      localStorage.setItem('fairplay_supply_v1', JSON.stringify(supply));
      return true;
    })()`);
    if (!seeded) throw new Error('could not seed storage');

    await send('Page.reload', {}, sessionId);
    await new Promise(r => setTimeout(r, 800));
    const refilled = await evalPage(`window.Progress.getHints()`);
    if (refilled !== 15) throw new Error('expected refill to 15, got ' + refilled);

    await evalPage(`(() => {
      const raw = JSON.parse(localStorage.getItem('sudoku_progress_v1'));
      raw.hints = 40;
      localStorage.setItem('sudoku_progress_v1', JSON.stringify(raw));
      const supply = JSON.parse(localStorage.getItem('fairplay_supply_v1'));
      supply.sudoku.lastRefillDate = '1999-06-01';
      localStorage.setItem('fairplay_supply_v1', JSON.stringify(supply));
    })()`);
    await send('Page.reload', {}, sessionId);
    await new Promise(r => setTimeout(r, 800));
    const kept = await evalPage(`window.Progress.getHints()`);
    if (kept !== 40) throw new Error('expected surplus 40 to stay, got ' + kept);

    const open = await evalPage(`window.Progress.getUnlockedLevel('master')`);
    if (open !== 1000) throw new Error('master not open: ' + open);
    console.log('smoke-refill: date change tops 1 hint up to 15 and leaves 40 in place');
  } finally {
    browser.close();
    chrome.kill();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
