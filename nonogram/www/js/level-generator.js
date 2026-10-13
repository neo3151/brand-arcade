/* ==========================================================================
   level-generator.js — Seeded Deterministic Nonogram Puzzle & Art Generator
   5 Difficulties x 1,000 Levels = 5,000 Seeded Puzzles
   Zen Nonogram: Pixel Tapestry
   ========================================================================== */

(function(window) {
  'use strict';

  // Mulberry32 32-bit PRNG
  function mulberry32(seed) {
    return function() {
      var t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // Pre-curated iconic pixel art models for early levels
  const CURATED_5x5 = [
    {
      name: "Heart of Jade",
      color: "#f43f5e",
      pattern: [
        [0, 1, 0, 1, 0],
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1],
        [0, 1, 1, 1, 0],
        [0, 0, 1, 0, 0]
      ]
    },
    {
      name: "Morning Star",
      color: "#fbbf24",
      pattern: [
        [0, 0, 1, 0, 0],
        [1, 1, 1, 1, 1],
        [0, 1, 1, 1, 0],
        [1, 1, 0, 1, 1],
        [1, 0, 0, 0, 1]
      ]
    },
    {
      name: "Tiny Pine Tree",
      color: "#10b981",
      pattern: [
        [0, 0, 1, 0, 0],
        [0, 1, 1, 1, 0],
        [1, 1, 1, 1, 1],
        [0, 0, 1, 0, 0],
        [0, 0, 1, 0, 0]
      ]
    },
    {
      name: "Little Sailboat",
      color: "#38bdf8",
      pattern: [
        [0, 0, 1, 0, 0],
        [0, 0, 1, 1, 0],
        [0, 0, 1, 1, 1],
        [1, 1, 1, 1, 1],
        [0, 1, 1, 1, 0]
      ]
    },
    {
      name: "Zen Teacup",
      color: "#a78bfa",
      pattern: [
        [1, 0, 0, 0, 0],
        [1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1],
        [0, 1, 1, 1, 0]
      ]
    },
    {
      name: "Ancient Key",
      color: "#f59e0b",
      pattern: [
        [0, 1, 1, 0, 0],
        [1, 0, 0, 1, 0],
        [0, 1, 1, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 1, 1, 1, 0]
      ]
    },
    {
      name: "Lucky Duckling",
      color: "#fbbf24",
      pattern: [
        [0, 1, 1, 0, 0],
        [1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1],
        [0, 1, 1, 1, 1],
        [0, 0, 1, 1, 0]
      ]
    },
    {
      name: "Dojo Mushroom",
      color: "#ef4444",
      pattern: [
        [0, 1, 1, 1, 0],
        [1, 1, 1, 1, 1],
        [1, 0, 1, 0, 1],
        [0, 1, 1, 1, 0],
        [0, 0, 1, 0, 0]
      ]
    },
    {
      name: "Golden Crown",
      color: "#f59e0b",
      pattern: [
        [1, 0, 1, 0, 1],
        [1, 0, 1, 0, 1],
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1]
      ]
    },
    {
      name: "Moonlit Diamond",
      color: "#06b6d4",
      pattern: [
        [0, 0, 1, 0, 0],
        [0, 1, 1, 1, 0],
        [1, 1, 1, 1, 1],
        [0, 1, 1, 1, 0],
        [0, 0, 1, 0, 0]
      ]
    }
  ];

  const THEME_WORDS_1 = [
    "Moonlit", "Golden", "Silent", "Hidden", "Shadow", "Autumn", "Emerald", "Celestial",
    "Floating", "Crimson", "Mystic", "Ancient", "Sacred", "Bamboo", "Whispering", "Frost",
    "Thunder", "Velvet", "Infinite", "Blossom", "Solar", "Storm", "Twilight", "Echoing"
  ];

  const THEME_WORDS_2 = [
    "Dragon", "Lotus", "Pagoda", "Bonsai", "Koi", "Crane", "Lantern", "Temple",
    "Tiger", "Fox", "Sword", "Shrine", "Wave", "Panda", "Tapestry", "Compass",
    "Phoenix", "Monk", "Bridge", "Castle", "Falcon", "Moon", "Garden", "Echo"
  ];

  const PALETTES = [
    "#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6",
    "#06b6d4", "#14b8a6", "#f97316", "#a855f7", "#6366f1"
  ];

  // Derive Clues from binary grid
  function calculateClues(grid, size) {
    const rowClues = [];
    const colClues = [];

    // Rows
    for (let r = 0; r < size; r++) {
      const clues = [];
      let count = 0;
      for (let c = 0; c < size; c++) {
        if (grid[r][c] === 1) {
          count++;
        } else if (count > 0) {
          clues.push(count);
          count = 0;
        }
      }
      if (count > 0) clues.push(count);
      if (clues.length === 0) clues.push(0);
      rowClues.push(clues);
    }

    // Columns
    for (let c = 0; c < size; c++) {
      const clues = [];
      let count = 0;
      for (let r = 0; r < size; r++) {
        if (grid[r][c] === 1) {
          count++;
        } else if (count > 0) {
          clues.push(count);
          count = 0;
        }
      }
      if (count > 0) clues.push(count);
      if (clues.length === 0) clues.push(0);
      colClues.push(clues);
    }

    return { rowClues, colClues };
  }

  const LevelGenerator = {
    getLevel(difficulty, levelNumber) {
      const size = window.Utils.getGridSize(difficulty);

      // Check curated 5x5 first
      if (difficulty === 'beginner' && levelNumber <= CURATED_5x5.length) {
        const item = CURATED_5x5[levelNumber - 1];
        const grid = item.pattern.map(row => [...row]);
        const clues = calculateClues(grid, 5);
        return {
          difficulty,
          level: levelNumber,
          size: 5,
          name: item.name,
          color: item.color,
          solution: grid,
          rowClues: clues.rowClues,
          colClues: clues.colClues
        };
      }

      // Procedural generation with deterministic seed
      const diffHash = { beginner: 1001, easy: 2002, medium: 3003, hard: 4004, master: 5005 }[difficulty] || 1;
      const seed = (diffHash * 10000) + levelNumber;
      const rng = mulberry32(seed);

      // Generate symmetrical or organic pixel art
      const grid = Array.from({ length: size }, () => Array(size).fill(0));
      const symmetric = rng() > 0.35; // 65% symmetrical art looks great
      const halfSize = Math.ceil(size / 2);

      // Fill density target: 45% - 55%
      const targetFilled = Math.floor(size * size * (0.42 + rng() * 0.16));
      let filledCount = 0;

      // Seed core cluster shapes
      const centersCount = 2 + Math.floor(rng() * 3);
      const centers = [];
      for (let k = 0; k < centersCount; k++) {
        centers.push({
          r: Math.floor(rng() * size),
          c: Math.floor(rng() * (symmetric ? halfSize : size)),
          radius: 1 + rng() * (size / 3.5)
        });
      }

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < (symmetric ? halfSize : size); c++) {
          let prob = 0.2;
          // Distance to centers
          centers.forEach(ctr => {
            const dist = Math.hypot(r - ctr.r, c - ctr.c);
            if (dist < ctr.radius) {
              prob += (1 - dist / ctr.radius) * 0.65;
            }
          });

          if (rng() < prob) {
            grid[r][c] = 1;
            filledCount++;
            if (symmetric) {
              const oppC = size - 1 - c;
              if (oppC !== c) {
                grid[r][oppC] = 1;
                filledCount++;
              }
            }
          }
        }
      }

      // Guarantee no empty rows and no empty columns
      for (let r = 0; r < size; r++) {
        let rowSum = grid[r].reduce((a, b) => a + b, 0);
        if (rowSum === 0) {
          const c = Math.floor(rng() * size);
          grid[r][c] = 1;
        }
      }
      for (let c = 0; c < size; c++) {
        let colSum = 0;
        for (let r = 0; r < size; r++) colSum += grid[r][c];
        if (colSum === 0) {
          const r = Math.floor(rng() * size);
          grid[r][c] = 1;
        }
      }

      // Name generation
      const w1 = THEME_WORDS_1[Math.floor(rng() * THEME_WORDS_1.length)];
      const w2 = THEME_WORDS_2[Math.floor(rng() * THEME_WORDS_2.length)];
      const name = `${w1} ${w2}`;
      const color = PALETTES[Math.floor(rng() * PALETTES.length)];

      const clues = calculateClues(grid, size);

      return {
        difficulty,
        level: levelNumber,
        size,
        name,
        color,
        solution: grid,
        rowClues: clues.rowClues,
        colClues: clues.colClues
      };
    }
  };

  window.LevelGenerator = LevelGenerator;
})(window);
