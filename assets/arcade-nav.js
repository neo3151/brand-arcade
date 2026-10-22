/**
 * arcade-nav.js — Universal Return to Arcade Hub Bar & Daily Mode Indicator
 * Injected across individual games to provide a seamless way for players
 * to return to the centralized Benchmark Arcade cabinet selection screen.
 */
(function() {
  // Only inject if not inside an iframe
  if (window.self !== window.top) return;

  function getHubUrl(hash = '') {
    const urlParams = new URLSearchParams(window.location.search);
    const isDaily = urlParams.has('daily');
    const targetHash = hash || (isDaily ? 'daily' : '');

    // Check pathname depth relative to root index.html
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const inWwwSubdir = window.location.pathname.includes('/www/');
    
    // In Capacitor or web server, each game lives at <game>/www/
    let prefix = '../../index.html';
    if (!inWwwSubdir && pathParts.length <= 2) {
      prefix = '../index.html';
    }

    return targetHash ? `${prefix}#${targetHash}` : prefix;
  }

  function initNav() {
    // Check if an explicit hub button already exists on the page
    if (document.getElementById('arcade-hub-floating-btn') || 
        document.querySelector('.arcade-hub-btn, .btn--hub-return')) {
      // Still load inspector and passport scripts in background
      loadSupportScripts();
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const isDaily = urlParams.has('daily');
    const isMobile = window.innerWidth <= 640;

    const container = document.createElement('div');
    container.id = 'arcade-nav-container';
    
    // Position intelligently: top-left with safe-area insets
    Object.assign(container.style, {
      position: 'fixed',
      top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
      left: 'calc(env(safe-area-inset-left, 0px) + 10px)',
      zIndex: '999999',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      pointerEvents: 'auto',
      maxWidth: 'calc(100vw - 20px)'
    });

    // 1. Primary "Arcade Hub" return button
    const hubBtn = document.createElement('a');
    hubBtn.id = 'arcade-hub-floating-btn';
    hubBtn.href = getHubUrl();
    hubBtn.title = 'Return to Benchmark Arcade Cabinets Selection Screen';
    hubBtn.setAttribute('aria-label', 'Return to Benchmark Arcade Cabinets');
    hubBtn.innerHTML = `
      <span style="font-size: 14px; line-height: 1;">🕹️</span>
      <span style="letter-spacing: 0.04em;">${isMobile ? 'Arcade' : 'Arcade Hub'}</span>
    `;

    Object.assign(hubBtn.style, {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      background: 'rgba(10, 15, 29, 0.92)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1.5px solid #06b6d4',
      borderRadius: '9999px',
      padding: isMobile ? '6px 12px' : '7px 14px',
      minHeight: '36px',
      color: '#38bdf8',
      fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      fontSize: isMobile ? '12px' : '12.5px',
      fontWeight: '700',
      textDecoration: 'none',
      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5), 0 0 10px rgba(6, 182, 212, 0.25)',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      touchAction: 'manipulation',
      userSelect: 'none',
      WebkitTapHighlightColor: 'transparent'
    });

    hubBtn.addEventListener('mouseenter', () => {
      hubBtn.style.transform = 'translateY(-1px) scale(1.04)';
      hubBtn.style.borderColor = '#22d3ee';
      hubBtn.style.boxShadow = '0 6px 20px rgba(6, 182, 212, 0.45)';
    });

    hubBtn.addEventListener('mouseleave', () => {
      hubBtn.style.transform = 'none';
      hubBtn.style.borderColor = '#06b6d4';
      hubBtn.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.5), 0 0 10px rgba(6, 182, 212, 0.25)';
    });

    hubBtn.addEventListener('click', (e) => {
      // Haptic feedback if supported
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(20);
      }
      window.location.href = getHubUrl();
    });

    container.appendChild(hubBtn);

    // 2. If launched in Daily Challenge mode, show prominent daily badge
    if (isDaily) {
      const dailyPill = document.createElement('a');
      dailyPill.href = getHubUrl('daily');
      dailyPill.innerHTML = `
        <span style="color: #facc15; font-size: 11px;">★</span>
        <span>DAILY</span>
      `;
      Object.assign(dailyPill.style, {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: 'rgba(234, 179, 8, 0.18)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid #facc15',
        borderRadius: '9999px',
        padding: '6px 10px',
        minHeight: '36px',
        color: '#facc15',
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        fontSize: '11px',
        fontWeight: '800',
        textDecoration: 'none',
        letterSpacing: '0.05em',
        boxShadow: '0 0 12px rgba(250, 204, 21, 0.3)',
        cursor: 'pointer',
        touchAction: 'manipulation'
      });
      container.appendChild(dailyPill);
    }

    // 3. On Desktop (width > 640px), show Dev HUD and Passport triggers
    if (!isMobile) {
      // Dev Inspector HUD trigger
      const devBtn = document.createElement('button');
      devBtn.type = 'button';
      devBtn.id = 'arcade-nav-dev-btn';
      devBtn.title = 'Open "Behind the Build" Developer Telemetry HUD (Hotkey: ~)';
      devBtn.innerHTML = `
        <span style="font-size: 13px;">🛠️</span>
        <span>Dev HUD</span>
      `;
      Object.assign(devBtn.style, {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        background: 'rgba(6, 182, 212, 0.15)',
        border: '1px solid #06b6d4',
        borderRadius: '9999px',
        padding: '6px 12px',
        minHeight: '36px',
        color: '#38bdf8',
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        fontSize: '11px',
        fontWeight: '700',
        letterSpacing: '0.04em',
        boxShadow: '0 0 10px rgba(6, 182, 212, 0.25)',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      });

      devBtn.addEventListener('mouseenter', () => {
        devBtn.style.transform = 'translateY(-1px) scale(1.04)';
        devBtn.style.boxShadow = '0 0 16px rgba(6, 182, 212, 0.45)';
      });

      devBtn.addEventListener('mouseleave', () => {
        devBtn.style.transform = 'none';
        devBtn.style.boxShadow = '0 0 10px rgba(6, 182, 212, 0.25)';
      });

      devBtn.addEventListener('click', () => {
        if (window.ArcadeInspector) {
          window.ArcadeInspector.toggle();
        }
      });

      container.appendChild(devBtn);

      // Passport Trophy Room button
      const passportBtn = document.createElement('a');
      passportBtn.id = 'arcade-nav-passport-btn';
      passportBtn.href = getHubUrl('passport');
      passportBtn.title = 'Open Arcade Passport & Trophy Room';
      passportBtn.innerHTML = `
        <span style="font-size: 13px;">🏆</span>
        <span>Passport</span>
      `;
      Object.assign(passportBtn.style, {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        background: 'rgba(250, 204, 21, 0.15)',
        border: '1px solid #facc15',
        borderRadius: '9999px',
        padding: '6px 12px',
        minHeight: '36px',
        color: '#facc15',
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        fontSize: '11px',
        fontWeight: '700',
        letterSpacing: '0.04em',
        textDecoration: 'none',
        boxShadow: '0 0 10px rgba(250, 204, 21, 0.25)',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      });

      passportBtn.addEventListener('mouseenter', () => {
        passportBtn.style.transform = 'translateY(-1px) scale(1.04)';
        passportBtn.style.boxShadow = '0 0 16px rgba(250, 204, 21, 0.45)';
      });

      passportBtn.addEventListener('mouseleave', () => {
        passportBtn.style.transform = 'none';
        passportBtn.style.boxShadow = '0 0 10px rgba(250, 204, 21, 0.25)';
      });

      container.appendChild(passportBtn);
    }

    document.body.appendChild(container);

    loadSupportScripts();
  }

  function loadSupportScripts() {
    const inWww = window.location.pathname.includes('/www/');
    const assetPrefix = inWww ? '../../assets/' : '../assets/';

    // Dynamically inject arcade-inspector.js and arcade-passport.js if not already present
    if (!window.ArcadeInspector && !document.getElementById('arcade-inspector-script')) {
      const script = document.createElement('script');
      script.id = 'arcade-inspector-script';
      script.src = `${assetPrefix}arcade-inspector.js`;
      document.body.appendChild(script);
    }

    if (!window.ArcadePassport && !document.getElementById('arcade-passport-script')) {
      const pScript = document.createElement('script');
      pScript.id = 'arcade-passport-script';
      pScript.src = `${assetPrefix}arcade-passport.js`;
      document.body.appendChild(pScript);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  } else {
    initNav();
  }
})();
