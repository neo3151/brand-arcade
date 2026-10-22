/**
 * CELESTIAL JADE: MAHJONG SOLITAIRE — board-engine.js
 * 3D Tile spatial math, free-tile hit testing, available move finder,
 * and guaranteed-solvable reverse generation algorithm.
 */

'use strict';

window.BoardEngine = (() => {

  function getTilesEngine() {
    return (typeof window !== 'undefined' && window.MahjongTiles) ? window.MahjongTiles : (typeof MahjongTiles !== 'undefined' ? MahjongTiles : null);
  }

  /**
   * Checks if a tile is covered by any tile above it (z_other > z)
   */
  function isTileCovered(tile, activeTiles) {
    const x = tile.x;
    const y = tile.y;
    const z = tile.z;

    for (let i = 0; i < activeTiles.length; i++) {
      const o = activeTiles[i];
      if (o.id === tile.id) continue;
      if (o.z > z) {
        if (Math.abs(o.x - x) < 2 && Math.abs(o.y - y) < 2) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Checks if a tile is blocked on its left side on layer z
   */
  function isTileBlockedLeft(tile, activeTiles) {
    const x = tile.x;
    const y = tile.y;
    const z = tile.z;

    for (let i = 0; i < activeTiles.length; i++) {
      const o = activeTiles[i];
      if (o.id === tile.id) continue;
      if (o.z === z) {
        if (o.x < x && (x - o.x) <= 2 && Math.abs(o.y - y) < 2) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Checks if a tile is blocked on its right side on layer z
   */
  function isTileBlockedRight(tile, activeTiles) {
    const x = tile.x;
    const y = tile.y;
    const z = tile.z;

    for (let i = 0; i < activeTiles.length; i++) {
      const o = activeTiles[i];
      if (o.id === tile.id) continue;
      if (o.z === z) {
        if (o.x > x && (o.x - x) <= 2 && Math.abs(o.y - y) < 2) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Standard Mahjong Solitaire tile availability test:
   * A tile is free if:
   * 1. It is not covered from above.
   * 2. Either its left side or right side is open.
   */
  function isTileFree(tile, activeTiles) {
    if (isTileCovered(tile, activeTiles)) return false;
    const leftBlocked = isTileBlockedLeft(tile, activeTiles);
    const rightBlocked = isTileBlockedRight(tile, activeTiles);
    return !leftBlocked || !rightBlocked;
  }

  /**
   * Returns an array of all currently free tiles
   */
  function getFreeTiles(activeTiles) {
    return activeTiles.filter(t => isTileFree(t, activeTiles));
  }

  /**
   * Finds all available matching pairs among currently free tiles
   */
  function findAvailablePairs(activeTiles) {
    const free = getFreeTiles(activeTiles);
    const pairs = [];

    for (let i = 0; i < free.length; i++) {
      for (let j = i + 1; j < free.length; j++) {
        if (getTilesEngine().canMatch(free[i].tileData, free[j].tileData)) {
          pairs.push([free[i], free[j]]);
        }
      }
    }
    return pairs;
  }

  /**
   * Organizes a standard 144-tile deck into 72 matching pairs
   */
  function createDeckPairs() {
    const deck = getTilesEngine().createStandardDeck();
    const pairs = [];

    // Group matching tiles
    // Seasons: 4 tiles -> 2 pairs
    const seasons = deck.filter(t => t.type === 'season');
    pairs.push([seasons[0], seasons[1]]);
    pairs.push([seasons[2], seasons[3]]);

    // Flowers: 4 tiles -> 2 pairs
    const flowers = deck.filter(t => t.type === 'flower');
    pairs.push([flowers[0], flowers[1]]);
    pairs.push([flowers[2], flowers[3]]);

    // Standard suits & honors: 4 identical tiles of each -> 2 pairs each
    const standard = deck.filter(t => t.type !== 'season' && t.type !== 'flower');
    const grouped = {};
    standard.forEach(t => {
      const key = `${t.type}_${t.value}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t);
    });

    Object.keys(grouped).forEach(k => {
      const g = grouped[k];
      pairs.push([g[0], g[1]]);
      pairs.push([g[2], g[3]]);
    });

    // Shuffle the pair order
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = pairs[i];
      pairs[i] = pairs[j];
      pairs[j] = temp;
    }

    return pairs;
  }

  /**
   * Reverse Construction Generator:
   * Places matching pairs into currently free positions in reverse.
   * If a deadlock occurs during reverse placement, it retries from the beginning with a newly shuffled deck.
   * Zero blocked-slot fallbacks — guaranteeing a 100% solvable puzzle from deal to finish.
   */
  function generateSolvableBoard(layoutPositions, maxAttempts = 200) {
    const total = layoutPositions.length;
    if (total % 2 !== 0) throw new Error('Layout must contain an even number of tiles');

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const pairCatalog = createDeckPairs();

      // Virtual slots
      let virtualSlots = layoutPositions.map((p, idx) => ({
        slotId: `slot_${idx}`,
        x: p.x,
        y: p.y,
        z: p.z,
        id: `slot_${idx}`
      }));

      const assignedTiles = [];
      let success = true;

      // Step in reverse: Find free virtual positions, assign a matching pair, then remove those positions
      for (let pairIdx = 0; pairIdx < pairCatalog.length; pairIdx++) {
        const pair = pairCatalog[pairIdx];
        const freeSlots = virtualSlots.filter(s => isTileFree(s, virtualSlots));

        if (freeSlots.length < 2) {
          // Deadlock encountered — restart with fresh attempt
          success = false;
          break;
        }

        // Pick 2 random free slots
        const idxA = Math.floor(Math.random() * freeSlots.length);
        const slotA = freeSlots[idxA];
        freeSlots.splice(idxA, 1);

        const idxB = Math.floor(Math.random() * freeSlots.length);
        const slotB = freeSlots[idxB];

        // Assign tiles
        assignedTiles.push({
          id: slotA.slotId,
          x: slotA.x,
          y: slotA.y,
          z: slotA.z,
          tileData: pair[0]
        });
        assignedTiles.push({
          id: slotB.slotId,
          x: slotB.x,
          y: slotB.y,
          z: slotB.z,
          tileData: pair[1]
        });

        // Remove from virtual slots so deeper tiles become free
        virtualSlots = virtualSlots.filter(s => s.id !== slotA.id && s.id !== slotB.id);
      }

      if (success && assignedTiles.length === total) {
        return assignedTiles;
      }
    }

    throw new Error('Failed to generate a 100% solvable board within max attempts');
  }

  /**
   * Solvable Reshuffle:
   * Rearranges remaining active tiles so at least one matching pair is open.
   */
  function reshuffleRemainingTiles(activeTiles, maxAttempts = 300) {
    if (activeTiles.length < 2) return activeTiles;

    const remainingData = activeTiles.map(t => t.tileData);
    let attempts = 0;
    let bestArrangement = null;

    while (attempts < maxAttempts) {
      attempts++;
      // Shuffle tileData array
      for (let i = remainingData.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = remainingData[i];
        remainingData[i] = remainingData[j];
        remainingData[j] = temp;
      }

      // Map shuffled data to active tiles
      const candidate = activeTiles.map((t, idx) => ({
        ...t,
        tileData: remainingData[idx]
      }));

      const availableMoves = findAvailablePairs(candidate);
      if (availableMoves.length > 0) {
        return candidate;
      }
      bestArrangement = candidate;
    }

    // Deterministic guarantee: place an open matching pair into two free positions
    const freeTiles = getFreeTiles(activeTiles);
    if (freeTiles.length >= 2) {
      let pairIdx1 = -1;
      let pairIdx2 = -1;
      for (let i = 0; i < remainingData.length; i++) {
        for (let j = i + 1; j < remainingData.length; j++) {
          if (MahjongTiles.areTilesMatching(remainingData[i], remainingData[j])) {
            pairIdx1 = i;
            pairIdx2 = j;
            break;
          }
        }
        if (pairIdx1 !== -1) break;
      }

      if (pairIdx1 !== -1 && pairIdx2 !== -1) {
        const matchedA = remainingData[pairIdx1];
        const matchedB = remainingData[pairIdx2];
        const otherData = remainingData.filter((_, idx) => idx !== pairIdx1 && idx !== pairIdx2);
        for (let i = otherData.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const temp = otherData[i];
          otherData[i] = otherData[j];
          otherData[j] = temp;
        }

        const freeId1 = freeTiles[0].id;
        const freeId2 = freeTiles[1].id;
        let otherIdx = 0;

        return activeTiles.map(t => {
          if (t.id === freeId1) return { ...t, tileData: matchedA };
          if (t.id === freeId2) return { ...t, tileData: matchedB };
          return { ...t, tileData: otherData[otherIdx++] };
        });
      }
    }

    return bestArrangement || activeTiles;
  }

  return {
    isTileCovered,
    isTileBlockedLeft,
    isTileBlockedRight,
    isTileFree,
    getFreeTiles,
    findAvailablePairs,
    generateSolvableBoard,
    reshuffleRemainingTiles
  };

})();
