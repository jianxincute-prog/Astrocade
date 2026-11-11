# Waifu Assembler 3D

Jelajahi aula pameran 150 × 150, temukan 30 segmen patung yang tersebar, lalu susun kembali Office-01, Nurse-01, CEO-01, Student-01, Idol-01, dan Janitor-01 di annex restorasi di luar aula. Blueprint holografik memperlihatkan figur utuh dengan segmen yang sedang dibawa disorot merah.

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

## Sistem karakter (Character Studio)
- 12 preset wajah (`faces.mjs`): 6 patung + Rin, Aoi, Mei, Yuki, Kana, Sakura — tiap preset punya bentuk rahang/dagu/hidung/bibir, mata, riasan, rambut (potongan, poni, gaya ikat) dan aksesori sendiri.
- 10 ekspresi: neutral, smiling, happy, shy, angry, sad, surprised, wink, crying, smug.
- Ekspresi dibentuk dalam 3D pada mesh kepala: kelopak atas/bawah berupa cangkang mesh yang menutup bola mata 3D, bulu mata 3D mengikuti tepi kelopak, rongga mulut 3D (gigi, lidah) di balik bukaan bibir, air mata 3D; alis, blush dan riasan dilukis pada material kulit kepala yang sama. Tidak ada sprite/plane wajah.
- Tombol **STUDIO** membuka scene studio terpisah (lampu key/fill/rim + beauty light, refleksi studio, bloom/ACES); seret untuk memutar kepala, panah untuk ganti karakter, chip untuk ganti ekspresi. Patung di game memakai ekspresi khas masing-masing.

## Struktur kode
- `game.js` — entry Astrocade (`window.run`), memuat Babylon.js dari CDN.
- `logic.mjs` — aturan murni (pecahan, pengambilan, pemasangan, save).
- `renderer.js` — scene, kamera, cahaya, pipeline, input, HUD, editor.
- `statues.js` — model patung, wajah anime bertekstur, rambut, seragam, dan hologram.
- `faces.mjs` — data preset wajah, ekspresi, ekspresi default dan bentuk wajah (diuji di Node).
- `poses.mjs` — pose khas berbasis sendi (bahu → siku → pergelangan, arah tangan, telapak, lekuk jari): Office membawa clipboard di pinggul, Nurse melambai, CEO tangan di pinggang sambil presentasi.
- `world.js` — aula, annex, podium, pedestal fragmen, label, partikel.
- `ui.js` — markup HUD, CSS, blueprint SVG.
- `tests/logic.test.mjs` — `node --test tests/logic.test.mjs`.
