const { BASE, summarize } = require('./sim.js');
const arg = process.argv[2] || 'all';
const configs = {
  a_tough: { chew: 3.2, chewTank: 11, baseHp: 220, bloatFence: 70, hwChance: 0.55, scrapRoll: 0.45, playerStations: 3, npcStationsPerDay: 1.5, repairPerScrap: 25, costBarbed: 10, costPlated: 16, costElectric: 14 },
  b_tougher: { chew: 4.0, chewTank: 13, baseHp: 200, bloatFence: 70, hwChance: 0.55, scrapRoll: 0.45, playerStations: 3, npcStationsPerDay: 1.5, repairPerScrap: 25, costBarbed: 10, costPlated: 16, costElectric: 14 },
  c_mid: { chew: 3.6, chewTank: 12, baseHp: 220, bloatFence: 70, hwChance: 0.6, scrapRoll: 0.48, playerStations: 3, npcStationsPerDay: 2, repairPerScrap: 25, costBarbed: 10, costPlated: 16, costElectric: 14, cellRoll: 0.2 }
};
for (const k of Object.keys(configs)) if (arg === 'all' || arg === k) summarize({ ...BASE, ...configs[k] }, k + ' ' + JSON.stringify(configs[k]));
