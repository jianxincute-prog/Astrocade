# Waifu Assembler 3D

Jelajahi aula restorasi terang berukuran 96 × 96, temukan 60 segmen patung yang tersebar di 12 zona, lalu susun kembali dua belas figur (Office, Nurse, CEO, Student, Idol, Janitor, Rin, Aoi, Mei, Yuki, Kana, Sakura) di galeri patung berkubah di utara aula. Blueprint holografik memperlihatkan figur utuh dengan segmen yang sedang dibawa disorot merah. Mode **Stage Run** menantang pemain menyelesaikan satu patung per stage dengan waktu terbatas, fragmen ornamen baru, tirai dan peti yang dibuka, serta skor leaderboard kumulatif.

## Layar pembuka
- **Loading sederhana (2D)**: latar gelap hangat, logo kecil, progress bar + persen + status. Scene 3D tidak dirender selama loading sehingga semua waktu dipakai untuk membangun galeri; splash sebelum Babylon.js termuat memakai tampilan yang sama. LOD low-poly hanya dibuat untuk satu patung saat loading (untuk menghangatkan shader), sisanya dicicil per bagian di latar belakang setelah menu tampil (patung yang sudah selesai di save tetap dibuat LOD-nya sebelum digabung). Waktu loading di renderer software: ±25 dtk → ±15 dtk.
- **Main menu**: **STAGE RUN** memulai atau melanjutkan endless run; **GALLERY** membuka mode restorasi bebas. Settings dan ranking tetap tersedia. Stage Run berawal dengan satu patung tanpa rintangan; stage 2 memperkenalkan tirai, stage 3 peti, lalu kombinasi. Satu patung aktif dan fragmen stage saja yang tampil, jumlah ornamen bertambah bertahap, waktu tersisa memberi poin, dan skor kumulatif dikirim ke leaderboard menurun (`sort_ascending = false`). Tombol ☰ / Esc kembali ke menu.
- Waktu restorasi hanya dihitung saat bermain, disimpan bersama progres dan preferensi; skor dikirim saat patung terakhir selesai.

## Bermain
- Gerak: joystick sentuh atau WASD / panah; geser layar atau seret mouse untuk melihat.
- Dekati komponen di atas plinth marmer, tekan **COLLECT** (atau E), bawa ke plinth bernama set yang sama di galeri, tekan **ASSEMBLE**.
- Kamera orang pertama berada di ketinggian mata 3.2 (patung ±5 unit di atas plinth), jadi wajah patung terlihat sejajar dada–wajah pengunjung.
- Selesaikan lima bagian pada setiap podium untuk memulihkan seluruh figur.

## Tutorial interaktif
- Saat pertama kali bermain, kartu pemandu muncul di atas kontrol dan maju sendiri begitu pemain benar-benar melakukan langkahnya: **1** lihat sekeliling (seret layar) → **2** berjalan (stick/WASD) → **3** ambil potongan (atau OPEN peti/tirai) → **4** bawa ke plinth bernama sama di galeri → **5** ASSEMBLE dan putar sampai pas dengan TARGET.
- Kontrol yang sedang dibahas berdenyut (stick, tombol aksi, peta). Langkah yang sudah terpenuhi dilewati otomatis. Tombol **SKIP** menutupnya; **REPLAY TUTORIAL** di Settings memulainya lagi. Status selesai tersimpan (`meta.tutorialDone`), tetap setelah NEW RUN, terhapus oleh RESET PROGRESS.

## Tata letak peta
- **Aula 96 × 96** dibagi 6 bay sama besar (`HALL_SIZE / 6`). Balok langit-langit dan jendela ada di garis bay, skylight di tengah bay, pilaster di antara jendela, jadi dekorasi selalu simetris. Pohon dan bangku didefinisikan di `logic.mjs` (`HALL_TREES`, `HALL_BENCHES`) dan diuji agar tidak menimpa potongan.
- **Galeri** (x ±20, z −50 … −140): enam plinth per sisi dengan jarak rata 12,5 (`GALLERY_ROWS`); rusuk atap berada tepat di antara baris plinth. Mode Gallery memakai 12 zona potongan 4 × 3 di aula.
- **Stage Run**: patung stage berdiri di medali tengah aula. Potongan diletakkan di titik-titik rata di sekelilingnya: maksimal 6 di lingkar dalam, sisanya di lingkar luar di sela-selanya (`stageStations`). Lingkar dalam 13 di stage 1 dan melebar 1 per stage sampai 18 (lingkar luar +11). Pola diputar per stage (kelipatan 15°) dan potongan diacak per titik, jadi rute selalu berbeda tapi tetap rapi. Tiap stage pemain mulai tepat di depan patung (`STAGE_SPAWN`).

- **Ornamen di patung** (stage 2+): model ornamen digambar besar saat jadi potongan koleksi di aula, tetapi saat terpasang di patung diperkecil per jenis (`ON_STATUE_SIZE` di `world.js`): permata/bros ≈ 0,2×, pita 0,62×, mahkota 0,68×, gelang 0,55×. Gelang diletakkan di pergelangan tangan kanan tiap patung dari data pose (`armJoints`), jadi menempel di tangan walau pose tiap karakter berbeda. Ornamen tidak memakai puzzle putar-dan-pas.

## Kedalaman gameplay
- **Potongan tersembunyi**: 24 dari 60 potongan (2 per patung) disimpan di dalam **peti kayu** (11) atau di balik **tirai beludru** (13). Di peta tampil sebagai "?", HUD menulis *SOMETHING IS HIDDEN HERE*, tombol jadi **OPEN**. Saat dibuka: tutup peti berengsel / tirai tersibak (animasi 0,8 dtk), potongan melayang naik, kilau + SFX peti/tirai. Status terbuka tersimpan (`revealed`).
- **Mini-puzzle "putar & pas-kan"**: tekan ASSEMBLE di plinth → potongan melayang besar di tengah layar dengan latar gelap, diputar acak 90°–270° (sebagian juga terbalik). Hologram **TARGET** kecil di kanan atas menunjukkan posisi yang benar. Putar 45° dengan tombol ⟲ ⟳ / swipe kiri-kanan / A-D, balik dengan ⤾ / swipe atas-bawah / W-S. Saat pas: hologram menyatu ke potongan, "PERFECT FIT", klik + chime, getar, lalu potongan terbang ke patung. ✕ / Esc membatalkan.
- **Medali per patung**: jam tiap patung berjalan dari potongan pertamanya diambil sampai potongan kelima terpasang (hanya saat bermain). Par dihitung per patung dari rute sebenarnya (jalan plinth → potongan → kembali lewat pintu galeri + 5 dtk per puzzle + 2 dtk per wadah): emas ≤ par, perak ≤ 1,5× par, selain itu perunggu. Kartu hologram menampilkan jam + target emas + medali saat ini. Saat selesai: pop-up medali + SFX, lencana medali 3D di depan plinth, label patung menulis medalinya. Fokus pada satu patung = medali lebih baik.
- **Hadiah di Studio** (bintang: emas 3★, perak 2★, perunggu 1★, tantangan harian +3★):
  - Potret karakter terkunci (hologram + 🔒) sampai patungnya dipulihkan.
  - Ekspresi terbuka dengan bintang: happy 2★, shy 4★, wink 7★, surprised 10★, smug 14★, sad 18★, angry 22★, crying 27★ (neutral, smiling, dan ekspresi khas karakter selalu terbuka).
  - Medali emas membuka **kostum gala** karakter itu (mis. *Evening Gala*, *Mint Ward*, *Indigo Shrine*), bisa dipakai/dilepas di Studio.
- **Tantangan harian** (sama untuk semua pemain per tanggal): pulihkan patung tertentu dalam batas waktu, dapatkan medali emas, atau buka N peti/tirai. Kartu di menu menunjukkan tugas, progres, dan streak; selesai = +3★ sekali per hari, streak bertambah bila kemarin juga selesai.
- **NEW RUN** di menu: mulai restorasi baru (waktu, peti, potongan direset) tetapi medali, potret, bintang, dan streak tetap. RESET PROGRESS di Settings menghapus semuanya.

## Audio
- Musik tema `music_atelier_theme` (piano lembut, string, harpa, music box; loop) dan efek: ambil potongan, pasang potongan, patung selesai, semua patung selesai, tap UI, nada lembut saat plinth terlalu jauh, peti dibuka, tirai disibak, putaran puzzle, potongan "klik" pas, dan medali. Semua aset ada di `asset_map.json`.
- Audio dimulai pada sentuhan/tombol pertama, berhenti saat game disembunyikan, musik diredam sejenak saat fanfare. Tombol ♪ di HUD mematikan/menyalakan suara (tersimpan bersama progres); volume musik dan efek bisa diatur di panel pengaturan (`settings.musicVolume`, `settings.sfxVolume`).

## Juice & performa
- Potongan terbang dari plinth ke tangan saat diambil dan dari tangan ke patung saat dipasang (pop saat mendarat; kilau, suara, dan getar tepat saat mendarat). Patung selesai: pilar cahaya emas + gelombang cincin + halo; FOV kick halus; counter HUD "pop"; langkah kaki di marmer; petunjuk singkat untuk pemain baru.
- Pengunjung tidak bisa menembus patung, plinth, pohon, dan bangku (collider lingkaran).
- Resolusi dinamis menjaga ±60 fps (turun bertahap saat < 50 fps, naik lagi saat stabil); material statis, plinth, podium, dan ceruk dibekukan setelah loading (hologram fresnel dikecualikan); plinth fragmen tidak lagi ikut bergerak tiap frame; status fragmen & target terdekat di-cache; DOM HUD hanya ditulis saat berubah; rect kartu hologram diukur saat layout berubah saja; save digabung (debounce 1,5 dtk); timer memakai waktu nyata.

## Performa patung (LOD, merge, shader, context)
- **LOD low-poly**: tiap bagian patung juga dipahat ulang pada 35% resolusi (≈5× lebih sedikit segitiga, `Sculptor.detail`). Mulai 22 unit, bagian patung diganti satu mesh low-poly berwarna per-vertex (satu material bersama) + wajah low-poly → ±2 draw call per patung jauh. Bulu mata, kornea, air mata, gigi, lidah tidak digambar di atas 16 unit. Hologram bagian yang belum terpasang juga punya LOD.
- **Merge per material**: patung yang selesai digabung jadi satu mesh per material (±26 → ±15 draw call) beserta LOD-nya; bagian asli, hologram, dan klon fragmennya dilepas (mesh di scene 1.463 → ±330 saat semua selesai). Ceruk dan plinth juga digabung per material. Reset progres memuat ulang game untuk membangun ulang patung. (Perbaikan: salinan hologram tidak lagi berbagi array indeks dengan patung asli — sebelumnya merge patung jadi bisa menggambar garis liar, terlihat di OFFICE-01.)
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
- `logic.mjs` — aturan murni (fragmen, pengambilan, pemasangan, save, potongan tersembunyi, par & medali, bintang, unlock ekspresi, tantangan harian, puzzle); `stages.mjs` — generator stage deterministik, timer, bonus, skor, dan transisi run.
- `renderer.js` — scene, kamera, cahaya, pipeline, input, HUD, editor.
- `statues.js` — model patung, wajah anime bertekstur, rambut, seragam, dan hologram.
- `faces.mjs` — data preset wajah, ekspresi, ekspresi default, bentuk wajah, gaya bibir, dan kostum gala (diuji di Node).
- `poses.mjs` — 12 pose khas berbasis sendi (bahu → siku → pergelangan, arah tangan, telapak, lekuk jari) beserta propertinya.
- `world.js` — aula restorasi, galeri patung, plinth patung, plinth fragmen, peti & bilik tirai, label, partikel.
- `ui.js` — markup HUD, CSS, blueprint SVG.
- `audio.js` — musik tema dan efek suara (Web Audio, aset dari `lib.getAsset`).
- `tests/logic.test.mjs`, `tests/stages.test.mjs` — `node --test tests/logic.test.mjs tests/stages.test.mjs`.
