# GDD Revisi V1 — Secret Recipe Lab (Astrocade)

Status: draf kerja. Menggantikan bagian yang bertentangan di GDD asli dan Technical Spec.
Label klaim: **[terukur]** dari data akun / hitungan, **[platform]** dari dev guide, **[hipotesis]** belum terbukti.

---

## 1. Kalibrasi pasar (akun, 70 game publik) [terukur]

- Median plays 2.494, rata-rata 11.149. Top 5 menguasai 42% total play, top 10 menguasai 63%.
  22 game >10 ribu play, 29 game <1 ribu.
- Median per kelompok: hiper-kasual 19.193 (8 game, terendah 4.500), makeover/job-sim/dandan
  9.652 (12 game), brawl/aksi 7.184 (10 game), horor/misteri 370 (9 game; tetapi pemenang
  tunggal Ghost Line Express 88.921).
- Kelompok "makeover / job-sim / dandan" paling relevan untuk game ini. Pemenangnya Nasi Goreng
  Special Recipe (61.241), Coco's Dream Closet (26.744), Style Spectrum Salon (23.170),
  Squeaky Clean (20.433), Suture Specialist (19.071).
- **Pembanding paling penting:** dua game masak di akun yang sama.
  - Nasi Goreng Special Recipe: 61.241 play. Pemain mengerjakan tahap demi tahap secara aktif
    (kupas `peelStrokes` 4, potong `chopPieces` 6, nasi di wajan) dan ada kejutan
    `dragonSurprise` (naga di gudang, `dragonShreds` 8, `dragonBoilSeconds` 7).
    Tanpa leaderboard, tanpa `saveUserGameState`.
  - Tubby Custard Chef: 902 play. Tema dapur modern, mode `timed`, tanpa leaderboard dan tanpa save.
  - WHAT DID I JUST EAT?!: 3.515 play.
- **Hipotesis dari data ini, bukan sebab-akibat** (n kecil, umur game berbeda):
  1. Memasak yang pemainnya aktif (kupas, potong, aduk) dan ada kejutan lebih jauh dari game
     masak yang pasif/timer.
  2. Hook judul menang: "Nasi Goreng Special Recipe" menjanjikan resep, "Cozy Blocky Kitchen" tidak.
  3. Leaderboard dan save tidak menentukan jangkauan (Nasi Goreng tidak punya keduanya).
- Yang belum diukur: sesi rata-rata, retensi, dan thumbnail tiap game. Itu tidak ada di data akun.

## 2. Keputusan perubahan terhadap dokumen asli

| # | Asli | Revisi | Alasan |
|---|---|---|---|
| 1 | "Zero stress", tanpa kejutan | Tetap tanpa kegagalan, **tambah kejutan ringan** (bagian 7) | Hook test: satu kejutan di loop inti |
| 2 | Chef memasak otomatis 3,5 dtk (pasif) | Pemain **ketuk** untuk tumis/aduk di Beat 1 dan 2 (opsional, otomatis jika tidak) | Pasif ≈ 8 dtk tiap masakan; hit akun bersifat aktif [hipotesis] |
| 3 | Kamera/HUD mengikuti `window.inner*` | Portrait 720×1280: panggung 3D di y 0–640, HUD di y 640–1280 | [platform] |
| 4 | Starter 6 bahan bebas, +3 tiap 2 order | Starter tetap (Nasi, Roti, Ayam, Telur, Tomat, Keju); +3 tiap 3 order | Bagian 5 |
| 5 | Fallback satu nama "Kreasi Spesial Chef" | Nama prosedural dari bahan + bentuk hidangan | Pilar "selalu unik" |
| 6 | Skor `base*2 + combo*25`, `base` tak jelas | Tabel skor eksplisit (bagian 6) | Ambigu |
| 7 | `dt` maks 0,05 | `dt` maks 0,11 | [platform] |
| 8 | Slot 3 langsung kunci | Jeda 0,35 dtk "batal" sebelum kunci (ketuk slot 3 untuk batal) | Salah klik |
| 9 | Judul "Cozy Blocky Kitchen" | **"Secret Recipe Lab"** (dipilih pemilik). Tema netral, semua teks bahasa Inggris | Hook test |
| 10 | Teks UI di kode | Semua teks di `game_config.json` (`strings`) | Alih bahasa, [platform] teks minimal |

Struktur multi-file dari Technical Spec **dipertahankan**: `game.js` mengimpor modul dan diakhiri
`window.run = run;` [platform].

## 3. Layout 720×1280 [platform]

- y 0–640: panggung 3D (kamera `aspect = 720/640`). Order card melayang di kiri atas, skor/combo kanan atas
  (tombol info, suara, pengaturan = ikon ≥96×96).
- y 640–1280: HUD. 3 slot (tiap ≥140×140) di y ≈ 660–810; grid 12 bahan 6×2, kartu 96×96 + celah 16 px
  (lebar 6×96 + 5×16 = 656 px), y ≈ 850–1080. Tombol "Resep" (buku) dan "Ulangi" (masak lagi resep terakhir) di bawah.
- Tombol terkunci saat `LOCK_AND_TOSS` sampai `SERVING_EVALUATE`, dengan indikator visual redup.
- Keyboard: tombol `1–9, 0, -, =` memilih 12 bahan, `Backspace` undo, `Enter`/Spasi mulai/percepat.
  Pakai `lib.shouldUseTouchControls()` untuk menampilkan ikon sentuh atau petunjuk tombol.

## 4. Bahan, kategori, warna

Kategori dipakai hanya untuk **bentuk 3D**, bukan aturan slot. Tiap bahan mempunyai `id`, `category`,
`color`, `miniMesh()`, `ikon`.

| id | Nama | Kat. | Warna (revisi) | Catatan |
|---|---|---|---|---|
| carb_1 | Nasi | carb | `#FFFFFF` + garis tepi `#D9D9D9` | Tepi agar terbaca di piring putih |
| carb_2 | Mie | carb | `#F4D03F` | |
| carb_3 | Roti | carb | `#D9A066` | **diubah** dari `#D5A6BD` (pink) ke cokelat keemasan |
| carb_4 | Kentang | carb | `#E5C158` | |
| prot_5 | Ayam | prot | `#C0651A` | digelapkan agar beda dari Mie/Telur |
| prot_6 | Sapi | prot | `#6E2C00` | |
| prot_7 | Udang | prot | `#FF7675` | |
| prot_8 | Telur | prot | `#FFFFFF` + kuning `#F1C40F` | |
| garn_9 | Sayur | garn | `#2ECC71` | |
| garn_10 | Tomat | garn | `#E74C3C` | |
| garn_11 | Keju | garn | `#FFD84D` | **diubah** dari oranye `#F39C12` ke kuning |
| garn_12 | Jamur | garn | `#795548` | |

Bahan tidak boleh dibedakan hanya lewat warna: tiap kartu punya ikon bentuk berbeda [aksesibilitas].

## 5. Resep dan progresi [terukur dari hitungan]

### 5.1 Resep
- 20 resep dari GDD asli dipertahankan (tidak ada duplikat). 15 berpola karbo+protein+pelengkap, 5 menyimpang:
  #1 Nasi+Ayam+Telur (2 protein), #13 Nasi+Sayur+Jamur (2 pelengkap), #14 Ayam+Keju+Tomat (2 pelengkap),
  #15 Sapi+Jamur+Keju (2 pelengkap), #19 Udang+Telur+Sayur (2 protein).
- **Setiap resep punya fungsi bentuk sendiri** (`buildDish_<id>()`), bukan hasil lapisan generik.
  Resep 1–20 dibangun satu per satu (bagian 11 langkah 5).
- **Fallback generator** (200 kombinasi sisanya):
  1. Urutkan tiga bahan ke 3 lapisan menurut `category` dengan prioritas carb → prot → garn.
  2. **Jangan pernah mengulang bahan.** Jika dua bahan sekategori, yang kedua naik ke lapisan berikutnya yang kosong.
  3. Pilih bentuk hidangan: `bowl` (ada carb nasi/mie), `plate` (selainnya), `stack` (ada roti).
  4. Nama: `"<Bentuk> <bahan1> <bahan2> <bahan3>"`, mis. "Bowl Nasi Udang Tomat". Skor dasar 100.
  5. Bentuk acak diganti RNG ber-seed dari `id` ketiga bahan, supaya kombinasi yang sama selalu tampak sama
     (dibutuhkan buku resep).
- Petunjuk kilau emas di slot 3: hanya jika dua bahan terpilih **tepat** satu resep yang belum ditemukan.
  Dari 66 pasangan, 44 masuk ≥1 resep dan 12 ambigu, jadi kilau dihitung per resep **belum ditemukan**, bukan per pasangan.

### 5.2 Progresi (menggantikan V4)
- **Awal (6):** Nasi, Roti, Ayam, Telur, Tomat, Keju → membuka **6 resep** (#1, 6, 10, 14, 16, 20), 20 kombinasi.
- **Gelombang 2 (setelah 3 order cocok atau 6 masakan):** + Sapi, Kentang, Jamur → 9 bahan, **12 resep**, 84 kombinasi.
- **Gelombang 3 (setelah 6 order cocok atau 12 masakan):** + Mie, Udang, Sayur → 12 bahan, 20 resep, 220 kombinasi.
- Alasan: setiap gelombang membuka resep baru, dan tak ada starter tanpa resep (99 dari 924 pilihan 6 bahan
  tidak membuka resep sama sekali).
- Setelah semua terbuka, penggerak progres = buku resep (20 siluet), dekorasi dapur, dan skor tinggi.

## 6. Skor (tabel tunggal)

| Kejadian | Poin |
|---|---|
| Kreasi (kombinasi non-resep) | 100 |
| Resep khusus (belum cocok order) | 150, plus "BARU!" jika baru ditemukan (+50) |
| Cocok order | 200 |
| Bonus combo | +25 × `comboStreak`, maksimum +250 |
| Kejutan Wajan berhasil | +100 (bagian 7) |
| Order Emas | ×3 total |

Combo naik tiap order cocok berturut-turut, dan hanya **reset** saat memilih Kreasi/bukan-order
(tanpa hukuman poin).

## 7. Loop dan kejutan (hook) [hipotesis, wajib diukur]

Fase (durasi baku, semua di `game_config.json`):
`SELECTING` → `GRACE` 0,35 → `LOCK_AND_TOSS` 0,7 → `COOKING_SHOWCASE` 3,5 → `SERVING_WALK` (± 1 dtk, sampai tiba)
→ `SERVING_EVALUATE` 1,6 → `CLEANUP_RESET` (± 1 dtk, sampai tiba). Total ± 8,2 dtk.
- **Percepat 2×** lewat tombol ⏩ (atau Spasi), bukan ketuk layar, karena ketukan dipakai untuk irama memasak (diubah di langkah 4). Tombol ↻ "Ulangi" mengulang resep terakhir.
- **Beat 1 (0–1,2 dtk) dan Beat 2 (1,2–2,6 dtk) bisa diketuk berirama:** tiap ketukan menambah "Kilau" (0–100).
  Kilau 100 → "Chef Perfect" +50. Tidak ketuk pun tidak dihukum.
- **Kejutan Wajan** (`surpriseChance` 0,15 per masakan): wajan menyala biru di Beat 1; pemain ketuk 3× untuk
  melempar masakan (+100, partikel bintang). Bila diabaikan, tetap sukses tanpa bonus.
- **Order Emas** (`goldenOrderEvery` 5): pelanggan berpita emas, petunjuk hanya satu bahan, selesai dalam
  `goldenOrderSeconds` 25 untuk ×3. Telat = order biasa, bukan gagal.
- Tidak ada game over, tidak ada layar hukuman.

## 8. FTUE (konkret)

- **0 dtk:** dapur, chef idle, order card "Minta: Nasi Goreng Ayam", 6 kartu bahan, panah menunjuk Nasi.
- **0–10 dtk:** ketuk Nasi → Ayam → (kilau di slot 3) → Telur. Jeda batal 0,35 dtk, lalu masakan jalan.
- **10–25 dtk:** masakan pertama selesai dan skor naik (momen kepuasan). Tanpa teks panjang; skip tutorial tersedia.
- **Menit ke-2:** gelombang 2 terbuka (bahan baru berkilau). **Menit ke-5:** gelombang 3, Order Emas pertama.
- Tutorial dalam dunia game (panah, sorotan) hanya pada order pertama; ikon bantuan memutar ulang.

## 9. Daftar perbaikan teknis dari Technical Spec

1. `buildProceduralDish`: tiap sub-generator menerima `id` valid saja, tidak ada `else` default. Pakai peta
   `id → fungsi`; ganti lookup kategori dengan pengurutan tanpa pengulangan (bagian 5.1).
2. `LOCK_AND_TOSS`: yaw chef menghadap `panCenter` memakai `atan2(dx, dz)` dengan lerp sudut yang membungkus ±π.
3. Torso: posisi pinggul y = 0,75 (sama dengan dasar badan) agar tidak melayang. Samakan nilai diagram dan kode.
4. Tambah wajah (mata, pipi), pita celemek, dan sanggul 4 kubus sesuai GDD; skala kepala tetap proporsional
   (GDD 1,0 vs kode 0,5 → pakai 0,5 dan sesuaikan teks GDD).
5. Partikel: akumulator berbasis `dt` (`rate × dt`), bukan `Math.random()` per frame.
6. Cache geometri/material di satu modul; `dispose()` saat membersihkan masakan; pooling partikel.
7. `dt = clamp(raw, 0, 0.11)`; frame pertama pakai `dt = 0`.
8. Chef menghadap pelanggan saat evaluasi dan menghadap prep counter saat kembali (set yaw akhir).
9. Tambah karakter pelanggan sederhana (blocky) yang bereaksi (hati, bintang) saat order cocok.
10. Pelengkap yang belum ada: data bahan, dapur (konter, kompor, wajan, meja), generator order, evaluasi resep,
    audio prosedural (tambah `SLOTS_LOCKED`, `DISH_READY`, `SERVE_NORMAL`), partikel, HUD, save, leaderboard.
11. Durasi serve/cleanup di GDD (3,4 dtk / 0,8 dtk) diganti dengan durasi sebenarnya (bagian 7).

## 10. Persyaratan platform

- **Loading screen** bertema dengan bar nyata; **menu** bertema (tombol MAIN besar di bawah y 640, ikon ≥96×96, skor terbaik,
  mute, kualitas Auto/Low/Med/High).
- **Tier performa:** ukur FPS di loading. Low: pixel ratio 1, tanpa bayangan, partikel ≤ 30, tanpa antialias.
  Med: 1,5 dan bayangan sederhana. High: 2. Pilihan tersimpan lewat `lib.saveUserGameState`.
- **Save** (`lib.saveUserGameState`): bahan terbuka, resep ditemukan, skor tertinggi, pengaturan. Daftar dibatasi (maks 20 resep).
- **Leaderboard:** skor total sesi (`"persistent_storage_config": {"leaderboard": {"sort_ascending": false}}`).
  Kirim saat pemain keluar atau menekan "Selesai", bukan tiap masakan.
- **Getar** (`lib.haptics`): `tick` saat memilih bahan, `tap` saat melempar, `success` saat order cocok.
- `showGameParameters` dipanggil sekali di kedua mode; mode edit menonaktifkan gameplay.
- Konten aman semua umur; kilatan layar ≤ 3 kali per detik.
- **Kandidat judul** (uji, jangan dianggap terbukti): "Resep Rahasia: 220 Masakan", "Chef Blocky: Masak 3 Bahan!",
  "Masak Apa Saja!". Thumbnail: chef + piring hidangan emas dengan bintang.

## 11. Rencana kerja (satu mekanik per prompt)

1. Fondasi: scene Three.js, kamera portrait, chef rig (diperbaiki), dapur dasar.
2. Loop inti: pilih/undo 3 slot → lempar → masak (tap) → sajikan → reset, sentuh + keyboard, FTUE.
3. Generator hidangan: fallback + 6 resep starter dulu.
4. Loading, menu bertema, audio prosedural, partikel, getar.
5. Sisa 14 resep, progresi gelombang, buku resep, save.
6. Kejutan Wajan, Order Emas, skor, leaderboard.
7. Tier performa, uji lintas perangkat (throttle CPU), thumbnail, publikasi.

## 12. Yang akan diukur setelah rilis

Panggil `list_my_games` pada 24–72 jam dan 7 hari. Bandingkan dengan median akun (2.494) dan dengan Nasi Goreng (61.241).
Jangan menyimpulkan dari kurang dari beberapa ratus play. Bukti yang dicari: apakah ketukan aktif dan Kejutan Wajan
menaikkan sesi dan kembali bermain. Data yang belum tersedia (sesi, retensi) harus diambil dari dashboard platform.

## 13. Nama hidangan (English, tema netral)

1 Chicken Egg Fried Rice · 2 Seafood Noodle Stir-Fry · 3 Double Melt Cheeseburger · 4 Classic Steak & Fries ·
5 Shrimp Mushroom Risotto · 6 Crispy Chicken Sandwich · 7 Beef Noodle Soup · 8 Loaded Chicken Potato Bake ·
9 Beef Bolognese Rice Bowl · 10 Fluffy Egg & Cheese Toast · 11 Tomato Egg Noodles · 12 Seafood Potato Skillet ·
13 Veggie Mushroom Fried Rice · 14 Chicken Parmigiana Plate · 15 Beef Mushroom Melt Steak · 16 Chicken Tomato Club Sandwich ·
17 Mushroom Chicken Noodles · 18 Cheesy Potato Frittata · 19 Shrimp Scramble Plate · 20 Cheesy Chicken Rice Bake.
Urutan dan bahan sama dengan tabel GDD asli. Nama disimpan di `game_config.json` (`strings`) pada langkah 5.

## 14. Status langkah 3 (fondasi)

Kode ada di `game/`. Sudah diuji di Chromium headless (swiftshader): tanpa error konsol, satu siklus preview
(idle → toCook → sautee → stir → plate → toServe → cheer → back) berulang bersih, mode edit dan pemanggilan `run()` ganda aman.
Belum diuji: perangkat nyata, FPS di Low, runtime Astrocade asli (apakah script cdnjs r128 + `type="module"` diterima bundler).

## 15. Draft di Astrocade

- Game dibuat sebagai draft privat: `game_id` 01M7YJ2F7VE6718XD0SA3CFDS1, mode `multi_file`.
- Pembuatan lolos validasi bundler (esbuild): impor modul `./src/*.js` dari `game.js` diterima.
- Percobaan pertama gagal karena tiga file modul tertinggal dari daftar file, bukan karena struktur kode.
- Belum diverifikasi: pemuatan Three.js r128 dari cdnjs di runtime sebenarnya, harus dicek lewat `draft_play_url`
  (butuh sesi yang login sebagai pemilik).
- Thumbnail belum ada; `publish_game` menolak sampai `generate_thumbnail` + `set_thumbnail` dilakukan.

## 16. Status langkah 4 (gameplay)

Draft Astrocade versi `01M7YP8BBMZ0NQFC70PHVR1NKZ` (disimpan). Sudah diuji di Chromium headless dengan waktu virtual:
- Siklus penuh GRACE → LOCK_AND_TOSS → COOKING → SERVING_WALK → SERVING_EVALUATE → CLEANUP_RESET → SELECTING.
- 41 masakan acak berturut-turut (mode cepat bergantian) tanpa macet; progresi gelombang 2 dan 3 terbuka sesuai aturan.
- Semua 220 kombinasi bahan terbangun tanpa error (81 mangkuk, 55 tumpuk, 84 piring).
- Skor resep pertama (Chicken Egg Fried Rice, order cocok, baru): 200 + 50 + 25 = 275, sesuai tabel bagian 6.
Belum diuji: perangkat nyata, FPS di Low, suara (AudioContext butuh gestur), getaran, input keyboard sungguhan, dan runtime Astrocade asli.
Belum ada: save/leaderboard, buku resep, layar loading dan menu, bentuk 3D khusus untuk 20 resep signature (kini memakai generator berlapis).

## 17. Status langkah 5 (shell, save, leaderboard)

Draft Astrocade versi `01M7YQFPDA5QDFBQH5M42AG1BK`. Ukuran 18 file di server sama persis dengan repo.
Diuji di Chromium headless dengan klik pointer sungguhan dan `lib` tiruan (penyimpanan dan leaderboard dibuat palsu):
- Loading screen dengan bar nyata (35% → 71% → 96%), lalu menu; PLAY, jeda (klik), FINISH, buku resep, leaderboard.
- Progres tersimpan dan pulih di halaman baru (9 masakan, 5 resep, gelombang 2, skor terbaik 2475, 9 bahan terbuka).
- Mode edit: loading disembunyikan dan tanpa FSM.
- Bug ditemukan dan diperbaiki lewat uji ini: `submit()` mencatat skor terbaru, bukan skor yang terkirim, sehingga skor akhir bisa terlewat.
Belum diuji: `lib` asli (login, leaderboard sungguhan), perangkat nyata, musik dan suara, performa di Low.
Belum ada: bentuk 3D khusus 20 resep, thumbnail dan publikasi, kontrol keyboard di menu.
