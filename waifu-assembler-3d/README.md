# Waifu Assembler 3D

Jelajahi aula pameran 150 × 150, temukan 25 segmen patung yang tersebar, lalu susun kembali Office-01, Nurse-01, CEO-01, Student-01, dan Janitor-01 di annex restorasi di luar aula. Blueprint holografik memperlihatkan figur utuh dengan segmen yang sedang dibawa disorot merah.

## Bermain
- Gerak: joystick sentuh atau WASD / panah; geser layar atau seret mouse untuk melihat.
- Dekati komponen, tekan **COLLECT** (atau E), bawa ke podium bernama set yang sama, tekan **ASSEMBLE**.
- Selesaikan lima bagian pada setiap podium untuk memulihkan seluruh figur.

## Editor
Mode **Edit** menghentikan gameplay; podium annex bisa dipilih dan diseret (ditulis ke `gameConfig.podiumPositions`).

## Visual (Babylon.js 9.35)
- Scene right-handed, PBR, bayangan PCF di annex, pantulan cermin lembut di lantai annex, probe refleksi studio untuk emas/rambut/sepatu.
- Post-processing: bloom, FXAA, tone mapping ACES, vignette. Kelopak sakura + percikan bintang saat mengambil/memasang bagian.
- Patung: wajah anime bertekstur dengan iris berkilau, ekspresi dan blush khas; rambut, aksesori, dan seragam berbeda tiap set. Office memegang clipboard, Nurse melambai, CEO berpose presentasi; bagian belum terpasang tampil sebagai hologram.

## Struktur kode
- `game.js` — entry Astrocade (`window.run`), memuat Babylon.js dari CDN.
- `logic.mjs` — aturan murni (pecahan, pengambilan, pemasangan, save).
- `renderer.js` — scene, kamera, cahaya, pipeline, input, HUD, editor.
- `statues.js` — model patung, wajah anime bertekstur, rambut, seragam, dan hologram.
- `poses.mjs` — pose khas berbasis sendi (bahu → siku → pergelangan, arah tangan, telapak, lekuk jari): Office membawa clipboard di pinggul, Nurse melambai, CEO tangan di pinggang sambil presentasi.
- `world.js` — aula, annex, podium, pedestal fragmen, label, partikel.
- `ui.js` — markup HUD, CSS, blueprint SVG.
- `tests/logic.test.mjs` — `node --test tests/logic.test.mjs`.
