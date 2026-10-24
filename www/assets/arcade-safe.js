/**
 * arcade-safe.js — one safe-area measurement for the hub, shop, and games.
 * Sets --safe-top/right/bottom/left on <html>. When iOS reports 0 (the
 * WKWebView is edge-to-edge but env() did not resolve), an iPhone gets a
 * Dynamic Island fallback so controls are not drawn in the untappable band.
 */
(function () {
  'use strict';

  function readInsets() {
    var probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'visibility:hidden',
      'pointer-events:none',
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

  function iphoneWithoutInsets() {
    var ua = navigator.userAgent || '';
    if (/iPhone|iPod/.test(ua)) return true;
    var cap = window.Capacitor;
    var platform = cap && typeof cap.getPlatform === 'function' ? cap.getPlatform() : '';
    return platform === 'ios' && Math.min(window.innerWidth, window.innerHeight) < 500;
  }

  function apply() {
    var insets = readInsets();
    if (insets.top < 1 && insets.left < 1 && insets.right < 1 && iphoneWithoutInsets()) {
      var portrait = window.innerHeight >= window.innerWidth;
      if (portrait) {
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
    window.ArcadeSafe = window.ArcadeSafe || {};
    window.ArcadeSafe.insets = insets;
  }

  window.ArcadeSafe = window.ArcadeSafe || {};
  window.ArcadeSafe.apply = apply;
  apply();
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
})();
