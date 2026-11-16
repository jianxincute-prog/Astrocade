// Pure rules for Midnight Breach's accelerated phone clock and editable app layout.
export const DEFAULT_APP_ORDER = ['messages', 'photos', 'contacts', 'notes', 'phone', 'after'];

export function clockAt(elapsedMs, durationSeconds) {
  const durationMs = Math.max(1, Number(durationSeconds) || 80) * 1000;
  const progress = Math.min(1, Math.max(0, elapsedMs / durationMs));
  const elapsedGameMinutes = Math.floor(progress * 12);
  const totalMinutes = 23 * 60 + 48 + elapsedGameMinutes;
  const hour24 = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  const hour12 = hour24 % 12 || 12;
  return {
    hour24,
    minute,
    hour12,
    display: `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    isMidnight: progress >= 1,
    secondsLeft: Math.max(0, Math.ceil((durationMs - Math.max(0, elapsedMs)) / 1000)),
    progress,
  };
}

export function normalizeAppOrder(order) {
  const valid = new Set(DEFAULT_APP_ORDER);
  const normalized = [];
  for (const id of Array.isArray(order) ? order : []) {
    if (valid.has(id) && !normalized.includes(id)) normalized.push(id);
  }
  for (const id of DEFAULT_APP_ORDER) if (!normalized.includes(id)) normalized.push(id);
  return normalized;
}

export function moveApp(order, fromId, toId) {
  const next = normalizeAppOrder(order);
  const from = next.indexOf(fromId);
  const to = next.indexOf(toId);
  if (from < 0 || to < 0 || from === to) return next;
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}

export function archiveIsUnlocked(elapsedMs, durationSeconds) {
  return clockAt(elapsedMs, durationSeconds).isMidnight;
}

// Phone clock that keeps running after midnight (00:01, 00:02 ...), 12h display.
export function clockDisplayAt(elapsedMs, durationSeconds) {
  const msPerMinute = (Math.max(1, Number(durationSeconds) || 80) * 1000) / 12;
  const gameMinutes = Math.floor(Math.max(0, elapsedMs) / msPerMinute);
  const total = 23 * 60 + 48 + gameMinutes;
  const hour24 = Math.floor(total / 60) % 24;
  const minute = total % 60;
  const hour12 = hour24 % 12 || 12;
  return {
    display: `${String(hour12).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    hour24,
    minute,
    isMidnight: gameMinutes >= 12,
    afterMidnightMinutes: Math.max(0, gameMinutes - 12),
  };
}
