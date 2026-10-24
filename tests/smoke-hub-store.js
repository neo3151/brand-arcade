/**
 * Hub store smoke: web fallback, no console errors, no real-money price text.
 * Usage: node tests/smoke-hub-store.js http://127.0.0.1:8765
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
    '--remote-debugging-port=9335',
    '--user-data-dir=/tmp/arcade-store-chrome',
    'about:blank'
  ], { stdio: 'ignore' });

  let version;
  for (let i = 0; i < 40; i++) {
    try {
      version = await fetch('http://127.0.0.1:9335/json/version').then(r => r.json());
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

  const pages = [
    ['hub', '/index.html'],
    ['hub www copy', '/www/index.html'],
    ['blockblast menu', '/blockblast/index.html'],
    ['shop', '/shop.html']
  ];
  const failures = [];

  try {
    for (const [name, pagePath] of pages) {
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
        if (msg.method === 'Network.responseReceived') {
          const resp = msg.params.response;
          if (resp.status >= 400 && /arcade-store|arcade-passport|arcade-purchases|arcade-cosmetics|arcade-shop|shop\.html|index\.html/.test(resp.url)) {
            problems.push('http ' + resp.status + ' ' + resp.url);
          }
        }
      };
      browser.addEventListener('message', onMessage);
      await send('Page.navigate', { url: base + pagePath }, sessionId);
      await new Promise(r => setTimeout(r, 1200));

      if (name !== 'blockblast menu' && name !== 'shop') {
        await send('Runtime.evaluate', {
          expression: `document.getElementById('btn-open-passport').click()`,
          returnByValue: true
        }, sessionId);
        await send('Runtime.evaluate', {
          expression: `window.ArcadeStore.restore()`,
          awaitPromise: true,
          returnByValue: true
        }, sessionId);
        await new Promise(r => setTimeout(r, 300));
      }

      const evalResult = await send('Runtime.evaluate', {
        expression: `(() => {
          const text = document.body ? document.body.innerText : '';
          const store = window.ArcadeStore;
          const passport = window.ArcadePassport;
          const hub = ${name === 'hub' || name === 'hub www copy' ? 'true' : 'false'};
          const shop = ${name === 'shop' ? 'true' : 'false'};
          return {
            store: !!store,
            price: store ? store.getPrice('com.gamingempire.benchmarkarcade.arcade.patron') : 'missing',
            native: !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() === false),
            refused: passport ? passport.applyTheme('vectrex', false) : 'missing',
            theme: passport ? passport.state.theme : 'missing',
            xp: passport ? passport.state.xp : 'missing',
            hasPatron: text.includes('ARCADE PATRON'),
            hasVectrex: text.includes('Vectrex Vector'),
            hasShop: text.includes('Arcade Shop'),
            hasComplete: text.includes('Complete Collection'),
            hasCoffee: text.includes('Coffee'),
            hasRestore: text.includes('Restore purchases'),
            hasUnavailable: text.includes('Unavailable'),
            devUnlock: window.ARCADE_DEV_UNLOCK_ALL === true,
            hasDevUnlock: text.includes('DEV UNLOCK'),
            hasBuy: text.includes('btn-buy-patron') || text.includes('· Buy'),
            priceText: (text.match(/\\$\\d+\\.\\d{2}/) || [])[0] || '',
            hub: hub
          };
        })()`,
        returnByValue: true
      }, sessionId);
      const value = evalResult.result && evalResult.result.value;
      if (!value) problems.push('no eval result');
      else if (name === 'blockblast menu') {
        if (!value.store) problems.push('hub game page did not load ArcadeStore');
        if (value.price !== null) problems.push('web price ' + value.price);
        if (value.priceText) problems.push('price text ' + value.priceText);
      } else if (name === 'shop') {
        if (!value.store) problems.push('ArcadeStore missing');
        if (value.price !== null) problems.push('web price ' + value.price);
        if (!value.hasComplete || !value.hasCoffee || !value.hasRestore || !value.hasUnavailable) {
          problems.push('shop copy missing ' + JSON.stringify(value));
        }
        if (value.devUnlock && !value.hasDevUnlock) problems.push('shop missing DEV UNLOCK');
        if (value.priceText) problems.push('price text ' + value.priceText);
      } else {
        if (!value.store) problems.push('ArcadeStore missing');
        if (!value.native) problems.push('Capacitor bridge did not load');
        if (value.price !== null) problems.push('web price ' + value.price);
        if (value.devUnlock) {
          if (value.refused !== true) problems.push('dev unlock refused vectrex');
          if (value.theme !== 'vectrex') problems.push('theme ' + value.theme);
        } else {
          if (value.refused !== false) problems.push('locked theme applied');
          if (value.theme !== 'default') problems.push('theme ' + value.theme);
        }
        if (!value.hasPatron || !value.hasVectrex || !value.hasShop) {
          problems.push('passport copy missing ' + JSON.stringify(value));
        }
        if (value.hasBuy) problems.push('purchase prompt outside the shop');
        if (value.priceText) problems.push('price text ' + value.priceText);
      }
      browser.removeEventListener('message', onMessage);
      await send('Target.closeTarget', { targetId });
      if (problems.length) {
        failures.push(name + ' ' + pagePath + '\n  ' + problems.join('\n  '));
        console.log('FAIL', name, problems);
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
  console.log('smoke-hub-store: hub loaded with an unavailable web store');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
