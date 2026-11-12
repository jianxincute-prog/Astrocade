// Pure campaign progress: kills per gang, boss summons, liberated territories, score.
import { killScore } from './combat.js';

export function createProgress(killsForBoss = 8) {
  return {
    killsForBoss,
    gangs: [0, 1, 2].map(() => ({ kills: 0, bossSpawned: false, liberated: false })),
    score: 0, combo: 0, comboTimer: 0, bestCombo: 0, totalKills: 0, time: 0,
  };
}

export function registerHit(pr) {
  pr.combo++;
  pr.comboTimer = 2.5;
  pr.bestCombo = Math.max(pr.bestCombo, pr.combo);
  pr.score += 5 + Math.min(pr.combo, 30);
}

export function tickProgress(pr, dt) {
  pr.time += dt;
  if (pr.comboTimer > 0) {
    pr.comboTimer -= dt;
    if (pr.comboTimer <= 0) pr.combo = 0;
  }
}

/** Register a kill; returns events: 'bossSummon' when a gang's boss should appear, 'liberated', 'victory'. */
export function registerKill(pr, gang, isBoss) {
  const out = [];
  const g = pr.gangs[gang];
  pr.score += killScore(isBoss, pr.combo);
  pr.totalKills++;
  if (isBoss) {
    g.liberated = true;
    out.push('liberated');
    if (pr.gangs.every((x) => x.liberated)) out.push('victory');
    return out;
  }
  g.kills++;
  if (!g.bossSpawned && g.kills >= pr.killsForBoss) {
    g.bossSpawned = true;
    out.push('bossSummon');
  }
  return out;
}

export function finalScore(pr, victory) {
  return Math.round(pr.score + (victory ? Math.max(0, 6000 - pr.time * 10) : 0));
}
