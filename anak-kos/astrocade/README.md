# Anak Kos: Tanggal Tua

Game simulasi hidup (life sim) mobile portrait 720x1280. Pemain mengurus satu anak kos
di satu kamar selama 30 hari: menjaga 4 kebutuhan (Lapar, Energi, Bersih, Senang) sambil
bekerja untuk mengumpulkan uang sewa yang ditagih tanggal 30.

## Loop inti
- Ketuk perabot (atau tombol aksi 1-6): Tidur, Masak mi, Mandi, Freelance, Nonton TV, Kerja shift.
- Kebutuhan turun seiring waktu; kegagalan lembut (pingsan, ketiduran, bau, galau) tanpa game over.
- Kejadian acak harian berupa adegan beranimasi dengan NPC (teman, ibu kos, kurir, kucing);
  kecoa terbang adalah mini-game ketuk 3x dalam 4,5 detik.
- Toko perabot (upgrade bertahan antar bulan). Skor akhir bulan = sisa uang setelah sewa
  + rata-rata bahagia x moodWeight, dikirim ke leaderboard.

## Struktur kode
Semua kode ada di `game.js` (canvas 2D + WebAudio, tanpa aset eksternal):
- Konfigurasi: `CFG` (default) digabung dengan `gameConfig.cfg` lewat `applyConfig()`; slider di `showParams()`.
- Data: `NEEDS`, `FURN`, `SHOP`, `EVENTS`, `LOOKS`.
- Simpanan: `loadSave()` / `writeSave()` via `lib.getUserGameState` / `lib.saveUserGameState`.
- Audio: `SFX` (efek), sequencer musik `TRACKS` + `musTick()` (suasana menu/day/night/tense).
- Gameplay: `newGame`, `order`, `startAct`, `finishAct`, `update`, `endMonth`.
- Adegan kejadian: generator di `SCENES` (helper `moveTo`, `all`, `jump`, `choose`, `enter`, `leave`).
- Karakter: kerangka 2D `drawPerson` + `POSES`, `drawHeadFull`, `drawItem`, `drawCat`, `drawRoach`.
- Ruangan: lapisan statis di-cache `buildRoomLayer()` + elemen dinamis di `drawRoom()`.
- UI: ikon vektor `ICONS`, tombol 3D `btn3d`, `drawHUD`, `drawPanel`, `drawModal`, `drawMenu`, `drawEnd`.
- Entry: `run(mode)`. Mode edit menampilkan kamar tanpa gameplay; mode play menjalankan game penuh.

## Kualitas
Auto/Low/Med/High (deteksi FPS saat loading): mengatur pixel ratio, partikel, bayangan, dan efek cahaya.
