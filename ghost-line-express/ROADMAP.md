# Ghost Line Express — Kerangka Update (Roadmap)

Basis: `game_code.html` (Three.js, 3.7k baris, single-file) hasil pull dari Astrocade
(game_id `01M3G5FPW0WWCP48WN45JYEBZR`, masih draft/private, 3 plays).

## Status
Fase 1 (kecuali tikungan/tanjakan/jembatan dan genangan reflektif) dan Fase 2 sudah dikerjakan: game ditulis ulang dari nol
(150 KB -> 66 KB, ~131 draw call, ~6k segitiga) dan disimpan sebagai draft Astrocade. Catatan: bagian bus dilakukan
sebagai satu kelompok mesh + tekstur kanvas (jendela, plat, sign), bukan InstancedMesh; `createGhost(type)` belum
dipisah dan baru tersedia sebagai blok kuntilanak di `run()` — dipisah saat Fase 3.

Fase 3 hampir selesai: sistem `GHOST_TYPES` + `DESTS` data-driven dengan 6 hantu (kuntilanak, pocong, tuyul, genderuwo,
hantu anak sekolah, wewe gombel), 3 lokasi jemput (kuburan, halte, pohon beringin) dan 6 tujuan (Rumah Kosong, Sekolah Tua,
Rumah Sakit Tua, Pasar Malam, Jembatan Tua, Hutan Bambu). Pocong dan tuyul memakai bay bergerak, genderuwo memperlambat bus,
tuyul mencuri poin, anak sekolah = 3 penumpang sekaligus (x3), wewe gombel langka dengan rute 1,4x dan hadiah x4.
Belum: genderuwo yang menghalangi lajur dan suster ngesot (keduanya butuh sistem tabrakan/rintangan Fase 4).

## Kondisi awal (hasil baca kode, sebelum rewrite)
- Loop inti: gas/rem/steer -> berhenti di bay hijau dekat kuburan -> kuntilanak naik -> berhenti di "Abandoned House" (~500 unit) -> +100 poin -> ulang.
- Tidak ada fail state, rintangan, lalu lintas, suara, atau progres kesulitan. Hanya 1 jenis hantu, 1 tujuan.
- Jalan: kotak datar (`ROAD_WIDTH=14`), marka tengah, recycling segmen, prop pinggir jalan berulang (pohon, labu, pagar, batu), semua per-segmen identik.
- Bus: grup mesh besar (~600 baris) dengan skala 1.04/1.16/1.02, roll/yaw saat steer, lampu spot. Kamera chase statis.
- Hantu: ~1000 baris geometri prosedural (gaun, rambut, wajah, tangan) — detail tinggi tapi dibangun dari primitif, sehingga wajah/siluet terbaca "kaku".

## Fase 1 — Polish fondasi (cepat, risiko rendah)
### Jalan raya
- [x] Tekstur aspal prosedural (canvas noise + retakan + tambalan), bukan warna datar
- [x] Marka putus-putus bergerak mulus, garis tepi pudar, genangan air reflektif
- [ ] Variasi segmen: tikungan ringan (offset x sinus pada segmen), tanjakan kecil, jembatan, terowongan pohon
- [x] Prop pinggir jalan acak per recycle (seed berbeda): lampu jalan berkedip, papan halte tua, mobil terbengkalai, gagak di pagar
- [x] Kabut berlapis + partikel (kunang-kunang, daun, kabut tanah rendah)
- [x] Jarak pandang dinamis: kabut menebal saat dekat area hantu

### Bus
- [x] Suspensi (bounce pada gundukan/rem), asap knalpot, percikan saat rem
- [x] Headlight volumetrik (cone transparan) + lampu dalam bus yang berkedip saat hantu naik
- [x] Interior terlihat dari jendela: siluet penumpang, dasbor, sopir
- [ ] Penyok/goresan bertahap sesuai "damage"
- [x] Rapikan struktur: pecah `bus` jadi `createBus()`, kurangi draw call (merge geometry / InstancedMesh untuk rivet, rel, dll)
- [x] Kontrol sentuh yang lebih responsif (tombol besar, haptic, tilt opsional) — game ini mobile-first

## Fase 2 — Redesign hantu pertama (Kuntilanak)
- [x] Silhouette ulang: gaun putih panjang dengan cloth sim sederhana (vertex shader sin wave) menggantikan ratusan mesh lipatan
- [x] Wajah: tekstur wajah via canvas/asset gambar (mata cekung, kulit pucat) di plane kecil, bukan geometri tiap fitur
- [x] Rambut: ribbon/strip dengan animasi angin, dibatasi jumlah mesh
- [x] Shader rim-light + transparansi (alpha fade kaki, aura biru-hijau) agar terasa "arwah"
- [x] Animasi: melayang, kepala miring mendadak, tertawa (jump-scare ringan saat mendekat), naik bus tanpa teleport
- [ ] Gunakan `lib` asset (generate_image) untuk sprite wajah/aura bila ingin kualitas lebih tinggi
- [x] Pisahkan ke fungsi `createGhost(type)` supaya bisa dipakai jenis lain

## Fase 3 — Variasi hantu (sistem `GHOST_TYPES`)
Refactor jadi data-driven: `{ id, model, spawnSide, boardSpeed, destination, behavior, points }`.

| Hantu | Perilaku | Efek gameplay |
|---|---|---|
| Kuntilanak (selesai) | Berdiri menunggu | Pickup standar |
| Pocong (selesai) | Melompat-lompat di jalan menuju bus | Bay bergerak, harus sinkron |
| Tuyul (selesai) | Kecil, berlari zig-zag, mencuri koin/poin | Harus dikejar/dihindari |
| Genderuwo (selesai, tanpa blokir lajur) | Besar, menghalangi satu lajur | Rintangan + penumpang berat (bus melambat) |
| Hantu Anak Sekolah (selesai) | Menunggu di halte sekolah | Pickup berkelompok (2-3 sekaligus) |
| Suster Ngesot (ditunda ke Fase 4) | Merayap di aspal | Bahaya jalan: jangan tabrak (penalti) |
| Wewe Gombel (selesai; Leak tidak dibuat) | Elite, muncul malam tertentu | Bonus tinggi, tujuan sulit |

Tujuan bervariasi: Abandoned House, Sekolah Tua, Rumah Sakit, Pasar Malam, Jembatan, Hutan Bambu — masing-masing dengan landmark & tema pinggir jalan sendiri.

## Fase 4 — Gameplay & progres
- [ ] Fail state: hantu bisa "marah" jika penumpang menunggu terlalu lama / bus terlalu kencang saat membawa (meter ketakutan/kesabaran)
- [ ] Rintangan jalan (batu, pohon tumbang, lubang) + lalu lintas hantu (mobil jenazah, motor tanpa kepala)
- [ ] Combo pengiriman mulus (stop presisi, bonus waktu), rating bintang per rute
- [ ] Kesulitan naik: kabut tebal, jalan sempit, hujan, jarak lebih jauh
- [ ] Skor + `lib` leaderboard & save/load (best score, hantu terbuka = koleksi/"ghost dex")
- [ ] Upgrade bus (lampu, rem, kecepatan) dibeli dengan poin
- [ ] Tutorial 10 detik pada rute pertama

## Fase 5 — Audio, UI, rilis
- [ ] Musik ambient horor (generate_music) + SFX mesin, rem, tawa, pintu bus, hujan (generate_sound_effect)
- [ ] HUD: speedometer, indikator jarak ke tujuan (panah di tepi layar), meter ketakutan
- [ ] Layar judul + game over + jump-scare cut-in
- [ ] Thumbnail baru (generate_thumbnail / set_thumbnail), deskripsi, publish ke review

## Urutan kerja yang disarankan
1. Refactor kecil: ekstrak `createBus`, `createGhost`, `createRoadSegment`; tambah `GHOST_TYPES`
2. Jalan + kabut + prop acak (dampak visual terbesar per jam kerja)
3. Redesign Kuntilanak (shader + wajah tekstur)
4. Tambah Pocong & Tuyul (membuktikan sistem variasi)
5. Fail state + rintangan + audio
6. Progres (leaderboard, upgrade) -> thumbnail -> publish

## Catatan teknis
- Satu file `game_code.html`; ukuran 150 KB, hati-hati bertambah besar — pertimbangkan multi-file bila > ~300 KB
- Jaga performa mobile: batasi shadow, merge geometri, pixelRatio <= 2
- Edit via `save_draft` setelah `get_game_dev_guide` dibaca; pakai `sync_token` `90beaa448a9a6fc4eb41ee2f8fcfc326` saat pull berikutnya
