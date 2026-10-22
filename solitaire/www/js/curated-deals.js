/**
 * Curated Deals — 100 draw-1 Klondike seeds outside the free 1–1000 ladder.
 * Each seed wins under scripts/klondike-solve.js (same rules as the game).
 */
(function (root) {
  'use strict';
  const deals = [10001,10005,10006,10007,10009,10010,10013,10014,10016,10018,10020,10022,10024,10025,10026,10030,10035,10036,10037,10041,10042,10043,10045,10046,10047,10048,10051,10059,10060,10063,10064,10065,10067,10072,10078,10079,10081,10083,10084,10085,10091,10093,10096,10098,10104,10105,10107,10108,10110,10112,10114,10116,10117,10121,10122,10123,10124,10128,10129,10130,10131,10132,10138,10145,10148,10150,10153,10156,10160,10161,10164,10166,10167,10171,10175,10176,10178,10179,10180,10181,10184,10186,10189,10192,10193,10194,10197,10198,10199,10202,10204,10209,10214,10215,10216,10218,10220,10223,10224,10227];
  const api = {
    deals: deals,
    productId: 'com.gamingempire.benchmarkarcade.solitaire.pack.curated',
    entitlementId: 'solitaire_pack_curated',
    samples: deals.slice(0, 2),
    contains(dealNumber) { return deals.indexOf(dealNumber) !== -1; },
    indexOf(dealNumber) { return deals.indexOf(dealNumber); },
    next(dealNumber) {
      const i = deals.indexOf(dealNumber);
      return i >= 0 && i + 1 < deals.length ? deals[i + 1] : null;
    }
  };
  root.CuratedDeals = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
