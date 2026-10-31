// Monte-Carlo of the fence/economy loop using the game's real formulas (player aim modeled as effective fire rate).
function run(P, seed) {
  let s = seed; const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  const sides = ['n', 'e', 's', 'w'];
  const st = { hp: { n: P.baseHp, e: P.baseHp, s: P.baseHp, w: P.baseHp }, br: { n: 0, e: 0, s: 0, w: 0 } };
  const tiers = { barbed: false, plated: false, electric: false };
  let charge = 0, scrap = 4, cells = 0;
  const zapAcc = { n: 0, e: 0, s: 0, w: 0 };
  const maxHp = () => P.baseHp + (tiers.barbed ? P.barbedHp : 0) + (tiers.plated ? P.platedHp : 0);
  const thorns = () => (tiers.barbed ? P.barbedThorn : 0) + (tiers.plated ? P.platedThorn : 0);
  const out = [];
  for (let wave = 1; wave <= P.maxWave; wave++) {
    // ---- day: income & spending
    const stationsPerDay = P.playerStations + (wave >= P.npcJoinWave ? P.npcStationsPerDay : 0);
    let incomeScrap = 0, incomeCells = 0;
    for (let i = 0; i < stationsPerDay; i++) {
      if (rnd() < P.hwChance) {
        const r = rnd();
        if (r < P.scrapRoll) incomeScrap += 2 + Math.floor(rnd() * P.scrapQtyVar);
        else if (r > 1 - P.cellRoll) incomeCells++;
      }
    }
    if (wave >= P.npcJoinWave && P.scavengerBonus) incomeScrap *= 1.3;
    scrap += Math.round(incomeScrap); cells += incomeCells;
    const tryBuy = () => {
      if (!tiers.barbed && scrap >= P.costBarbed) { scrap -= P.costBarbed; tiers.barbed = true; for (const k of sides) if (!st.br[k]) st.hp[k] = Math.min(maxHp(), st.hp[k] + P.barbedHp); return true; }
      if (tiers.barbed && !tiers.plated && scrap >= P.costPlated) { scrap -= P.costPlated; tiers.plated = true; for (const k of sides) if (!st.br[k]) st.hp[k] = Math.min(maxHp(), st.hp[k] + P.platedHp); return true; }
      if (tiers.plated && !tiers.electric && scrap >= P.costElectric && cells >= 2) { scrap -= P.costElectric; cells -= 2; tiers.electric = true; charge = 100; return true; }
      return false;
    };
    // policy: repair first (keep sides alive), then upgrades
    for (const k of sides) {
      const miss = maxHp() - st.hp[k]; const need = Math.ceil(miss / P.repairPerScrap); const use = Math.min(need, scrap);
      if (use > 0) { scrap -= use; st.hp[k] = Math.min(maxHp(), st.hp[k] + use * P.repairPerScrap); if (st.br[k] && st.hp[k] >= 45) st.br[k] = 0; }
    }
    while (tryBuy()) { /* buy everything affordable */ }
    if (tiers.electric && cells > 0 && charge < 60) { cells--; charge = Math.min(100, charge + P.cellCharge); }
    // ---- night
    const type = wave % 10 === 0 ? 'boss' : (wave % 10 === 5 ? 'bloater' : (wave % 3 === 0 ? ['runner', 'tank', 'climber'][(Math.floor(wave / 3) - 1) % 3] : 'normal'));
    let total = type === 'boss' ? 1 : Math.min(45, P.perWave + (wave - 1) * P.inc);
    if (type === 'bloater') total = Math.max(3, Math.ceil(total * 0.4));
    const prof = { normal: [1, 1], runner: [0.75, 1.85], tank: [3.2, 0.55], climber: [1.25, 1.05], bloater: [1.6, 0.6], boss: [0, 0.72] }[type];
    const hp0 = type === 'boss' ? 55 + (wave / 10 - 1) * 25 : Math.max(1, Math.ceil(wave * 0.5) * prof[0]);
    const speed = Math.min(2 + wave * 0.2, 6) * prof[1];
    let spawned = 0, spawnT = 0; const zs = []; let t = 0, dmgTaken = 0, leaks = 0;
    const breaches0 = sides.filter(k => st.br[k]).length;
    const dt = 0.25;
    while ((spawned < total || zs.length) && t < 240) {
      t += dt; spawnT += dt;
      if (spawned < total && spawnT >= 1.5 / (wave * 0.5 + 1)) {
        spawnT = 0; spawned++;
        const dist = 25 + rnd() * 60;
        zs.push({ side: sides[Math.floor(rnd() * 4)], hp: hp0, eta: (dist - 7) / speed, fence: false, fuse: 0, stun: 0, inside: false });
      }
      // player: effective shots per second spread over zombies that are close
      let shots = P.fireRate * P.accuracy * dt;
      const targets = zs.filter(z => z.eta <= 6 || z.fence || z.inside);
      while (shots > 0 && targets.length) {
        const z = targets[Math.floor(rnd() * targets.length)];
        z.hp -= (rnd() < P.headChance ? 2.5 : 1) * Math.min(1, shots); shots -= 1;
      }
      if (wave >= P.npcJoinWave) for (let h = 0; h < P.hunters; h++) { const c = zs.filter(z => z.fence); if (c.length && rnd() < dt / 1.05) c[Math.floor(rnd() * c.length)].hp -= 1; }
      const chewBy = { n: 0, e: 0, s: 0, w: 0 };
      const touchers = { n: [], e: [], s: [], w: [] };
      for (const z of zs) {
        z.eta -= dt;
        if (z.eta <= 0 && !z.fence && !z.inside) {
          if (type === 'climber' || st.br[z.side]) { z.inside = true; leaks++; } else z.fence = true;
        }
        if (z.fence) {
          touchers[z.side].push(z);
          if (z.stun > 0) z.stun -= dt;
          else if (type === 'bloater') z.fuse += dt;
          else chewBy[z.side] += (type === 'tank' ? P.chewTank : P.chew) * P.guardMult;
        }
        if (z.inside) dmgTaken += dt * 0.35 * (type === 'tank' ? 2 : 1);
        if (z.fence && st.br[z.side]) { z.fence = false; z.inside = true; leaks++; }
      }
      for (const k of sides) {
        if (!st.br[k] && chewBy[k] > 0) { st.hp[k] -= chewBy[k] * dt; if (st.hp[k] <= 0) { st.hp[k] = 0; st.br[k] = 1; } }
        const th = thorns();
        if (th > 0) for (const z of touchers[k]) z.hp -= th * dt;
        if (tiers.electric && charge > 0 && touchers[k].length) {
          zapAcc[k] += dt;
          if (zapAcc[k] >= 0.9) { zapAcc[k] = 0; let n = 0; for (const z of touchers[k]) { if (n++ >= 6) break; z.hp -= 1.8; z.stun = 0.7; } charge = Math.max(0, charge - P.zapCost); }
        }
      }
      for (const z of zs) if (type === 'bloater' && z.fence && (z.fuse >= 1.2 || z.hp <= 0)) {
        if (!st.br[z.side]) { st.hp[z.side] -= P.bloatFence; if (st.hp[z.side] <= 0) { st.hp[z.side] = 0; st.br[z.side] = 1; } }
        z.hp = -1;
      }
      for (let i = zs.length - 1; i >= 0; i--) if (zs[i].hp <= 0) zs.splice(i, 1);
    }
    const brNow = sides.filter(k => st.br[k]).length;
    out.push({ wave, type, total, secs: Math.round(t), breaches: brNow, newBreaches: Math.max(0, brNow - breaches0), leaks, dmg: +dmgTaken.toFixed(1), scrap, cells, tiers: (tiers.barbed ? 'B' : '-') + (tiers.plated ? 'P' : '-') + (tiers.electric ? 'E' : '-') });
  }
  return out;
}
const BASE = {
  maxWave: 12, baseHp: 260, barbedHp: 100, platedHp: 180, barbedThorn: 0.9, platedThorn: 0.6, repairPerScrap: 30, costBarbed: 8, costPlated: 12, costElectric: 10, cellCharge: 40, zapCost: 1.3,
  chew: 1.8, chewTank: 7, bloatFence: 55, perWave: 5, inc: 3, fireRate: 3, accuracy: 0.55, headChance: 0.3, guardMult: 1,
  playerStations: 4, npcStationsPerDay: 2, npcJoinWave: 3, scavengerBonus: true, hunters: 1, hwChance: 0.7, scrapRoll: 0.52, cellRoll: 0.22, scrapQtyVar: 3
};
function summarize(P, label, n = 300) {
  const agg = {};
  for (let i = 0; i < n; i++) {
    const r = run(P, 1000 + i * 7919);
    for (const w of r) {
      const a = agg[w.wave] || (agg[w.wave] = { wave: w.wave, type: w.type, total: w.total, secs: 0, breach: 0, newB: 0, leaks: 0, dmg: 0, scrap: 0, cells: 0, B: 0, P: 0, E: 0 });
      a.secs += w.secs; a.breach += w.breaches > 0 ? 1 : 0; a.newB += w.newBreaches; a.leaks += w.leaks; a.dmg += w.dmg; a.scrap += w.scrap; a.cells += w.cells;
      a.B += w.tiers[0] === 'B' ? 1 : 0; a.P += w.tiers[1] === 'P' ? 1 : 0; a.E += w.tiers[2] === 'E' ? 1 : 0;
    }
  }
  console.log('\n== ' + label);
  console.log('wave type      zombies night(s) P(side down) leaks dmg  scrap(spare)  B%  P%  E%');
  for (const k in agg) {
    const a = agg[k];
    console.log(String(a.wave).padStart(3), a.type.padEnd(9), String(a.total).padStart(6), String(Math.round(a.secs / n)).padStart(8), (a.breach / n * 100).toFixed(0).padStart(10) + '%', (a.leaks / n).toFixed(1).padStart(6), (a.dmg / n).toFixed(1).padStart(4), (a.scrap / n).toFixed(1).padStart(9), (a.B / n * 100).toFixed(0).padStart(7), (a.P / n * 100).toFixed(0).padStart(3), (a.E / n * 100).toFixed(0).padStart(3));
  }
}
module.exports = { run, BASE, summarize };
if (require.main === module) summarize(BASE, 'CURRENT SETTINGS');
