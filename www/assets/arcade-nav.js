/**
 * arcade-nav.js — Universal Return to Arcade Hub Bar & Daily Mode Indicator
 * Injected across individual games. On a phone the bar is a full-width
 * strip under the status bar / Dynamic Island. Each control is at least
 * 44pt and the strip itself does not take taps in the island band.
 */
(function() {
  if (window.self !== window.top) return;

  var PHONE_QUERY = '(max-width: 820px)';

  function assetPrefix() {
    var inWww = window.location.pathname.includes('/www/');
    return inWww ? '../../assets/' : '../assets/';
  }

  function readInsets() {
    var probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'visibility:hidden', 'pointer-events:none',
      'padding-top:env(safe-area-inset-top,0px)',
      'padding-right:env(safe-area-inset-right,0px)',
      'padding-bottom:env(safe-area-inset-bottom,0px)',
      'padding-left:env(safe-area-inset-left,0px)'
    ].join(';');
    document.documentElement.appendChild(probe);
    var cs = getComputedStyle(probe);
    var insets = {
      top: parseFloat(cs.paddingTop) || 0,
      right: parseFloat(cs.paddingRight) || 0,
      bottom: parseFloat(cs.paddingBottom) || 0,
      left: parseFloat(cs.paddingLeft) || 0
    };
    probe.remove();
    return insets;
  }

  function applySafeNow() {
    if (window.ArcadeSafe && typeof window.ArcadeSafe.apply === 'function') {
      window.ArcadeSafe.apply();
      return;
    }
    var insets = readInsets();
    var ua = navigator.userAgent || '';
    var cap = window.Capacitor;
    var platform = cap && typeof cap.getPlatform === 'function' ? cap.getPlatform() : '';
    var iphone = /iPhone|iPod/.test(ua) || (platform === 'ios' && Math.min(window.innerWidth, window.innerHeight) < 500);
    if (insets.top < 1 && insets.left < 1 && insets.right < 1 && iphone) {
      if (window.innerHeight >= window.innerWidth) {
        insets.top = 59;
        if (insets.bottom < 1) insets.bottom = 34;
      } else {
        if (insets.left < 1) insets.left = 59;
        if (insets.right < 1) insets.right = 59;
        if (insets.bottom < 1) insets.bottom = 21;
      }
    }
    var root = document.documentElement;
    root.style.setProperty('--safe-top', insets.top + 'px');
    root.style.setProperty('--safe-right', insets.right + 'px');
    root.style.setProperty('--safe-bottom', insets.bottom + 'px');
    root.style.setProperty('--safe-left', insets.left + 'px');
    root.classList.add('arcade-safe');
  }

  function ensureSafe() {
    var prefix = assetPrefix();
    if (!document.getElementById('arcade-safe-css')) {
      var link = document.createElement('link');
      link.id = 'arcade-safe-css';
      link.rel = 'stylesheet';
      link.href = prefix + 'arcade-safe.css';
      document.head.appendChild(link);
    }
    applySafeNow();
    if (!document.getElementById('arcade-safe-script')) {
      var script = document.createElement('script');
      script.id = 'arcade-safe-script';
      script.src = prefix + 'arcade-safe.js';
      document.head.appendChild(script);
    }
  }

  function isPhone() {
    return window.matchMedia(PHONE_QUERY).matches;
  }

  function getHubUrl(hash) {
    var urlParams = new URLSearchParams(window.location.search);
    var isDaily = urlParams.has('daily');
    var targetHash = hash || (isDaily ? 'daily' : '');
    var pathParts = window.location.pathname.split('/').filter(Boolean);
    var inWwwSubdir = window.location.pathname.includes('/www/');
    var prefix = '../../index.html';
    if (!inWwwSubdir && pathParts.length <= 2) {
      prefix = '../index.html';
    }
    return targetHash ? prefix + '#' + targetHash : prefix;
  }

  function makeBtn(tag, className) {
    var el = document.createElement(tag);
    el.className = 'arcade-nav-btn' + (className ? ' ' + className : '');
    return el;
  }

  function initNav() {
    ensureSafe();

    var phone = isPhone();
    var hasInHeaderHub = document.querySelector('.arcade-hub-btn, .btn--hub-return');
    if (document.getElementById('arcade-hub-floating-btn')) {
      loadSupportScripts();
      return;
    }
    // Wide layout keeps an in-header hub link (Word Search). A phone
    // replaces that small link with the bar below the island.
    if (hasInHeaderHub && !phone) {
      loadSupportScripts();
      return;
    }

    if (phone) document.documentElement.classList.add('arcade-bar-on');

    var urlParams = new URLSearchParams(window.location.search);
    var isDaily = urlParams.has('daily');

    var container = document.createElement('div');
    container.id = 'arcade-nav-container';
    var row = document.createElement('div');
    row.id = 'arcade-nav-row';
    container.appendChild(row);

    var hubBtn = makeBtn('a');
    hubBtn.id = 'arcade-hub-floating-btn';
    hubBtn.href = getHubUrl();
    hubBtn.title = 'Return to Benchmark Arcade';
    hubBtn.setAttribute('aria-label', 'Return to Benchmark Arcade');
    hubBtn.innerHTML = '<span aria-hidden="true">🕹️</span><span>Arcade</span>';
    hubBtn.addEventListener('click', function () {
      if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(20);
      window.location.href = getHubUrl();
    });
    row.appendChild(hubBtn);

    if (isDaily) {
      var dailyPill = makeBtn('a', 'arcade-nav-daily');
      dailyPill.href = getHubUrl('daily');
      dailyPill.innerHTML = '<span aria-hidden="true">★</span><span>DAILY</span>';
      row.appendChild(dailyPill);
    }

    var devBtn = makeBtn('button');
    devBtn.type = 'button';
    devBtn.id = 'arcade-nav-dev-btn';
    devBtn.title = 'Open the developer HUD';
    devBtn.setAttribute('aria-label', 'Open the developer HUD');
    devBtn.innerHTML = '<span aria-hidden="true">🛠️</span><span>Dev HUD</span>';
    devBtn.addEventListener('click', function () {
      if (window.ArcadeInspector) window.ArcadeInspector.toggle();
    });

    var soundBtn = document.getElementById('sound-toggle-btn');
    if (phone && soundBtn) {
      soundBtn.classList.add('arcade-nav-sound');
      row.appendChild(soundBtn);
    }

    if (!phone) {
      var passportBtn = makeBtn('a');
      passportBtn.id = 'arcade-nav-passport-btn';
      passportBtn.href = getHubUrl('passport');
      passportBtn.title = 'Open Arcade Passport';
      passportBtn.innerHTML = '<span aria-hidden="true">🏆</span><span>Passport</span>';
      row.appendChild(passportBtn);
    }

    row.appendChild(devBtn);
    if (phone) {
      var anchor = soundBtn || devBtn;
      anchor.style.marginLeft = 'auto';
    }

    document.body.appendChild(container);
    loadSupportScripts();
  }

  function loadSupportScripts() {
    var prefix = assetPrefix();
    if (!window.ArcadeInspector && !document.getElementById('arcade-inspector-script')) {
      var script = document.createElement('script');
      script.id = 'arcade-inspector-script';
      script.src = prefix + 'arcade-inspector.js';
      document.body.appendChild(script);
    }
    if (!window.ArcadePassport && !document.getElementById('arcade-passport-script')) {
      var pScript = document.createElement('script');
      pScript.id = 'arcade-passport-script';
      pScript.src = prefix + 'arcade-passport.js';
      document.body.appendChild(pScript);
    }
  }

  ensureSafe();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  } else {
    initNav();
  }

  window.addEventListener('resize', function () {
    var bar = document.getElementById('arcade-nav-container');
    document.documentElement.classList.toggle('arcade-bar-on', !!(bar && isPhone()));
  });
})();
