// Reads tunables from window.gameConfig (seeded from game_config.json) with safe defaults.
const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
export function getCfg() {
  const g = window.gameConfig || {};
  return {
    level: Math.min(1, Math.max(0, num(g.skill && g.skill.level, 0))),
    pushAccel: num(g.skating && g.skating.pushAccel, 7),
    iceFriction: num(g.skating && g.skating.iceFriction, 0.1),
    camDist: num(g.camera && g.camera.distance, 8.5),
    camHeight: num(g.camera && g.camera.height, 4.2),
    dayMinutes: num(g.world && g.world.dayMinutes, 12),
    weather: Math.round(Math.min(4, Math.max(0, num(g.world && g.world.weather, 0)))),
    hour: (g.world && typeof g.world.hour === 'number' && g.world.hour >= 0) ? g.world.hour : -1,
  };
}
// Build 1 derives every skill from one level value; later builds make them independent.
export function skillsFor(level) {
  return { balance: level, control: level, speed: level, braking: level, tricks: level };
}
