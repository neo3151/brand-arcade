/**
 * arcade-nav.js — Universal Return to Arcade Hub Bar & Daily Mode Indicator
 * Injected or linked across individual games to provide a seamless
 * way for players to return to the centralized hub and track daily challenge status.
 */
(function() {
  // Only inject if not inside an iframe
  if (window.self !== window.top) return;

  function initNav() {
    if (document.getElementById('arcade-hub-floating-btn')) return;

    const urlParams = new URLSearchParams(window.location.search);
    const isDaily = urlParams.has('daily');

    const container = document.createElement('div');
    container.id = 'arcade-nav-container';
    Object.assign(container.style, {
      position: 'fixed',
      top: '12px',
      left: '12px',
      zIndex: '99999',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px'
    });

    const hubBtn = document.createElement('a');
    hubBtn.id = 'arcade-hub-floating-btn';
    hubBtn.href = isDaily ? '../../index.html#daily' : '../../index.html';
    hubBtn.title = 'Return to Arcade Hub';
    hubBtn.innerHTML = `
      <span style="font-size: 14px;">🕹️</span>
      <span>Arcade Hub</span>
    `;

    Object.assign(hubBtn.style, {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      background: 'rgba(15, 23, 42, 0.9)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      borderRadius: '9999px',
      padding: '6px 14px',
      color: '#f8fafc',
      fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      fontSize: '12px',
      fontWeight: '600',
      textDecoration: 'none',
      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer'
    });

    hubBtn.addEventListener('mouseenter', () => {
      hubBtn.style.transform = 'translateY(-1px) scale(1.04)';
      hubBtn.style.borderColor = '#10b981';
      hubBtn.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.35)';
    });

    hubBtn.addEventListener('mouseleave', () => {
      hubBtn.style.transform = 'none';
      hubBtn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      hubBtn.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.4)';
    });

    container.appendChild(hubBtn);

    // If launched in Daily Challenge mode, show prominent daily pill
    if (isDaily) {
      const dailyPill = document.createElement('a');
      dailyPill.href = '../../index.html#daily';
      dailyPill.innerHTML = `
        <span style="color: #facc15;">★</span>
        <span>DAILY RUN</span>
      `;
      Object.assign(dailyPill.style, {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        background: 'rgba(234, 179, 8, 0.15)',
        border: '1px solid #facc15',
        borderRadius: '9999px',
        padding: '6px 12px',
        color: '#facc15',
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        fontSize: '11px',
        fontWeight: '700',
        textDecoration: 'none',
        letterSpacing: '0.05em',
        boxShadow: '0 0 12px rgba(250, 204, 21, 0.3)',
        cursor: 'pointer'
      });
      container.appendChild(dailyPill);
    }

    document.body.appendChild(container);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  } else {
    initNav();
  }
})();
