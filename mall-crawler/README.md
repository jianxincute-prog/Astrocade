# Mall Crawler

Game 3D third-person survival (single-file Astrocade, Three.js r128). Kumpulkan makanan dan minuman di mal 320 m berisi 240 toko, klaim basecamp, hindari monster dan jebakan.

## Berkas
- `game_code.html` — seluruh game (peta isi ada di komentar kepala `<script>`).
- `game_config.json` — parameter yang bisa diubah (slider via `lib.showGameParameters`).
- `persistent_storage_config.json` — deklarasi leaderboard (skor tertinggi lebih baik).
- `asset_map.json` — dikelola di platform (8 aset audio); ambil dengan `pull_game` bila perlu.
- `tests/smoke.js` — smoke test Playwright; `tools/extract-js.js` — bantu lint.

## Menjalankan pemeriksaan
```
npm install
npm run lint     # ESLint pada script yang diekstrak
npm test         # butuh Chromium Playwright; memakai three r128 dari node_modules
```
Variabel opsional: `GAME_HTML`, `THREE_JS`.

## Catatan arsitektur
- Satu `run(mode)` besar dengan bagian bernomor (lihat komentar). Astrocade single-file tidak mendukung modul terpisah; memecah menjadi modul berarti memigrasi ke game multi-file.
- Konstanta balance/AI ada di `TUNING`, tingkat kesulitan di `DIFFS`, tipe monster di `MTYPES`.
- Dunia statis digabung per material per chunk (draw call ~70); interior toko dibangun malas saat dibuka dan dibuang saat restart.
- `run()` aman dipanggil ulang: `window.__mallCleanup` melepas listener, loop, dan konteks WebGL lama.
