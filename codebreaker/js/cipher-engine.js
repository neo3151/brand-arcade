/**
 * BLACK VAULT — cipher-engine.js
 * Secret code generator, Mastermind evaluation logic (exact & partial feedback),
 * duplicate handling, and wiretap constraint consistency checker.
 */

'use strict';

window.CipherEngine = (() => {

  const PIN_SYMBOLS = [
    { id: 'crimson',  label: 'Crimson',  hex: '#e11d48', icon: '🔴', code: 'C' },
    { id: 'amber',    label: 'Amber',    hex: '#f59e0b', icon: '🟠', code: 'A' },
    { id: 'emerald',  label: 'Emerald',  hex: '#10b981', icon: '🟢', code: 'E' },
    { id: 'cobalt',   label: 'Cobalt',   hex: '#2563eb', icon: '🔵', code: 'B' },
    { id: 'amethyst', label: 'Amethyst', hex: '#9333ea', icon: '🟣', code: 'M' },
    { id: 'cyan',     label: 'Cyan',     hex: '#06b6d4', icon: '🔷', code: 'Y' },
    { id: 'silver',   label: 'Silver',   hex: '#e2e8f0', icon: '⚪', code: 'S' },
    { id: 'onyx',     label: 'Onyx',     hex: '#3f3f46', icon: '⚫', code: 'O' }
  ];

  const CLEARANCE_PRESETS = {
    operative: {
      id: 'operative',
      label: 'Field Operative',
      codeLength: 4,
      poolSize: 6,
      allowDuplicates: true,
      maxAttempts: 10
    },
    officer: {
      id: 'officer',
      label: 'Intelligence Officer',
      codeLength: 5,
      poolSize: 7,
      allowDuplicates: true,
      maxAttempts: 10
    },
    chief: {
      id: 'chief',
      label: 'Station Chief',
      codeLength: 6,
      poolSize: 8,
      allowDuplicates: true,
      maxAttempts: 10
    }
  };

  /**
   * Generates a random secret code
   */
  function generateSecretCode(codeLength, pool, allowDuplicates = true) {
    const poolCopy = [...pool];
    const code = [];

    for (let i = 0; i < codeLength; i++) {
      if (allowDuplicates) {
        const pick = pool[Math.floor(Math.random() * pool.length)];
        code.push(pick);
      } else {
        if (poolCopy.length === 0) break;
        const idx = Math.floor(Math.random() * poolCopy.length);
        code.push(poolCopy.splice(idx, 1)[0]);
      }
    }
    return code;
  }

  /**
   * Mastermind feedback evaluator with duplicate accounting
   * Returns: { exact: number, partial: number, total: number }
   */
  function evaluateGuess(secretCode, guess) {
    const len = secretCode.length;
    let exact = 0;
    let partial = 0;

    const secretMatched = new Array(len).fill(false);
    const guessMatched = new Array(len).fill(false);

    // Pass 1: Find Exact Matches (Red / Black Pegs)
    for (let i = 0; i < len; i++) {
      if (secretCode[i] === guess[i]) {
        exact++;
        secretMatched[i] = true;
        guessMatched[i] = true;
      }
    }

    // Pass 2: Find Partial Matches (Amber / White Pegs)
    for (let i = 0; i < len; i++) {
      if (guessMatched[i]) continue;

      for (let j = 0; j < len; j++) {
        if (!secretMatched[j] && guess[i] === secretCode[j]) {
          partial++;
          secretMatched[j] = true;
          break;
        }
      }
    }

    return {
      exact,
      partial,
      empty: len - (exact + partial),
      total: len
    };
  }

  /**
   * Wiretap Logic Probe:
   * Checks if a proposed guess is logically consistent with all past clues.
   * If a guess could NOT possibly be the secret code based on earlier feedback, returns inconsistent.
   */
  function validateGuessConsistency(candidateGuess, history) {
    if (!history || history.length === 0) return { consistent: true };

    for (let i = 0; i < history.length; i++) {
      const past = history[i];
      // Evaluate what feedback the candidate would give against the past guess
      const sim = evaluateGuess(candidateGuess, past.guess);

      if (sim.exact !== past.feedback.exact || sim.partial !== past.feedback.partial) {
        return {
          consistent: false,
          rowNumber: i + 1,
          expectedExact: past.feedback.exact,
          actualExact: sim.exact,
          expectedPartial: past.feedback.partial,
          actualPartial: sim.partial
        };
      }
    }

    return { consistent: true };
  }

  /**
   * Helper for Signal Decryptor:
   * Finds an index not yet revealed in permanently unmasked list
   */
  function findUnrevealedSlot(codeLength, revealedSlots) {
    const available = [];
    for (let i = 0; i < codeLength; i++) {
      if (!revealedSlots[i]) {
        available.push(i);
      }
    }
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  /**
   * Helper for Frequency Filter:
   * Returns up to 2 symbols from currentPool that are NOT present in the secret code
   */
  function findSymbolsToFilter(secretCode, currentPool, alreadyFiltered = new Set()) {
    const secretSet = new Set(secretCode);
    const eligible = currentPool.filter(sym => !secretSet.has(sym) && !alreadyFiltered.has(sym));

    // Shuffle
    for (let i = eligible.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = eligible[i];
      eligible[i] = eligible[j];
      eligible[j] = t;
    }

    return eligible.slice(0, 2);
  }

  return {
    PIN_SYMBOLS,
    CLEARANCE_PRESETS,
    generateSecretCode,
    evaluateGuess,
    validateGuessConsistency,
    findUnrevealedSlot,
    findSymbolsToFilter
  };

})();
