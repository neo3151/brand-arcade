/**
 * CELESTIAL JADE: MAHJONG SOLITAIRE — mahjong-tiles.js
 * Complete 144-tile standard deck definition, matching rule validator,
 * and vector SVG face artwork renderer.
 */

'use strict';

window.MahjongTiles = (() => {

  const CHINESE_NUMERALS = {
    1: '一', 2: '二', 3: '三', 4: '四', 5: '五',
    6: '六', 7: '七', 8: '八', 9: '九'
  };

  /**
   * Generates the standard 144-tile deck
   */
  function createStandardDeck() {
    const deck = [];
    let uid = 0;

    // 1. Wan / Characters (1-9, 4 of each = 36)
    for (let val = 1; val <= 9; val++) {
      for (let c = 0; c < 4; c++) {
        deck.push({
          id: `wan_${val}_${c}_${++uid}`,
          type: 'wan',
          value: val,
          label: `${val} Wan`,
          ch: CHINESE_NUMERALS[val]
        });
      }
    }

    // 2. Bamboo / Sticks (1-9, 4 of each = 36)
    for (let val = 1; val <= 9; val++) {
      for (let c = 0; c < 4; c++) {
        deck.push({
          id: `bam_${val}_${c}_${++uid}`,
          type: 'bamboo',
          value: val,
          label: `${val} Bamboo`
        });
      }
    }

    // 3. Dots / Circles (1-9, 4 of each = 36)
    for (let val = 1; val <= 9; val++) {
      for (let c = 0; c < 4; c++) {
        deck.push({
          id: `dot_${val}_${c}_${++uid}`,
          type: 'dot',
          value: val,
          label: `${val} Dot`
        });
      }
    }

    // 4. Winds (East, South, West, North, 4 of each = 16)
    const winds = [
      { val: 'east',  ch: '東', color: '#0284c7', label: 'East Wind' },
      { val: 'south', ch: '南', color: '#e11d48', label: 'South Wind' },
      { val: 'west',  ch: '西', color: '#d97706', label: 'West Wind' },
      { val: 'north', ch: '北', color: '#4f46e5', label: 'North Wind' }
    ];
    winds.forEach(w => {
      for (let c = 0; c < 4; c++) {
        deck.push({
          id: `wind_${w.val}_${c}_${++uid}`,
          type: 'wind',
          value: w.val,
          label: w.label,
          ch: w.ch,
          color: w.color
        });
      }
    });

    // 5. Dragons (Red, Green, White, 4 of each = 12)
    const dragons = [
      { val: 'red',   ch: '中', color: '#dc2626', label: 'Red Dragon' },
      { val: 'green', ch: '發', color: '#059669', label: 'Green Dragon' },
      { val: 'white', ch: '白', color: '#2563eb', label: 'White Dragon' }
    ];
    dragons.forEach(d => {
      for (let c = 0; c < 4; c++) {
        deck.push({
          id: `dragon_${d.val}_${c}_${++uid}`,
          type: 'dragon',
          value: d.val,
          label: d.label,
          ch: d.ch,
          color: d.color
        });
      }
    });

    // 6. Seasons (Spring, Summer, Autumn, Winter, 1 of each = 4)
    const seasons = [
      { val: 'spring', ch: '春', icon: '🌸', color: '#db2777', label: 'Spring' },
      { val: 'summer', ch: '夏', icon: '☀️', color: '#ea580c', label: 'Summer' },
      { val: 'autumn', ch: '秋', icon: '🍁', color: '#d97706', label: 'Autumn' },
      { val: 'winter', ch: '冬', icon: '❄️', color: '#0284c7', label: 'Winter' }
    ];
    seasons.forEach(s => {
      deck.push({
        id: `season_${s.val}_${++uid}`,
        type: 'season',
        value: s.val,
        label: s.label,
        ch: s.ch,
        icon: s.icon,
        color: s.color
      });
    });

    // 7. Flowers (Plum, Orchid, Chrysanthemum, Bamboo, 1 of each = 4)
    const flowers = [
      { val: 'plum',  ch: '梅', icon: '🌺', color: '#e11d48', label: 'Plum Blossom' },
      { val: 'orchid', ch: '蘭', icon: '🌿', color: '#059669', label: 'Orchid' },
      { val: 'chrys', ch: '菊', icon: '🌼', color: '#f59e0b', label: 'Chrysanthemum' },
      { val: 'bamb',  ch: '竹', icon: '🎋', color: '#16a34a', label: 'Bamboo Flower' }
    ];
    flowers.forEach(f => {
      deck.push({
        id: `flower_${f.val}_${++uid}`,
        type: 'flower',
        value: f.val,
        label: f.label,
        ch: f.ch,
        icon: f.icon,
        color: f.color
      });
    });

    return deck;
  }

  /**
   * Mahjong Solitaire matching rule:
   * - Any Season matches any Season
   * - Any Flower matches any Flower
   * - Exact match on type & value for all other tiles
   */
  function canMatch(a, b) {
    if (!a || !b) return false;
    if (a.id === b.id) return false;

    if (a.type === 'season' && b.type === 'season') return true;
    if (a.type === 'flower' && b.type === 'flower') return true;

    return a.type === b.type && a.value === b.value;
  }

  /**
   * SVG Face Artwork Generators
   */
  function renderTileSVG(tile) {
    switch (tile.type) {
      case 'wan':
        return renderWanSVG(tile);
      case 'bamboo':
        return renderBambooSVG(tile);
      case 'dot':
        return renderDotSVG(tile);
      case 'wind':
        return renderWindSVG(tile);
      case 'dragon':
        return renderDragonSVG(tile);
      case 'season':
      case 'flower':
        return renderBonusSVG(tile);
      default:
        return '';
    }
  }

  function renderWanSVG(tile) {
    return `
      <svg viewBox="0 0 48 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <text x="24" y="25" font-family="'Noto Serif SC', 'Songti SC', 'SimSun', serif" font-size="21" font-weight="900" fill="#1e293b" text-anchor="middle" dominant-baseline="central">${tile.ch}</text>
        <text x="24" y="47" font-family="'Noto Serif SC', 'Songti SC', 'SimSun', serif" font-size="20" font-weight="900" fill="#dc2626" text-anchor="middle" dominant-baseline="central">萬</text>
        <text x="4" y="10" font-family="sans-serif" font-size="8" font-weight="700" fill="#64748b">${tile.value}</text>
      </svg>
    `;
  }

  function renderBambooStick(cx, cy, color = '#059669', h = 14) {
    return `
      <g transform="translate(${cx - 2}, ${cy - h/2})">
        <rect x="0" y="0" width="4" height="${h}" rx="1.5" fill="${color}" stroke="#064e3b" stroke-width="0.6"/>
        <line x1="0" y1="${h*0.33}" x2="4" y2="${h*0.33}" stroke="#fff" stroke-width="0.8"/>
        <line x1="0" y1="${h*0.66}" x2="4" y2="${h*0.66}" stroke="#fff" stroke-width="0.8"/>
      </g>
    `;
  }

  function renderBambooSVG(tile) {
    let inner = '';
    const v = tile.value;
    const green = '#059669';
    const blue = '#2563eb';
    const red = '#dc2626';

    if (v === 1) {
      // Ceremonial Peacock / Bird
      inner = `
        <circle cx="24" cy="30" r="14" fill="#ecfdf5" stroke="${green}" stroke-width="1.2"/>
        <path d="M 24 18 Q 28 22 26 28 Q 30 26 34 32 Q 28 35 24 44 Q 20 35 14 32 Q 18 26 22 28 Q 20 22 24 18 Z" fill="${green}"/>
        <circle cx="24" cy="22" r="3.5" fill="${red}"/>
        <circle cx="24" cy="22" r="1.5" fill="#fff"/>
      `;
    } else if (v === 2) {
      inner = renderBambooStick(24, 20, green, 18) + renderBambooStick(24, 44, blue, 18);
    } else if (v === 3) {
      inner = renderBambooStick(24, 18, blue, 16) + renderBambooStick(16, 44, green, 18) + renderBambooStick(32, 44, green, 18);
    } else if (v === 4) {
      inner = renderBambooStick(16, 20, blue, 16) + renderBambooStick(32, 20, green, 16) +
              renderBambooStick(16, 44, green, 16) + renderBambooStick(32, 44, blue, 16);
    } else if (v === 5) {
      inner = renderBambooStick(14, 18, green, 15) + renderBambooStick(34, 18, blue, 15) +
              renderBambooStick(24, 32, red, 15) +
              renderBambooStick(14, 46, blue, 15) + renderBambooStick(34, 46, green, 15);
    } else if (v === 6) {
      inner = renderBambooStick(15, 20, green, 15) + renderBambooStick(24, 20, green, 15) + renderBambooStick(33, 20, green, 15) +
              renderBambooStick(15, 44, blue, 15) + renderBambooStick(24, 44, blue, 15) + renderBambooStick(33, 44, blue, 15);
    } else if (v === 7) {
      inner = renderBambooStick(24, 15, red, 13) +
              renderBambooStick(15, 30, green, 13) + renderBambooStick(33, 30, blue, 13) +
              renderBambooStick(14, 48, green, 14) + renderBambooStick(24, 48, blue, 14) + renderBambooStick(34, 48, green, 14);
    } else if (v === 8) {
      inner = renderBambooStick(16, 17, green, 12) + renderBambooStick(32, 17, green, 12) +
              renderBambooStick(20, 29, blue, 12) + renderBambooStick(28, 29, blue, 12) +
              renderBambooStick(20, 41, blue, 12) + renderBambooStick(28, 41, blue, 12) +
              renderBambooStick(16, 51, green, 12) + renderBambooStick(32, 51, green, 12);
    } else if (v === 9) {
      inner = renderBambooStick(15, 17, green, 12) + renderBambooStick(24, 17, blue, 12) + renderBambooStick(33, 17, red, 12) +
              renderBambooStick(15, 32, green, 12) + renderBambooStick(24, 32, blue, 12) + renderBambooStick(33, 32, red, 12) +
              renderBambooStick(15, 47, green, 12) + renderBambooStick(24, 47, blue, 12) + renderBambooStick(33, 47, red, 12);
    }

    return `
      <svg viewBox="0 0 48 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        ${inner}
        <text x="4" y="10" font-family="sans-serif" font-size="8" font-weight="700" fill="#64748b">${v}</text>
      </svg>
    `;
  }

  function renderCircle(cx, cy, r = 5.5, fill = '#2563eb', stroke = '#1d4ed8') {
    return `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>
      <circle cx="${cx}" cy="${cy}" r="${r*0.45}" fill="#fff"/>
      <circle cx="${cx}" cy="${cy}" r="${r*0.18}" fill="${fill}"/>
    `;
  }

  function renderDotSVG(tile) {
    let inner = '';
    const v = tile.value;
    const blue = '#2563eb';
    const green = '#059669';
    const red = '#dc2626';

    if (v === 1) {
      // Large ceremonial sun circle
      inner = `
        <circle cx="24" cy="32" r="16" fill="#fef2f2" stroke="${red}" stroke-width="2.5"/>
        <circle cx="24" cy="32" r="11" fill="${red}"/>
        <circle cx="24" cy="32" r="5" fill="#fff"/>
        <circle cx="24" cy="32" r="2" fill="${red}"/>
      `;
    } else if (v === 2) {
      inner = renderCircle(24, 18, 7.5, green) + renderCircle(24, 44, 7.5, blue);
    } else if (v === 3) {
      inner = renderCircle(14, 16, 6, blue) + renderCircle(24, 32, 6, red) + renderCircle(34, 48, 6, green);
    } else if (v === 4) {
      inner = renderCircle(15, 19, 6.5, blue) + renderCircle(33, 19, 6.5, green) +
              renderCircle(15, 45, 6.5, green) + renderCircle(33, 45, 6.5, blue);
    } else if (v === 5) {
      inner = renderCircle(14, 17, 6, blue) + renderCircle(34, 17, 6, green) +
              renderCircle(24, 32, 6.5, red) +
              renderCircle(14, 47, 6, green) + renderCircle(34, 47, 6, blue);
    } else if (v === 6) {
      inner = renderCircle(16, 17, 5.5, green) + renderCircle(32, 17, 5.5, green) +
              renderCircle(16, 32, 5.5, red)   + renderCircle(32, 32, 5.5, red) +
              renderCircle(16, 47, 5.5, red)   + renderCircle(32, 47, 5.5, red);
    } else if (v === 7) {
      inner = renderCircle(13, 15, 5, green) + renderCircle(24, 19, 5, green) + renderCircle(35, 23, 5, green) +
              renderCircle(16, 37, 5.5, red) + renderCircle(32, 37, 5.5, red) +
              renderCircle(16, 50, 5.5, red) + renderCircle(32, 50, 5.5, red);
    } else if (v === 8) {
      inner = renderCircle(16, 14, 5, blue) + renderCircle(32, 14, 5, blue) +
              renderCircle(16, 26, 5, blue) + renderCircle(32, 26, 5, blue) +
              renderCircle(16, 38, 5, blue) + renderCircle(32, 38, 5, blue) +
              renderCircle(16, 50, 5, blue) + renderCircle(32, 50, 5, blue);
    } else if (v === 9) {
      inner = renderCircle(14, 16, 5, green) + renderCircle(24, 16, 5, green) + renderCircle(34, 16, 5, green) +
              renderCircle(14, 32, 5, red)   + renderCircle(24, 32, 5, red)   + renderCircle(34, 32, 5, red) +
              renderCircle(14, 48, 5, blue)  + renderCircle(24, 48, 5, blue)  + renderCircle(34, 48, 5, blue);
    }

    return `
      <svg viewBox="0 0 48 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        ${inner}
        <text x="4" y="10" font-family="sans-serif" font-size="8" font-weight="700" fill="#64748b">${v}</text>
      </svg>
    `;
  }

  function renderWindSVG(tile) {
    return `
      <svg viewBox="0 0 48 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="32" r="18" fill="none" stroke="${tile.color}" stroke-width="0.8" opacity="0.4" stroke-dasharray="2 2"/>
        <text x="24" y="35" font-family="'Noto Serif SC', 'Songti SC', 'SimSun', serif" font-size="28" font-weight="900" fill="${tile.color}" text-anchor="middle" dominant-baseline="central">${tile.ch}</text>
        <text x="24" y="55" font-family="sans-serif" font-size="7" font-weight="800" fill="${tile.color}" text-anchor="middle" letter-spacing="0.5">${tile.value.toUpperCase()}</text>
      </svg>
    `;
  }

  function renderDragonSVG(tile) {
    if (tile.value === 'white') {
      // White Dragon: Decorative rectangular blue frame
      return `
        <svg viewBox="0 0 48 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="10" width="32" height="44" rx="2" fill="none" stroke="#2563eb" stroke-width="3"/>
          <rect x="12" y="14" width="24" height="36" fill="none" stroke="#60a5fa" stroke-width="1" stroke-dasharray="3 2"/>
          <circle cx="24" cy="32" r="3" fill="#2563eb"/>
        </svg>
      `;
    }

    return `
      <svg viewBox="0 0 48 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="32" r="19" fill="${tile.color === '#dc2626' ? '#fef2f2' : '#ecfdf5'}" opacity="0.6"/>
        <text x="24" y="34" font-family="'Noto Serif SC', 'Songti SC', 'SimSun', serif" font-size="30" font-weight="900" fill="${tile.color}" text-anchor="middle" dominant-baseline="central">${tile.ch}</text>
      </svg>
    `;
  }

  function renderBonusSVG(tile) {
    const isSeason = tile.type === 'season';
    return `
      <svg viewBox="0 0 48 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="6" width="38" height="52" rx="3" fill="none" stroke="${tile.color}" stroke-width="1" opacity="0.6"/>
        <text x="24" y="21" font-size="16" text-anchor="middle" dominant-baseline="central">${tile.icon}</text>
        <text x="24" y="42" font-family="'Noto Serif SC', 'Songti SC', 'SimSun', serif" font-size="18" font-weight="900" fill="${tile.color}" text-anchor="middle" dominant-baseline="central">${tile.ch}</text>
        <text x="24" y="54" font-family="sans-serif" font-size="6" font-weight="800" fill="#64748b" text-anchor="middle">${isSeason ? 'SEASON' : 'FLOWER'}</text>
      </svg>
    `;
  }

  return {
    createStandardDeck,
    canMatch,
    renderTileSVG
  };

})();
