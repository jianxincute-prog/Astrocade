// Pure battlefield hazards spawned by bosses: projectiles, delayed meteors and lingering ground zones.
// updateField returns events for main.js to apply damage / spawn effects:
//   projectileHit, projectileEnd, meteorLand, zoneStart, zoneTick, zoneEnd
export function createField() { return { projectiles: [], zones: [], meteors: [], nextId: 1 }; }

export function addProjectile(f, p) { const o = { id: f.nextId++, age: 0, ...p }; f.projectiles.push(o); return o; }
/** zone: { owner, kind:'poison'|'fire', x, z, r, arm, dur, dps, poison } — harmless while arming, then ticks every 0.5 s. */
export function addZone(f, z) { const o = { id: f.nextId++, age: 0, tick: 0, started: false, arm: 0, ...z }; f.zones.push(o); return o; }
/** meteor: { owner, x, z, delay, r, dmg, kb, burn:{dur,dps,r} } — lands after `delay` seconds. */
export function addMeteor(f, m) { const o = { id: f.nextId++, age: 0, ...m }; f.meteors.push(o); return o; }

export function clearOwner(f, owner) {
  f.projectiles = f.projectiles.filter((p) => p.owner !== owner);
  f.zones = f.zones.filter((p) => p.owner !== owner);
  f.meteors = f.meteors.filter((p) => p.owner !== owner);
}
export function clearAll(f) { f.projectiles = []; f.zones = []; f.meteors = []; }

/** pl: { x, z, radius, dead }; opts.blocked(x, z) -> true when a projectile hits a building. */
export function updateField(f, dt, pl, opts = {}) {
  const events = [];
  const alive = !pl.dead;
  // projectiles
  const keepP = [];
  for (const p of f.projectiles) {
    p.age += dt;
    p.x += p.vx * dt; p.z += p.vz * dt;
    if (alive && Math.hypot(pl.x - p.x, pl.z - p.z) < p.r + pl.radius) {
      events.push({ type: 'projectileHit', id: p.id, kind: p.kind, x: p.x, z: p.z, vx: p.vx, vz: p.vz, dmg: p.dmg, poison: !!p.poison, owner: p.owner });
      continue;
    }
    if (p.age >= p.life || (opts.blocked && opts.blocked(p.x, p.z))) { events.push({ type: 'projectileEnd', id: p.id, kind: p.kind, x: p.x, z: p.z }); continue; }
    keepP.push(p);
  }
  f.projectiles = keepP;
  // meteors
  const keepM = [];
  for (const m of f.meteors) {
    m.age += dt;
    if (m.age < m.delay) { keepM.push(m); continue; }
    const hit = alive && Math.hypot(pl.x - m.x, pl.z - m.z) < m.r + pl.radius;
    events.push({ type: 'meteorLand', id: m.id, x: m.x, z: m.z, r: m.r, dmg: m.dmg, kb: m.kb || 0, hit, owner: m.owner });
    if (m.burn) addZone(f, { owner: m.owner, kind: 'fire', x: m.x, z: m.z, r: m.burn.r, arm: 0, dur: m.burn.dur, dps: m.burn.dps, poison: false });
  }
  f.meteors = keepM;
  // zones
  const keepZ = [];
  for (const z of f.zones) {
    z.age += dt;
    if (!z.started && z.age >= z.arm) { z.started = true; events.push({ type: 'zoneStart', id: z.id, kind: z.kind, x: z.x, z: z.z, r: z.r }); }
    if (z.age >= z.arm + z.dur) { events.push({ type: 'zoneEnd', id: z.id, kind: z.kind }); continue; }
    if (z.started && alive && Math.hypot(pl.x - z.x, pl.z - z.z) < z.r + pl.radius * 0.5) {
      z.tick += dt;
      while (z.tick >= 0.5) { z.tick -= 0.5; events.push({ type: 'zoneTick', id: z.id, kind: z.kind, x: z.x, z: z.z, dmg: z.dps * 0.5, poison: !!z.poison, owner: z.owner }); }
    } else z.tick = Math.min(z.tick, 0.45);
    keepZ.push(z);
  }
  f.zones = keepZ;
  return events;
}
