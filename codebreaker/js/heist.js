/**
 * Heist campaign — 15 hand-written vault missions.
 * Codes use the same pin colors as the free clearances. No extra hints.
 */
'use strict';

(function (root) {
  const missions = [
    {
      id: 1,
      title: 'Lobby Clipboard',
      story: 'The night guard left a four-color pin on the lobby clipboard. No color repeats.',
      code: ['crimson', 'amber', 'emerald', 'cobalt'],
      poolSize: 6,
      allowDuplicates: false,
      maxAttempts: 10
    },
    {
      id: 2,
      title: 'Service Elevator',
      story: 'The service elevator asks for a night combination before it drops to the vault floor.',
      code: ['amber', 'cobalt', 'amethyst', 'cyan'],
      poolSize: 6,
      allowDuplicates: false,
      maxAttempts: 10
    },
    {
      id: 3,
      title: 'Camera Nest',
      story: 'A camera nest above the stair hides the next pin. Four colors, still no repeats.',
      code: ['emerald', 'crimson', 'cyan', 'amber'],
      poolSize: 6,
      allowDuplicates: false,
      maxAttempts: 10
    },
    {
      id: 4,
      title: 'Vault Anteroom',
      story: 'The anteroom lock is the same length as the lobby, with a colder palette.',
      code: ['cobalt', 'emerald', 'amber', 'amethyst'],
      poolSize: 6,
      allowDuplicates: false,
      maxAttempts: 10
    },
    {
      id: 5,
      title: 'Dual Key',
      story: 'Two keyholes, one code. Match every pin before the second bolt drops.',
      code: ['amethyst', 'cyan', 'crimson', 'cobalt'],
      poolSize: 6,
      allowDuplicates: false,
      maxAttempts: 10
    },
    {
      id: 6,
      title: 'Laser Gallery',
      story: 'The gallery adds a fifth pin. The lasers do not grade the story, only the colors.',
      code: ['crimson', 'amber', 'emerald', 'cobalt', 'amethyst'],
      poolSize: 6,
      allowDuplicates: false,
      maxAttempts: 10
    },
    {
      id: 7,
      title: 'Archive Cage',
      story: 'The cage catalog is five pins. Duplicates are still forbidden.',
      code: ['amber', 'emerald', 'cobalt', 'amethyst', 'cyan'],
      poolSize: 6,
      allowDuplicates: false,
      maxAttempts: 10
    },
    {
      id: 8,
      title: 'Safe Dial',
      story: 'The dial was replaced with a color drum. Five positions, ten tries.',
      code: ['emerald', 'cobalt', 'amethyst', 'cyan', 'crimson'],
      poolSize: 6,
      allowDuplicates: false,
      maxAttempts: 10
    },
    {
      id: 9,
      title: 'Roof Hatch',
      story: 'The roof hatch uses the same drum as the safe, shifted by one color.',
      code: ['cobalt', 'amethyst', 'cyan', 'crimson', 'amber'],
      poolSize: 6,
      allowDuplicates: false,
      maxAttempts: 10
    },
    {
      id: 10,
      title: 'Getaway Alley',
      story: 'An alley lockbox holds the car key. Five pins, no repeats.',
      code: ['amethyst', 'cyan', 'crimson', 'amber', 'emerald'],
      poolSize: 6,
      allowDuplicates: false,
      maxAttempts: 10
    },
    {
      id: 11,
      title: 'River Cache',
      story: 'The river cache adds silver and onyx. You get eight tries.',
      code: ['crimson', 'silver', 'onyx', 'amber'],
      poolSize: 8,
      allowDuplicates: false,
      maxAttempts: 8
    },
    {
      id: 12,
      title: 'Safehouse',
      story: 'The safehouse door is quieter. Four pins, eight tries, no repeats.',
      code: ['silver', 'emerald', 'onyx', 'cobalt'],
      poolSize: 8,
      allowDuplicates: false,
      maxAttempts: 8
    },
    {
      id: 13,
      title: 'The Buyer',
      story: 'The buyer will not open the case until this four-pin drum matches.',
      code: ['onyx', 'cyan', 'silver', 'amethyst'],
      poolSize: 8,
      allowDuplicates: false,
      maxAttempts: 8
    },
    {
      id: 14,
      title: 'After Action',
      story: 'Write the last drum into the log. Eight tries, and still no repeated colors.',
      code: ['amber', 'onyx', 'emerald', 'silver'],
      poolSize: 8,
      allowDuplicates: false,
      maxAttempts: 8
    },
    {
      id: 15,
      title: 'Dawn Train',
      story: 'The dawn train lock is the last page. Same rules as the river cache.',
      code: ['cobalt', 'silver', 'cyan', 'onyx'],
      poolSize: 8,
      allowDuplicates: false,
      maxAttempts: 8
    }
  ];

  const api = {
    productId: 'com.gamingempire.benchmarkarcade.codebreaker.pack.heist',
    entitlementId: 'codebreaker_pack_heist',
    missions: missions,
    samples: [1, 2],
    get: function (id) {
      const n = parseInt(id, 10);
      for (let i = 0; i < missions.length; i++) {
        if (missions[i].id === n) return missions[i];
      }
      return null;
    }
  };

  root.HeistCampaign = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
