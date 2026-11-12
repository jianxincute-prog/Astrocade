# Waifu Assembler 3D

Jelajahi aula restorasi 120 × 120 yang terang, temukan 60 segmen patung yang tersebar di 12 zona, lalu susun kembali dua belas figur (Office, Nurse, CEO, Student, Idol, Janitor, Rin, Aoi, Mei, Yuki, Kana, Sakura) di galeri patung berkubah di utara aula. Blueprint holografik memperlihatkan figur utuh dengan segmen yang sedang dibawa disorot merah.

## Layar pembuka
- **Loading 3D**: selama dunia dibangun (satu patung per frame), kamera sinematik menyusuri galeri dan tiap patung muncul begitu selesai dipahat; judul + progress bar di atasnya. Sebelum Babylon.js termuat, splash bergaya sama.
- **Main menu** di atas galeri yang terus bergerak pelan: **PLAY/CONTINUE**, **SETTINGS** (volume musik & efek, audio on/off, sensitivitas kamera, grafis High/Balanced, reset progres dengan konfirmasi dua kali), **RANKING** (leaderboard waktu tercepat memulihkan ke-12 patung; `persistent_storage_config.leaderboard.sort_ascending = true`). Tombol ☰ / Esc di game kembali ke menu.
- Waktu restorasi hanya dihitung saat bermain, disimpan bersama progres dan preferensi; skor dikirim saat patung terakhir selesai.

## Bermain
- Gerak: joystick sentuh atau WASD / panah; geser layar atau seret mouse untuk melihat.
- Dekati komponen di atas plinth marmer, tekan **COLLECT** (atau E), bawa ke plinth bernama set yang sama di galeri, tekan **ASSEMBLE**.
- Kamera orang pertama berada di ketinggian mata 3.2 (patung ±5 unit di atas plinth), jadi wajah patung terlihat sejajar dada–wajah pengunjung.
- Selesaikan lima bagian pada setiap podium untuk memulihkan seluruh figur.

## Audio
- Musik tema `music_atelier_theme` (piano lembut, string, harpa, music box; loop) dan efek: ambil potongan, pasang potongan, patung selesai, semua patung selesai, tap UI, dan nada lembut saat plinth terlalu jauh. Semua aset ada di `asset_map.json`.
- Audio dimulai pada sentuhan/tombol pertama, berhenti saat game disembunyikan, musik diredam sejenak saat fanfare. Tombol ♪ di HUD mematikan/menyalakan suara (tersimpan bersama progres); volume musik dan efek bisa diatur di panel pengaturan (`settings.musicVolume`, `settings.sfxVolume`).

## Juice & performa
- Potongan terbang dari plinth ke tangan saat diambil dan dari tangan ke patung saat dipasang (pop saat mendarat; kilau, suara, dan getar tepat saat mendarat). Patung selesai: pilar cahaya emas + gelombang cincin + halo; FOV kick halus; counter HUD "pop"; langkah kaki di marmer; petunjuk singkat untuk pemain baru.
- Pengunjung tidak bisa menembus patung, plinth, pohon, dan bangku (collider lingkaran).
- Resolusi dinamis menjaga ±60 fps (turun bertahap saat < 50 fps, naik lagi saat stabil); material statis, plinth, podium, dan ceruk dibekukan setelah loading (hologram fresnel dikecualikan); plinth fragmen tidak lagi ikut bergerak tiap frame; status fragmen & target terdekat di-cache; DOM HUD hanya ditulis saat berubah; rect kartu hologram diukur saat layout berubah saja; save digabung (debounce 1,5 dtk); timer memakai waktu nyata.

## Performa patung (LOD, merge, shader, context)
- **LOD low-poly**: tiap bagian patung juga dipahat ulang pada 35% resolusi (≈5× lebih sedikit segitiga, `Sculptor.detail`). Mulai 22 unit, bagian patung diganti satu mesh low-poly berwarna per-vertex (satu material bersama) + wajah low-poly → ±2 draw call per patung jauh. Bulu mata, kornea, air mata, gigi, lidah tidak digambar di atas 16 unit. Hologram bagian yang belum terpasang juga punya LOD.
- **Merge per material**: patung yang selesai digabung jadi satu mesh per material (±26 → ±15 draw call) beserta LOD-nya; bagian asli, hologram, dan klon fragmennya dilepas (mesh di scene 1.463 → ±330 saat semua selesai). Ceruk dan plinth juga digabung per material. Reset progres memuat ulang game untuk membangun ulang patung.
- **Shader warm-up**: semua varian shader (bagian patung + lampu potret, LOD, fragmen, hologram, perayaan, depth bayangan) dikompilasi saat loading → memasang potongan tidak memicu kompilasi.
- **WebGL context lost**: render dijeda, progres disimpan, overlay "Restoring the gallery…"; saat pulih, probe refleksi & bayangan dibangun ulang; jika tidak pulih dalam 6 dtk, tombol RELOAD.
- Hologram kartu HUD memakai patung low-poly yang di-cache per karakter; potongan yang dibawa adalah klon (tanpa memahat ulang).

## Editor
Mode **Edit** menghentikan gameplay; plinth di galeri bisa dipilih dan diseret (ditulis ke `gameConfig.podiumPositions`). Patung otomatis menghadap lorong tengah dan ceruk berwarna di dinding ikut berpindah.

## Visual (Babylon.js 9.35)
- Tema museum siang hari (tanpa neon): lantai travertin, dinding plester hangat dengan wainscot kayu dan list kuningan, jendela taman lengkung, langit-langit berkoffer dengan skylight, pohon zaitun, bangku, medali lantai 12 sinar.
- Galeri patung 40 × 92: kubah dengan skylight memanjang, lantai marmer, karpet di lorong tengah, enam plinth di tiap sisi, ceruk pastel warna khas tiap karakter, jendela apse di ujung.
- Scene right-handed, PBR, cahaya hemisfer + matahari + fill, bayangan PCF yang digambar ulang hanya saat isi galeri berubah, probe refleksi siang untuk emas/rambut/sepatu.
- Performa ponsel: geometri tiap bagian patung dipahat sekali (fragmen = clone yang berbagi geometri), tekstur wajah in-game 1024×512, fragmen/patung jauh tidak digambar, label hanya untuk objek dekat.
- Post-processing: bloom lembut, FXAA, tone mapping ACES, vignette hangat. Kelopak sakura + percikan bintang saat mengambil/memasang bagian.
- Patung: wajah anime bertekstur dengan iris berkilau, ekspresi dan blush khas; rambut, aksesori, dan seragam berbeda tiap set. Office memegang clipboard, Nurse melambai, CEO berpose presentasi, Student membawa tas, Idol memegang mikrofon, Janitor memegang pel, Rin memegang buku, Aoi mengepalkan tangan, Mei membawa nampan teh, Yuki memunculkan kristal salju, Kana ber-selfie, Sakura memegang sapu kuil; bagian belum terpasang tampil sebagai hologram.

## Sistem karakter (Character Studio)
- 12 preset wajah (`faces.mjs`): 6 patung + Rin, Aoi, Mei, Yuki, Kana, Sakura — tiap preset punya bentuk rahang/dagu/hidung/bibir, mata, riasan, rambut (potongan, poni, gaya ikat) dan aksesori sendiri.
- 10 ekspresi: neutral, smiling, happy, shy, angry, sad, surprised, wink, crying, smug.
- Bibir per karakter (`LIP_STYLE`): lebar, tebal bibir atas/bawah, bentuk cupid's bow, warna lipstik, lip liner, dan finish (matte, satin, gloss, gradient, frost, bare, beni). Finish juga mengatur kilap 3D lewat peta roughness wajah.
- Ekspresi dibentuk dalam 3D pada mesh kepala: kelopak atas/bawah berupa cangkang mesh yang menutup bola mata 3D, bulu mata 3D mengikuti tepi kelopak, rongga mulut 3D (gigi, lidah) di balik bukaan bibir, air mata 3D; alis, blush dan riasan dilukis pada material kulit kepala yang sama. Tidak ada sprite/plane wajah.
- Tombol **STUDIO** membuka scene studio terpisah (lampu key/fill/rim + beauty light, refleksi studio, bloom/ACES); seret untuk memutar kepala, panah untuk ganti karakter, chip untuk ganti ekspresi. Patung di game memakai ekspresi khas masing-masing.

## Struktur kode
- `game.js` — entry Astrocade (`window.run`), memuat Babylon.js dari CDN.
- `logic.mjs` — aturan murni (pecahan, pengambilan, pemasangan, save).
- `renderer.js` — scene, kamera, cahaya, pipeline, input, HUD, editor.
- `statues.js` — model patung, wajah anime bertekstur, rambut, seragam, dan hologram.
- `faces.mjs` — data preset wajah, ekspresi, ekspresi default, bentuk wajah dan gaya bibir (diuji di Node).
- `poses.mjs` — 12 pose khas berbasis sendi (bahu → siku → pergelangan, arah tangan, telapak, lekuk jari) beserta propertinya.
- `world.js` — aula restorasi, galeri patung, plinth patung, plinth fragmen, label, partikel.
- `ui.js` — markup HUD, CSS, blueprint SVG.
- `audio.js` — musik tema dan efek suara (Web Audio, aset dari `lib.getAsset`).
- `tests/logic.test.mjs` — `node --test tests/logic.test.mjs`.
