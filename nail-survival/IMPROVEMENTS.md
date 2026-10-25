# Nail Survival — Polish / Improve / Update (1A = langkah paling gampang dulu)

Game: 3D zombie survival (Three.js, single file `game_code.html`, 7174 baris). Day/night, scavenging toko, 10 wave + boss Crawler, combo, inventory, minimap.

## Temuan dari kode
| # | Jenis | Temuan | Lokasi |
|---|-------|--------|--------|
| 1 | Update | Belum ada leaderboard & save (`lib.addPlayerScoreToLeaderboard`/`saveUserGameState` tidak dipakai; `persistent_storage_config.json` = `{}`) | `endGame` ~L6161 |
| 2 | Polish | `applySpecialNailEffect` didefinisikan 2x (L5281 & di dalam `gameLoop` L6726) -> duplikat, yang dalam loop dibuat ulang tiap frame | L5281, L6726 |
| 3 | Improve | Fungsi nested (`clampZombieOutsideFence`, `beginZombieClimb`, dst) dibuat ulang di tiap frame di `gameLoop` -> GC spike di mobile | L6693-6760 |
| 4 | Improve | `spawnZombie` membangun model baru (`createBlockyCharacter`) tiap spawn, tidak ada pooling; tidak ada `dispose()` sama sekali (0 hit) -> memory leak makin lama main | L4940 |
| 5 | Improve | `createFlyingNailMesh` clone material per paku special -> material leak | L5175 |
| 6 | Polish | Game over screen cuma skor; tidak ada best score / rank | L6161 |
| 7 | Balance | Boss HP 55 flat, wave 10 dipaksa solo boss; setelah boss tidak ada scaling endless (wave 11+ pakai rumus sama) | L4918, L4955 |
| 8 | Update | Tipe zombie baru (spitter/exploder), power-up drop, weapon upgrade antar-wave | - |
| 9 | Polish | Tidak ada tutorial/hint kontrol saat pertama main | - |

## 1A — Leaderboard + best score (paling cepat, dampak besar)

1. `persistent_storage_config.json`:
```json
{ "leaderboard": { "sort_ascending": false } }
```

2. Tambah sebelum `function endGame()`:
```js
let bestScore = 0;
(async () => {
    try {
        const r = await lib.getUserGameState();
        bestScore = (r && r.state && r.state.bestScore) || 0;
    } catch (e) { lib.log('load failed: ' + e); }
})();

async function submitRunResult() {
    const score = gameState.score;
    const isNewBest = score > bestScore;
    if (isNewBest) bestScore = score;
    const bestEl = document.getElementById('final-best');
    if (bestEl) bestEl.textContent = bestScore + (isNewBest ? ' NEW!' : '');
    try {
        await lib.saveUserGameState({ bestScore, bestWave: Math.max(gameState.wave, 0) });
        const res = await lib.addPlayerScoreToLeaderboard(score, 5);
        const rankEl = document.getElementById('final-rank');
        if (rankEl && res.userRank) rankEl.textContent = '#' + res.userRank;
    } catch (e) { lib.log('score submit failed: ' + e); }
}
```

3. Di akhir `endGame()` (setelah `playSound('gameOver', 0.8);`) tambah:
```js
submitRunResult();
```

4. Di HTML game-over screen (dekat `id="final-combo"`) tambah:
```html
<div>Best: <span id="final-best">0</span></div>
<div>Rank: <span id="final-rank">-</span></div>
```

## 2A — Hapus duplikat `applySpecialNailEffect`
Hapus versi di dalam `gameLoop` (L6726-6746), pakai versi global di L5281. Sekalian pindahkan `clampZombieOutsideFence` & `beginZombieClimb` keluar `gameLoop` (taruh sebelum `function gameLoop`) supaya tidak dialokasi ulang per frame.

## 3A — Dispose saat zombie mati / reset
Helper:
```js
function disposeObject(obj) {
    obj.traverse(o => {
        if (o.geometry && !o.userData.sharedGeo) o.geometry.dispose();
        if (o.material && !o.userData.sharedMat) {
            (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
        }
    });
}
```
Panggil `scene.remove(zombie.model); disposeObject(zombie.model);` di tempat zombie dihapus dan di `resetGame`. (Cek dulu `boxGeo`/`stdMat` L1110-1117 — itu cache bersama, tandai `userData.sharedGeo/sharedMat = true` agar tidak ikut di-dispose.)

## 4A — Endless scaling setelah boss (wave 11+)
Di `spawnZombie`, ganti rumus health:
```js
const endless = Math.max(0, gameState.wave - 10);
const hpBase = Math.ceil(gameState.wave * 0.5) + endless * 0.5;
```
dan di `getWaveZombieType` ubah `wave === 10` jadi `wave % 10 === 0` agar boss muncul tiap 10 wave (HP boss: `55 + (wave/10 - 1) * 25`).

## 5A — Tutorial hint singkat
Banner 1x di `startWave()` saat `gameState.wave === 1`:
```js
if (gameState.wave === 1) showBanner(isMobile ? 'Joystick kiri = jalan, kanan = tembak' : 'WASD jalan, klik tembak, R reload', '#ffffff', 3500);
```

## Urutan kerja yang disarankan
1A (leaderboard) -> 2A (duplikat) -> 5A (hint) -> 3A (dispose) -> 4A (endless) -> baru fitur baru (#8).

File game hasil pull ada di `nail-survival/game_code.html` (belum diubah, belum di-push ke Astrocade).
